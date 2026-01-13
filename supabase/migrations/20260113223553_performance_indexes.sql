-- Performance indexes for faster queries

-- Properties indexes (most queried table)
CREATE INDEX IF NOT EXISTS idx_properties_is_published ON properties(is_published) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_properties_created_at ON properties(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_properties_host_id ON properties(host_id);

-- Tours indexes
CREATE INDEX IF NOT EXISTS idx_tours_is_published ON tours(is_published) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_tours_created_at ON tours(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tours_category ON tours(category);

-- Transport vehicles indexes
CREATE INDEX IF NOT EXISTS idx_transport_vehicles_is_published ON transport_vehicles(is_published) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_transport_vehicles_created_at ON transport_vehicles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transport_vehicles_vehicle_type ON transport_vehicles(vehicle_type);

-- Transport routes indexes
CREATE INDEX IF NOT EXISTS idx_transport_routes_locations ON transport_routes(from_location, to_location);

-- Favorites indexes (safe - user_id always exists)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'favorites' AND column_name = 'user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
  END IF;
END $$;

-- User roles indexes
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_roles' AND column_name = 'user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
  END IF;
END $$;

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);

-- Host applications indexes
CREATE INDEX IF NOT EXISTS idx_host_applications_user_id ON host_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_host_applications_status ON host_applications(status);

-- Trip cart indexes
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trip_cart_items' AND column_name = 'user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_trip_cart_items_user_id ON trip_cart_items(user_id);
  END IF;
END $$;

-- Stories indexes
CREATE INDEX IF NOT EXISTS idx_stories_created_at ON stories(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stories_user_id ON stories(user_id);

-- Property reviews indexes
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'property_reviews' AND column_name = 'property_id') THEN
    CREATE INDEX IF NOT EXISTS idx_property_reviews_property_id ON property_reviews(property_id);
  END IF;
END $$;

-- Analyze tables for query planner optimization
ANALYZE properties;
ANALYZE tours;
ANALYZE transport_vehicles;
ANALYZE transport_routes;
ANALYZE profiles;
