-- Create database indexes for fast, consistent data fetching
-- These indexes optimize the most common queries across the platform

-- Properties table indexes
CREATE INDEX IF NOT EXISTS idx_properties_published 
ON properties(is_published) 
WHERE is_published = true;

CREATE INDEX IF NOT EXISTS idx_properties_created_at 
ON properties(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_properties_rating 
ON properties(rating DESC NULLS LAST) 
WHERE is_published = true;

CREATE INDEX IF NOT EXISTS idx_properties_host_id 
ON properties(host_id);

CREATE INDEX IF NOT EXISTS idx_properties_location 
ON properties USING gin(to_tsvector('english', location));

CREATE INDEX IF NOT EXISTS idx_properties_title 
ON properties USING gin(to_tsvector('english', title));

-- Tours table indexes
CREATE INDEX IF NOT EXISTS idx_tours_published 
ON tours(is_published) 
WHERE is_published = true;

CREATE INDEX IF NOT EXISTS idx_tours_created_at 
ON tours(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tours_category 
ON tours(category) 
WHERE is_published = true;

CREATE INDEX IF NOT EXISTS idx_tours_rating 
ON tours(rating DESC NULLS LAST) 
WHERE is_published = true;

CREATE INDEX IF NOT EXISTS idx_tours_location 
ON tours USING gin(to_tsvector('english', location));

-- Transport vehicles indexes
CREATE INDEX IF NOT EXISTS idx_transport_vehicles_published 
ON transport_vehicles(is_published) 
WHERE is_published = true;

CREATE INDEX IF NOT EXISTS idx_transport_vehicles_created_at 
ON transport_vehicles(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_transport_vehicles_type 
ON transport_vehicles(vehicle_type) 
WHERE is_published = true;

-- Transport routes indexes
CREATE INDEX IF NOT EXISTS idx_transport_routes_published 
ON transport_routes(is_published) 
WHERE is_published = true;

CREATE INDEX IF NOT EXISTS idx_transport_routes_from 
ON transport_routes USING gin(to_tsvector('english', from_location));

CREATE INDEX IF NOT EXISTS idx_transport_routes_to 
ON transport_routes USING gin(to_tsvector('english', to_location));

-- Bookings table indexes
CREATE INDEX IF NOT EXISTS idx_bookings_created_at 
ON bookings(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bookings_status 
ON bookings(status);

CREATE INDEX IF NOT EXISTS idx_bookings_status_revenue 
ON bookings(status, total_price) 
WHERE status IN ('confirmed', 'completed');

-- Property reviews indexes
CREATE INDEX IF NOT EXISTS idx_property_reviews_property_id 
ON property_reviews(property_id);

CREATE INDEX IF NOT EXISTS idx_property_reviews_rating 
ON property_reviews(rating) 
WHERE NOT is_hidden;

CREATE INDEX IF NOT EXISTS idx_property_reviews_created_at 
ON property_reviews(created_at DESC);

-- User roles indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id 
ON user_roles(user_id);

CREATE INDEX IF NOT EXISTS idx_user_roles_role 
ON user_roles(role);

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_user_id 
ON profiles(user_id);

CREATE INDEX IF NOT EXISTS idx_profiles_suspended 
ON profiles(is_suspended) 
WHERE is_suspended = true;

-- Favorites indexes (if table exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'favorites') THEN
    CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
    CREATE INDEX IF NOT EXISTS idx_favorites_property_id ON favorites(property_id);
  END IF;
END $$;

-- Trip cart items indexes (if table exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'trip_cart_items') THEN
    CREATE INDEX IF NOT EXISTS idx_trip_cart_user_id ON trip_cart_items(user_id);
    CREATE INDEX IF NOT EXISTS idx_trip_cart_item_type ON trip_cart_items(item_type);
  END IF;
END $$;

-- Analyze tables to update query planner statistics
ANALYZE properties;
ANALYZE tours;
ANALYZE transport_vehicles;
ANALYZE transport_routes;
ANALYZE bookings;
ANALYZE property_reviews;
ANALYZE user_roles;
ANALYZE profiles;