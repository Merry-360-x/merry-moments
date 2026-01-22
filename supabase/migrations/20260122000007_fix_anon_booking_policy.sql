-- Fix booking RLS to allow both authenticated and anonymous inserts
ALTER TABLE bookings DISABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Anyone can create bookings" ON bookings;
DROP POLICY IF EXISTS "Users can view own bookings" ON bookings;
DROP POLICY IF EXISTS "Admins can view all bookings" ON bookings;
DROP POLICY IF EXISTS "Admins can manage bookings" ON bookings;

-- Create policies for inserts (allow both anon and authenticated)
CREATE POLICY "Anon users can create bookings"
ON bookings FOR INSERT
TO anon
WITH CHECK (TRUE);

CREATE POLICY "Authenticated users can create bookings"
ON bookings FOR INSERT
TO authenticated
WITH CHECK (TRUE);

-- Create policies for SELECT
CREATE POLICY "Users can view own bookings"
ON bookings FOR SELECT
TO authenticated
USING (guest_id = auth.uid());

CREATE POLICY "Admins can view all bookings"
ON bookings FOR SELECT
TO authenticated
USING (public.is_admin() = TRUE);

-- Create policies for UPDATE and DELETE (admins only)
CREATE POLICY "Admins can update bookings"
ON bookings FOR UPDATE
TO authenticated
USING (public.is_admin() = TRUE)
WITH CHECK (public.is_admin() = TRUE);

CREATE POLICY "Admins can delete bookings"
ON bookings FOR DELETE
TO authenticated
USING (public.is_admin() = TRUE);
