-- EMERGENCY FIX: Remove infinite recursion in user_roles policies
-- The "Staff and admins can view all user roles" policy causes infinite recursion
-- because it queries user_roles to check permissions, creating a loop

-- Drop the problematic policy
DROP POLICY IF EXISTS "Staff and admins can view all user roles" ON user_roles;

-- Keep only the simple, non-recursive policy
-- Users can view their own roles (this already exists, just ensuring it's there)
DROP POLICY IF EXISTS "Users can view own roles" ON user_roles;
CREATE POLICY "Users can view own roles"
ON user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- For admins viewing all roles, rely on the existing "Admins can view all user roles" 
-- policy that uses is_admin() function (which doesn't query user_roles recursively)
