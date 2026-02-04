-- Add monthly rental fields to properties table
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS available_for_monthly_rental BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS price_per_month DECIMAL(10, 2);

-- Add comment explaining the fields
COMMENT ON COLUMN properties.available_for_monthly_rental IS 'Indicates if the property is available for monthly (28+ days) bookings';
COMMENT ON COLUMN properties.price_per_month IS 'Monthly rental price (for stays of 28+ days). Optional - can use price_per_night * 30 with monthly_discount if not set';

-- Create index for filtering monthly rentals
CREATE INDEX IF NOT EXISTS idx_properties_monthly_rental ON properties(available_for_monthly_rental) WHERE available_for_monthly_rental = true;
