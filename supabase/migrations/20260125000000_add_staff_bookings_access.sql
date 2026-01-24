-- Add RLS policies to allow staff to view bookings
-- This fixes the issue where bookings don't show up on staff dashboards

-- =============================================
-- BOOKINGS TABLE - Staff Access
-- =============================================

-- Allow admins to view all bookings
DROP POLICY IF EXISTS "Admins can view all bookings" ON bookings;
CREATE POLICY "Admins can view all bookings"
  ON bookings FOR SELECT
  USING (is_admin());

-- Allow operations staff to view all bookings
DROP POLICY IF EXISTS "Operations staff can view all bookings" ON bookings;
CREATE POLICY "Operations staff can view all bookings"
  ON bookings FOR SELECT
  USING (is_operations_staff());

-- Allow financial staff to view all bookings
DROP POLICY IF EXISTS "Financial staff can view all bookings" ON bookings;
CREATE POLICY "Financial staff can view all bookings"
  ON bookings FOR SELECT
  USING (is_financial_staff());

-- Allow customer support to view all bookings
DROP POLICY IF EXISTS "Customer support can view all bookings" ON bookings;
CREATE POLICY "Customer support can view all bookings"
  ON bookings FOR SELECT
  USING (is_customer_support());

-- Allow admins to manage bookings
DROP POLICY IF EXISTS "Admins can manage bookings" ON bookings;
CREATE POLICY "Admins can manage bookings"
  ON bookings FOR ALL
  USING (is_admin());

-- =============================================
-- CHECKOUT_REQUESTS TABLE - Staff Access
-- =============================================

-- These were already created, but let's ensure they exist
DROP POLICY IF EXISTS "Operations staff can view checkout requests" ON checkout_requests;
CREATE POLICY "Operations staff can view checkout requests"
  ON checkout_requests FOR SELECT
  USING (is_operations_staff());

DROP POLICY IF EXISTS "Financial staff can view checkout requests" ON checkout_requests;
CREATE POLICY "Financial staff can view checkout requests"
  ON checkout_requests FOR SELECT
  USING (is_financial_staff());

DROP POLICY IF EXISTS "Customer support can view checkout requests" ON checkout_requests;
CREATE POLICY "Customer support can view checkout requests"
  ON checkout_requests FOR SELECT
  USING (is_customer_support());

DROP POLICY IF EXISTS "Admins can view all checkout requests" ON checkout_requests;
CREATE POLICY "Admins can view all checkout requests"
  ON checkout_requests FOR SELECT
  USING (is_admin());

DROP POLICY IF EXISTS "Admins can manage checkout requests" ON checkout_requests;
CREATE POLICY "Admins can manage checkout requests"
  ON checkout_requests FOR ALL
  USING (is_admin());

-- =============================================
-- USERS CAN VIEW THEIR OWN BOOKINGS
-- =============================================

-- Allow users to view their own bookings
DROP POLICY IF EXISTS "Users can view their own bookings" ON bookings;
CREATE POLICY "Users can view their own bookings"
  ON bookings FOR SELECT
  USING (auth.uid() = guest_id);

-- Allow users to view their own checkout requests
DROP POLICY IF EXISTS "Users can view their own checkout requests" ON checkout_requests;
CREATE POLICY "Users can view their own checkout requests"
  ON checkout_requests FOR SELECT
  USING (auth.uid() = user_id);

-- =============================================
-- REFRESH SCHEMA CACHE
-- =============================================

NOTIFY pgrst, 'reload schema';
