-- Reset Schema Cache and ensure all RLS policies are active
-- This migration ensures the PostgREST schema cache is reloaded

-- Ensure RLS is enabled on all critical tables
ALTER TABLE IF EXISTS properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS property_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tours ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS transport_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS host_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_preferences ENABLE ROW LEVEL SECURITY;

-- Properties policies
DROP POLICY IF EXISTS "Anyone can view published properties" ON properties;
CREATE POLICY "Anyone can view published properties" ON properties
  FOR SELECT USING (is_published = true);

DROP POLICY IF EXISTS "Hosts can manage their own properties" ON properties;
CREATE POLICY "Hosts can manage their own properties" ON properties
  FOR ALL USING (auth.uid() = host_id);

-- User roles policies
DROP POLICY IF EXISTS "Users can view their own roles" ON user_roles;
CREATE POLICY "Users can view their own roles" ON user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- Profiles policies
DROP POLICY IF EXISTS "Anyone can view profiles" ON profiles;
CREATE POLICY "Anyone can view profiles" ON profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Tours policies
DROP POLICY IF EXISTS "Anyone can view published tours" ON tours;
CREATE POLICY "Anyone can view published tours" ON tours
  FOR SELECT USING (is_published = true);

DROP POLICY IF EXISTS "Hosts can manage their own tours" ON tours;
CREATE POLICY "Hosts can manage their own tours" ON tours
  FOR ALL USING (auth.uid() = created_by);

-- Transport vehicles policies
DROP POLICY IF EXISTS "Anyone can view published vehicles" ON transport_vehicles;
CREATE POLICY "Anyone can view published vehicles" ON transport_vehicles
  FOR SELECT USING (is_published = true);

-- Favorites policies
DROP POLICY IF EXISTS "Users can view their own favorites" ON favorites;
CREATE POLICY "Users can view their own favorites" ON favorites
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own favorites" ON favorites;
CREATE POLICY "Users can manage their own favorites" ON favorites
  FOR ALL USING (auth.uid() = user_id);

-- User preferences policies
DROP POLICY IF EXISTS "Users can view their own preferences" ON user_preferences;
CREATE POLICY "Users can view their own preferences" ON user_preferences
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own preferences" ON user_preferences;
CREATE POLICY "Users can manage their own preferences" ON user_preferences
  FOR ALL USING (auth.uid() = user_id);

-- Host applications policies  
DROP POLICY IF EXISTS "Users can view their own applications" ON host_applications;
CREATE POLICY "Users can view their own applications" ON host_applications
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own applications" ON host_applications;
CREATE POLICY "Users can insert their own applications" ON host_applications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Reviews policies
DROP POLICY IF EXISTS "Anyone can view reviews" ON property_reviews;
CREATE POLICY "Anyone can view reviews" ON property_reviews
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage their own reviews" ON property_reviews;
CREATE POLICY "Users can manage their own reviews" ON property_reviews
  FOR ALL USING (auth.uid() = reviewer_id);

-- Bookings policies
DROP POLICY IF EXISTS "Users can view their own bookings" ON bookings;
CREATE POLICY "Users can view their own bookings" ON bookings
  FOR SELECT USING (auth.uid() = guest_id);

DROP POLICY IF EXISTS "Users can manage their own bookings" ON bookings;
CREATE POLICY "Users can manage their own bookings" ON bookings
  FOR ALL USING (auth.uid() = guest_id);

DROP POLICY IF EXISTS "Hosts can view bookings for their properties" ON bookings;
CREATE POLICY "Hosts can view bookings for their properties" ON bookings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM properties 
      WHERE properties.id = bookings.property_id 
      AND properties.host_id = auth.uid()
    )
  );

-- Reload the PostgREST schema cache
NOTIFY pgrst, 'reload schema';
