import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('[Supabase] Missing environment variables');
}

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    storageKey: 'merry360-auth',
  },
  global: {
    headers: {
      'X-Client-Info': 'merry360-web',
    },
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
    timeout: 10000,
    heartbeatIntervalMs: 30000,
    log: () => {}, // Suppress all realtime logs including WebSocket errors
  },
});

// Suppress WebSocket errors globally
if (typeof window !== 'undefined') {
  const originalConsoleError = console.error;
  console.error = (...args: any[]) => {
    // Filter out WebSocket and Realtime errors
    const message = args[0]?.toString() || '';
    if (
      message.includes('WebSocket') ||
      message.includes('realtime') ||
      message.includes('websocket') ||
      message.includes('%0A') ||
      message.includes('Connection aborted')
    ) {
      return; // Suppress these errors
    }
    originalConsoleError.apply(console, args);
  };
}
