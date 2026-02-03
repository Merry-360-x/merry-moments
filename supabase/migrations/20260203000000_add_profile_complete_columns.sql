-- Add profile completion columns to host_applications table
-- These track whether a host has completed their profile after the simplified onboarding

-- Add profile_complete flag (defaults to false for new auto-approved hosts)
ALTER TABLE host_applications 
ADD COLUMN IF NOT EXISTS profile_complete BOOLEAN DEFAULT false;

-- Add tour_license_url for tour operators
ALTER TABLE host_applications 
ADD COLUMN IF NOT EXISTS tour_license_url TEXT;

-- Add rdb_certificate_url for RDB registration (optional)
ALTER TABLE host_applications 
ADD COLUMN IF NOT EXISTS rdb_certificate_url TEXT;

-- Update existing approved applications to have profile_complete = true 
-- (they went through the old full application process)
UPDATE host_applications 
SET profile_complete = true 
WHERE status = 'approved' 
  AND profile_complete IS NULL;
