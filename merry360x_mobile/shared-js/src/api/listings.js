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
      
      const cityCounts = {};
      (data ?? []).forEach(item => {
        if (item.location) {
          const city = item.location.split(',')[0].trim();
          cityCounts[city] = (cityCounts[city] || 0) + 1;
        }
      });
      
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

    async getAccommodations({ search, propertyType, minPrice, maxPrice, monthlyOnly, limit = 20, offset = 0 } = {}) {
      let query = client.supabase
        .from('properties')
        .select('id,host_id,title,name,location,property_type,price_per_night,price_per_month,currency,max_guests,bedrooms,bathrooms,images,main_image,is_published,available_for_monthly_rental,monthly_only_listing,rating,review_count,created_at')
        .eq('is_published', true);

      if (search) query = query.or(`title.ilike.%${search}%,location.ilike.%${search}%`);
      if (propertyType) query = query.eq('property_type', propertyType);
      if (minPrice != null) query = query.gte('price_per_night', minPrice);
      if (maxPrice != null) query = query.lte('price_per_night', maxPrice);
      if (monthlyOnly) query = query.eq('monthly_only_listing', true);

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return (data ?? []).map(normalizeListing);
    },

    async getTours({ search, category, duration, limit = 20 } = {}) {
      let query = client.supabase
        .from('tours')
        .select('id,title,description,location,category,duration,price,currency,images,main_image,rating,review_count,created_at')
        .eq('is_published', true);

      if (search) query = query.or(`title.ilike.%${search}%,location.ilike.%${search}%`);
      if (category) query = query.eq('category', category);
      if (duration) query = query.eq('duration', duration);

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data ?? [];
    },

    async getTransportVehicles({ search, limit = 20 } = {}) {
      let query = client.supabase
        .from('transport_vehicles')
        .select('id,name,brand,model,year,vehicle_type,fuel_type,transmission,seats,daily_rate,currency,images,main_image,is_verified,created_at');

      if (search) query = query.or(`name.ilike.%${search}%,brand.ilike.%${search}%,model.ilike.%${search}%`);

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data ?? [];
    },

    async getAirportTransferRoutes() {
      const { data, error } = await client.supabase
        .from('airport_transfer_routes')
        .select('id,from_location,to_location,price,currency,vehicle_type,created_at')
        .order('from_location');

      if (error) throw error;
      return data ?? [];
    },

    async searchAll(query, limit = 10) {
      const search = `%${query}%`;
      const [properties, tours, transport] = await Promise.all([
        client.supabase
          .from('properties')
          .select('id,title,location,property_type,price_per_night,currency,main_image,rating')
          .eq('is_published', true)
          .or(`title.ilike.${search},location.ilike.${search}`)
          .limit(limit),
        client.supabase
          .from('tours')
          .select('id,title,location,category,price,currency,main_image,rating')
          .eq('is_published', true)
          .or(`title.ilike.${search},location.ilike.${search}`)
          .limit(limit),
        client.supabase
          .from('transport_vehicles')
          .select('id,name,brand,model,daily_rate,currency,main_image')
          .or(`name.ilike.${search},brand.ilike.${search},model.ilike.${search}`)
          .limit(limit),
      ]);

      return {
        properties: (properties.data ?? []).map(r => ({ ...r, type: 'property' })),
        tours: (tours.data ?? []).map(r => ({ ...r, type: 'tour' })),
        transport: (transport.data ?? []).map(r => ({ ...r, type: 'transport' })),
      };
    },
  };
}
