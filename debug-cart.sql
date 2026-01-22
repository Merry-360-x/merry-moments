-- Debug trip_cart_items RLS and data
-- Run this to check if RLS is blocking reads

-- Check if table exists and has RLS enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'trip_cart_items';

-- Check existing policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'trip_cart_items';

-- Check current user's cart items (if any)
SELECT id, user_id, item_type, reference_id, quantity, created_at
FROM trip_cart_items
WHERE user_id = auth.uid()
LIMIT 10;

-- Check if there are any cart items at all (as admin)
SELECT COUNT(*) as total_items,
       COUNT(DISTINCT user_id) as unique_users
FROM trip_cart_items;
