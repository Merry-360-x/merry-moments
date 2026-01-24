-- Add cancellation policy type and custom policy URL to tour_packages table
ALTER TABLE tour_packages 
ADD COLUMN IF NOT EXISTS cancellation_policy_type TEXT DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS custom_cancellation_policy_url TEXT;

-- Add comment
COMMENT ON COLUMN tour_packages.cancellation_policy_type IS 'Type of cancellation policy: non_refundable, standard, flexible, moderate, strict, multiday_private, custom';
COMMENT ON COLUMN tour_packages.custom_cancellation_policy_url IS 'URL to uploaded custom cancellation policy PDF';

-- Make existing cancellation_policy column nullable since policy type determines behavior
ALTER TABLE tour_packages ALTER COLUMN cancellation_policy DROP NOT NULL;
