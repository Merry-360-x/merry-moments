// Mock Supabase client - all database features disabled
export const supabase = {
  from: () => ({
    select: () => ({ data: [], error: null }),
    insert: () => ({ data: null, error: { message: 'Database disabled' } }),
    update: () => ({ data: null, error: { message: 'Database disabled' } }),
    delete: () => ({ data: null, error: { message: 'Database disabled' } }),
    upsert: () => ({ data: null, error: { message: 'Database disabled' } }),
  }),
  auth: {
    getSession: async () => ({ data: { session: null }, error: null }),
    getUser: async () => ({ data: { user: null }, error: null }),
    signUp: async () => ({ data: null, error: { message: 'Auth disabled' } }),
    signInWithPassword: async () => ({ data: null, error: { message: 'Auth disabled' } }),
    signInWithOAuth: async () => ({ data: null, error: { message: 'Auth disabled' } }),
    signOut: async () => ({ error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
  },
  storage: {
    from: () => ({
      upload: async () => ({ data: null, error: { message: 'Storage disabled' } }),
      remove: async () => ({ data: null, error: { message: 'Storage disabled' } }),
      getPublicUrl: () => ({ data: { publicUrl: '' } }),
    }),
  },
  rpc: async () => ({ data: null, error: { message: 'RPC disabled' } }),
};
