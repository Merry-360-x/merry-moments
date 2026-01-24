-- Add price_per_person field to properties table
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS price_per_person NUMERIC;

-- Add comment to explain the field
COMMENT ON COLUMN properties.price_per_person IS 'Optional price per person for properties that charge per guest instead of per night';
