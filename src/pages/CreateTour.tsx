import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, X, AlertCircle, Loader2, Save } from "lucide-react";
import { CloudinaryUploadDialog } from "@/components/CloudinaryUploadDialog";
import { extractPDFMetadata, validatePDF } from "@/lib/pdf-extractor";
import { uploadFile } from "@/lib/uploads";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { DISPLAY_CURRENCIES } from "@/lib/currencies";
import { getTourPricingModels } from "@/lib/tour-pricing";

const categories = ["Nature", "Adventure", "Cultural", "Wildlife", "Historical", "City Tours", "Eco-Tourism", "Photography"];
const tourPricingModels = [
  { value: "per_person", label: "Per person" },
  { value: "per_group", label: "Per group" },
  { value: "per_hour", label: "Per hour" },
  { value: "per_minute", label: "Per minute" },
] as const;
type TourPricingModel = (typeof tourPricingModels)[number]["value"];
type TimePricingTier = { duration_value: number; duration_unit: "minute" | "hour"; price: number };
type GroupPricingTier = { min_group_size: number; max_group_size: number; price: number };

function normalizeTimePricingTiers(raw: unknown, fallbackPricingModel: TourPricingModel): TimePricingTier[] {
  if (!Array.isArray(raw)) return [];
  const defaultUnit: "minute" | "hour" = fallbackPricingModel === "per_hour" ? "hour" : "minute";
  return raw
    .map((tier: any) => ({
      duration_value: Number(tier?.duration_value || 0),
      duration_unit: tier?.duration_unit === "hour" ? "hour" : tier?.duration_unit === "minute" ? "minute" : defaultUnit,
      price: Number(tier?.price || 0),
    }))
    .filter((tier) => tier.duration_value > 0 && tier.price > 0);
}

function normalizeGroupPricingTiers(raw: unknown): GroupPricingTier[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((tier: any) => ({
      min_group_size: Math.max(1, Math.floor(Number(tier?.min_group_size || 1))),
      max_group_size: Math.max(1, Math.floor(Number(tier?.max_group_size || 1))),
      price: Number(tier?.price || 0),
    }))
    .filter((tier) => tier.min_group_size >= 1 && tier.max_group_size >= tier.min_group_size && tier.price > 0);
}

interface FormErrors {
  title?: string;
  description?: string;
  location?: string;
  price_per_person?: string;
  duration_days?: string;
  max_participants?: string;
  images?: string;
  categories?: string;
}

