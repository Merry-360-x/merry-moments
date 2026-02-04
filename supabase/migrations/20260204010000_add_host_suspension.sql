-- Add suspension capability for hosts
-- When a host is suspended, their listings should not be visible

-- Add suspended column to host_applications
ALTER TABLE host_applications 
ADD COLUMN IF NOT EXISTS suspended BOOLEAN DEFAULT false;

-- Add suspension reason
ALTER TABLE host_applications 
ADD COLUMN IF NOT EXISTS suspension_reason TEXT;

-- Add suspended_at timestamp
ALTER TABLE host_applications 
ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;

-- Add suspended_by (admin/staff who suspended)
ALTER TABLE host_applications 
ADD COLUMN IF NOT EXISTS suspended_by UUID REFERENCES auth.users(id);

-- Create index for faster suspended host lookups
CREATE INDEX IF NOT EXISTS idx_host_applications_suspended 
ON host_applications(suspended) WHERE suspended = true;

-- Update RLS policies for properties to exclude suspended hosts
DROP POLICY IF EXISTS "Properties visible to all" ON properties;
CREATE POLICY "Properties visible to all (non-suspended hosts)"
ON properties FOR SELECT
USING (
  is_published = true 
  AND NOT EXISTS (
    SELECT 1 FROM host_applications ha 
    WHERE ha.user_id = properties.host_id 
    AND ha.suspended = true
  )
);

-- Update RLS policies for tours to exclude suspended hosts
DROP POLICY IF EXISTS "Tours visible to all" ON tours;
CREATE POLICY "Tours visible to all (non-suspended hosts)"
ON tours FOR SELECT
USING (
  is_published = true 
  AND NOT EXISTS (
    SELECT 1 FROM host_applications ha 
    WHERE ha.user_id = tours.created_by 
    AND ha.suspended = true
  )
);

-- Update RLS policies for transport_vehicles to exclude suspended hosts
DROP POLICY IF EXISTS "Vehicles visible to all" ON transport_vehicles;
CREATE POLICY "Vehicles visible to all (non-suspended hosts)"
ON transport_vehicles FOR SELECT
USING (
  is_published = true 
  AND NOT EXISTS (
    SELECT 1 FROM host_applications ha 
    WHERE ha.user_id = transport_vehicles.created_by 
    AND ha.suspended = true
  )
);

-- Note: Hosts can still see their own listings when suspended
-- Add policies for hosts to see their own listings
DROP POLICY IF EXISTS "Hosts see own properties" ON properties;
CREATE POLICY "Hosts see own properties"
ON properties FOR SELECT
USING (host_id = auth.uid());

DROP POLICY IF EXISTS "Hosts see own tours" ON tours;
CREATE POLICY "Hosts see own tours"
ON tours FOR SELECT
USING (created_by = auth.uid());

DROP POLICY IF EXISTS "Hosts see own vehicles" ON transport_vehicles;
CREATE POLICY "Hosts see own vehicles"
ON transport_vehicles FOR SELECT
USING (created_by = auth.uid());
