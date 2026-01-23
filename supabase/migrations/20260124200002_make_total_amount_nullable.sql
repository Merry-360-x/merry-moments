-- Make total_amount nullable in checkout_requests since it may not always be provided
ALTER TABLE checkout_requests 
ALTER COLUMN total_amount DROP NOT NULL;

-- Add default value of 0 for existing records if needed
UPDATE checkout_requests 
SET total_amount = 0 
WHERE total_amount IS NULL;

-- Add comment
COMMENT ON COLUMN checkout_requests.total_amount IS 'Total amount for the checkout request (may be null if not calculated)';
