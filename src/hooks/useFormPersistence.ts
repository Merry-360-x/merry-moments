import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface FormPersistenceOptions<T> {
  /** Unique key to identify this form's storage */
  formKey: string;
  /** Initial/default form data */
  initialData: T;
  /** Auto-save interval in milliseconds (default: 30000 = 30s) */
  autoSaveInterval?: number;
  /** Whether to include user ID in storage key (default: true) */
  userScoped?: boolean;
  /** Whether to sync to database for authenticated users (default: false) */
  syncToDatabase?: boolean;
  /** Whether to show toast notifications (default: true) */
  showToasts?: boolean;
  /** Minimum data to trigger save (callback returns true if form has meaningful content) */
  shouldSave?: (data: T) => boolean;
  /** Called when draft is restored */
  onRestore?: (data: T) => void;
}

export interface FormPersistenceResult<T> {
  /** Current form data */
  data: T;
  /** Update form data */
  setData: React.Dispatch<React.SetStateAction<T>>;
  /** Update a single field */
  updateField: <K extends keyof T>(field: K, value: T[K]) => void;
  /** Manually trigger save */
  saveDraft: () => void;
  /** Clear saved draft */
  clearDraft: () => void;
  /** Timestamp of last save */
  lastSaved: Date | null;
  /** Whether currently saving */
  isSaving: boolean;
  /** Whether draft was restored from storage */
  wasRestored: boolean;
  /** Reset form to initial data and clear draft */
  resetForm: () => void;
}

/**
 * Hook for persisting form data across page refreshes and sessions.
 * Automatically saves to localStorage with optional database sync.
 */
