-- Grant permissions to admin users for the dashboard metrics function
-- This ensures admins can call the RPC functions

-- Grant execute permission on admin_dashboard_metrics to authenticated users
GRANT EXECUTE ON FUNCTION admin_dashboard_metrics() TO authenticated;

-- Grant execute permission on admin_list_users to authenticated users  
GRANT EXECUTE ON FUNCTION admin_list_users() TO authenticated;

-- Create policy to ensure only admins can access these functions via RLS
-- (The functions themselves will check user roles internally for security)

-- Refresh RLS policies for user_roles table to ensure proper access
DROP POLICY IF EXISTS "Users can view their own roles" ON user_roles;
CREATE POLICY "Users can view their own roles" ON user_roles
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all roles" ON user_roles;  
CREATE POLICY "Admins can view all roles" ON user_roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role = 'admin'
    )
  );

-- Ensure profiles table has proper admin access policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR ALL USING (
    auth.uid() = user_id 
    OR EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role = 'admin'
    )
  );

-- Ensure bookings table has admin access for revenue calculations (fix column reference)
DROP POLICY IF EXISTS "Admins can view all bookings" ON bookings;
CREATE POLICY "Admins can view all bookings" ON bookings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role = 'admin'
    )
  );

-- Ensure properties table has admin access
DROP POLICY IF EXISTS "Admins can manage all properties" ON properties;
CREATE POLICY "Admins can manage all properties" ON properties
  FOR ALL USING (
    auth.uid() = host_id 
    OR EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role = 'admin'
    )
  );

-- Ensure tours table has admin access (fix column reference)
DROP POLICY IF EXISTS "Admins can manage all tours" ON tours;
CREATE POLICY "Admins can manage all tours" ON tours
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role = 'admin'
    )
  );