-- Add advanced features to tour_packages table
-- Cancellation policies, group discounts, and RDB certificate

-- Add cancellation policy type (day or multiday tours)
ALTER TABLE public.tour_packages 
ADD COLUMN IF NOT EXISTS cancellation_policy_type TEXT CHECK (cancellation_policy_type IN ('day', 'multiday'));

-- Add group discount fields
ALTER TABLE public.tour_packages
ADD COLUMN IF NOT EXISTS group_discount_percentage INTEGER CHECK (group_discount_percentage >= 0 AND group_discount_percentage <= 100),
ADD COLUMN IF NOT EXISTS group_discount_min_size INTEGER CHECK (group_discount_min_size >= 2);

-- Add RDB certificate fields
ALTER TABLE public.tour_packages
ADD COLUMN IF NOT EXISTS rdb_certificate_url TEXT,
ADD COLUMN IF NOT EXISTS rdb_certificate_valid_until DATE;

-- Add comment for documentation
COMMENT ON COLUMN public.tour_packages.cancellation_policy_type IS 'Type of cancellation policy: day (24-48 hours) or multiday (3-7 days or more)';
COMMENT ON COLUMN public.tour_packages.group_discount_percentage IS 'Percentage discount for groups (0-100)';
COMMENT ON COLUMN public.tour_packages.group_discount_min_size IS 'Minimum group size to qualify for discount';
COMMENT ON COLUMN public.tour_packages.rdb_certificate_url IS 'URL to uploaded RDB (Rwanda Development Board) tourism certificate';
COMMENT ON COLUMN public.tour_packages.rdb_certificate_valid_until IS 'Expiration date of the RDB certificate';
