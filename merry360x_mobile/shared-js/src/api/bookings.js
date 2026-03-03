import { normalizeBooking } from '../models/types.js';

export function createBookingsApi(client) {
  return {
    async getUserBookings(userId) {
      const { data, error } = await client.supabase
        .from('bookings')
        .select('id,host_id,property_id,tour_id,transport_id,booking_type,status,confirmation_status,payment_status,payment_method,special_requests,total_price,currency,check_in,check_out,guests,created_at')
        .eq('guest_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data ?? []).map(normalizeBooking);
    },

    async createBooking(payload) {
      const normalizedPayload = {
        status: 'pending',
        confirmation_status: 'pending',
        payment_status: 'pending',
        booking_type: 'property',
        ...payload,
      };

      const { data, error } = await client.supabase
        .from('bookings')
        .insert(normalizedPayload)
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data ? normalizeBooking(data) : null;
    },
  };
}
