#!/bin/bash

# Test script to verify all dashboards can access data
# This tests RLS policies and data consistency

echo "=========================================="
echo "Testing Dashboard Data Access"
echo "=========================================="
echo ""

DB_URL="postgresql://postgres.uwgiostcetoxotfnulfm:4_m3J9QlD%404FbYkT@aws-0-us-east-1.pooler.supabase.com:6543/postgres"

echo "1. Testing admin_dashboard_metrics function..."
psql "$DB_URL" -c "SELECT * FROM admin_dashboard_metrics();" -x

echo ""
echo "2. Testing tours count (both tables)..."
psql "$DB_URL" -c "SELECT 
  (SELECT COUNT(*) FROM tours) as tours_count,
  (SELECT COUNT(*) FROM tour_packages) as tour_packages_count,
  (SELECT COUNT(*) FROM tours) + (SELECT COUNT(*) FROM tour_packages) as total_tours;"

echo ""
echo "3. Testing bookings access..."
psql "$DB_URL" -c "SELECT COUNT(*) as total_bookings, 
  COUNT(*) FILTER (WHERE status = 'pending_confirmation') as pending_bookings,
  COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed_bookings,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_bookings
FROM bookings;"

echo ""
echo "4. Testing checkout_requests access..."
psql "$DB_URL" -c "SELECT COUNT(*) as total_checkout_requests,
  COUNT(*) FILTER (WHERE status = 'pending_confirmation') as pending_requests
FROM checkout_requests;"

echo ""
echo "5. Testing RLS helper functions..."
psql "$DB_URL" -c "SELECT 
  proname as function_name,
  prosecdef as is_security_definer
FROM pg_proc 
WHERE proname IN ('is_admin', 'is_financial_staff', 'is_operations_staff', 'is_customer_support', 'is_any_staff')
ORDER BY proname;"

echo ""
echo "6. Testing RLS policies on bookings..."
psql "$DB_URL" -c "SELECT 
  schemaname, 
  tablename, 
  policyname,
  cmd as operation
FROM pg_policies 
WHERE tablename = 'bookings'
ORDER BY policyname;"

echo ""
echo "7. Testing RLS policies on checkout_requests..."
psql "$DB_URL" -c "SELECT 
  schemaname, 
  tablename, 
  policyname,
  cmd as operation
FROM pg_policies 
WHERE tablename = 'checkout_requests'
ORDER BY policyname;"

echo ""
echo "8. Testing RLS policies on tours..."
psql "$DB_URL" -c "SELECT 
  schemaname, 
  tablename, 
  policyname,
  cmd as operation
FROM pg_policies 
WHERE tablename = 'tours'
ORDER BY policyname;"

echo ""
echo "9. Testing RLS policies on tour_packages..."
psql "$DB_URL" -c "SELECT 
  schemaname, 
  tablename, 
  policyname,
  cmd as operation
FROM pg_policies 
WHERE tablename = 'tour_packages'
ORDER BY policyname;"

echo ""
echo "10. Testing user_roles table..."
psql "$DB_URL" -c "SELECT 
  role,
  COUNT(*) as user_count
FROM user_roles
GROUP BY role
ORDER BY role;"

echo ""
echo "=========================================="
echo "Test Complete!"
echo "=========================================="