export function useFormPersistence<T extends Record<string, any>>(
  options: FormPersistenceOptions<T>
): FormPersistenceResult<T> {
  const {
    formKey,
    initialData,
    autoSaveInterval = 30000,
    userScoped = true,
    syncToDatabase = false,
    showToasts = true,
    shouldSave,
    onRestore,
  } = options;

  const { user } = useAuth();
  const { toast } = useToast();
  
  const [data, setData] = useState<T>(initialData);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [wasRestored, setWasRestored] = useState(false);
  const initialLoadDone = useRef(false);
  const dataRef = useRef(data);

  // Keep ref updated with latest data
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  // Generate storage key
  const getStorageKey = useCallback(() => {
    if (userScoped && user?.id) {
      return `form_${formKey}_${user.id}`;
    }
    return `form_${formKey}`;
  }, [formKey, userScoped, user?.id]);

  // Load from localStorage on mount
  useEffect(() => {
    if (initialLoadDone.current) return;
    initialLoadDone.current = true;

    const storageKey = getStorageKey();
    
    try {
      const savedData = localStorage.getItem(storageKey);
      if (savedData) {
        const parsed = JSON.parse(savedData);
        
        // Deep merge with initialData to ensure all fields exist
        const mergedData = deepMerge(initialData, parsed.data || parsed);
        
        setData(mergedData);
        setWasRestored(true);
        
        if (parsed.timestamp) {
          setLastSaved(new Date(parsed.timestamp));
        }
        
        if (showToasts) {
          toast({
            title: "Draft restored",
            description: "Your previous progress has been restored.",
            duration: 3000,
          });
        }
        
        if (onRestore) {
          onRestore(mergedData);
        }
      }
    } catch (error) {
      console.error(`[useFormPersistence] Failed to load draft for ${formKey}:`, error);
    }
  }, [getStorageKey, formKey, initialData, showToasts, toast, onRestore]);

  // Also try to load from database if syncToDatabase is enabled
  useEffect(() => {
    if (!syncToDatabase || !user?.id) return;

    const loadFromDatabase = async () => {
      try {
        const { data: draft, error } = await supabase
          .from('form_drafts')
          .select('draft_data, updated_at')
          .eq('user_id', user.id)
          .eq('form_key', formKey)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error(`[useFormPersistence] Database load error:`, error);
          return;
        }

        if (draft?.draft_data) {
          const localKey = getStorageKey();
          const localData = localStorage.getItem(localKey);
          const localTimestamp = localData ? JSON.parse(localData).timestamp : null;
          
          // Use database version if it's newer
          if (!localTimestamp || new Date(draft.updated_at) > new Date(localTimestamp)) {
            const mergedData = deepMerge(initialData, draft.draft_data as T);
            setData(mergedData);
            setLastSaved(new Date(draft.updated_at));
            setWasRestored(true);
          }
        }
      } catch (error) {
        console.error(`[useFormPersistence] Failed to load from database:`, error);
      }
    };

    loadFromDatabase();
  }, [syncToDatabase, user?.id, formKey, getStorageKey, initialData]);

  // Save to localStorage
  const saveToLocalStorage = useCallback((dataToSave: T) => {
    const storageKey = getStorageKey();
    const payload = {
      data: dataToSave,
      timestamp: new Date().toISOString(),
      formKey,
    };
    
    try {
      localStorage.setItem(storageKey, JSON.stringify(payload));
      setLastSaved(new Date());
    } catch (error) {
      console.error(`[useFormPersistence] Failed to save to localStorage:`, error);
    }
  }, [getStorageKey, formKey]);

  // Save to database (if enabled)
  const saveToDatabase = useCallback(async (dataToSave: T) => {
    if (!syncToDatabase || !user?.id) return;

    try {
      const { error } = await supabase
        .from('form_drafts')
        .upsert({
          user_id: user.id,
          form_key: formKey,
          draft_data: dataToSave as any,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,form_key',
        });

      if (error) {
        console.error(`[useFormPersistence] Database save error:`, error);
      }
    } catch (error) {
      console.error(`[useFormPersistence] Failed to save to database:`, error);
    }
  }, [syncToDatabase, user?.id, formKey]);

  // Combined save function
  const saveDraft = useCallback(() => {
    const currentData = dataRef.current;
    
    // Check if we should save
    if (shouldSave && !shouldSave(currentData)) {
      return;
    }

    setIsSaving(true);
    
    saveToLocalStorage(currentData);
    
    if (syncToDatabase) {
      saveToDatabase(currentData);
    }
    
    setTimeout(() => setIsSaving(false), 300);
  }, [shouldSave, saveToLocalStorage, saveToDatabase, syncToDatabase]);

  // Auto-save on interval
  useEffect(() => {
    const interval = setInterval(() => {
      if (shouldSave && !shouldSave(dataRef.current)) {
        return;
      }
      saveDraft();
    }, autoSaveInterval);

    return () => clearInterval(interval);
  }, [autoSaveInterval, saveDraft, shouldSave]);

  // Save when data changes (debounced via the interval)
  useEffect(() => {
    // Also save on beforeunload to catch page closes
    const handleBeforeUnload = () => {
      if (!shouldSave || shouldSave(dataRef.current)) {
        saveToLocalStorage(dataRef.current);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveToLocalStorage, shouldSave]);

  // Clear draft
  const clearDraft = useCallback(() => {
    const storageKey = getStorageKey();
    
    try {
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.error(`[useFormPersistence] Failed to clear localStorage:`, error);
    }

    if (syncToDatabase && user?.id) {
      supabase
        .from('form_drafts')
        .delete()
        .eq('user_id', user.id)
        .eq('form_key', formKey)
        .then(() => {});
    }

    setLastSaved(null);
    setWasRestored(false);
  }, [getStorageKey, syncToDatabase, user?.id, formKey]);

  // Update a single field
  const updateField = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    setData((prev) => ({ ...prev, [field]: value }));
  }, []);

  // Reset form
  const resetForm = useCallback(() => {
    setData(initialData);
    clearDraft();
  }, [initialData, clearDraft]);

  // Manual save with toast
  const handleSaveDraft = useCallback(() => {
    saveDraft();
    if (showToasts) {
      toast({
        title: "Draft saved",
        description: "Your progress has been saved.",
        duration: 2000,
      });
    }
  }, [saveDraft, showToasts, toast]);

  return {
    data,
    setData,
    updateField,
    saveDraft: handleSaveDraft,
    clearDraft,
    lastSaved,
    isSaving,
    wasRestored,
    resetForm,
  };
}

/**
 * Deep merge utility that handles arrays and nested objects
 */
function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
  const result = { ...target };

  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const sourceValue = source[key];
      const targetValue = result[key];

      if (Array.isArray(sourceValue)) {
        // For arrays, use source if it has items, otherwise keep target
        result[key] = sourceValue.length > 0 ? sourceValue : targetValue;
      } else if (
        sourceValue !== null &&
        typeof sourceValue === 'object' &&
        !Array.isArray(sourceValue) &&
        targetValue !== null &&
        typeof targetValue === 'object' &&
        !Array.isArray(targetValue)
      ) {
        // Recursively merge nested objects
        result[key] = deepMerge(targetValue, sourceValue);
      } else if (sourceValue !== undefined) {
        // Use source value if defined
        result[key] = sourceValue;
      }
    }
  }

  return result;
}

export default useFormPersistence;
