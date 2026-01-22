-- Fix tours table RLS access for anonymous and authenticated users
-- Drop existing policies and recreate them properly

-- First, enable RLS on tours table
ALTER TABLE tours ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies on tours
DROP POLICY IF EXISTS "Anyone can view published tours" ON tours;
DROP POLICY IF EXISTS "Creators can view own tours" ON tours;
DROP POLICY IF EXISTS "Hosts can create tours" ON tours;
DROP POLICY IF EXISTS "Creators can update own tours" ON tours;
DROP POLICY IF EXISTS "Creators can delete own tours" ON tours;
DROP POLICY IF EXISTS "Admins can view all tours" ON tours;
DROP POLICY IF EXISTS "Admins can manage all tours" ON tours;
DROP POLICY IF EXISTS "Admins can insert any tour" ON tours;
DROP POLICY IF EXISTS "Admins can update any tour" ON tours;
DROP POLICY IF EXISTS "Admins can delete any tour" ON tours;

-- Create new policies with proper permissions

-- 1. ANYONE (including anonymous) can view published tours
CREATE POLICY "Anyone can view published tours"
ON tours FOR SELECT
USING (is_published = true);

-- 2. Authenticated users can view their own tours (published or not)
CREATE POLICY "Creators can view own tours"
ON tours FOR SELECT
TO authenticated
USING (auth.uid() = created_by);

-- 3. Admins can view ALL tours
CREATE POLICY "Admins can view all tours"
ON tours FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- 4. Hosts can create tours
CREATE POLICY "Hosts can create tours"
ON tours FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = created_by
  AND (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('host', 'admin')
    )
  )
);

-- 5. Creators can update their own tours
CREATE POLICY "Creators can update own tours"
ON tours FOR UPDATE
TO authenticated
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

-- 6. Creators can delete their own tours
CREATE POLICY "Creators can delete own tours"
ON tours FOR DELETE
TO authenticated
USING (auth.uid() = created_by);

-- 7. Admins can manage all tours (insert/update/delete)
CREATE POLICY "Admins can insert tours"
ON tours FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

CREATE POLICY "Admins can update all tours"
ON tours FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

CREATE POLICY "Admins can delete all tours"
ON tours FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- Grant SELECT permission to anon role on tours table
GRANT SELECT ON tours TO anon;
GRANT SELECT ON tours TO authenticated;

-- Also ensure tour_packages has similar policies
ALTER TABLE tour_packages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view published tour packages" ON tour_packages;
DROP POLICY IF EXISTS "Hosts can view own packages" ON tour_packages;
DROP POLICY IF EXISTS "Admins can view all packages" ON tour_packages;

-- Anyone can view published tour packages
CREATE POLICY "Anyone can view published tour packages"
ON tour_packages FOR SELECT
USING (is_published = true);

-- Hosts can view their own packages
CREATE POLICY "Hosts can view own packages"
ON tour_packages FOR SELECT
TO authenticated
USING (auth.uid() = host_id);

-- Admins can view all packages
CREATE POLICY "Admins can view all packages"
ON tour_packages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- Grant permissions on tour_packages
GRANT SELECT ON tour_packages TO anon;
GRANT SELECT ON tour_packages TO authenticated;
