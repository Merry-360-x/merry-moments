-- Test script to verify staff role data access
-- Run this to check if RLS policies are working correctly

-- Test 1: Check if financial_staff policy exists for bookings
SELECT 
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'bookings' 
  AND policyname LIKE '%Financial staff%';

-- Test 2: Check if operations_staff policies exist
SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE policyname LIKE '%Operations staff%'
ORDER BY tablename, policyname;

-- Test 3: Check if customer_support policies exist
SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE policyname LIKE '%Customer support%'
ORDER BY tablename;

-- Test 4: List all new policies created
SELECT 
  tablename,
  policyname,
  cmd,
  CASE 
    WHEN policyname LIKE '%Financial%' THEN 'financial_staff'
    WHEN policyname LIKE '%Operations%' THEN 'operations_staff'
    WHEN policyname LIKE '%Customer support%' THEN 'customer_support'
    ELSE 'other'
  END as role_type
FROM pg_policies
WHERE policyname LIKE '%staff%'
ORDER BY role_type, tablename, cmd;
