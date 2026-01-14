-- Fix RLS policies to ensure proper access for all user types
-- Issue: Properties not showing for authenticated users
-- Issue: Admin dashboard not accessible

-- ==============================================
-- PROPERTIES TABLE POLICIES
-- ==============================================

-- Drop all existing properties policies
DROP POLICY IF EXISTS "Properties are viewable by everyone" ON properties;
DROP POLICY IF EXISTS "Published properties viewable by all" ON properties;
DROP POLICY IF EXISTS "Hosts can insert own properties" ON properties;
DROP POLICY IF EXISTS "Hosts can update own properties" ON properties;
DROP POLICY IF EXISTS "Hosts can delete own properties" ON properties;
DROP POLICY IF EXISTS "Admins can view all properties" ON properties;
DROP POLICY IF EXISTS "Admins can insert any property" ON properties;
DROP POLICY IF EXISTS "Admins can update any property" ON properties;
DROP POLICY IF EXISTS "Admins can delete any property" ON properties;
DROP POLICY IF EXISTS "Admins can manage all properties" ON properties;

-- Create clear, non-conflicting policies

-- 1. Everyone (anon + authenticated) can view published properties
CREATE POLICY "Anyone can view published properties"
ON properties FOR SELECT
TO authenticated, anon
USING (is_published = true);

-- 2. Hosts can view their own properties (published or not)
CREATE POLICY "Hosts can view own properties"
ON properties FOR SELECT
TO authenticated
USING (auth.uid() = host_id);

-- 3. Admins can view ALL properties  
CREATE POLICY "Admins can view all properties"
ON properties FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
    LIMIT 1
  )
);

-- 4. Hosts can insert their own properties
CREATE POLICY "Hosts can create properties"
ON properties FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = host_id);

-- 5. Hosts can update their own properties
CREATE POLICY "Hosts can update own properties"
ON properties FOR UPDATE
TO authenticated
USING (auth.uid() = host_id)
WITH CHECK (auth.uid() = host_id);

-- 6. Hosts can delete their own properties
CREATE POLICY "Hosts can delete own properties"
ON properties FOR DELETE
TO authenticated
USING (auth.uid() = host_id);

-- 7. Admins can do everything with properties
CREATE POLICY "Admins can manage all properties"
ON properties FOR ALL
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

-- ==============================================
-- USER_ROLES TABLE POLICIES  
-- ==============================================

-- Ensure these are non-recursive (already fixed in previous migration)
-- Just verify they exist

DO $$ 
BEGIN
  -- Check if policies exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_roles' 
    AND policyname = 'Users can view own roles'
  ) THEN
    CREATE POLICY "Users can view own roles"
    ON user_roles FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_roles' 
    AND policyname = 'Admins can view all roles'
  ) THEN
    CREATE POLICY "Admins can view all roles"
    ON user_roles FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid()
        AND role = 'admin'
        LIMIT 1
      )
    );
  END IF;
END $$;

-- ==============================================
-- TOURS TABLE POLICIES
-- ==============================================

DROP POLICY IF EXISTS "Anyone can view published tours" ON tours;
DROP POLICY IF EXISTS "Admins can view all tours" ON tours;
DROP POLICY IF EXISTS "Admins can manage all tours" ON tours;
DROP POLICY IF EXISTS "Users can create tours" ON tours;

-- Everyone can view published tours
CREATE POLICY "Anyone can view published tours"
ON tours FOR SELECT
TO authenticated, anon
USING (is_published = true);

-- Creators can view their own tours
CREATE POLICY "Creators can view own tours"
ON tours FOR SELECT
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

-- Admins can manage all tours
CREATE POLICY "Admins can manage all tours"
ON tours FOR ALL
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

-- ==============================================
-- TRANSPORT_VEHICLES TABLE POLICIES
-- ==============================================

DROP POLICY IF EXISTS "Anyone can view published vehicles" ON transport_vehicles;
DROP POLICY IF EXISTS "Admins can view all vehicles" ON transport_vehicles;
DROP POLICY IF EXISTS "Admins can manage all vehicles" ON transport_vehicles;

-- Everyone can view published vehicles
CREATE POLICY "Anyone can view published vehicles"
ON transport_vehicles FOR SELECT
TO authenticated, anon
USING (is_published = true);

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

-- ==============================================
-- BOOKINGS TABLE POLICIES
-- ==============================================

DROP POLICY IF EXISTS "Users can view own bookings" ON bookings;
DROP POLICY IF EXISTS "Users can create bookings" ON bookings;
DROP POLICY IF EXISTS "Admins can view all bookings" ON bookings;

-- Users can view their own bookings
CREATE POLICY "Users can view own bookings"
ON bookings FOR SELECT
TO authenticated
USING (guest_id = auth.uid());

-- Users can create bookings
CREATE POLICY "Users can create bookings"
ON bookings FOR INSERT
TO authenticated
WITH CHECK (guest_id = auth.uid());

-- Admins can view all bookings
CREATE POLICY "Admins can view all bookings"
ON bookings FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
    LIMIT 1
  )
);

-- Admins can manage all bookings
CREATE POLICY "Admins can manage all bookings"
ON bookings FOR ALL
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
