import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook to subscribe to cross-platform sync events and invalidate relevant React Query caches
 * This ensures instant updates when data changes on Flutter, API, or other web clients
 */
export function usePlatformSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('platform-sync-web')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'platform_sync_events',
        },
        (payload) => {
          const event = payload.new;
          if (!event) return;
          
          invalidateRelevantQueries(queryClient, event);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

/**
 * Invalidate React Query caches based on the sync event
 */
function invalidateRelevantQueries(queryClient: QueryClient, event: any) {
  const { entity_type, entity_id, event_type, source_platform } = event;
  
  // Don't invalidate if the event originated from this platform (web)
  // to avoid unnecessary refetches - the local UI is already updated
  if (source_platform === 'web') return;

  console.log('[PlatformSync] Received event:', event_type, entity_type, entity_id);

  // Invalidate listing queries
  if (['property', 'tour', 'tour_package', 'transport_vehicle'].includes(entity_type)) {
    // Invalidate all listing queries
    queryClient.invalidateQueries({ queryKey: ['listings'] });
    queryClient.invalidateQueries({ queryKey: ['properties'] });
    queryClient.invalidateQueries({ queryKey: ['tours'] });
    queryClient.invalidateQueries({ queryKey: ['tourPackages'] });
    queryClient.invalidateQueries({ queryKey: ['transport'] });
    
    // Invalidate specific entity query
    queryClient.invalidateQueries({ queryKey: [entity_type, entity_id] });
    queryClient.invalidateQueries({ queryKey: ['property', entity_id] });
    queryClient.invalidateQueries({ queryKey: ['tour', entity_id] });
    queryClient.invalidateQueries({ queryKey: ['tourPackage', entity_id] });
    queryClient.invalidateQueries({ queryKey: ['transport', entity_id] });
  }

  // Invalidate booking queries
  if (entity_type === 'booking') {
    queryClient.invalidateQueries({ queryKey: ['bookings'] });
    queryClient.invalidateQueries({ queryKey: ['booking', entity_id] });
    queryClient.invalidateQueries({ queryKey: ['myBookings'] });
    queryClient.invalidateQueries({ queryKey: ['hostBookings'] });
  }

  // Invalidate user/profile queries
  if (['user', 'profile'].includes(entity_type)) {
    queryClient.invalidateQueries({ queryKey: ['profile', entity_id] });
    queryClient.invalidateQueries({ queryKey: ['user', entity_id] });
    queryClient.invalidateQueries({ queryKey: ['auth'] });
  }

  // Invalidate wishlist/favorites
  if (entity_type === 'wishlist' || entity_type === 'favorite') {
    queryClient.invalidateQueries({ queryKey: ['favorites'] });
    queryClient.invalidateQueries({ queryKey: ['wishlists'] });
  }

  // Invalidate trip cart
  if (entity_type === 'trip_cart') {
    queryClient.invalidateQueries({ queryKey: ['tripCart'] });
    queryClient.invalidateQueries({ queryKey: ['trip_cart'] });
  }

  // Invalidate notifications
  if (entity_type === 'notification') {
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  }

  // Invalidate stories
  if (entity_type === 'story') {
    queryClient.invalidateQueries({ queryKey: ['stories'] });
  }

  // Invalidate host applications
  if (entity_type === 'host_application') {
    queryClient.invalidateQueries({ queryKey: ['hostApplications'] });
  }

  // Invalidate reviews
  if (entity_type === 'review') {
    queryClient.invalidateQueries({ queryKey: ['reviews'] });
    queryClient.invalidateQueries({ queryKey: ['propertyReviews'] });
  }

  // Invalidate charges/post-booking
  if (['charge', 'checkout', 'booking_modification', 'dispute'].includes(entity_type)) {
    queryClient.invalidateQueries({ queryKey: ['charges'] });
    queryClient.invalidateQueries({ queryKey: ['postBooking'] });
    queryClient.invalidateQueries({ queryKey: ['bookingModifications'] });
    queryClient.invalidateQueries({ queryKey: ['disputes'] });
  }

  // Invalidate host-specific data
  if (['payout', 'host_follow'].includes(entity_type)) {
    queryClient.invalidateQueries({ queryKey: ['hostPayouts'] });
    queryClient.invalidateQueries({ queryKey: ['hostFollowers'] });
  }

  // Invalidate support tickets
  if (['support_ticket', 'support_message'].includes(entity_type)) {
    queryClient.invalidateQueries({ queryKey: ['supportTickets'] });
  }

  // Invalidate direct messages
  if (entity_type === 'direct_message') {
    queryClient.invalidateQueries({ queryKey: ['directMessages'] });
    queryClient.invalidateQueries({ queryKey: ['conversations'] });
  }

  // Invalidate affiliate data
  if (['affiliate', 'affiliate_referral', 'affiliate_commission'].includes(entity_type)) {
    queryClient.invalidateQueries({ queryKey: ['affiliate'] });
  }

  // Invalidate discount codes
  if (entity_type === 'discount_code') {
    queryClient.invalidateQueries({ queryKey: ['discountCodes'] });
  }

  // Invalidate admin data
  if (['ad_banner', 'user_role'].includes(entity_type)) {
    queryClient.invalidateQueries({ queryKey: ['admin'] });
  }
}

/**
 * Helper to manually trigger invalidation for a specific entity
 * Useful for optimistic updates that need to be confirmed by server
 */
export function invalidateEntity(queryClient: QueryClient, entityType: string, entityId: string) {
  queryClient.invalidateQueries({ queryKey: [entityType, entityId] });
  
  // Also invalidate related list queries
  const listQueryKeys: Record<string, string[]> = {
    property: ['properties', 'listings'],
    tour: ['tours', 'listings'],
    tour_package: ['tourPackages', 'listings'],
    transport_vehicle: ['transport', 'listings'],
    booking: ['bookings', 'myBookings', 'hostBookings'],
    user: ['profile', 'auth'],
    wishlist: ['favorites', 'wishlists'],
    trip_cart: ['tripCart'],
    notification: ['notifications'],
    story: ['stories'],
    review: ['reviews', 'propertyReviews'],
    charge: ['charges', 'postBooking'],
    booking_modification: ['bookingModifications', 'postBooking'],
    dispute: ['disputes', 'postBooking'],
    payout: ['hostPayouts'],
    support_ticket: ['supportTickets'],
    direct_message: ['directMessages', 'conversations'],
    affiliate: ['affiliate'],
    discount_code: ['discountCodes'],
  };

  const keys = listQueryKeys[entityType];
  if (keys) {
    keys.forEach(key => queryClient.invalidateQueries({ queryKey: [key] }));
  }
}