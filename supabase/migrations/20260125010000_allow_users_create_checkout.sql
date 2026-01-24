-- Allow users to create their own checkout requests
-- This fixes the issue where cart checkout doesn't work

-- =============================================
-- CHECKOUT_REQUESTS - Allow INSERT for users
-- =============================================

-- Allow authenticated users to create checkout requests
DROP POLICY IF EXISTS "Users can create checkout requests" ON checkout_requests;
CREATE POLICY "Users can create checkout requests"
  ON checkout_requests FOR INSERT
  WITH CHECK (
    -- User can create for themselves
    auth.uid() = user_id
    OR
    -- Or create as guest (user_id is null)
    user_id IS NULL
  );

-- Allow anyone (including anonymous) to create checkout requests
-- This is needed for guest checkout
DROP POLICY IF EXISTS "Anyone can create checkout requests" ON checkout_requests;
CREATE POLICY "Anyone can create checkout requests"
  ON checkout_requests FOR INSERT
  WITH CHECK (true);

-- =============================================
-- BOOKINGS - Allow INSERT for users
-- =============================================

-- Allow users to create their own bookings
DROP POLICY IF EXISTS "Users can create bookings" ON bookings;
CREATE POLICY "Users can create bookings"
  ON bookings FOR INSERT
  WITH CHECK (
    -- User can create booking for themselves
    auth.uid() = guest_id
    OR
    -- Or create as guest (guest_id is null)
    guest_id IS NULL
  );

-- =============================================
-- REFRESH SCHEMA CACHE
-- =============================================

NOTIFY pgrst, 'reload schema';
