-- Comprehensive RLS policies to ensure all staff can see all data
-- This ensures data consistency across all dashboards

-- =============================================
-- ADMIN POLICIES - Full access to everything
-- =============================================

-- Tours table
DROP POLICY IF EXISTS "Admins can view all tours" ON tours;
CREATE POLICY "Admins can view all tours"
  ON tours FOR SELECT
  USING (is_admin());

DROP POLICY IF EXISTS "Admins can manage tours" ON tours;
CREATE POLICY "Admins can manage tours"
  ON tours FOR ALL
  USING (is_admin());

-- Tour packages table
DROP POLICY IF EXISTS "Admins can view all tour packages" ON tour_packages;
CREATE POLICY "Admins can view all tour packages"
  ON tour_packages FOR SELECT
  USING (is_admin());

DROP POLICY IF EXISTS "Admins can manage tour packages" ON tour_packages;
CREATE POLICY "Admins can manage tour packages"
  ON tour_packages FOR ALL
  USING (is_admin());

-- =============================================
-- OPERATIONS STAFF - Can view and manage operational data
-- =============================================

-- Tours
DROP POLICY IF EXISTS "Operations staff can view all tours" ON tours;
CREATE POLICY "Operations staff can view all tours"
  ON tours FOR SELECT
  USING (is_operations_staff());

-- =============================================
-- FINANCIAL STAFF - Can view financial data
-- =============================================

-- Tours
DROP POLICY IF EXISTS "Financial staff can view all tours" ON tours;
CREATE POLICY "Financial staff can view all tours"
  ON tours FOR SELECT
  USING (is_financial_staff());

-- Tour packages
DROP POLICY IF EXISTS "Financial staff can view all tour packages" ON tour_packages;
CREATE POLICY "Financial staff can view all tour packages"
  ON tour_packages FOR SELECT
  USING (is_financial_staff());

-- =============================================
-- HOST POLICIES - Can view their own bookings
-- =============================================

-- Hosts can view bookings for their properties
DROP POLICY IF EXISTS "Hosts can view their property bookings" ON bookings;
CREATE POLICY "Hosts can view their property bookings"
  ON bookings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = bookings.property_id
      AND properties.host_id = auth.uid()
    )
  );

-- =============================================
-- GRANT EXECUTE ON ALL HELPER FUNCTIONS
-- =============================================

-- Ensure all authenticated users can execute the helper functions
GRANT EXECUTE ON FUNCTION is_admin TO authenticated, anon;
GRANT EXECUTE ON FUNCTION is_financial_staff TO authenticated, anon;
GRANT EXECUTE ON FUNCTION is_operations_staff TO authenticated, anon;
GRANT EXECUTE ON FUNCTION is_customer_support TO authenticated, anon;
GRANT EXECUTE ON FUNCTION is_any_staff TO authenticated, anon;

-- =============================================
-- PUBLIC ACCESS POLICIES
-- =============================================

-- Anyone can view published tours
DROP POLICY IF EXISTS "Anyone can view published tours" ON tours;
CREATE POLICY "Anyone can view published tours"
  ON tours FOR SELECT
  USING (is_published = true OR is_admin() OR is_operations_staff() OR created_by = auth.uid());

-- Anyone can view approved tour packages
DROP POLICY IF EXISTS "Anyone can view approved tour packages" ON tour_packages;
CREATE POLICY "Anyone can view approved tour packages"
  ON tour_packages FOR SELECT
  USING (status = 'approved' OR is_admin() OR is_operations_staff() OR host_id = auth.uid());

-- =============================================
-- REFRESH SCHEMA CACHE
-- =============================================

NOTIFY pgrst, 'reload schema';
