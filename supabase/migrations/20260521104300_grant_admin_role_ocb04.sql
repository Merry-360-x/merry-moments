-- Grant admin role to ocb04@yahoo.com
INSERT INTO user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email = 'ocb04@yahoo.com'
ON CONFLICT (user_id, role) DO NOTHING;
