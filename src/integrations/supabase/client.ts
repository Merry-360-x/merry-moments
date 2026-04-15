import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://uwgiostcetoxotfnulfm.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3Z2lvc3RjZXRveG90Zm51bGZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNDAxMjgsImV4cCI6MjA4MzkxNjEyOH0.a3jDwpElRGICu7WvV3ahT0MCtmcUj4d9LO0KIHMSTtA';

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
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
