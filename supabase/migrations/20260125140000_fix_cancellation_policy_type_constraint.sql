-- Fix tour_packages cancellation_policy_type to be nullable
-- and remove the strict CHECK constraint to allow flexibility

-- Drop the existing constraint
ALTER TABLE tour_packages 
DROP CONSTRAINT IF EXISTS tour_packages_cancellation_policy_type_check;

-- Make the field nullable
ALTER TABLE tour_packages 
ALTER COLUMN cancellation_policy_type DROP NOT NULL;

-- Add a more flexible constraint that allows multiple comma-separated values or NULL
-- This validates that each value is one of the allowed types
ALTER TABLE tour_packages
ADD CONSTRAINT tour_packages_cancellation_policy_type_check 
CHECK (
  cancellation_policy_type IS NULL OR
  cancellation_policy_type ~ '^(standard_day|standard|multiday_private|non_refundable|custom)(,(standard_day|standard|multiday_private|non_refundable|custom))*$'
);

COMMENT ON COLUMN tour_packages.cancellation_policy_type IS 'Optional comma-separated list of cancellation policy types: standard_day, standard, multiday_private, non_refundable, custom. Can be NULL if no policy specified.';
