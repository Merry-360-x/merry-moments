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

    async getUserBookingsDetailed(userId) {
      const { data, error } = await client.supabase
        .from('bookings')
        .select('id,host_id,property_id,tour_id,transport_id,booking_type,status,confirmation_status,payment_status,payment_method,cancellation_policy,special_requests,total_price,currency,check_in,check_out,guests,created_at,properties(id,title,location,main_image,price_per_night)')
        .eq('guest_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data ?? []).map(row => ({
        ...normalizeBooking(row),
        cancellationPolicy: row.cancellation_policy ?? null,
        property: row.properties ? {
          id: row.properties.id,
          title: row.properties.title,
          location: row.properties.location,
          mainImage: row.properties.main_image,
          pricePerNight: row.properties.price_per_night,
        } : null,
      }));
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

    async cancelBooking(bookingId) {
      const { error } = await client.supabase
        .from('bookings')
        .update({ status: 'cancelled', confirmation_status: 'cancelled' })
        .eq('id', bookingId);

      if (error) throw error;
    },

    async requestDateChange(bookingId, { newCheckIn, newCheckOut, reason }) {
      const { error } = await client.supabase
        .from('booking_date_change_requests')
        .insert({
          booking_id: bookingId,
          new_check_in: newCheckIn,
          new_check_out: newCheckOut,
          reason,
          status: 'pending',
        });

      if (error) throw error;
    },

    async requestRefund(bookingId, reason) {
      const { error } = await client.supabase
        .from('bookings')
        .update({ status: 'refund_requested', special_requests: reason })
        .eq('id', bookingId);

      if (error) throw error;
    },

    async submitGuestReview(bookingId, { propertyId, guestId, rating, comment }) {
      const { error } = await client.supabase
        .from('property_reviews')
        .insert({
          booking_id: bookingId,
          property_id: propertyId,
          reviewer_id: guestId,
          rating,
          comment,
        });

      if (error) throw error;
    },

    async submitTokenReview(token, { rating, serviceRating, comment }) {
      const { error } = await client.supabase
        .from('property_reviews')
        .insert({
          review_token: token,
          rating,
          service_rating: serviceRating,
          comment,
        });

      if (error) throw error;
    },
  };
}
