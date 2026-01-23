-- Create helper functions for staff role checks
-- These use SECURITY DEFINER to bypass RLS when checking roles

CREATE OR REPLACE FUNCTION is_financial_staff(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = $1 
    AND role IN ('financial_staff', 'admin')
  );
END;
$$;

CREATE OR REPLACE FUNCTION is_operations_staff(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = $1 
    AND role IN ('operations_staff', 'admin')
  );
END;
$$;

CREATE OR REPLACE FUNCTION is_customer_support(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = $1 
    AND role IN ('customer_support', 'admin')
  );
END;
$$;

CREATE OR REPLACE FUNCTION is_any_staff(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = $1 
    AND role IN ('financial_staff', 'operations_staff', 'customer_support', 'admin')
  );
END;
$$;
