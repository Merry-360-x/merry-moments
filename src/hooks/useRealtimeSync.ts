import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useRealtimeSync = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const invalidateQueries = useCallback((table: string, payload?: any) => {
    switch (table) {
      case 'properties':
        queryClient.invalidateQueries({ queryKey: ['properties'] });
        queryClient.invalidateQueries({ queryKey: ['properties', 'latest'] });
        queryClient.invalidateQueries({ queryKey: ['properties', 'featured-home'] });
        queryClient.invalidateQueries({ queryKey: ['properties', 'top-rated-home'] });
        queryClient.invalidateQueries({ queryKey: ['staff-properties'] });
        queryClient.invalidateQueries({ queryKey: ['admin-properties'] });
        break;
        
      case 'tours':
        queryClient.invalidateQueries({ queryKey: ['tours'] });
        queryClient.invalidateQueries({ queryKey: ['tours', 'featured-home'] });
        queryClient.invalidateQueries({ queryKey: ['staff-tours'] });
        queryClient.invalidateQueries({ queryKey: ['admin-tours'] });
        queryClient.invalidateQueries({ queryKey: ['related-tours'] });
        break;
        
      case 'transport_vehicles':
        queryClient.invalidateQueries({ queryKey: ['transport-vehicles'] });
        queryClient.invalidateQueries({ queryKey: ['vehicles', 'featured-home'] });
        queryClient.invalidateQueries({ queryKey: ['staff-transport-vehicles'] });
        queryClient.invalidateQueries({ queryKey: ['admin-transport-vehicles'] });
        queryClient.invalidateQueries({ queryKey: ['related-transport-vehicles'] });
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
        break;
        
      case 'favorites':
        if (payload?.user_id === user?.id || payload?.old_record?.user_id === user?.id) {
          queryClient.invalidateQueries({ queryKey: ['favorites', 'list', user?.id] });
        }
        break;
        
      case 'trip_cart_items':
        if (payload?.user_id === user?.id || payload?.old_record?.user_id === user?.id) {
          queryClient.invalidateQueries({ queryKey: ['tripCart', user?.id] });
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
        if (payload?.user_id === user?.id || payload?.old_record?.user_id === user?.id) {
          queryClient.invalidateQueries({ queryKey: ['user_roles', user?.id] });
        }
        queryClient.invalidateQueries({ queryKey: ['admin_list_users'] });
        queryClient.invalidateQueries({ queryKey: ['staff_list_users'] });
        break;

      case 'profiles':
        if (payload?.user_id === user?.id || payload?.old_record?.user_id === user?.id) {
          queryClient.invalidateQueries({ queryKey: ['profiles', user?.id] });
        }
        break;
    }
  }, [queryClient, user?.id]);

  useEffect(() => {
    if (!user) return;

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

      // Transport vehicles real-time
      supabase
        .channel('transport-vehicles-changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'transport_vehicles' }, 
          (payload) => invalidateQueries('transport_vehicles', payload)
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
  }, [user, invalidateQueries]);

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