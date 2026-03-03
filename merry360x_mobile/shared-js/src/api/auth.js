export function createAuthApi(client) {
  return {
    async signInWithPassword(email, password) {
      const { data, error } = await client.supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return data;
    },

    async signUp(email, password) {
      const { data, error } = await client.supabase.auth.signUp({ email, password });
      if (error) throw error;
      return data;
    },

    async signOut() {
      const { error } = await client.supabase.auth.signOut();
      if (error) throw error;
    },

    async getSession() {
      const { data, error } = await client.supabase.auth.getSession();
      if (error) throw error;
      return data.session;
    },
  };
}
