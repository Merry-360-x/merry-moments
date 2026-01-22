-- Temporarily disable RLS on bookings to allow testing, then re-enable with correct policies
ALTER TABLE bookings DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Drop all existing booking policies to start fresh
DROP POLICY IF EXISTS "Admins can view all bookings" ON bookings;
DROP POLICY IF EXISTS "Admins can manage all bookings" ON bookings;
DROP POLICY IF EXISTS "Admins can insert any booking" ON bookings;
DROP POLICY IF EXISTS "Admins can update any booking" ON bookings;
DROP POLICY IF EXISTS "Admins can delete any booking" ON bookings;
DROP POLICY IF EXISTS "Users can view own bookings" ON bookings;
DROP POLICY IF EXISTS "Users can create bookings" ON bookings;
DROP POLICY IF EXISTS "Allow guest bookings" ON bookings;

-- Create new, clean policies
-- 1. Allow anyone (authenticated or not) to create bookings
CREATE POLICY "Anyone can create bookings"
ON bookings FOR INSERT
WITH CHECK (TRUE);

-- 2. Authenticated users can view their own bookings
CREATE POLICY "Users can view own bookings"
ON bookings FOR SELECT
TO authenticated
USING (guest_id = auth.uid());

-- 3. Admins can view all bookings
CREATE POLICY "Admins can view all bookings"
ON bookings FOR SELECT
TO authenticated
USING (public.is_admin() = TRUE);

-- 4. Admins can update and delete bookings
CREATE POLICY "Admins can manage bookings"
ON bookings FOR ALL
TO authenticated
USING (public.is_admin() = TRUE)
WITH CHECK (public.is_admin() = TRUE);
