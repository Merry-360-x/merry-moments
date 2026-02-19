-- Add explicit monthly-only listing flag for properties
-- This allows UI to distinguish monthly-only listings from nightly listings
-- that merely also support monthly rentals.

ALTER TABLE properties
ADD COLUMN IF NOT EXISTS monthly_only_listing BOOLEAN DEFAULT false;

UPDATE properties
SET monthly_only_listing = true
WHERE available_for_monthly_rental = true
  AND COALESCE(price_per_month, 0) > 0
  AND COALESCE(price_per_night, 0) = GREATEST(1, ROUND(COALESCE(price_per_month, 0) / 30.0))
  AND (price_per_group IS NULL OR price_per_group = 0);

COMMENT ON COLUMN properties.monthly_only_listing IS 'True when listing is monthly-only and should display monthly price (not per-night).';

CREATE INDEX IF NOT EXISTS idx_properties_monthly_only_listing
  ON properties(monthly_only_listing)
  WHERE monthly_only_listing = true;
