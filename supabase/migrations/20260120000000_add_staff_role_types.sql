-- Add new staff role types to the system
-- This migration adds financial_staff, operations_staff, and customer_support roles

-- First, let's ensure the user_roles table exists (it should already)
-- We're just adding support for new role types

-- No schema changes needed - user_roles table already supports any role string
-- This migration is just for documentation purposes and to add sample roles for testing

-- Add a comment to document the new roles
COMMENT ON TABLE user_roles IS 'Stores user roles. Supported roles: guest, host, staff, admin, financial_staff, operations_staff, customer_support';

-- Example: To assign a user to financial_staff role, run:
-- INSERT INTO user_roles (user_id, role) VALUES ('user-uuid-here', 'financial_staff');

-- Example: To assign a user to operations_staff role, run:
-- INSERT INTO user_roles (user_id, role) VALUES ('user-uuid-here', 'operations_staff');

-- Example: To assign a user to customer_support role, run:
-- INSERT INTO user_roles (user_id, role) VALUES ('user-uuid-here', 'customer_support');
