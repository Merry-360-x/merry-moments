-- Verify and fix RLS policies for staff access to bookings

-- Ensure RLS is enabled on bookings
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Ensure RLS is enabled on checkout_requests  
ALTER TABLE checkout_requests ENABLE ROW LEVEL SECURITY;

-- Grant usage on the public schema functions to authenticated users
GRANT EXECUTE ON FUNCTION is_financial_staff TO authenticated;
GRANT EXECUTE ON FUNCTION is_operations_staff TO authenticated;
GRANT EXECUTE ON FUNCTION is_customer_support TO authenticated;
GRANT EXECUTE ON FUNCTION is_any_staff TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin TO authenticated;

-- Ensure staff policies exist for checkout_requests
DROP POLICY IF EXISTS "Financial staff can view all checkout requests" ON checkout_requests;
CREATE POLICY "Financial staff can view all checkout requests"
  ON checkout_requests
  FOR SELECT
  USING (is_financial_staff());

DROP POLICY IF EXISTS "Operations staff can view all checkout requests" ON checkout_requests;
CREATE POLICY "Operations staff can view all checkout requests"
  ON checkout_requests
  FOR SELECT
  USING (is_operations_staff());

DROP POLICY IF EXISTS "Customer support can view all checkout requests" ON checkout_requests;
CREATE POLICY "Customer support can view all checkout requests"
  ON checkout_requests
  FOR SELECT
  USING (is_customer_support());

-- Add admin policies for checkout_requests
DROP POLICY IF EXISTS "Admins can view all checkout requests" ON checkout_requests;
CREATE POLICY "Admins can view all checkout requests"
  ON checkout_requests
  FOR SELECT
  USING (is_admin());

DROP POLICY IF EXISTS "Admins can manage checkout requests" ON checkout_requests;
CREATE POLICY "Admins can manage checkout requests"
  ON checkout_requests
  FOR ALL
  USING (is_admin());
