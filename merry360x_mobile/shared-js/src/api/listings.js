import { normalizeListing } from '../models/types.js';

export function createListingsApi(client) {
  return {
    async getFeaturedListings(limit = 20) {
      const { data, error } = await client.supabase
        .from('properties')
        .select('id,host_id,title,name,location,property_type,price_per_night,price_per_month,currency,max_guests,bedrooms,bathrooms,images,main_image,is_published,available_for_monthly_rental,monthly_only_listing,rating,review_count,created_at')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data ?? []).map(normalizeListing);
    },

    async getListingById(id) {
      const { data, error } = await client.supabase
        .from('properties')
        .select('*')
        .eq('id', id)
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data ? normalizeListing(data) : null;
    },

    async getCitiesWithStays() {
      const { data, error } = await client.supabase
        .from('properties')
        .select('location')
        .eq('is_published', true)
        .not('location', 'is', null);

      if (error) throw error;
      
      // Extract unique cities and count stays per city
      const cityCounts = {};
      (data ?? []).forEach(item => {
        if (item.location) {
          // Extract city name (first part before comma or the whole string)
          const city = item.location.split(',')[0].trim();
          cityCounts[city] = (cityCounts[city] || 0) + 1;
        }
      });
      
      // Convert to array and sort by count (descending)
      return Object.entries(cityCounts)
        .map(([city, count]) => ({ city, count }))
        .sort((a, b) => b.count - a.count);
    },

    async getListingsByCity(city, limit = 10) {
      const { data, error } = await client.supabase
        .from('properties')
        .select('id,host_id,title,name,location,property_type,price_per_night,price_per_month,currency,max_guests,bedrooms,bathrooms,images,main_image,is_published,available_for_monthly_rental,monthly_only_listing,rating,review_count,created_at')
        .eq('is_published', true)
        .ilike('location', `${city}%`)
        .order('rating', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data ?? []).map(normalizeListing);
    },
  };
}
