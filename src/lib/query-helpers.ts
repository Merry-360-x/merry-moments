// Optimized database query helpers for consistent, fast data fetching
import { supabase } from "@/integrations/supabase/client";

/**
 * Query optimization utilities for Supabase
 * These helpers ensure queries are fast and use proper indexes
 */

// Standard query configuration for consistent caching
export const QUERY_CONFIG = {
  // Fast-changing data (search results, filters)
  dynamic: {
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes cache
  },
  // Medium-changing data (listings, tours)
  standard: {
    staleTime: 1000 * 60 * 3, // 3 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes cache
  },
  // Slow-changing data (user profiles, settings)
  stable: {
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 20, // 20 minutes cache
  },
  // Real-time data (admin metrics, live counts)
  realtime: {
    staleTime: 1000 * 60, // 1 minute
    gcTime: 1000 * 60 * 5, // 5 minutes cache
  },
} as const;

// Common query options for all pages
export const commonQueryOptions = {
  refetchOnWindowFocus: true,
  refetchOnMount: true,
  refetchOnReconnect: true,
};

// Optimized property fetching with proper indexing
export const fetchPropertiesOptimized = async (filters: {
  published?: boolean;
  limit?: number;
  orderBy?: { column: string; ascending?: boolean };
  search?: string;
}) => {
  const { published = true, limit = 20, orderBy, search } = filters;
  
  let query = supabase
    .from("properties")
    .select(
      "id, title, location, price_per_night, currency, property_type, rating, review_count, images, created_at, bedrooms, bathrooms, beds, max_guests, check_in_time, check_out_time, smoking_allowed, events_allowed, pets_allowed"
    );

  // Use index on is_published
  if (published !== undefined) {
    query = query.eq("is_published", published);
  }

  // Search optimization
  if (search?.trim()) {
    query = query.or(`title.ilike.%${search.trim()}%,location.ilike.%${search.trim()}%`);
  }

  // Ordering (uses created_at index by default)
  if (orderBy) {
    query = query.order(orderBy.column, { ascending: orderBy.ascending ?? false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  // Limit results for performance
  query = query.limit(limit);

  const { data, error } = await query;
  
  if (error) {
    console.error("[DB] Properties fetch error:", error.message);
    throw error;
  }

  return data ?? [];
};

// Optimized tours fetching
export const fetchToursOptimized = async (filters: {
  published?: boolean;
  limit?: number;
  category?: string;
  search?: string;
}) => {
  const { published = true, limit = 20, category, search } = filters;
  
  let query = supabase
    .from("tours")
    .select(
      "id, title, location, price_per_person, currency, images, rating, review_count, category, duration_days"
    );

  if (published !== undefined) {
    query = query.eq("is_published", published);
  }

  if (category && category !== "All") {
    query = query.eq("category", category);
  }

  if (search?.trim()) {
    query = query.or(`title.ilike.%${search.trim()}%,location.ilike.%${search.trim()}%`);
  }

  query = query.order("created_at", { ascending: false }).limit(limit);

  const { data, error } = await query;
  
  if (error) {
    console.error("[DB] Tours fetch error:", error.message);
    throw error;
  }

  return data ?? [];
};

// Optimized transport vehicles fetching
export const fetchVehiclesOptimized = async (filters: {
  published?: boolean;
  limit?: number;
  vehicleType?: string;
}) => {
  const { published = true, limit = 20, vehicleType } = filters;
  
  let query = supabase
    .from("transport_vehicles")
    .select(
      "id, title, provider_name, vehicle_type, seats, price_per_day, currency, driver_included, image_url, media"
    );

  if (published !== undefined) {
    query = query.eq("is_published", published);
  }

  if (vehicleType && vehicleType !== "All Vehicles") {
    query = query.eq("vehicle_type", vehicleType);
  }

  query = query.order("created_at", { ascending: false }).limit(limit);

  const { data, error } = await query;
  
  if (error) {
    console.error("[DB] Vehicles fetch error:", error.message);
    throw error;
  }

  return data ?? [];
};

// Batch fetching utility for reducing round trips
export const fetchBatch = async <T>(
  queries: Array<() => Promise<T>>
): Promise<T[]> => {
  try {
    return await Promise.all(queries);
  } catch (error) {
    console.error("[DB] Batch fetch error:", error);
    throw error;
  }
};

// Query key factory for consistent cache keys
export const queryKeys = {
  properties: {
    all: ["properties"] as const,
    lists: () => [...queryKeys.properties.all, "list"] as const,
    list: (filters: Record<string, unknown>) => 
      [...queryKeys.properties.lists(), filters] as const,
    details: () => [...queryKeys.properties.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.properties.details(), id] as const,
  },
  tours: {
    all: ["tours"] as const,
    lists: () => [...queryKeys.tours.all, "list"] as const,
    list: (filters: Record<string, unknown>) => 
      [...queryKeys.tours.lists(), filters] as const,
    details: () => [...queryKeys.tours.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.tours.details(), id] as const,
  },
  vehicles: {
    all: ["transport_vehicles"] as const,
    lists: () => [...queryKeys.vehicles.all, "list"] as const,
    list: (filters: Record<string, unknown>) => 
      [...queryKeys.vehicles.lists(), filters] as const,
  },
  admin: {
    metrics: ["admin_dashboard_metrics"] as const,
    users: ["admin_list_users"] as const,
  },
} as const;