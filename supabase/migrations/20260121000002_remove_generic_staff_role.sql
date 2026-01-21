-- Remove generic 'staff' role and ensure only specific staff roles are used
-- This migration removes the old 'staff' role in favor of specific roles:
-- financial_staff, operations_staff, customer_support

-- First, let's migrate any existing 'staff' roles to 'operations_staff' as a default
-- You can manually reassign them later using the assign-staff-role.mjs script
UPDATE user_roles 
SET role = 'operations_staff' 
WHERE role = 'staff' 
AND NOT EXISTS (
  SELECT 1 FROM user_roles ur2 
  WHERE ur2.user_id = user_roles.user_id 
  AND ur2.role IN ('financial_staff', 'operations_staff', 'customer_support')
);

-- Delete remaining 'staff' roles (where user already has a specific staff role)
DELETE FROM user_roles 
WHERE role = 'staff';

-- Update table comment to reflect only specific staff roles
COMMENT ON TABLE user_roles IS 'Stores user roles. Available roles: guest, host, admin, financial_staff, operations_staff, customer_support';

-- Note: The 'staff' enum value still exists in app_role type for backwards compatibility
-- but should not be assigned to new users
