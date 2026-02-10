-- Add East African pricing column to tour_packages table
-- This enables 3-tier pricing: National, East African, Foreign

ALTER TABLE public.tour_packages
ADD COLUMN IF NOT EXISTS price_for_east_african NUMERIC;

COMMENT ON COLUMN public.tour_packages.price_for_east_african IS 'Price for East African Community citizens (Kenya, Uganda, Tanzania, Burundi, South Sudan, DRC)';

-- Add same column to tours table for consistency
ALTER TABLE public.tours
ADD COLUMN IF NOT EXISTS has_differential_pricing BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS price_for_citizens NUMERIC,
ADD COLUMN IF NOT EXISTS price_for_east_african NUMERIC,
ADD COLUMN IF NOT EXISTS price_for_foreigners NUMERIC;

COMMENT ON COLUMN public.tours.has_differential_pricing IS 'Whether tour has different prices for citizens, East Africans, and foreigners';
COMMENT ON COLUMN public.tours.price_for_citizens IS 'Price for national citizens/residents';
COMMENT ON COLUMN public.tours.price_for_east_african IS 'Price for East African Community citizens';
COMMENT ON COLUMN public.tours.price_for_foreigners IS 'Price for international tourists';
