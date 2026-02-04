-- Add citizen/foreigner pricing fields to tour_packages table
ALTER TABLE tour_packages 
ADD COLUMN IF NOT EXISTS price_for_citizens DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS price_for_foreigners DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS has_differential_pricing BOOLEAN DEFAULT false;

-- Add comments
COMMENT ON COLUMN tour_packages.price_for_citizens IS 'Special price for citizens/residents (when differential pricing is enabled)';
COMMENT ON COLUMN tour_packages.price_for_foreigners IS 'Price for foreign tourists (when differential pricing is enabled)';
COMMENT ON COLUMN tour_packages.has_differential_pricing IS 'Whether this tour uses different prices for citizens vs foreigners';

-- Create index for filtering tours with differential pricing
CREATE INDEX IF NOT EXISTS idx_tour_packages_differential_pricing 
ON tour_packages(has_differential_pricing) 
WHERE has_differential_pricing = true;

-- Note: The existing price_per_person column can be used as a fallback/default when differential pricing is not enabled
