-- Add fee breakdown columns to checkout_requests table
-- This enables showing: total guest paid, service fees, and host earnings on booking confirmations

-- Add columns to checkout_requests if they don't exist
ALTER TABLE checkout_requests 
  ADD COLUMN IF NOT EXISTS base_price_amount NUMERIC(12, 2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS service_fee_amount NUMERIC(12, 2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS host_earnings_amount NUMERIC(12, 2) DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN checkout_requests.base_price_amount IS 'Subtotal before service fees';
COMMENT ON COLUMN checkout_requests.service_fee_amount IS 'Platform service fee charged to guest';
COMMENT ON COLUMN checkout_requests.host_earnings_amount IS 'Net amount host will receive after platform fees';

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
