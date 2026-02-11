-- Fix checkout_requests INSERT policy for all users (authenticated and guests)
-- This fixes the RLS error: "new row violates row-level security policy for table checkout_requests"

-- =============================================
-- DROP ALL CONFLICTING INSERT POLICIES
-- =============================================

DROP POLICY IF EXISTS "Users can create checkout requests" ON checkout_requests;
DROP POLICY IF EXISTS "Anyone can create checkout requests" ON checkout_requests;
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON checkout_requests;
DROP POLICY IF EXISTS "Allow insert for guests" ON checkout_requests;
DROP POLICY IF EXISTS "checkout_requests_insert_policy" ON checkout_requests;

-- =============================================
-- CREATE PERMISSIVE INSERT POLICY
-- =============================================

-- Allow anyone to create checkout requests (needed for both authenticated and guest checkout)
-- Using a simple true check since checkout is the entry point for payments
CREATE POLICY "Allow checkout request creation"
  ON checkout_requests FOR INSERT
  WITH CHECK (true);

-- =============================================
-- ENSURE SELECT POLICIES EXIST FOR USERS
-- =============================================

-- Users can view their own checkout requests  
DROP POLICY IF EXISTS "Users can view own checkout requests" ON checkout_requests;
CREATE POLICY "Users can view own checkout requests"
  ON checkout_requests FOR SELECT
  USING (
    user_id = auth.uid() 
    OR user_id IS NULL  -- Allow anonymous users to see guest checkouts
    OR EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.user_id = auth.uid() 
      AND p.role IN ('admin', 'super_admin', 'operations', 'financial', 'customer_support')
    )
  );

-- =============================================
-- ENSURE UPDATE POLICIES FOR WEBHOOK/ADMIN
-- =============================================

DROP POLICY IF EXISTS "Allow checkout update for service role" ON checkout_requests;
DROP POLICY IF EXISTS "Allow checkout update for admins" ON checkout_requests;

-- Admins and staff can update checkout requests
CREATE POLICY "Staff can update checkout requests"
  ON checkout_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.user_id = auth.uid() 
      AND p.role IN ('admin', 'super_admin', 'operations', 'financial', 'customer_support')
    )
  );

-- =============================================
-- REFRESH SCHEMA CACHE
-- =============================================

NOTIFY pgrst, 'reload schema';
