export function createNotificationsApi(client) {
  return {
    async list(userId) {
      const { data, error } = await client.supabase
        .from('notifications')
        .select('id,title,message,created_at,read_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  };
}