export default function CreateTour() {
  const { user, isHost, isLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [hostProfileComplete, setHostProfileComplete] = useState(false);
  const editId = searchParams.get("editId");
  const isEditMode = Boolean(editId);
  const [isEditLoading, setIsEditLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    location: "",
    categories: [] as string[],
    duration_days: 1,
    max_participants: 10,
    price_per_person: 0,
    pricing_model: "per_person" as TourPricingModel,
    pricing_models: ["per_person"] as TourPricingModel[],
    pricing_duration_value: 1,
    price_per_group_size: 2,
    time_pricing_tiers: [] as TimePricingTier[],
    group_pricing_tiers: [] as GroupPricingTier[],
    currency: "RWF",
    has_differential_pricing: false,
    price_for_citizens: "",
    price_for_east_african: "",
    price_for_foreigners: "",
  });

  const [images, setImages] = useState<string[]>([]);
  const [cloudinaryDialogOpen, setCloudinaryDialogOpen] = useState(false);
  const [licenseUrl, setLicenseUrl] = useState<string>("");
  const [licenseDialogOpen, setLicenseDialogOpen] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string>("");
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [pdfMetadata, setPdfMetadata] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);

  // Use a stable storage key
  const getStorageKey = () => user?.id ? `tour-draft-${user.id}` : 'tour-draft-anonymous';

  useEffect(() => {
    if (!isEditMode || !editId || !user?.id) return;

    let isMounted = true;
    const fetchTourForEdit = async () => {
      setIsEditLoading(true);
      const { data, error } = await supabase
        .from("tours")
        .select("*")
        .eq("id", editId)
        .eq("created_by", user.id)
        .maybeSingle();

      if (!isMounted) return;

      if (error || !data) {
        toast({
          title: "Tour not found",
          description: "We couldn't load this tour for editing.",
          variant: "destructive",
        });
        navigate("/host-dashboard");
        setIsEditLoading(false);
        return;
      }

      const mergedCategories = [data.category, ...((data.categories as string[] | null) || [])].filter(Boolean) as string[];
      const pricingModels = getTourPricingModels((data as any)?.pricing_tiers);
      const pricingModel = pricingModels[0] || "per_person";
      const rawPricingTiers = (data as any)?.pricing_tiers;
      const groupSize = (() => {
        const raw = rawPricingTiers;
        if (!raw || Array.isArray(raw) || typeof raw !== "object") return 2;
        const next = Number((raw as { price_per_group_size?: number }).price_per_group_size || 2);
        return Number.isFinite(next) && next >= 1 ? Math.floor(next) : 2;
      })();
      const pricingDurationValue = (() => {
        const raw = rawPricingTiers;
        if (!raw || Array.isArray(raw) || typeof raw !== "object") return 1;
        const next = Number((raw as { pricing_duration_value?: number }).pricing_duration_value || 1);
        return Number.isFinite(next) && next > 0 ? next : 1;
      })();
      const timePricingTiers = (() => {
        if (!rawPricingTiers || Array.isArray(rawPricingTiers) || typeof rawPricingTiers !== "object") return [] as TimePricingTier[];
        return normalizeTimePricingTiers((rawPricingTiers as any).time_pricing_tiers, pricingModel);
      })();
      const groupPricingTiers = (() => {
        if (!rawPricingTiers || Array.isArray(rawPricingTiers) || typeof rawPricingTiers !== "object") return [] as GroupPricingTier[];
        return normalizeGroupPricingTiers((rawPricingTiers as any).group_pricing_tiers);
      })();
      setFormData({
        title: data.title || "",
        description: data.description || "",
        location: data.location || "",
        categories: mergedCategories,
        duration_days: Number(data.duration_days || 1),
        max_participants: Number(data.max_group_size || 10),
        price_per_person: Number(data.price_per_person || 0),
        pricing_model: pricingModel,
        pricing_models: pricingModels,
        pricing_duration_value: pricingDurationValue,
        price_per_group_size: groupSize,
        time_pricing_tiers: timePricingTiers,
        group_pricing_tiers: groupPricingTiers,
        currency: data.currency || "RWF",
        has_differential_pricing: Boolean((data as any).has_differential_pricing),
        price_for_citizens: (data as any).price_for_citizens != null ? String((data as any).price_for_citizens) : "",
        price_for_east_african: (data as any).price_for_east_african != null ? String((data as any).price_for_east_african) : "",
        price_for_foreigners: (data as any).price_for_foreigners != null ? String((data as any).price_for_foreigners) : "",
      });
      setImages((data.images as string[] | null) || []);
      setPdfUrl((data as any).itinerary_pdf_url || "");
      setLicenseUrl((data as any).tour_guide_license_url || (data as any).tour_license_url || "");
      setDraftLoaded(true);
      setIsEditLoading(false);
    };

    void fetchTourForEdit();

    return () => {
      isMounted = false;
    };
  }, [editId, isEditMode, navigate, toast, user?.id]);

  // Fetch host profile completion status
  useEffect(() => {
    if (!user) return;
    const checkProfile = async () => {
      const { data } = await supabase
        .from("host_applications")
        .select("profile_complete")
        .eq("user_id", user.id)
        .eq("status", "approved")
        .single();
      setHostProfileComplete(data?.profile_complete ?? false);
    };
    checkProfile();
  }, [user]);

  // Load draft on mount (only once)
  useEffect(() => {
    if (isEditMode) {
      setDraftLoaded(true);
      return;
    }
    if (draftLoaded) return;
    
    const draftKey = getStorageKey();
    const savedDraft = localStorage.getItem(draftKey);
    
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        if (draft.formData) {
          const loadedPricingModels = getTourPricingModels({
            pricing_model: draft.formData.pricing_model,
            pricing_models: draft.formData.pricing_models,
          });
          setFormData((prev) => ({
            ...prev,
            ...draft.formData,
            pricing_models: loadedPricingModels,
            pricing_model: loadedPricingModels[0] || "per_person",
            pricing_duration_value: Number(draft.formData.pricing_duration_value || 1),
            time_pricing_tiers: normalizeTimePricingTiers(draft.formData.time_pricing_tiers, loadedPricingModels[0] || "per_person"),
            group_pricing_tiers: normalizeGroupPricingTiers(draft.formData.group_pricing_tiers),
          }));
        }
        if (draft.images) setImages(draft.images);
        setLastSaved(new Date(draft.timestamp));
        toast({ title: "Draft restored", description: "Your previous work has been restored" });
        console.log('[CreateTour] Draft restored from', draftKey);
      } catch (err) {
        console.error('Failed to load draft:', err);
      }
    }
    setDraftLoaded(true);
  }, [user?.id, draftLoaded, isEditMode]);

  // Auto-save on form changes (only after load)
  useEffect(() => {
    if (isEditMode) return;
    if (!draftLoaded) return;
    
    const draftKey = getStorageKey();
    
    // Only save if there's meaningful content
    if (!formData.title && !formData.description) return;
    
    const timer = setTimeout(() => {
      const draft = {
        formData,
        images,
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem(draftKey, JSON.stringify(draft));
      setLastSaved(new Date());
      console.log('[CreateTour] Auto-saved draft to', draftKey);
    }, 1000); // Debounce 1 second

    return () => clearTimeout(timer);
  }, [formData, images, user?.id, draftLoaded, isEditMode]);

  // Save on page unload
  useEffect(() => {
    if (isEditMode) return;
    const handleBeforeUnload = () => {
      if (!formData.title && !formData.description) return;
      
      const draftKey = getStorageKey();
      const draft = {
        formData,
        images,
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem(draftKey, JSON.stringify(draft));
      console.log('[CreateTour] Saved on page unload');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [formData, images, user?.id, isEditMode]);

  const saveDraft = () => {
    const draftKey = getStorageKey();
    const draft = {
      formData,
      images,
      timestamp: new Date().toISOString(),
    };
    
    localStorage.setItem(draftKey, JSON.stringify(draft));
    setLastSaved(new Date());
    console.log('[CreateTour] Manually saved draft');
  };

  const handleSaveDraft = () => {
    setIsSaving(true);
    saveDraft();
    toast({ title: "Draft saved", description: "Your progress has been saved locally" });
    setTimeout(() => setIsSaving(false), 500);
  };

  const clearDraft = () => {
    const draftKey = getStorageKey();
    localStorage.removeItem(draftKey);
  };

  useEffect(() => {
    if (pdfFile) {
      extractPDFMetadata(pdfFile).then((metadata) => {
        setPdfMetadata(metadata);
        if (metadata.title && !formData.title) {
          setFormData(prev => ({ ...prev, title: metadata.title! }));
        }
        if (metadata.duration && formData.duration_days === 1) {
          const days = parseInt(metadata.duration) || 1;
          setFormData(prev => ({ ...prev, duration_days: days }));
        }
      });
    }
  }, [pdfFile, formData.title, formData.duration_days]);

  useEffect(() => {
    const newErrors: FormErrors = {};
    if (touched.has('title') && !formData.title.trim()) newErrors.title = "Required";
    if (touched.has('description') && formData.description.trim().length < 20) newErrors.description = "Minimum 20 characters";
    if (touched.has('location') && !formData.location.trim()) newErrors.location = "Required";
    if (touched.has('price_per_person') && formData.price_per_person <= 0) newErrors.price_per_person = "Must be greater than 0";
    if (touched.has('duration_days') && formData.duration_days < 1) newErrors.duration_days = "Must be at least 1";
    if (touched.has('max_participants') && formData.max_participants < 1) newErrors.max_participants = "Must be at least 1";
    if (touched.has('categories') && formData.categories.length === 0) newErrors.categories = "Select at least one";
    if (touched.has('images') && images.length === 0) newErrors.images = "Upload at least one image";
    setErrors(newErrors);
  }, [formData, images, touched]);

  const handleBlur = (field: string) => setTouched(prev => new Set([...prev, field]));

  const isFormValid = () => {
    const hasValidTimeTier = normalizeTimePricingTiers(formData.time_pricing_tiers, formData.pricing_model).length > 0;
    const hasValidGroupTier = normalizeGroupPricingTiers(formData.group_pricing_tiers).length > 0;
    const needsTimeTier = formData.pricing_models.includes("per_hour") || formData.pricing_models.includes("per_minute");
    const needsGroupTier = formData.pricing_models.includes("per_group");

    return formData.title.trim() && formData.description.trim().length >= 20 &&
      formData.location.trim() && (formData.price_per_person > 0 || hasValidTimeTier || hasValidGroupTier) &&
      formData.duration_days >= 1 && formData.max_participants >= 1 &&
      formData.categories.length > 0 && images.length > 0 && formData.pricing_models.length > 0 &&
      (!needsTimeTier || hasValidTimeTier) &&
      (!needsGroupTier || hasValidGroupTier);
  };

  const hasDraftContent = () => {
    return Boolean(
      formData.title.trim() ||
      formData.description.trim() ||
      formData.location.trim() ||
      images.length > 0 ||
      licenseUrl.trim()
    );
  };

  const handlePdfChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validation = validatePDF(file);
      if (!validation.valid) {
        toast({ title: "Invalid PDF", description: validation.error, variant: "destructive" });
        return;
      }
      setPdfFile(file);
      
      // Upload immediately
      setUploadingPdf(true);
      try {
        const { url } = await uploadFile(file, { folder: "tour-itineraries" });
        setPdfUrl(url);
        toast({ title: "PDF uploaded successfully" });
      } catch (error) {
        toast({ title: "PDF upload failed", description: String(error), variant: "destructive" });
        setPdfFile(null);
      } finally {
        setUploadingPdf(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!isFormValid()) {
      if (hasDraftContent()) {
        saveDraft();
        toast({ title: "Saved as draft", description: "Your unfinished tour has been saved as a draft." });
      }
      return;
    }
    setUploading(true);

    try {
      // Use already uploaded PDF URL
      const tourData: Database['public']['Tables']['tours']['Insert'] = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        location: formData.location.trim(),
        category: formData.categories[0] || null,
        categories: formData.categories.length > 1 ? formData.categories.slice(1) : null,
        duration_days: formData.duration_days || null,
        max_group_size: formData.max_participants || null,
        price_per_person: formData.price_per_person,
        currency: formData.currency || null,
        images: images.length > 0 ? images : null,
        itinerary_pdf_url: pdfUrl || null,
        created_by: user.id || null,
        is_published: true, // Published by default
        has_differential_pricing: formData.has_differential_pricing,
        price_for_citizens: formData.has_differential_pricing && formData.price_for_citizens ? parseFloat(formData.price_for_citizens) : null,
        price_for_east_african: formData.has_differential_pricing && formData.price_for_east_african ? parseFloat(formData.price_for_east_african) : null,
        price_for_foreigners: formData.has_differential_pricing && formData.price_for_foreigners ? parseFloat(formData.price_for_foreigners) : null,
      };

      (tourData as any).pricing_tiers = {
        pricing_model: formData.pricing_model,
        pricing_models: formData.pricing_models,
        ...(formData.pricing_models.includes("per_hour") || formData.pricing_models.includes("per_minute")
          ? { pricing_duration_value: Math.max(0.25, Number(formData.pricing_duration_value || 1)) }
          : {}),
        ...(formData.pricing_models.includes("per_group")
          ? { price_per_group_size: Math.max(1, Number(formData.price_per_group_size || 1)) }
          : {}),
        ...(formData.pricing_models.includes("per_hour") || formData.pricing_models.includes("per_minute")
          ? { time_pricing_tiers: normalizeTimePricingTiers(formData.time_pricing_tiers, formData.pricing_model) }
          : {}),
        ...(formData.pricing_models.includes("per_group")
          ? { group_pricing_tiers: normalizeGroupPricingTiers(formData.group_pricing_tiers) }
          : {}),
      };

      (tourData as any).tour_guide_license_url = licenseUrl || null;
      (tourData as any).tour_license_url = licenseUrl || null;

      if (isEditMode && editId) {
        const { error } = await supabase
          .from("tours")
          .update(tourData as any)
          .eq("id", editId)
          .eq("created_by", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("tours").insert(tourData as any).select().single();
        if (error) throw error;
      }

      await queryClient.invalidateQueries({ queryKey: ["tours"] });
      await queryClient.invalidateQueries({ queryKey: ["featured-tours"] });

      toast({
        title: isEditMode ? "Tour Updated!" : "Tour Published!",
        description: isEditMode
          ? "Your tour changes have been saved."
          : "Your tour is now live and visible to guests.",
      });
      clearDraft();
      navigate("/host-dashboard");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || (isEditMode ? "Failed to update tour" : "Failed to create tour"),
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  if (!isLoading && isEditMode && isEditLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading tour for editing...</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (!isLoading && !user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-xl font-medium mb-2">Sign In Required</h1>
          <p className="text-sm text-muted-foreground mb-6">Please sign in to create tours</p>
          <Button onClick={() => navigate("/auth")}>Sign In</Button>
        </div>
        <Footer />
      </div>
    );
  }

  if (!isLoading && !isHost) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-xl font-medium mb-2">Host Access Required</h1>
          <p className="text-sm text-muted-foreground mb-6">You must be an approved host</p>
          <Button onClick={() => navigate("/host-application")}>Become a Host</Button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <div className="mb-12">
          <h1 className="text-2xl font-medium mb-2">{isEditMode ? "Edit Tour" : "Create Tour"}</h1>
          <p className="text-sm text-muted-foreground">
            {isEditMode ? "Update your tour details" : "Fill in the details to create your tour"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-10">
          {/* Basic */}
          <div className="space-y-5">
            <h2 className="text-base font-medium pb-2 border-b">Basic Information</h2>
            
            <div>
              <Label className="text-sm font-normal mb-1.5 block">Tour Name *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                onBlur={() => handleBlur('title')}
                placeholder="Gorilla Trekking Adventure"
                className={cn("h-10", errors.title && "border-destructive")}
              />
              {errors.title && <p className="text-xs text-destructive mt-1">{errors.title}</p>}
            </div>

            <div>
              <Label className="text-sm font-normal mb-1.5 block">
                Description * 
                <span className={`text-xs ml-1 ${formData.description.length > 0 && formData.description.length < 20 ? 'text-red-500' : 'text-muted-foreground'}`}>
                  ({formData.description.length}/20 chars min)
                </span>
              </Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                onBlur={() => handleBlur('description')}
                placeholder="Describe your tour experience..."
                rows={4}
                className={cn(
                  (errors.description || (formData.description.length > 0 && formData.description.length < 20)) && "border-destructive"
                )}
              />
              {errors.description && <p className="text-xs text-destructive mt-1">{errors.description}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-normal mb-1.5 block">Location *</Label>
                <Input
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  onBlur={() => handleBlur('location')}
                  placeholder="Kigali, Rwanda"
                  className={cn("h-10", errors.location && "border-destructive")}
                />
                {errors.location && <p className="text-xs text-destructive mt-1">{errors.location}</p>}
              </div>
            </div>
          </div>

          {/* Tour Details */}
          <div className="space-y-5">
            <h2 className="text-base font-medium pb-2 border-b">Tour Details</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-normal mb-1.5 block">Duration (days) *</Label>
                <Input
                  type="number"
                  value={formData.duration_days}
                  onChange={(e) => setFormData({ ...formData, duration_days: parseInt(e.target.value) || 1 })}
                  min="1"
                  className={cn("h-10", errors.duration_days && "border-destructive")}
                />
                {errors.duration_days && <p className="text-xs text-destructive mt-1">{errors.duration_days}</p>}
              </div>

              <div>
                <Label className="text-sm font-normal mb-1.5 block">Max Guests *</Label>
                <Input
                  type="number"
                  value={formData.max_participants}
                  onChange={(e) => setFormData({ ...formData, max_participants: parseInt(e.target.value) || 10 })}
                  min="1"
                  className={cn("h-10", errors.max_participants && "border-destructive")}
                />
                {errors.max_participants && <p className="text-xs text-destructive mt-1">{errors.max_participants}</p>}
              </div>
            </div>

            <div>
              <Label className="text-sm font-normal mb-1.5 block">Categories * <span className="text-xs text-muted-foreground">(select at least one)</span></Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                {categories.map((cat) => (
                  <label key={cat} className="flex items-center space-x-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={formData.categories.includes(cat)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setFormData({ ...formData, categories: [...formData.categories, cat] });
                        } else {
                          setFormData({ ...formData, categories: formData.categories.filter(c => c !== cat) });
                        }
                        setTouched(prev => new Set([...prev, 'categories']));
                      }}
                    />
                    <span>{cat}</span>
                  </label>
                ))}
              </div>
              {errors.categories && <p className="text-xs text-destructive mt-1">{errors.categories}</p>}
            </div>
          </div>

          {/* Pricing */}
          <div className="space-y-5">
            <h2 className="text-base font-medium pb-2 border-b">Pricing</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-normal mb-1.5 block">Pricing Models *</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {tourPricingModels.map((item) => (
                    <label key={item.value} className="flex items-center space-x-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={formData.pricing_models.includes(item.value)}
                        onCheckedChange={(checked) => {
                          const current = new Set(formData.pricing_models);
                          if (checked) {
                            current.add(item.value);
                          } else {
                            if (current.size <= 1) return;
                            current.delete(item.value);
                          }

                          const ordered = tourPricingModels
                            .map((model) => model.value)
                            .filter((model) => current.has(model)) as TourPricingModel[];

                          setFormData({
                            ...formData,
                            pricing_models: ordered,
                            pricing_model: ordered[0] || "per_person",
                          });
                        }}
                      />
                      <span>{item.label}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Primary pricing is set automatically from the first selected option.
                </p>
              </div>

              <div>
                <Label className="text-sm font-normal mb-1.5 block">
                  {(formData.pricing_model === "per_hour" || formData.pricing_model === "per_minute")
                    ? `Duration (${formData.pricing_model === "per_hour" ? "hours" : "minutes"}) *`
                    : "Price Input"}
                </Label>
                {(formData.pricing_model === "per_hour" || formData.pricing_model === "per_minute") ? (
                  <Input
                    type="number"
                    value={formData.pricing_duration_value}
                    onChange={(e) => setFormData({ ...formData, pricing_duration_value: Math.max(0.25, parseFloat(e.target.value) || 1) })}
                    min={formData.pricing_model === "per_hour" ? "0.25" : "1"}
                    step={formData.pricing_model === "per_hour" ? "0.25" : "1"}
                    className="h-10"
                  />
                ) : (
                  <p className="text-xs text-muted-foreground">Select per-hour or per-minute to define duration.</p>
                )}
              </div>

              {(formData.pricing_models.includes("per_hour") || formData.pricing_models.includes("per_minute")) ? (
                <div className="col-span-2 space-y-2 rounded-lg border p-3 bg-muted/20">
                  <Label className="text-sm font-medium">Time Pricing Tiers</Label>
                  <p className="text-xs text-muted-foreground">Add multiple durations and prices (example: 3 min = $40, 15 min = $150).</p>
                  <div className="space-y-2">
                    {formData.time_pricing_tiers.map((tier, index) => (
                      <div key={`time-tier-${index}`} className="grid grid-cols-[1fr_140px_1fr_auto] gap-2 items-end">
                        <div>
                          <Label className="text-xs">Duration</Label>
                          <Input
                            type="number"
                            min="1"
                            step="0.25"
                            value={tier.duration_value}
                            onChange={(e) => {
                              const next = [...formData.time_pricing_tiers];
                              next[index] = {
                                ...next[index],
                                duration_value: Math.max(0.25, Number(e.target.value) || 0.25),
                              };
                              setFormData({ ...formData, time_pricing_tiers: next });
                            }}
                            className="h-9"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Unit</Label>
                          <Select
                            value={tier.duration_unit}
                            onValueChange={(unit: "minute" | "hour") => {
                              const next = [...formData.time_pricing_tiers];
                              next[index] = { ...next[index], duration_unit: unit };
                              setFormData({ ...formData, time_pricing_tiers: next });
                            }}
                          >
                            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {formData.pricing_models.includes("per_minute") && <SelectItem value="minute">Minute</SelectItem>}
                              {formData.pricing_models.includes("per_hour") && <SelectItem value="hour">Hour</SelectItem>}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Price ({formData.currency})</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={tier.price}
                            onChange={(e) => {
                              const next = [...formData.time_pricing_tiers];
                              next[index] = {
                                ...next[index],
                                price: Math.max(0, Number(e.target.value) || 0),
                              };
                              setFormData({ ...formData, time_pricing_tiers: next });
                            }}
                            className="h-9"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-9"
                          onClick={() => setFormData({ ...formData, time_pricing_tiers: formData.time_pricing_tiers.filter((_, i) => i !== index) })}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setFormData({
                      ...formData,
                      time_pricing_tiers: [
                        ...formData.time_pricing_tiers,
                        {
                          duration_value: formData.pricing_model === "per_hour" ? 1 : 3,
                          duration_unit: formData.pricing_model === "per_hour" ? "hour" : "minute",
                          price: 0,
                        },
                      ],
                    })}
                  >
                    + Add Time Tier
                  </Button>
                </div>
              ) : null}

              <div>
                <Label className="text-sm font-normal mb-1.5 block">
                  {formData.pricing_model === "per_group"
                    ? "Price per Group *"
                    : formData.pricing_model === "per_hour"
                      ? "Price per Hour *"
                      : formData.pricing_model === "per_minute"
                        ? "Price per Minute *"
                        : "Price per Person *"}
                </Label>
                <Input
                  type="number"
                  value={formData.price_per_person}
                  onChange={(e) => setFormData({ ...formData, price_per_person: parseFloat(e.target.value) || 0 })}
                  onBlur={() => handleBlur('price_per_person')}
                  min="0"
                  step="0.01"
                  className={cn("h-10", errors.price_per_person && "border-destructive")}
                />
                {errors.price_per_person && <p className="text-xs text-destructive mt-1">{errors.price_per_person}</p>}
                {(formData.pricing_model === "per_hour" || formData.pricing_model === "per_minute") && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Total for selected duration: {formData.currency} {(Number(formData.pricing_duration_value || 1) * Number(formData.price_per_person || 0)).toFixed(2)}
                  </p>
                )}
              </div>

              {formData.pricing_models.includes("per_group") ? (
                <div className="col-span-2 space-y-2 rounded-lg border p-3 bg-muted/20">
                  <Label className="text-sm font-medium">Group Range Pricing Tiers</Label>
                  <p className="text-xs text-muted-foreground">Set group ranges and a fixed group price (example: 2–10 = $1000, 11–15 = $1500).</p>
                  <div className="space-y-2">
                    {formData.group_pricing_tiers.map((tier, index) => (
                      <div key={`group-tier-${index}`} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end">
                        <div>
                          <Label className="text-xs">Min People</Label>
                          <Input
                            type="number"
                            min="1"
                            step="1"
                            value={tier.min_group_size}
                            onChange={(e) => {
                              const next = [...formData.group_pricing_tiers];
                              const min = Math.max(1, parseInt(e.target.value, 10) || 1);
                              next[index] = {
                                ...next[index],
                                min_group_size: min,
                                max_group_size: Math.max(min, next[index].max_group_size),
                              };
                              setFormData({ ...formData, group_pricing_tiers: next });
                            }}
                            className="h-9"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Max People</Label>
                          <Input
                            type="number"
                            min={tier.min_group_size}
                            step="1"
                            value={tier.max_group_size}
                            onChange={(e) => {
                              const next = [...formData.group_pricing_tiers];
                              const max = Math.max(next[index].min_group_size, parseInt(e.target.value, 10) || next[index].min_group_size);
                              next[index] = { ...next[index], max_group_size: max };
                              setFormData({ ...formData, group_pricing_tiers: next });
                            }}
                            className="h-9"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Group Price ({formData.currency})</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={tier.price}
                            onChange={(e) => {
                              const next = [...formData.group_pricing_tiers];
                              next[index] = { ...next[index], price: Math.max(0, Number(e.target.value) || 0) };
                              setFormData({ ...formData, group_pricing_tiers: next });
                            }}
                            className="h-9"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-9"
                          onClick={() => setFormData({ ...formData, group_pricing_tiers: formData.group_pricing_tiers.filter((_, i) => i !== index) })}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setFormData({
                      ...formData,
                      group_pricing_tiers: [
                        ...formData.group_pricing_tiers,
                        {
                          min_group_size: formData.group_pricing_tiers.length > 0
                            ? formData.group_pricing_tiers[formData.group_pricing_tiers.length - 1].max_group_size + 1
                            : 2,
                          max_group_size: formData.group_pricing_tiers.length > 0
                            ? formData.group_pricing_tiers[formData.group_pricing_tiers.length - 1].max_group_size + 5
                            : 10,
                          price: 0,
                        },
                      ],
                      price_per_group_size: formData.group_pricing_tiers[0]?.min_group_size || formData.price_per_group_size,
                    })}
                  >
                    + Add Group Range Tier
                  </Button>
                </div>
              ) : null}

              <div>
                <Label className="text-sm font-normal mb-1.5 block">Currency</Label>
                <Select value={formData.currency} onValueChange={(v) => setFormData({ ...formData, currency: v })}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DISPLAY_CURRENCIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        ({c.symbol}) {c.code} - {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Differential Pricing Section */}
            <div className="p-4 rounded-xl border border-border bg-blue-50 dark:bg-blue-950/20">
              <div className="flex items-center gap-3 mb-3">
                <input
                  type="checkbox"
                  id="differential-pricing-tour"
                  checked={formData.has_differential_pricing}
                  onChange={(e) => setFormData({ ...formData, has_differential_pricing: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <Label htmlFor="differential-pricing-tour" className="text-sm font-medium cursor-pointer">
                  Tiered pricing by residency
                </Label>
              </div>
              
              {formData.has_differential_pricing && (
                <div className="ml-7 mt-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm">🇷🇼 National Citizens</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.price_for_citizens}
                      onChange={(e) => setFormData({ ...formData, price_for_citizens: e.target.value })}
                      placeholder="e.g. 50,000"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">🌍 East African</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.price_for_east_african}
                      onChange={(e) => setFormData({ ...formData, price_for_east_african: e.target.value })}
                      placeholder="e.g. 75,000"
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">KE, UG, TZ, BI, SS, DRC</p>
                  </div>
                  <div>
                    <Label className="text-sm">✈️ Foreign Tourists</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.price_for_foreigners}
                      onChange={(e) => setFormData({ ...formData, price_for_foreigners: e.target.value })}
                      placeholder="e.g. 150,000"
                      className="mt-1"
                    />
                  </div>
                  <p className="col-span-full text-xs text-muted-foreground">
                    Guests will select their residency status during booking
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Media */}
          <div className="space-y-5">
            <h2 className="text-base font-medium pb-2 border-b">Images & Files</h2>

            <div>
              <Label className="text-sm font-normal mb-2 block">Tour Images * <span className="text-xs text-muted-foreground">(at least 1)</span></Label>
              <div className="flex flex-wrap gap-2 mb-3">
                {images.map((img, i) => (
                  <div key={i} className="relative group">
                    <img src={img} alt="" className="w-20 h-20 object-cover rounded border" />
                    <button
                      type="button"
                      onClick={() => setImages(images.filter((_, idx) => idx !== i))}
                      className="absolute -top-1.5 -right-1.5 bg-destructive text-white rounded-full p-1 opacity-0 group-hover:opacity-100"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => setCloudinaryDialogOpen(true)}>
                <Upload className="w-3.5 h-3.5 mr-1.5" /> Upload Images
              </Button>
              {errors.images && <p className="text-xs text-destructive mt-1">{errors.images}</p>}
              <CloudinaryUploadDialog
                title="Upload Images"
                folder="tours"
                accept="image/*"
                multiple={true}
                maxFiles={10}
                autoStart={true}
                value={images}
                onChange={(urls) => {
                  setImages(urls);
                  setTouched(prev => new Set([...prev, 'images']));
                }}
                open={cloudinaryDialogOpen}
                onOpenChange={setCloudinaryDialogOpen}
              />
            </div>

            <div>
              <Label className="text-sm font-normal mb-2 block">Itinerary PDF <span className="text-xs text-muted-foreground">(optional)</span></Label>
              <Input type="file" accept=".pdf" onChange={handlePdfChange} className="h-10 cursor-pointer" />
              {pdfFile && <p className="text-xs text-muted-foreground mt-1">{pdfFile.name}</p>}
            </div>

            <div>
              <Label className="text-sm font-normal mb-2 block">Tour Guide License / Certificate (Optional)</Label>
              <p className="text-xs text-muted-foreground mb-2">You can upload your official tour guide license or certification (PDF or image), but publishing is allowed without it.</p>
              {licenseUrl ? (
                <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                  <span className="text-sm flex-1 text-green-700 dark:text-green-300">✓ License uploaded</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setLicenseUrl("")}
                    className="text-destructive hover:text-destructive"
                  >
                    <X className="w-4 h-4" /> Remove
                  </Button>
                </div>
              ) : (
                <Button type="button" variant="outline" size="sm" onClick={() => setLicenseDialogOpen(true)}>
                  <Upload className="w-3.5 h-3.5 mr-1.5" /> Upload License
                </Button>
              )}
              <CloudinaryUploadDialog
                title="Upload Tour Guide License/Certificate"
                folder="tour_licenses"
                accept="image/*,application/pdf"
                multiple={false}
                maxFiles={1}
                autoStart={true}
                value={licenseUrl ? [licenseUrl] : []}
                onChange={(urls) => setLicenseUrl(urls[0] || "")}
                open={licenseDialogOpen}
                onOpenChange={setLicenseDialogOpen}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3 pt-6 border-t">
            {lastSaved && (
              <p className="text-xs text-muted-foreground text-center">
                Last saved: {lastSaved.toLocaleTimeString()}
              </p>
            )}
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (hasDraftContent()) {
                    saveDraft();
                    toast({ title: "Saved as draft", description: "Your unfinished tour has been saved as a draft." });
                  }
                  navigate("/host-dashboard");
                }}
                disabled={uploading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                type="button" 
                variant="secondary" 
                onClick={handleSaveDraft} 
                disabled={uploading || isSaving}
                className="flex-1"
              >
                {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : <><Save className="w-4 h-4 mr-2" />Save as Draft</>}
              </Button>
              <Button type="submit" disabled={uploading || !isFormValid()} className="flex-1">
                {uploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</> : "Create Tour"}
              </Button>
            </div>
          </div>
        </form>
      </div>
      <Footer />
    </div>
  );
}
