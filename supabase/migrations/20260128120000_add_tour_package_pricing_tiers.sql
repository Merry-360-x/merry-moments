-- Add flexible pricing tiers for tour packages (per-person pricing by group size)

ALTER TABLE public.tour_packages
ADD COLUMN IF NOT EXISTS pricing_tiers JSONB;

COMMENT ON COLUMN public.tour_packages.pricing_tiers IS 'Array of {group_size:number, price_per_person:number} for per-person pricing by group size';
