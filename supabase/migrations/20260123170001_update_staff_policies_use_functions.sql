-- Update staff policies to use helper functions instead of direct user_roles queries
-- This avoids potential RLS issues and improves performance

-- =============================================
-- FINANCIAL STAFF POLICIES
-- =============================================

DROP POLICY IF EXISTS "Financial staff can view all bookings" ON bookings;
CREATE POLICY "Financial staff can view all bookings"
ON bookings FOR SELECT
USING (is_financial_staff());

-- =============================================
-- OPERATIONS STAFF POLICIES
-- =============================================

DROP POLICY IF EXISTS "Operations staff can view all host applications" ON host_applications;
CREATE POLICY "Operations staff can view all host applications"
ON host_applications FOR SELECT
USING (is_operations_staff());

DROP POLICY IF EXISTS "Operations staff can update host applications" ON host_applications;
CREATE POLICY "Operations staff can update host applications"
ON host_applications FOR UPDATE
USING (is_operations_staff());

DROP POLICY IF EXISTS "Operations staff can view all properties" ON properties;
CREATE POLICY "Operations staff can view all properties"
ON properties FOR SELECT
USING (is_operations_staff());

DROP POLICY IF EXISTS "Operations staff can update properties" ON properties;
CREATE POLICY "Operations staff can update properties"
ON properties FOR UPDATE
USING (is_operations_staff());

DROP POLICY IF EXISTS "Operations staff can view all tour packages" ON tour_packages;
CREATE POLICY "Operations staff can view all tour packages"
ON tour_packages FOR SELECT
USING (is_operations_staff());

DROP POLICY IF EXISTS "Operations staff can update tour packages" ON tour_packages;
CREATE POLICY "Operations staff can update tour packages"
ON tour_packages FOR UPDATE
USING (is_operations_staff());

DROP POLICY IF EXISTS "Operations staff can view all transport vehicles" ON transport_vehicles;
CREATE POLICY "Operations staff can view all transport vehicles"
ON transport_vehicles FOR SELECT
USING (is_operations_staff());

DROP POLICY IF EXISTS "Operations staff can update transport vehicles" ON transport_vehicles;
CREATE POLICY "Operations staff can update transport vehicles"
ON transport_vehicles FOR UPDATE
USING (is_operations_staff());

DROP POLICY IF EXISTS "Operations staff can view all transport routes" ON transport_routes;
CREATE POLICY "Operations staff can view all transport routes"
ON transport_routes FOR SELECT
USING (is_operations_staff());

DROP POLICY IF EXISTS "Operations staff can update transport routes" ON transport_routes;
CREATE POLICY "Operations staff can update transport routes"
ON transport_routes FOR UPDATE
USING (is_operations_staff());

DROP POLICY IF EXISTS "Operations staff can view all bookings" ON bookings;
CREATE POLICY "Operations staff can view all bookings"
ON bookings FOR SELECT
USING (is_operations_staff());

DROP POLICY IF EXISTS "Operations staff can update bookings" ON bookings;
CREATE POLICY "Operations staff can update bookings"
ON bookings FOR UPDATE
USING (is_operations_staff());

-- =============================================
-- CUSTOMER SUPPORT POLICIES
-- =============================================

DROP POLICY IF EXISTS "Customer support can view all profiles" ON profiles;
CREATE POLICY "Customer support can view all profiles"
ON profiles FOR SELECT
USING (is_customer_support());

DROP POLICY IF EXISTS "Customer support can view all bookings" ON bookings;
CREATE POLICY "Customer support can view all bookings"
ON bookings FOR SELECT
USING (is_customer_support());
