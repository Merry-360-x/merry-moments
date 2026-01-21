-- Test Staff Role Assignments
-- Run these in Supabase SQL Editor to test the staff dashboards

-- First, get your user ID (replace with actual email)
-- SELECT id FROM auth.users WHERE email = 'your-email@example.com';

-- Example: Assign Financial Staff role
-- INSERT INTO user_roles (user_id, role) 
-- VALUES ('your-user-id-here', 'financial_staff')
-- ON CONFLICT (user_id, role) DO NOTHING;

-- Example: Assign Operations Staff role
-- INSERT INTO user_roles (user_id, role) 
-- VALUES ('your-user-id-here', 'operations_staff')
-- ON CONFLICT (user_id, role) DO NOTHING;

-- Example: Assign Customer Support role
-- INSERT INTO user_roles (user_id, role) 
-- VALUES ('your-user-id-here', 'customer_support')
-- ON CONFLICT (user_id, role) DO NOTHING;

-- View all user roles
SELECT 
  ur.user_id,
  u.email,
  ur.role,
  ur.created_at
FROM user_roles ur
JOIN auth.users u ON u.id = ur.user_id
ORDER BY u.email, ur.role;

-- Check specific user's roles
-- SELECT role FROM user_roles WHERE user_id = 'your-user-id-here';
