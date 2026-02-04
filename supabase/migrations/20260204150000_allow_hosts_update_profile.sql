-- Allow hosts to update their own profile fields in host_applications
-- This enables hosts to complete their profile by uploading documents

-- Drop if exists first
DROP POLICY IF EXISTS "Hosts can update their own profile" ON host_applications;

-- Create policy allowing hosts to update their own application record
CREATE POLICY "Hosts can update their own profile" ON host_applications
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Also ensure hosts can SELECT their own application
DROP POLICY IF EXISTS "Hosts can view their own application" ON host_applications;
CREATE POLICY "Hosts can view their own application" ON host_applications
FOR SELECT
USING (user_id = auth.uid());

-- Add comment
COMMENT ON POLICY "Hosts can update their own profile" ON host_applications IS 
  'Allows approved hosts to update their own application record to complete their profile';
