-- Check RLS policies for key tables
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename IN (
    'bookings',
    'properties', 
    'tour_packages',
    'transport',
    'host_applications',
    'profiles',
    'user_roles'
)
ORDER BY tablename, policyname;
