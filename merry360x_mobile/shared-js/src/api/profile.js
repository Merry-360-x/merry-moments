export function createProfileApi(client) {
  return {
    async getCurrentProfile(userId) {
      const { data, error } = await client.supabase
        .from('profiles')
        .select('id,email,full_name,nickname,avatar_url')
        .eq('id', userId)
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },

    async getProfileDetails(userId) {
      const { data, error } = await client.supabase
        .from('profiles')
        .select('id,email,full_name,nickname,phone,bio,avatar_url,loyalty_points,profile_completed,is_over_18')
        .eq('id', userId)
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;
      return {
        id: data.id,
        email: data.email,
        fullName: data.full_name ?? '',
        nickname: data.nickname ?? '',
        phone: data.phone ?? '',
        bio: data.bio ?? '',
        avatarUrl: data.avatar_url ?? null,
        loyaltyPoints: data.loyalty_points ?? 0,
        profileCompleted: data.profile_completed ?? false,
        isOver18: data.is_over_18 ?? false,
      };
    },

    async completeProfile(userId, { fullName, nickname, phone, bio, isOver18 }) {
      const { error } = await client.supabase
        .from('profiles')
        .update({
          full_name: fullName,
          nickname,
          phone,
          bio,
          is_over_18: isOver18,
          profile_completed: true,
        })
        .eq('id', userId);

      if (error) throw error;
    },

    async becomeHost(userId, payload = {}) {
      const applicationPayload = {
        user_id: userId,
        status: payload.status ?? 'approved',
        applicant_type: payload.applicant_type ?? 'individual',
        service_types: payload.service_types ?? [],
        full_name: payload.full_name ?? '',
        phone: payload.phone ?? '',
        about: payload.about ?? null,
        national_id_number: payload.national_id_number ?? null,
        national_id_photo_url: payload.national_id_photo_url ?? null,
        selfie_photo_url: payload.selfie_photo_url ?? null,
        profile_complete: payload.profile_complete ?? false,
      };

      const { error: appError } = await client.supabase
        .from('host_applications')
        .insert(applicationPayload);
      if (appError) throw appError;

      const { error: roleError } = await client.supabase.rpc('become_host');
      if (roleError) {
        return { applicationCreated: true, roleAssigned: false, roleError };
      }

      return { applicationCreated: true, roleAssigned: true };
    },
  };
}
