-- Allow guest (unauthenticated) bookings
-- This policy allows anyone to create a booking record
-- Guest bookings are identified by is_guest_booking = TRUE

DROP POLICY IF EXISTS "Allow guest bookings" ON bookings;
CREATE POLICY "Allow guest bookings"
ON bookings FOR INSERT
TO anon
WITH CHECK (is_guest_booking = TRUE);

-- Also allow authenticated users to create bookings
DROP POLICY IF EXISTS "Users can create bookings" ON bookings;
CREATE POLICY "Users can create bookings"
ON bookings FOR INSERT
TO authenticated
WITH CHECK (TRUE);

-- Allow users to view their own bookings (by guest_id)
DROP POLICY IF EXISTS "Users can view own bookings" ON bookings;
CREATE POLICY "Users can view own bookings"
ON bookings FOR SELECT
TO authenticated
USING (guest_id = auth.uid());
