-- Add detailed cancellation policy fields to tour_packages table
-- This allows hosts to select predefined policies and add custom ones

-- Update cancellation_policy_type to include 'custom' and 'non_refundable'
ALTER TABLE public.tour_packages 
DROP CONSTRAINT IF EXISTS tour_packages_cancellation_policy_type_check;

ALTER TABLE public.tour_packages
ADD CONSTRAINT tour_packages_cancellation_policy_type_check 
CHECK (cancellation_policy_type IN ('standard_day', 'multiday_private', 'non_refundable', 'custom'));

-- Add custom cancellation policy text field
ALTER TABLE public.tour_packages
ADD COLUMN IF NOT EXISTS custom_cancellation_policy TEXT;

-- Add non-refundable components field (JSON array)
ALTER TABLE public.tour_packages
ADD COLUMN IF NOT EXISTS non_refundable_items JSONB DEFAULT '[]'::jsonb;

-- Update comments
COMMENT ON COLUMN public.tour_packages.cancellation_policy_type IS 'Type of cancellation policy: standard_day (72-48 hours), multiday_private (14-7 days), non_refundable (no refunds), or custom';
COMMENT ON COLUMN public.tour_packages.custom_cancellation_policy IS 'Custom cancellation policy text when type is custom';
COMMENT ON COLUMN public.tour_packages.non_refundable_items IS 'JSON array of non-refundable items (permits, tickets, etc.)';

-- Ensure existing data has valid values
UPDATE public.tour_packages 
SET cancellation_policy_type = 'standard_day' 
WHERE cancellation_policy_type = 'day' OR cancellation_policy_type IS NULL;

UPDATE public.tour_packages 
SET cancellation_policy_type = 'multiday_private' 
WHERE cancellation_policy_type = 'multiday';
