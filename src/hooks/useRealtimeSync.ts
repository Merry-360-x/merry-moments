import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useRealtimeSync = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const recordUserMatchesCurrentUser = useCallback((payload?: any) => {
    const currentUserId = user?.id;
    if (!currentUserId) return false;
    const nextUserId = payload?.new?.user_id;
    const prevUserId = payload?.old?.user_id;
    return nextUserId === currentUserId || prevUserId === currentUserId;
  }, [user?.id]);

  const invalidateListingDetailQueries = useCallback((table: string, payload?: any) => {
    const recordId = payload?.new?.id || payload?.old?.id;
    if (!recordId) return;

    if (table === 'properties') {
      queryClient.invalidateQueries({ queryKey: ['property', recordId] });
      queryClient.invalidateQueries({ queryKey: ['property-blocked-dates', recordId] });
      queryClient.invalidateQueries({ queryKey: ['property-custom-prices', recordId] });
      queryClient.invalidateQueries({ queryKey: ['related-tours', recordId] });
      queryClient.invalidateQueries({ queryKey: ['related-transport-vehicles', recordId] });
    }

    if (table === 'tours' || table === 'tour_packages') {
      queryClient.invalidateQueries({ queryKey: ['tour-with-host', recordId] });
    }
  }, [queryClient]);

  const invalidateQueries = useCallback((table: string, payload?: any) => {
    switch (table) {
      case 'properties':
        queryClient.invalidateQueries({ queryKey: ['properties'] });
        queryClient.invalidateQueries({ queryKey: ['properties', 'latest'] });
        queryClient.invalidateQueries({ queryKey: ['properties', 'featured-home'] });
        queryClient.invalidateQueries({ queryKey: ['properties', 'top-rated-home'] });
        queryClient.invalidateQueries({ queryKey: ['staff-properties'] });
        queryClient.invalidateQueries({ queryKey: ['admin-properties'] });
        queryClient.invalidateQueries({ queryKey: ['host-preview'] });
        queryClient.invalidateQueries({ queryKey: ['smart-recommendations'] });
        invalidateListingDetailQueries(table, payload);
        break;
        
      case 'tours':
        queryClient.invalidateQueries({ queryKey: ['tours'] });
        queryClient.invalidateQueries({ queryKey: ['tours', 'featured-home'] });
        queryClient.invalidateQueries({ queryKey: ['staff-tours'] });
        queryClient.invalidateQueries({ queryKey: ['admin-tours'] });
        queryClient.invalidateQueries({ queryKey: ['related-tours'] });
        queryClient.invalidateQueries({ queryKey: ['checkout_cart'] });
        queryClient.invalidateQueries({ queryKey: ['smart-recommendations'] });
        invalidateListingDetailQueries(table, payload);
        break;

      case 'tour_packages':
        queryClient.invalidateQueries({ queryKey: ['tours'] });
        queryClient.invalidateQueries({ queryKey: ['tours', 'featured-home'] });
        queryClient.invalidateQueries({ queryKey: ['staff-tours'] });
        queryClient.invalidateQueries({ queryKey: ['admin-tours'] });
        queryClient.invalidateQueries({ queryKey: ['related-tours'] });
        queryClient.invalidateQueries({ queryKey: ['checkout_cart'] });
        queryClient.invalidateQueries({ queryKey: ['smart-recommendations'] });
        invalidateListingDetailQueries(table, payload);
        break;
        
      case 'transport_vehicles':
        queryClient.invalidateQueries({ queryKey: ['transport_vehicles'] });
        queryClient.invalidateQueries({ queryKey: ['transport-vehicles'] });
        queryClient.invalidateQueries({ queryKey: ['vehicles', 'featured-home'] });
        queryClient.invalidateQueries({ queryKey: ['staff-transport-vehicles'] });
        queryClient.invalidateQueries({ queryKey: ['admin-transport-vehicles'] });
        queryClient.invalidateQueries({ queryKey: ['related-transport-vehicles'] });
        queryClient.invalidateQueries({ queryKey: ['transport_services'] });
        queryClient.invalidateQueries({ queryKey: ['checkout_cart'] });
        queryClient.invalidateQueries({ queryKey: ['smart-recommendations'] });
        break;

      case 'transport_routes':
        queryClient.invalidateQueries({ queryKey: ['transport_routes'] });
        queryClient.invalidateQueries({ queryKey: ['transport_services'] });
        break;

      case 'airport_transfer_routes':
        queryClient.invalidateQueries({ queryKey: ['airport_transfer_routes'] });
        break;

      case 'airport_transfer_pricing':
        queryClient.invalidateQueries({ queryKey: ['airport_transfer_pricing'] });
        break;
        
      case 'bookings':
        queryClient.invalidateQueries({ queryKey: ['bookings'] });
        queryClient.invalidateQueries({ queryKey: ['staff-recent-bookings'] });
        queryClient.invalidateQueries({ queryKey: ['admin-bookings-direct'] });
        queryClient.invalidateQueries({ queryKey: ['staff_dashboard_metrics'] });
        break;
        
      case 'host_applications':
        queryClient.invalidateQueries({ queryKey: ['host_applications'] });
        queryClient.invalidateQueries({ queryKey: ['staff_dashboard_metrics'] });
        queryClient.invalidateQueries({ queryKey: ['host-app-data'] });
        break;
        
      case 'favorites':
        if (recordUserMatchesCurrentUser(payload)) {
          queryClient.invalidateQueries({ queryKey: ['favorites', 'ids', user?.id] });
          queryClient.invalidateQueries({ queryKey: ['favorites', 'list', user?.id] });
          queryClient.invalidateQueries({ queryKey: ['favorites-full', user?.id] });
        }
        break;
        
      case 'trip_cart_items':
        if (recordUserMatchesCurrentUser(payload)) {
          queryClient.invalidateQueries({ queryKey: ['trip_cart', user?.id] });
          queryClient.invalidateQueries({ queryKey: ['tripCart', user?.id] });
          queryClient.invalidateQueries({ queryKey: ['checkout_cart', user?.id] });
        }
        queryClient.invalidateQueries({ queryKey: ['staff_dashboard_metrics'] });
        break;
        
      case 'property_reviews':
        queryClient.invalidateQueries({ queryKey: ['property-reviews'] });
        queryClient.invalidateQueries({ queryKey: ['admin-reviews-direct'] });
        // Invalidate specific property data to update ratings
        if (payload?.property_id) {
          queryClient.invalidateQueries({ queryKey: ['property', payload.property_id] });
        }
        break;
        
      case 'user_roles':
        if (recordUserMatchesCurrentUser(payload)) {
          queryClient.invalidateQueries({ queryKey: ['user_roles', user?.id] });
        }
        queryClient.invalidateQueries({ queryKey: ['admin_list_users'] });
        queryClient.invalidateQueries({ queryKey: ['staff_list_users'] });
        break;

      case 'profiles':
        if (recordUserMatchesCurrentUser(payload)) {
          queryClient.invalidateQueries({ queryKey: ['profiles', user?.id] });
        }
        queryClient.invalidateQueries({ queryKey: ['host-profile'] });
        break;
    }
  }, [invalidateListingDetailQueries, queryClient, recordUserMatchesCurrentUser, user?.id]);

  useEffect(() => {
    const channels = [
      // Properties real-time
      supabase
        .channel('properties-changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'properties' }, 
          (payload) => invalidateQueries('properties', payload)
        ),

      // Tours real-time  
      supabase
        .channel('tours-changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'tours' }, 
          (payload) => invalidateQueries('tours', payload)
        ),

      // Tour packages real-time
      supabase
        .channel('tour-packages-changes')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'tour_packages' },
          (payload) => invalidateQueries('tour_packages', payload)
        ),

      // Transport vehicles real-time
      supabase
        .channel('transport-vehicles-changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'transport_vehicles' }, 
          (payload) => invalidateQueries('transport_vehicles', payload)
        ),

      // Transport routes real-time
      supabase
        .channel('transport-routes-changes')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'transport_routes' },
          (payload) => invalidateQueries('transport_routes', payload)
        ),

      // Airport transfer routes real-time
      supabase
        .channel('airport-transfer-routes-changes')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'airport_transfer_routes' },
          (payload) => invalidateQueries('airport_transfer_routes', payload)
        ),

      // Airport transfer pricing real-time
      supabase
        .channel('airport-transfer-pricing-changes')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'airport_transfer_pricing' },
          (payload) => invalidateQueries('airport_transfer_pricing', payload)
        ),

      // Bookings real-time
      supabase
        .channel('bookings-changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'bookings' }, 
          (payload) => invalidateQueries('bookings', payload)
        ),

      // Host applications real-time
      supabase
        .channel('host-applications-changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'host_applications' }, 
          (payload) => invalidateQueries('host_applications', payload)
        ),

      // Favorites real-time (user-specific)
      supabase
        .channel('favorites-changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'favorites' }, 
          (payload) => invalidateQueries('favorites', payload)
        ),

      // Trip cart real-time (user-specific)
      supabase
        .channel('trip-cart-changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'trip_cart_items' }, 
          (payload) => invalidateQueries('trip_cart_items', payload)
        ),

      // Reviews real-time
      supabase
        .channel('reviews-changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'property_reviews' }, 
          (payload) => invalidateQueries('property_reviews', payload)
        ),

      // User roles real-time
      supabase
        .channel('user-roles-changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'user_roles' }, 
          (payload) => invalidateQueries('user_roles', payload)
        ),

      // Profiles real-time
      supabase
        .channel('profiles-changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'profiles' }, 
          (payload) => invalidateQueries('profiles', payload)
        ),
    ];

    // Subscribe to all channels
    channels.forEach(channel => channel.subscribe());

    // Cleanup subscriptions on unmount
    return () => {
      channels.forEach(channel => channel.unsubscribe());
    };
  }, [invalidateQueries]);

  // Background data refresh every 30 seconds for critical data
  useEffect(() => {
    const interval = setInterval(() => {
      // Only refresh if the page is visible to avoid unnecessary requests
      if (document.visibilityState === 'visible') {
        queryClient.invalidateQueries({ 
          queryKey: ['staff_dashboard_metrics'],
          refetchType: 'active' // Only refetch if query is currently active
        });
        queryClient.invalidateQueries({ 
          queryKey: ['bookings'],
          refetchType: 'active'
        });
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [queryClient]);

  // Visibility change handler - refresh data when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Refresh all stale queries when user returns to tab
        queryClient.invalidateQueries({
          refetchType: 'active',
          stale: true
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [queryClient]);

  return null;
};