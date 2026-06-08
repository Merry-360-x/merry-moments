-- Schema Alignment - Add missing columns to match Flutter expectations
-- This migration ensures all tables have the columns needed by both Web and Flutter

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Add missing columns to tours table
DO $$
BEGIN
  -- main_image column
  BEGIN
    ALTER TABLE tours ADD COLUMN main_image TEXT;
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;
  
  -- images array column (if not exists)
  BEGIN
    ALTER TABLE tours ADD COLUMN images TEXT[] DEFAULT '{}';
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;
  
  -- max_group_size column
  BEGIN
    ALTER TABLE tours ADD COLUMN max_group_size INTEGER;
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;
END $$;

-- 2. Add missing columns to tour_packages table
DO $$
BEGIN
  -- price_per_person column (alias for price_per_adult)
  BEGIN
    ALTER TABLE tour_packages ADD COLUMN price_per_person NUMERIC;
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;
  
  -- max_guests column
  BEGIN
    ALTER TABLE tour_packages ADD COLUMN max_guests INTEGER;
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;
  
  -- duration column (if not exists)
  BEGIN
    ALTER TABLE tour_packages ADD COLUMN duration TEXT;
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;
END $$;

-- 3. Add missing columns to transport_vehicles table
DO $$
BEGIN
  -- media array column
  BEGIN
    ALTER TABLE transport_vehicles ADD COLUMN media TEXT[] DEFAULT '{}';
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;
  
  -- daily_price column (alias for price_per_day)
  BEGIN
    ALTER TABLE transport_vehicles ADD COLUMN daily_price NUMERIC;
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;
  
  -- owner_id column (alias for created_by)
  BEGIN
    ALTER TABLE transport_vehicles ADD COLUMN owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;
END $$;

-- 4. Add missing columns to properties table
DO $$
BEGIN
  -- name column (alias for title)
  BEGIN
    ALTER TABLE properties ADD COLUMN name TEXT;
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;
  
  -- address column
  BEGIN
    ALTER TABLE properties ADD COLUMN address TEXT;
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;
  
  -- lat/lng columns
  BEGIN
    ALTER TABLE properties ADD COLUMN lat NUMERIC;
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;
  
  BEGIN
    ALTER TABLE properties ADD COLUMN lng NUMERIC;
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;
  
  -- weekly_discount column
  BEGIN
    ALTER TABLE properties ADD COLUMN weekly_discount NUMERIC DEFAULT 0;
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;
  
  -- monthly_discount column
  BEGIN
    ALTER TABLE properties ADD COLUMN monthly_discount NUMERIC DEFAULT 0;
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;
  
  -- cancellation_policy column
  BEGIN
    ALTER TABLE properties ADD COLUMN cancellation_policy TEXT DEFAULT 'fair';
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;
  
  -- check_in_time column
  BEGIN
    ALTER TABLE properties ADD COLUMN check_in_time TEXT DEFAULT '14:00';
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;
  
  -- check_out_time column
  BEGIN
    ALTER TABLE properties ADD COLUMN check_out_time TEXT DEFAULT '11:00';
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;
  
  -- smoking_allowed column
  BEGIN
    ALTER TABLE properties ADD COLUMN smoking_allowed BOOLEAN DEFAULT FALSE;
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;
  
  -- events_allowed column
  BEGIN
    ALTER TABLE properties ADD COLUMN events_allowed BOOLEAN DEFAULT FALSE;
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;
  
  -- pets_allowed column
  BEGIN
    ALTER TABLE properties ADD COLUMN pets_allowed BOOLEAN DEFAULT FALSE;
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;
  
  -- conference_room_price column
  BEGIN
    ALTER TABLE properties ADD COLUMN conference_room_price NUMERIC;
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;
  
  -- conference_room_capacity column
  BEGIN
    ALTER TABLE properties ADD COLUMN conference_room_capacity INTEGER;
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;
  
  -- conference_room_duration_hours column
  BEGIN
    ALTER TABLE properties ADD COLUMN conference_room_duration_hours NUMERIC;
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;
  
  -- conference_room_equipment column
  BEGIN
    ALTER TABLE properties ADD COLUMN conference_room_equipment TEXT[];
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;
  
  -- breakfast_available column
  BEGIN
    ALTER TABLE properties ADD COLUMN breakfast_available BOOLEAN DEFAULT FALSE;
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;
  
  -- breakfast_price_per_night column
  BEGIN
    ALTER TABLE properties ADD COLUMN breakfast_price_per_night NUMERIC;
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;
  
  -- hotel_id column
  BEGIN
    ALTER TABLE properties ADD COLUMN hotel_id UUID;
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;
  
  -- monthly_only_listing column
  BEGIN
    ALTER TABLE properties ADD COLUMN monthly_only_listing BOOLEAN DEFAULT FALSE;
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;
  
  -- available_for_monthly_rental column
  BEGIN
    ALTER TABLE properties ADD COLUMN available_for_monthly_rental BOOLEAN DEFAULT FALSE;
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;
  
  -- price_per_month column
  BEGIN
    ALTER TABLE properties ADD COLUMN price_per_month NUMERIC;
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;
END $$;

