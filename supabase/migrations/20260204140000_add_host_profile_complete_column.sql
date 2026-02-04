-- Add profile_complete column to host_applications table
-- This column tracks whether the host has completed their profile with required documents

ALTER TABLE host_applications 
ADD COLUMN IF NOT EXISTS profile_complete BOOLEAN DEFAULT FALSE;

-- Add tour_license_url column for tour guides
ALTER TABLE host_applications 
ADD COLUMN IF NOT EXISTS tour_license_url TEXT;

-- Add rdb_certificate_url column for business registration
ALTER TABLE host_applications 
ADD COLUMN IF NOT EXISTS rdb_certificate_url TEXT;

-- Create an index for faster queries on profile_complete
CREATE INDEX IF NOT EXISTS idx_host_applications_profile_complete 
ON host_applications(profile_complete) WHERE profile_complete = true;

-- Add comment
COMMENT ON COLUMN host_applications.profile_complete IS 'Whether the host has completed all required profile information and documents';
