-- Add price_per_group field to properties table
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS price_per_group NUMERIC;

-- Add comment to explain the field
COMMENT ON COLUMN properties.price_per_group IS 'Optional price per group for properties that charge a flat rate for the entire group regardless of headcount';
