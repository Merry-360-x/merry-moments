-- Add new staff role types to app_role enum
-- This enables financial_staff, operations_staff, and customer_support roles

-- Add the new role types to the app_role enum
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'financial_staff';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'operations_staff';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'customer_support';

-- Update the comment on user_roles table to document all available roles
COMMENT ON TABLE user_roles IS 'Stores user roles. Available roles: guest, host, staff, admin, financial_staff, operations_staff, customer_support';
