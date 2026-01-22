-- Enable hosts to create and manage transport services
-- Migration: 20260122000011_enable_transport_creation.sql

-- ==========================================
-- TRANSPORT VEHICLES POLICIES
-- ==========================================

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view published vehicles" ON transport_vehicles;
DROP POLICY IF EXISTS "Creators can view own vehicles" ON transport_vehicles;
DROP POLICY IF EXISTS "Admins can view all vehicles" ON transport_vehicles;
DROP POLICY IF EXISTS "Admins can manage all vehicles" ON transport_vehicles;

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

-- ==========================================
-- TRANSPORT ROUTES POLICIES
-- ==========================================

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view published routes" ON transport_routes;
DROP POLICY IF EXISTS "Creators can view own routes" ON transport_routes;
DROP POLICY IF EXISTS "Admins can view all routes" ON transport_routes;
DROP POLICY IF EXISTS "Admins can manage all routes" ON transport_routes;

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
