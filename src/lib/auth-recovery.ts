/**
 * Auth recovery utilities to handle session persistence across domains and refreshes
 */

import { supabase } from "@/integrations/supabase/client";

/**
 * Recover session from URL hash (OAuth callback)
 * This ensures sessions work across all domains
 */
export async function recoverSessionFromUrl(): Promise<boolean> {
  try {
    // Check if we have a hash fragment with auth data
    const hashFragment = window.location.hash;
    if (!hashFragment) return false;

    // Supabase automatically handles this, but we explicitly check
    const params = new URLSearchParams(hashFragment.substring(1));
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    
    if (accessToken || refreshToken) {
      console.log('[AuthRecovery] Found auth tokens in URL, waiting for Supabase to process...');
      // Wait a bit for Supabase to process the hash
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Verify session was established
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        console.log('[AuthRecovery] Session recovered from URL');
        // Clean up URL
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.warn('[AuthRecovery] Error recovering session from URL:', error);
    return false;
  }
}

/**
 * Verify current session is valid and refresh if needed
 */
export async function verifyAndRefreshSession(): Promise<boolean> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.warn('[AuthRecovery] Session error:', error);
      return false;
    }
    
    if (!session) {
      return false;
    }
    
    // Check if session is expired or about to expire (within 5 minutes)
    const expiresAt = session.expires_at;
    if (!expiresAt) return true;
    
    const expiryTime = expiresAt * 1000; // Convert to milliseconds
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    
    if (expiryTime - now < fiveMinutes) {
      console.log('[AuthRecovery] Session expiring soon, refreshing...');
      const { data, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError) {
        console.warn('[AuthRecovery] Session refresh failed:', refreshError);
        return false;
      }
      
      if (data.session) {
        console.log('[AuthRecovery] Session refreshed successfully');
        return true;
      }
    }
    
    return true;
  } catch (error) {
    console.warn('[AuthRecovery] Error verifying session:', error);
    return false;
  }
}

/**
 * Clear invalid session data
 */
export async function clearInvalidSession(): Promise<void> {
  try {
    // Sign out to clear any corrupted session data
    await supabase.auth.signOut();
    
    // Clear any stale auth data from localStorage
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('merry360-auth') || key.startsWith('supabase.auth')) {
        localStorage.removeItem(key);
      }
    });
    
    console.log('[AuthRecovery] Invalid session cleared');
  } catch (error) {
    console.warn('[AuthRecovery] Error clearing session:', error);
  }
}
