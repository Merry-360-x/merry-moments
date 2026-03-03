export function createHostApi(client) {
  return {
    async listHostProperties(hostId) {
      const { data, error } = await client.supabase
        .from('properties')
        .select('id,host_id,title,name,description,property_type,location,address,price_per_night,price_per_month,price_per_person,price_per_group,price_per_group_size,currency,max_guests,bedrooms,bathrooms,beds,amenities,images,main_image,is_published,available_for_monthly_rental,monthly_only_listing,weekly_discount,monthly_discount,check_in_time,check_out_time,smoking_allowed,events_allowed,pets_allowed,conference_room_capacity,conference_room_min_rooms_required,conference_room_equipment,conference_room_price,conference_room_duration_hours,created_at,updated_at')
        .eq('host_id', hostId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },

    async listHostBookings(hostId) {
      const { data, error } = await client.supabase
        .from('bookings')
        .select('id,order_id,guest_id,guest_name,guest_email,guest_phone,host_id,property_id,tour_id,transport_id,booking_type,status,confirmation_status,rejection_reason,rejected_at,confirmed_at,confirmed_by,payment_status,payment_method,special_requests,total_price,currency,check_in,check_out,guests,created_at,updated_at')
        .eq('host_id', hostId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },

    async createProperty(hostId, payload) {
      const normalizedPayload = {
        host_id: hostId,
        name: payload.name ?? payload.title ?? 'Untitled listing',
        title: payload.title ?? payload.name ?? 'Untitled listing',
        location: payload.location ?? 'Unknown',
        address: payload.address ?? null,
        property_type: payload.property_type ?? 'Apartment',
        description: payload.description ?? null,
        price_per_night: Number(payload.price_per_night ?? 0),
        price_per_month: payload.price_per_month ?? null,
        price_per_person: payload.price_per_person ?? null,
        price_per_group: payload.price_per_group ?? null,
        price_per_group_size: payload.price_per_group_size ?? null,
        currency: payload.currency ?? 'RWF',
        max_guests: payload.max_guests ?? 2,
        bedrooms: payload.bedrooms ?? 1,
        bathrooms: payload.bathrooms ?? 1,
        beds: payload.beds ?? null,
        amenities: payload.amenities ?? null,
        images: payload.images ?? null,
        main_image: payload.main_image ?? null,
        is_published: payload.is_published ?? true,
        weekly_discount: payload.weekly_discount ?? 0,
        monthly_discount: payload.monthly_discount ?? 0,
        available_for_monthly_rental: payload.available_for_monthly_rental ?? false,
        monthly_only_listing: payload.monthly_only_listing ?? false,
        check_in_time: payload.check_in_time ?? '14:00',
        check_out_time: payload.check_out_time ?? '11:00',
        smoking_allowed: payload.smoking_allowed ?? false,
        events_allowed: payload.events_allowed ?? false,
        pets_allowed: payload.pets_allowed ?? false,
        conference_room_capacity: payload.conference_room_capacity ?? null,
        conference_room_min_rooms_required: payload.conference_room_min_rooms_required ?? null,
        conference_room_equipment: payload.conference_room_equipment ?? null,
        conference_room_price: payload.conference_room_price ?? null,
        conference_room_duration_hours: payload.conference_room_duration_hours ?? null,
      };

      const { data, error } = await client.supabase
        .from('properties')
        .insert(normalizedPayload)
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data ?? null;
    },
  };
}
