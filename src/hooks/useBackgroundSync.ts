import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Background sync for critical user-specific data
export const useBackgroundSync = () => {
  const { user } = useAuth();

  // Sync user bookings in background
  useQuery({
    queryKey: ['user-bookings-sync', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from('bookings')
        .select('id, status, check_in, check_out, total_price, currency')
        .eq('guest_id', user.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 1000 * 30, // 30 seconds for bookings
    refetchInterval: 1000 * 60, // Refetch every minute
    refetchIntervalInBackground: true, // Continue in background
  });

  // Sync favorites in background
  useQuery({
    queryKey: ['user-favorites-sync', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from('favorites')
        .select('id, properties(id, title, price_per_night, currency)')
        .eq('user_id', user.id);
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 2, // 2 minutes for favorites
    refetchInterval: 1000 * 60 * 2, // Refetch every 2 minutes
    refetchIntervalInBackground: true,
  });

  // Sync trip cart in background
  useQuery({
    queryKey: ['user-cart-sync', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from('trip_cart_items')
        .select('*')
        .eq('user_id', user.id);
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 1000 * 15, // 15 seconds for cart
    refetchInterval: 1000 * 30, // Refetch every 30 seconds
    refetchIntervalInBackground: true,
  });

  return null;
};

// Background sync for admin/staff dashboard metrics
export const useAdminBackgroundSync = () => {
  const { user } = useAuth();

  // Only sync if user might be admin/staff
  useQuery({
    queryKey: ['admin-metrics-sync'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_dashboard_metrics');
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    staleTime: 1000 * 30, // 30 seconds for metrics
    refetchInterval: 1000 * 45, // Refetch every 45 seconds
    refetchIntervalInBackground: true,
    retry: 1, // Don't retry too much for admin queries
  });

  return null;
};