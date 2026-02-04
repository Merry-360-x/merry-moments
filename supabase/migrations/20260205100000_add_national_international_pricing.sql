-- Add national/international pricing discount to tour_packages
ALTER TABLE public.tour_packages
ADD COLUMN IF NOT EXISTS national_discount_percent numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS international_price_per_adult numeric;

-- Add comments
COMMENT ON COLUMN public.tour_packages.national_discount_percent IS 'Discount percentage for national (Rwandan) visitors, e.g., 20 for 20% off';
COMMENT ON COLUMN public.tour_packages.international_price_per_adult IS 'Optional: specific price for international visitors (if different from base price)';

-- Also add to tours table for consistency
ALTER TABLE public.tours
ADD COLUMN IF NOT EXISTS national_discount_percent numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS international_price_per_person numeric;

COMMENT ON COLUMN public.tours.national_discount_percent IS 'Discount percentage for national (Rwandan) visitors';
COMMENT ON COLUMN public.tours.international_price_per_person IS 'Optional: specific price for international visitors';
