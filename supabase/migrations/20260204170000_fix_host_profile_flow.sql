-- Fix host profile flow - allow users to insert their own applications
-- and ensure the complete profile flow works correctly

-- Allow users to INSERT their own host application
DROP POLICY IF EXISTS "Users can insert own host application" ON host_applications;
CREATE POLICY "Users can insert own host application" ON host_applications
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Ensure hosts can view their own application (already exists but re-affirm)
DROP POLICY IF EXISTS "Hosts can view their own application" ON host_applications;
CREATE POLICY "Hosts can view their own application" ON host_applications
FOR SELECT
USING (user_id = auth.uid());

-- Ensure hosts can update their own application (already exists but re-affirm)
DROP POLICY IF EXISTS "Hosts can update their own profile" ON host_applications;
CREATE POLICY "Hosts can update their own profile" ON host_applications
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Add profile_complete column if not exists (should already exist from previous migration)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'host_applications' AND column_name = 'profile_complete'
  ) THEN
    ALTER TABLE host_applications ADD COLUMN profile_complete boolean DEFAULT false;
  END IF;
END $$;

-- Add selfie_photo_url column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'host_applications' AND column_name = 'selfie_photo_url'
  ) THEN
    ALTER TABLE host_applications ADD COLUMN selfie_photo_url text;
  END IF;
END $$;

-- Add tour_license_url column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'host_applications' AND column_name = 'tour_license_url'
  ) THEN
    ALTER TABLE host_applications ADD COLUMN tour_license_url text;
  END IF;
END $$;

-- Add rdb_certificate_url column if not exists  
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'host_applications' AND column_name = 'rdb_certificate_url'
  ) THEN
    ALTER TABLE host_applications ADD COLUMN rdb_certificate_url text;
  END IF;
END $$;

COMMENT ON POLICY "Users can insert own host application" ON host_applications IS
  'Allows users to submit their own host application';
