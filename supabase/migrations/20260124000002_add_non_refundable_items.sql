-- Add non_refundable_items column to tour_packages table
ALTER TABLE public.tour_packages
ADD COLUMN IF NOT EXISTS non_refundable_items TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Create index for non_refundable_items
CREATE INDEX IF NOT EXISTS idx_tour_packages_non_refundable_items ON public.tour_packages USING GIN(non_refundable_items);
