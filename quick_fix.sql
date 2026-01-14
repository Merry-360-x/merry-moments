-- Quick fixes for immediate admin access
-- Add missing columns to existing tables

-- Add missing columns to properties table
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS main_image TEXT,
ADD COLUMN IF NOT EXISTS lat NUMERIC,
ADD COLUMN IF NOT EXISTS lng NUMERIC,
ADD COLUMN IF NOT EXISTS weekly_discount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS monthly_discount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS cancellation_policy TEXT DEFAULT 'fair';

-- Add missing columns to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS loyalty_points INTEGER DEFAULT 0;

-- Update lat/lng from existing latitude/longitude columns
UPDATE properties SET lat = latitude WHERE lat IS NULL AND latitude IS NOT NULL;
UPDATE properties SET lng = longitude WHERE lng IS NULL AND longitude IS NOT NULL;

-- Ensure admin role exists for bebisdavy@gmail.com
INSERT INTO user_roles (user_id, role) 
SELECT id, 'admin'::app_role 
FROM auth.users 
WHERE email = 'bebisdavy@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;