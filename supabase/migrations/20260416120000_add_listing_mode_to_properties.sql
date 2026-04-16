-- Add listing_mode column to properties table
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS listing_mode TEXT DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS price_per_month NUMERIC;

COMMENT ON COLUMN properties.listing_mode IS 'standard | monthly_only';
