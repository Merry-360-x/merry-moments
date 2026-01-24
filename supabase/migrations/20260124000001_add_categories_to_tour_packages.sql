-- Add categories array column to tour_packages table
ALTER TABLE public.tour_packages
ADD COLUMN IF NOT EXISTS categories TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Migrate existing single category to categories array
UPDATE public.tour_packages
SET categories = ARRAY[category]
WHERE categories = ARRAY[]::TEXT[] OR categories IS NULL;

-- Create index for categories
CREATE INDEX IF NOT EXISTS idx_tour_packages_categories ON public.tour_packages USING GIN(categories);

-- Update existing tours to ensure they have categories if missing
UPDATE public.tours
SET categories = ARRAY['Adventure']::TEXT[]
WHERE categories IS NULL OR categories = ARRAY[]::TEXT[];
