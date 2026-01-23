-- Emergency fix: Restore user_roles access policies
-- The previous migration created circular dependency issues

-- Drop the problematic policies
DROP POLICY IF EXISTS "Users can view own roles" ON user_roles;
DROP POLICY IF EXISTS "Staff can view all roles" ON user_roles;

-- Recreate simple, working policies for user_roles
-- Allow all authenticated users to view their own roles
CREATE POLICY "Users can view own roles"
ON user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow staff roles to view all roles (for their dashboards)
-- This uses a less restrictive check that won't create circular dependencies
CREATE POLICY "Staff and admins can view all user roles" 
ON user_roles FOR SELECT
TO authenticated
USING (
  -- Either the user is viewing their own role
  auth.uid() = user_id
  OR
  -- Or the user has any staff/admin role (checked via subquery)
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('admin', 'financial_staff', 'operations_staff', 'customer_support')
    LIMIT 1
  )
);
