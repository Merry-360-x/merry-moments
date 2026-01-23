-- Check which tables have public/user access policies
SELECT 
    tablename,
    policyname,
    cmd,
    CASE 
        WHEN qual LIKE '%is_admin()%' THEN 'Admin only'
        WHEN qual LIKE '%auth.uid()%' THEN 'Auth required'
        WHEN qual LIKE '%true%' THEN 'Public'
        ELSE 'Other'
    END as access_type
FROM pg_policies
WHERE tablename IN ('properties', 'tour_packages', 'bookings', 'profiles')
ORDER BY tablename, cmd, policyname;
