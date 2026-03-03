import { createClient } from '@supabase/supabase-js';

export function createBackendClient({ supabaseUrl, supabaseAnonKey }) {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase credentials for mobile shared client');
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });

  return {
    supabase,
  };
}
