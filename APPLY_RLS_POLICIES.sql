-- ============================================================================
-- COMPLETE RLS POLICY SETUP FOR TOURS AND TRANSPORT
-- Run this entire file in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- TOURS TABLE POLICIES
-- ============================================================================

-- Drop ALL existing tour policies
DO $$ 
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'tours') LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON tours';
  END LOOP;
END $$;

-- Public can view published tours
CREATE POLICY "Anyone can view published tours"
ON tours FOR SELECT
TO authenticated, anon
USING (is_published = true);

-- Creators (hosts) can view their own tours
CREATE POLICY "Creators can view own tours"
ON tours FOR SELECT
TO authenticated
USING (auth.uid() = created_by);

-- Hosts can create tours
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
      LIMIT 1
    )
  )
);

-- Creators can update their own tours
CREATE POLICY "Creators can update own tours"
ON tours FOR UPDATE
TO authenticated
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

-- Creators can delete their own tours
CREATE POLICY "Creators can delete own tours"
ON tours FOR DELETE
TO authenticated
USING (auth.uid() = created_by);

-- Admins can view all tours
CREATE POLICY "Admins can view all tours"
ON tours FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
    LIMIT 1
  )
);

-- Admins can insert any tour
CREATE POLICY "Admins can insert any tour"
ON tours FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
    LIMIT 1
  )
);

-- Admins can update any tour
CREATE POLICY "Admins can update any tour"
ON tours FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
    LIMIT 1
  )
);

-- Admins can delete any tour
CREATE POLICY "Admins can delete any tour"
ON tours FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
    LIMIT 1
  )
);

-- ============================================================================
-- TRANSPORT VEHICLES TABLE POLICIES
-- ============================================================================

-- Drop ALL existing vehicle policies
DO $$ 
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'transport_vehicles') LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON transport_vehicles';
  END LOOP;
END $$;

-- Public can view published vehicles
CREATE POLICY "Anyone can view published vehicles"
ON transport_vehicles FOR SELECT
TO authenticated, anon
USING (is_published = true);

-- Creators can view their own vehicles
CREATE POLICY "Creators can view own vehicles"
ON transport_vehicles FOR SELECT
TO authenticated
USING (auth.uid() = created_by);

-- Hosts can create vehicles
CREATE POLICY "Hosts can create vehicles"
ON transport_vehicles FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = created_by
  AND (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('host', 'admin')
      LIMIT 1
    )
  )
);

-- Creators can update their own vehicles
CREATE POLICY "Creators can update own vehicles"
ON transport_vehicles FOR UPDATE
TO authenticated
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

-- Creators can delete their own vehicles
CREATE POLICY "Creators can delete own vehicles"
ON transport_vehicles FOR DELETE
TO authenticated
USING (auth.uid() = created_by);

-- Admins can view all vehicles
CREATE POLICY "Admins can view all vehicles"
ON transport_vehicles FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
    LIMIT 1
  )
);

-- Admins can manage all vehicles
CREATE POLICY "Admins can manage all vehicles"
ON transport_vehicles FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
    LIMIT 1
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
    LIMIT 1
  )
);

-- ============================================================================
-- TRANSPORT ROUTES TABLE POLICIES
-- ============================================================================

-- Drop ALL existing route policies
DO $$ 
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'transport_routes') LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON transport_routes';
  END LOOP;
END $$;

-- Public can view published routes
CREATE POLICY "Anyone can view published routes"
ON transport_routes FOR SELECT
TO authenticated, anon
USING (is_published = true);

-- Creators can view their own routes
CREATE POLICY "Creators can view own routes"
ON transport_routes FOR SELECT
TO authenticated
USING (auth.uid() = created_by);

-- Hosts can create routes
CREATE POLICY "Hosts can create routes"
ON transport_routes FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = created_by
  AND (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('host', 'admin')
      LIMIT 1
    )
  )
);

-- Creators can update their own routes
CREATE POLICY "Creators can update own routes"
ON transport_routes FOR UPDATE
TO authenticated
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

-- Creators can delete their own routes
CREATE POLICY "Creators can delete own routes"
ON transport_routes FOR DELETE
TO authenticated
USING (auth.uid() = created_by);

-- Admins can view all routes
CREATE POLICY "Admins can view all routes"
ON transport_routes FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
    LIMIT 1
  )
);

-- Admins can manage all routes
CREATE POLICY "Admins can manage all routes"
ON transport_routes FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
    LIMIT 1
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
    LIMIT 1
  )
);

-- ============================================================================
-- VERIFICATION - Check applied policies
-- ============================================================================

SELECT 
  tablename,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename IN ('tours', 'transport_vehicles', 'transport_routes')
ORDER BY tablename, policyname;
