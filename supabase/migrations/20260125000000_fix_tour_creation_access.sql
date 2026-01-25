-- Fix tour creation to allow any authenticated user to create tours
-- The current policy requires users to have a 'host' role which may not be assigned

-- Drop the restrictive policy
DROP POLICY IF EXISTS "Hosts can create tours" ON tours;

-- Allow any authenticated user to create tours with their own user ID
CREATE POLICY "Authenticated users can create tours"
ON tours FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

-- Also update tour_packages to use the same pattern for consistency
DROP POLICY IF EXISTS "Hosts can create own tour packages" ON tour_packages;

CREATE POLICY "Authenticated users can create tour packages"
ON tour_packages FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = host_id);
