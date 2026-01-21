-- ===================================================================
-- STAFF ROLE ASSIGNMENT SCRIPT
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard
-- ===================================================================

-- Step 1: View all users to find the user_id you want to assign roles to
SELECT 
  id, 
  email, 
  created_at,
  last_sign_in_at
FROM auth.users 
ORDER BY created_at DESC;

-- Step 2: View existing roles (to check what's already assigned)
SELECT 
  u.email,
  ur.role,
  ur.created_at as role_assigned_at
FROM user_roles ur
JOIN auth.users u ON u.id = ur.user_id
ORDER BY u.email, ur.role;

-- ===================================================================
-- Step 3: ASSIGN STAFF ROLES
-- Replace 'USER_ID_HERE' with the actual user ID from Step 1
-- ===================================================================

-- Option A: Assign Financial Staff Role
INSERT INTO user_roles (user_id, role) 
VALUES ('USER_ID_HERE', 'financial_staff')
ON CONFLICT (user_id, role) DO NOTHING;

-- Option B: Assign Operations Staff Role
INSERT INTO user_roles (user_id, role) 
VALUES ('USER_ID_HERE', 'operations_staff')
ON CONFLICT (user_id, role) DO NOTHING;

-- Option C: Assign Customer Support Role
INSERT INTO user_roles (user_id, role) 
VALUES ('USER_ID_HERE', 'customer_support')
ON CONFLICT (user_id, role) DO NOTHING;

-- Option D: Assign ALL staff roles to one user (uncomment to use)
/*
INSERT INTO user_roles (user_id, role) VALUES 
  ('USER_ID_HERE', 'financial_staff'),
  ('USER_ID_HERE', 'operations_staff'),
  ('USER_ID_HERE', 'customer_support')
ON CONFLICT (user_id, role) DO NOTHING;
*/

-- ===================================================================
-- Step 4: VERIFY the roles were assigned
-- ===================================================================
SELECT 
  u.email,
  ur.role,
  ur.created_at as role_assigned_at
FROM user_roles ur
JOIN auth.users u ON u.id = ur.user_id
WHERE u.id = 'USER_ID_HERE'
ORDER BY ur.role;

-- ===================================================================
-- BONUS: Remove a role (if needed)
-- ===================================================================
/*
DELETE FROM user_roles 
WHERE user_id = 'USER_ID_HERE' 
  AND role = 'financial_staff';
*/