-- 5. Update lat/lng from existing latitude/longitude columns
UPDATE properties SET lat = latitude WHERE lat IS NULL AND latitude IS NOT NULL;
UPDATE properties SET lng = longitude WHERE lng IS NULL AND longitude IS NOT NULL;

-- 6. Add missing columns to profiles table
DO $$
BEGIN
  -- loyalty_points column
  BEGIN
    ALTER TABLE profiles ADD COLUMN loyalty_points INTEGER DEFAULT 0;
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;
  
  -- currency column
  BEGIN
    ALTER TABLE profiles ADD COLUMN currency TEXT DEFAULT 'RWF';
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;
  
  -- language column
  BEGIN
    ALTER TABLE profiles ADD COLUMN language TEXT DEFAULT 'en';
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;
  
  -- profile_completed column
  BEGIN
    ALTER TABLE profiles ADD COLUMN profile_completed BOOLEAN DEFAULT FALSE;
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;
  
  -- is_suspended column
  BEGIN
    ALTER TABLE profiles ADD COLUMN is_suspended BOOLEAN DEFAULT FALSE;
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;
END $$;

-- 7. Add missing columns to bookings table
DO $$
BEGIN
  -- host_id column
  BEGIN
    ALTER TABLE bookings ADD COLUMN host_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;
  
  -- booking_type column
  BEGIN
    ALTER TABLE bookings ADD COLUMN booking_type TEXT;
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;
  
  -- guest_name column
  BEGIN
    ALTER TABLE bookings ADD COLUMN guest_name TEXT;
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;
  
  -- guest_email column
  BEGIN
    ALTER TABLE bookings ADD COLUMN guest_email TEXT;
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;
  
  -- guest_phone column
  BEGIN
    ALTER TABLE bookings ADD COLUMN guest_phone TEXT;
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;
  
  -- payment_status column
  BEGIN
    ALTER TABLE bookings ADD COLUMN payment_status TEXT DEFAULT 'pending';
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;
  
  -- payment_method column
  BEGIN
    ALTER TABLE bookings ADD COLUMN payment_method TEXT;
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;
  
  -- payment_phone column
  BEGIN
    ALTER TABLE bookings ADD COLUMN payment_phone TEXT;
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;
  
  -- special_requests column
  BEGIN
    ALTER TABLE bookings ADD COLUMN special_requests TEXT;
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;
  
  -- is_guest_booking column
  BEGIN
    ALTER TABLE bookings ADD COLUMN is_guest_booking BOOLEAN DEFAULT FALSE;
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;
  
  -- order_id column
  BEGIN
    ALTER TABLE bookings ADD COLUMN order_id UUID;
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;
  
  -- total_price column (if not exists, alias for total_amount)
  BEGIN
    ALTER TABLE bookings ADD COLUMN total_price NUMERIC;
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;
END $$;

-- 8. Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_properties_host_id ON properties(host_id);
CREATE INDEX IF NOT EXISTS idx_properties_is_published ON properties(is_published);
CREATE INDEX IF NOT EXISTS idx_tours_created_by ON tours(created_by);
CREATE INDEX IF NOT EXISTS idx_tours_is_published ON tours(is_published);
CREATE INDEX IF NOT EXISTS idx_tour_packages_host_id ON tour_packages(host_id);
CREATE INDEX IF NOT EXISTS idx_tour_packages_status ON tour_packages(status);
CREATE INDEX IF NOT EXISTS idx_transport_vehicles_created_by ON transport_vehicles(created_by);
CREATE INDEX IF NOT EXISTS idx_transport_vehicles_is_published ON transport_vehicles(is_published);
CREATE INDEX IF NOT EXISTS idx_bookings_guest_id ON bookings(guest_id);
CREATE INDEX IF NOT EXISTS idx_bookings_host_id ON bookings(host_id);
CREATE INDEX IF NOT EXISTS idx_bookings_property_id ON bookings(property_id);
CREATE INDEX IF NOT EXISTS idx_bookings_tour_id ON bookings(tour_id);
CREATE INDEX IF NOT EXISTS idx_bookings_transport_id ON bookings(transport_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);

-- 9. Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';