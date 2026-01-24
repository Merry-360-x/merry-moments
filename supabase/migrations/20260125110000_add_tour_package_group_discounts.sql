-- Add group discount fields to tour_packages
ALTER TABLE tour_packages
ADD COLUMN IF NOT EXISTS group_discount_6_10 DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS group_discount_11_15 DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS group_discount_16_plus DECIMAL(5,2) DEFAULT 0;

COMMENT ON COLUMN tour_packages.group_discount_6_10 IS 'Percentage discount for groups of 6-10 people';
COMMENT ON COLUMN tour_packages.group_discount_11_15 IS 'Percentage discount for groups of 11-15 people';
COMMENT ON COLUMN tour_packages.group_discount_16_plus IS 'Percentage discount for groups of 16 or more people';
