-- Comprehensive database fix - handles existing objects gracefully
-- This migration applies all necessary schema changes with proper conflict handling

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types (handle existing ones)
DO $$ BEGIN
  CREATE TYPE app_role AS ENUM ('guest', 'user', 'host', 'staff', 'admin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE application_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create tables with IF NOT EXISTS
CREATE TABLE IF NOT EXISTS profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  phone TEXT,
  loyalty_points INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, role)
);

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  currency TEXT DEFAULT 'RWF',
  language TEXT DEFAULT 'en',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS host_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status application_status DEFAULT 'pending',
  applicant_type TEXT DEFAULT 'individual',
  service_types TEXT[] DEFAULT '{}',
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  about TEXT,
  national_id_number TEXT,
  national_id_photo_url TEXT,
  business_name TEXT,
  business_tin TEXT,
  hosting_location TEXT,
  listing_title TEXT,
  listing_location TEXT,
  listing_property_type TEXT,
  listing_price_per_night NUMERIC,
  listing_currency TEXT DEFAULT 'RWF',
  listing_max_guests INTEGER,
  listing_bedrooms INTEGER,
  listing_bathrooms INTEGER,
  listing_amenities TEXT[],
  listing_images TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  host_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  name TEXT,
  description TEXT,
  property_type TEXT,
  location TEXT NOT NULL,
  address TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  lat NUMERIC,
  lng NUMERIC,
  price_per_night NUMERIC NOT NULL,
  currency TEXT DEFAULT 'RWF',
  max_guests INTEGER DEFAULT 1,
  bedrooms INTEGER DEFAULT 1,
  bathrooms INTEGER DEFAULT 1,
  beds INTEGER DEFAULT 1,
  amenities TEXT[] DEFAULT '{}',
  images TEXT[] DEFAULT '{}',
  main_image TEXT,
  is_published BOOLEAN DEFAULT FALSE,
  rating NUMERIC DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  check_in_time TEXT DEFAULT '14:00',
  check_out_time TEXT DEFAULT '11:00',
  smoking_allowed BOOLEAN DEFAULT FALSE,
  events_allowed BOOLEAN DEFAULT FALSE,
  pets_allowed BOOLEAN DEFAULT FALSE,
  weekly_discount NUMERIC DEFAULT 0,
  monthly_discount NUMERIC DEFAULT 0,
  cancellation_policy TEXT DEFAULT 'fair',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tours (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  location TEXT NOT NULL,
  duration_days INTEGER DEFAULT 1,
  difficulty TEXT DEFAULT 'Easy',
  price_per_person NUMERIC NOT NULL,
  currency TEXT DEFAULT 'RWF',
  max_group_size INTEGER DEFAULT 10,
  images TEXT[] DEFAULT '{}',
  is_published BOOLEAN DEFAULT FALSE,
  rating NUMERIC DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transport_vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  provider_name TEXT,
  vehicle_type TEXT,
  seats INTEGER,
  price_per_day NUMERIC NOT NULL,
  currency TEXT DEFAULT 'RWF',
  driver_included BOOLEAN DEFAULT FALSE,
  image_url TEXT,
  media TEXT[],
  is_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transport_routes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  from_location TEXT NOT NULL,
  to_location TEXT NOT NULL,
  base_price NUMERIC NOT NULL,
  currency TEXT DEFAULT 'RWF',
  duration_hours NUMERIC,
  distance_km NUMERIC,
  transport_type TEXT DEFAULT 'bus',
  schedule TEXT,
  is_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guest_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  guests INTEGER DEFAULT 1,
  total_price NUMERIC NOT NULL,
  currency TEXT DEFAULT 'RWF',
  status booking_status DEFAULT 'pending',
  special_requests TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS property_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  guest_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns to existing tables
DO $$ 
BEGIN
  -- Add columns to profiles if they don't exist
  BEGIN
    ALTER TABLE profiles ADD COLUMN loyalty_points INTEGER DEFAULT 0;
  EXCEPTION
    WHEN duplicate_column THEN NULL;
  END;
  
  -- Add columns to properties if they don't exist
  BEGIN
    ALTER TABLE properties ADD COLUMN address TEXT;
  EXCEPTION
    WHEN duplicate_column THEN NULL;
  END;
  
  BEGIN
    ALTER TABLE properties ADD COLUMN name TEXT;
  EXCEPTION
    WHEN duplicate_column THEN NULL;
  END;
  
  BEGIN
    ALTER TABLE properties ADD COLUMN main_image TEXT;
  EXCEPTION
    WHEN duplicate_column THEN NULL;
  END;
  
  BEGIN
    ALTER TABLE properties ADD COLUMN lat NUMERIC;
  EXCEPTION
    WHEN duplicate_column THEN NULL;
  END;
  
  BEGIN
    ALTER TABLE properties ADD COLUMN lng NUMERIC;
  EXCEPTION
    WHEN duplicate_column THEN NULL;
  END;
  
  BEGIN
    ALTER TABLE properties ADD COLUMN weekly_discount NUMERIC DEFAULT 0;
  EXCEPTION
    WHEN duplicate_column THEN NULL;
  END;
  
  BEGIN
    ALTER TABLE properties ADD COLUMN monthly_discount NUMERIC DEFAULT 0;
  EXCEPTION
    WHEN duplicate_column THEN NULL;
  END;
  
  BEGIN
    ALTER TABLE properties ADD COLUMN cancellation_policy TEXT DEFAULT 'fair';
  EXCEPTION
    WHEN duplicate_column THEN NULL;
  END;
END $$;

-- Update lat/lng from existing latitude/longitude columns
UPDATE properties SET lat = latitude WHERE lat IS NULL AND latitude IS NOT NULL;
UPDATE properties SET lng = longitude WHERE lng IS NULL AND longitude IS NOT NULL;

-- Create admin check function
CREATE OR REPLACE FUNCTION is_admin(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = $1 
    AND role = 'admin'
  );
END;
$$;

-- Create admin dashboard metrics function
CREATE OR REPLACE FUNCTION admin_dashboard_metrics()
RETURNS TABLE (
  total_users BIGINT,
  total_properties BIGINT,
  total_bookings BIGINT,
  total_host_applications BIGINT,
  pending_applications BIGINT,
  total_tours BIGINT,
  total_transport BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM auth.users) as total_users,
    (SELECT COUNT(*) FROM properties) as total_properties,
    (SELECT COUNT(*) FROM bookings) as total_bookings,
    (SELECT COUNT(*) FROM host_applications) as total_host_applications,
    (SELECT COUNT(*) FROM host_applications WHERE status = 'pending') as pending_applications,
    (SELECT COUNT(*) FROM tours) as total_tours,
    (SELECT COUNT(*) FROM transport_vehicles) as total_transport;
END;
$$;

-- Create admin list users function
CREATE OR REPLACE FUNCTION admin_list_users(_search TEXT DEFAULT '')
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMPTZ,
  roles TEXT[],
  avatar_url TEXT,
  phone TEXT,
  last_sign_in_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    au.id as user_id,
    au.email,
    p.full_name,
    au.created_at,
    COALESCE(
      ARRAY(
        SELECT ur.role::TEXT 
        FROM user_roles ur 
        WHERE ur.user_id = au.id
      ), 
      ARRAY[]::TEXT[]
    ) as roles,
    p.avatar_url,
    p.phone,
    au.last_sign_in_at
  FROM auth.users au
  LEFT JOIN profiles p ON p.user_id = au.id
  WHERE 
    CASE 
      WHEN _search = '' OR _search IS NULL THEN TRUE
      ELSE (
        au.email ILIKE '%' || _search || '%' OR 
        COALESCE(p.full_name, '') ILIKE '%' || _search || '%' OR
        COALESCE(p.phone, '') ILIKE '%' || _search || '%'
      )
    END
  ORDER BY au.created_at DESC;
END;
$$;

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE host_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE tours ENABLE ROW LEVEL SECURITY;
ALTER TABLE transport_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE transport_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_reviews ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can insert any profile" ON profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
DROP POLICY IF EXISTS "Admins can delete any profile" ON profiles;

DROP POLICY IF EXISTS "Admins can view all host applications" ON host_applications;
DROP POLICY IF EXISTS "Admins can insert any host application" ON host_applications;
DROP POLICY IF EXISTS "Admins can update any host application" ON host_applications;
DROP POLICY IF EXISTS "Admins can delete any host application" ON host_applications;

DROP POLICY IF EXISTS "Admins can view all properties" ON properties;
DROP POLICY IF EXISTS "Admins can insert any property" ON properties;
DROP POLICY IF EXISTS "Admins can update any property" ON properties;
DROP POLICY IF EXISTS "Admins can delete any property" ON properties;

DROP POLICY IF EXISTS "Admins can view all bookings" ON bookings;
DROP POLICY IF EXISTS "Admins can insert any booking" ON bookings;
DROP POLICY IF EXISTS "Admins can update any booking" ON bookings;
DROP POLICY IF EXISTS "Admins can delete any booking" ON bookings;

DROP POLICY IF EXISTS "Admins can view all tours" ON tours;
DROP POLICY IF EXISTS "Admins can insert any tour" ON tours;
DROP POLICY IF EXISTS "Admins can update any tour" ON tours;
DROP POLICY IF EXISTS "Admins can delete any tour" ON tours;

DROP POLICY IF EXISTS "Admins can view all transport vehicles" ON transport_vehicles;
DROP POLICY IF EXISTS "Admins can insert any transport vehicle" ON transport_vehicles;
DROP POLICY IF EXISTS "Admins can update any transport vehicle" ON transport_vehicles;
DROP POLICY IF EXISTS "Admins can delete any transport vehicle" ON transport_vehicles;

DROP POLICY IF EXISTS "Admins can view all transport routes" ON transport_routes;
DROP POLICY IF EXISTS "Admins can insert any transport route" ON transport_routes;
DROP POLICY IF EXISTS "Admins can update any transport route" ON transport_routes;
DROP POLICY IF EXISTS "Admins can delete any transport route" ON transport_routes;

DROP POLICY IF EXISTS "Admins can view all user roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can insert any user role" ON user_roles;
DROP POLICY IF EXISTS "Admins can update any user role" ON user_roles;
DROP POLICY IF EXISTS "Admins can delete any user role" ON user_roles;

DROP POLICY IF EXISTS "Admins can view all reviews" ON property_reviews;
DROP POLICY IF EXISTS "Admins can insert any review" ON property_reviews;
DROP POLICY IF EXISTS "Admins can update any review" ON property_reviews;
DROP POLICY IF EXISTS "Admins can delete any review" ON property_reviews;

-- Create admin policies for all tables
CREATE POLICY "Admins can view all profiles" ON profiles FOR SELECT USING (is_admin());
CREATE POLICY "Admins can insert any profile" ON profiles FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admins can update any profile" ON profiles FOR UPDATE USING (is_admin());
CREATE POLICY "Admins can delete any profile" ON profiles FOR DELETE USING (is_admin());

CREATE POLICY "Admins can view all host applications" ON host_applications FOR SELECT USING (is_admin());
CREATE POLICY "Admins can insert any host application" ON host_applications FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admins can update any host application" ON host_applications FOR UPDATE USING (is_admin());
CREATE POLICY "Admins can delete any host application" ON host_applications FOR DELETE USING (is_admin());

CREATE POLICY "Admins can view all properties" ON properties FOR SELECT USING (is_admin());
CREATE POLICY "Admins can insert any property" ON properties FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admins can update any property" ON properties FOR UPDATE USING (is_admin());
CREATE POLICY "Admins can delete any property" ON properties FOR DELETE USING (is_admin());

CREATE POLICY "Admins can view all bookings" ON bookings FOR SELECT USING (is_admin());
CREATE POLICY "Admins can insert any booking" ON bookings FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admins can update any booking" ON bookings FOR UPDATE USING (is_admin());
CREATE POLICY "Admins can delete any booking" ON bookings FOR DELETE USING (is_admin());

CREATE POLICY "Admins can view all tours" ON tours FOR SELECT USING (is_admin());
CREATE POLICY "Admins can insert any tour" ON tours FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admins can update any tour" ON tours FOR UPDATE USING (is_admin());
CREATE POLICY "Admins can delete any tour" ON tours FOR DELETE USING (is_admin());

CREATE POLICY "Admins can view all transport vehicles" ON transport_vehicles FOR SELECT USING (is_admin());
CREATE POLICY "Admins can insert any transport vehicle" ON transport_vehicles FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admins can update any transport vehicle" ON transport_vehicles FOR UPDATE USING (is_admin());
CREATE POLICY "Admins can delete any transport vehicle" ON transport_vehicles FOR DELETE USING (is_admin());

CREATE POLICY "Admins can view all transport routes" ON transport_routes FOR SELECT USING (is_admin());
CREATE POLICY "Admins can insert any transport route" ON transport_routes FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admins can update any transport route" ON transport_routes FOR UPDATE USING (is_admin());
CREATE POLICY "Admins can delete any transport route" ON transport_routes FOR DELETE USING (is_admin());

CREATE POLICY "Admins can view all user roles" ON user_roles FOR SELECT USING (is_admin());
CREATE POLICY "Admins can insert any user role" ON user_roles FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admins can update any user role" ON user_roles FOR UPDATE USING (is_admin());
CREATE POLICY "Admins can delete any user role" ON user_roles FOR DELETE USING (is_admin());

CREATE POLICY "Admins can view all reviews" ON property_reviews FOR SELECT USING (is_admin());
CREATE POLICY "Admins can insert any review" ON property_reviews FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admins can update any review" ON property_reviews FOR UPDATE USING (is_admin());
CREATE POLICY "Admins can delete any review" ON property_reviews FOR DELETE USING (is_admin());

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION admin_dashboard_metrics() TO authenticated;
GRANT EXECUTE ON FUNCTION admin_list_users(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin(UUID) TO authenticated;

-- Ensure admin role exists for bebisdavy@gmail.com
INSERT INTO user_roles (user_id, role) 
SELECT id, 'admin'::app_role 
FROM auth.users 
WHERE email = 'bebisdavy@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';