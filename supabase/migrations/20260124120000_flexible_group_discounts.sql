-- Add flexible group discounts column to tour_packages
ALTER TABLE tour_packages
ADD COLUMN IF NOT EXISTS group_discounts JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN tour_packages.group_discounts IS 'Flexible group discount tiers stored as array of {min_people: number, max_people: number, discount_percentage: number}';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_tour_packages_group_discounts ON tour_packages USING GIN (group_discounts);
