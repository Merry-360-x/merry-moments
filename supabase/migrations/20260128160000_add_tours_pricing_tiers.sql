-- Add pricing_tiers column to tours table for group-based pricing
-- This allows hosts to set different per-person prices for different group sizes
-- Example: Single person: $696, Group of 2: $439/person, Group of 4: $311/person

ALTER TABLE public.tours
ADD COLUMN IF NOT EXISTS pricing_tiers JSONB;

COMMENT ON COLUMN public.tours.pricing_tiers IS 'Array of {group_size:number, price_per_person:number} for per-person pricing by group size';

-- Also add categories column (array) if it doesn't exist, for multiple tour categories
ALTER TABLE public.tours
ADD COLUMN IF NOT EXISTS categories TEXT[];

COMMENT ON COLUMN public.tours.categories IS 'Array of tour category tags (e.g., Adventure, Cultural, Wildlife)';
