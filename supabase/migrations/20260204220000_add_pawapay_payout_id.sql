-- Add PawaPay payout ID column for automatic payouts
ALTER TABLE host_payouts 
ADD COLUMN IF NOT EXISTS pawapay_payout_id TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_host_payouts_pawapay_id ON host_payouts(pawapay_payout_id) WHERE pawapay_payout_id IS NOT NULL;

COMMENT ON COLUMN host_payouts.pawapay_payout_id IS 'PawaPay payout transaction ID for automatic payouts';
