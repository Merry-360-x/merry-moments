-- Migration: Grant staff roles access to their respective data
-- Financial staff: View all bookings and payment data
-- Operations staff: View and manage applications, properties, tours, transport, bookings
-- Customer support: View user profiles and bookings

-- =============================================
-- FINANCIAL STAFF POLICIES
-- =============================================

-- Financial staff can view all bookings
CREATE POLICY "Financial staff can view all bookings"
ON bookings FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('financial_staff', 'admin')
  )
);

-- =============================================
-- OPERATIONS STAFF POLICIES
-- =============================================

-- Operations staff can view all host applications
CREATE POLICY "Operations staff can view all host applications"
ON host_applications FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('operations_staff', 'admin')
  )
);

-- Operations staff can update host applications (approve/reject)
CREATE POLICY "Operations staff can update host applications"
ON host_applications FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('operations_staff', 'admin')
  )
);

-- Operations staff can view all properties
CREATE POLICY "Operations staff can view all properties"
ON properties FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('operations_staff', 'admin')
  )
);

-- Operations staff can update properties (approve/manage)
CREATE POLICY "Operations staff can update properties"
ON properties FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('operations_staff', 'admin')
  )
);

-- Operations staff can view all tour packages
CREATE POLICY "Operations staff can view all tour packages"
ON tour_packages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('operations_staff', 'admin')
  )
);

-- Operations staff can update tour packages
CREATE POLICY "Operations staff can update tour packages"
ON tour_packages FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('operations_staff', 'admin')
  )
);

-- Operations staff can view all transport vehicles
CREATE POLICY "Operations staff can view all transport vehicles"
ON transport_vehicles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('operations_staff', 'admin')
  )
);

-- Operations staff can update transport vehicles
CREATE POLICY "Operations staff can update transport vehicles"
ON transport_vehicles FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('operations_staff', 'admin')
  )
);

-- Operations staff can view all transport routes
CREATE POLICY "Operations staff can view all transport routes"
ON transport_routes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('operations_staff', 'admin')
  )
);

-- Operations staff can update transport routes
CREATE POLICY "Operations staff can update transport routes"
ON transport_routes FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('operations_staff', 'admin')
  )
);

-- Operations staff can view all bookings
CREATE POLICY "Operations staff can view all bookings"
ON bookings FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('operations_staff', 'admin')
  )
);

-- Operations staff can update bookings (confirm/manage)
CREATE POLICY "Operations staff can update bookings"
ON bookings FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('operations_staff', 'admin')
  )
);

-- =============================================
-- CUSTOMER SUPPORT POLICIES
-- =============================================

-- Customer support can view all user profiles
CREATE POLICY "Customer support can view all profiles"
ON profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('customer_support', 'admin')
  )
);

-- Customer support can view all bookings (for support inquiries)
CREATE POLICY "Customer support can view all bookings"
ON bookings FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('customer_support', 'admin')
  )
);

-- =============================================
-- ADDITIONAL: Ensure user_roles table is accessible
-- =============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own roles" ON user_roles;
DROP POLICY IF EXISTS "Staff can view all roles" ON user_roles;

-- All authenticated users can view their own roles
CREATE POLICY "Users can view own roles"
ON user_roles FOR SELECT
USING (auth.uid() = user_id);

-- Staff can view all roles (for admin interface)
CREATE POLICY "Staff can view all roles"
ON user_roles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('admin', 'financial_staff', 'operations_staff', 'customer_support')
  )
);
