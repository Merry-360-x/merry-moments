-- Fix infinite recursion in user_roles policies
-- The problem: Policies check user_roles table while operating on user_roles table

-- Drop all existing policies on user_roles
DROP POLICY IF EXISTS "Users can view own roles" ON user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON user_roles;
DROP POLICY IF EXISTS "Admin can manage all roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON user_roles;
DROP POLICY IF EXISTS "Users can create own guest role" ON user_roles;

-- Create SIMPLE policies that don't reference user_roles table

-- 1. Users can view their own roles (no recursion)
CREATE POLICY "Users can view own roles"
ON user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 2. Users can insert their own initial role (guest only, no recursion)
CREATE POLICY "Users can create own guest role"
ON user_roles FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id 
  AND role = 'guest'
);

-- 3. Service role (backend) can do everything
-- This allows admin operations to happen via backend/RPC functions
-- without triggering policy recursion
GRANT ALL ON user_roles TO service_role;

-- 4. Create a helper function to check if user is admin (in public schema)
-- This function will be called by policies instead of querying user_roles directly
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
    LIMIT 1
  );
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- 5. Admin policies that use the helper function (no recursion because SECURITY DEFINER)
-- Admins can view all roles
CREATE POLICY "Admins can view all roles"
ON user_roles FOR SELECT
TO authenticated
USING (public.is_admin() = true);

-- Admins can insert/update/delete any role
CREATE POLICY "Admins can insert roles"
ON user_roles FOR INSERT
TO authenticated
WITH CHECK (public.is_admin() = true);

CREATE POLICY "Admins can update roles"
ON user_roles FOR UPDATE
TO authenticated
USING (public.is_admin() = true)
WITH CHECK (public.is_admin() = true);

CREATE POLICY "Admins can delete roles"
ON user_roles FOR DELETE
TO authenticated
USING (public.is_admin() = true);

-- Update properties policies to use the helper function
DROP POLICY IF EXISTS "Admins can view all properties" ON properties;
CREATE POLICY "Admins can view all properties"
ON properties FOR SELECT
TO authenticated
USING (public.is_admin() = true);

DROP POLICY IF EXISTS "Admins can manage all properties" ON properties;
CREATE POLICY "Admins can manage all properties"
ON properties FOR ALL
TO authenticated
USING (public.is_admin() = true)
WITH CHECK (public.is_admin() = true);

-- Update tours policies to use the helper function
DROP POLICY IF EXISTS "Admins can view all tours" ON tours;
CREATE POLICY "Admins can view all tours"
ON tours FOR SELECT
TO authenticated
USING (public.is_admin() = true);

DROP POLICY IF EXISTS "Admins can manage all tours" ON tours;
CREATE POLICY "Admins can manage all tours"
ON tours FOR ALL
TO authenticated
USING (public.is_admin() = true)
WITH CHECK (public.is_admin() = true);

-- Update transport_vehicles policies to use the helper function
DROP POLICY IF EXISTS "Admins can view all vehicles" ON transport_vehicles;
CREATE POLICY "Admins can view all vehicles"
ON transport_vehicles FOR SELECT
TO authenticated
USING (public.is_admin() = true);

DROP POLICY IF EXISTS "Admins can manage all vehicles" ON transport_vehicles;
CREATE POLICY "Admins can manage all vehicles"
ON transport_vehicles FOR ALL
TO authenticated
USING (public.is_admin() = true)
WITH CHECK (public.is_admin() = true);

-- Update bookings policies to use the helper function
DROP POLICY IF EXISTS "Admins can view all bookings" ON bookings;
CREATE POLICY "Admins can view all bookings"
ON bookings FOR SELECT
TO authenticated
USING (public.is_admin() = true);

DROP POLICY IF EXISTS "Admins can manage all bookings" ON bookings;
CREATE POLICY "Admins can manage all bookings"
ON bookings FOR ALL
TO authenticated
USING (public.is_admin() = true)
WITH CHECK (public.is_admin() = true);
