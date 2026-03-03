export function createWishlistApi(client) {
  return {
    async list(userId) {
      const { data, error } = await client.supabase
        .from('wishlists')
        .select('id,user_id,property_id,item_id,item_type,title,created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    async add(payload) {
      const { data, error } = await client.supabase
        .from('wishlists')
        .insert(payload)
        .select('*')
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    async remove(id) {
      const { error } = await client.supabase.from('wishlists').delete().eq('id', id);
      if (error) throw error;
    },
  };
}
