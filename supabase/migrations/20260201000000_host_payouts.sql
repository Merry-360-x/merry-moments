-- Add payout info columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS payout_method TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS payout_phone TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS payout_bank_name TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS payout_bank_account TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS payout_account_name TEXT DEFAULT NULL;

COMMENT ON COLUMN profiles.payout_method IS 'Preferred payout method: mobile_money, bank_transfer';
COMMENT ON COLUMN profiles.payout_phone IS 'Mobile money phone number for payouts';
COMMENT ON COLUMN profiles.payout_bank_name IS 'Bank name for bank transfer payouts';
COMMENT ON COLUMN profiles.payout_bank_account IS 'Bank account number for payouts';
COMMENT ON COLUMN profiles.payout_account_name IS 'Account holder name for payouts';

-- Create host_payouts table to track payout requests
CREATE TABLE IF NOT EXISTS host_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'RWF',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'rejected')),
  payout_method TEXT NOT NULL,
  payout_details JSONB DEFAULT '{}',
  admin_notes TEXT DEFAULT NULL,
  processed_by UUID REFERENCES auth.users(id) DEFAULT NULL,
  processed_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_host_payouts_host ON host_payouts(host_id);
CREATE INDEX IF NOT EXISTS idx_host_payouts_status ON host_payouts(status);
CREATE INDEX IF NOT EXISTS idx_host_payouts_created ON host_payouts(created_at DESC);

-- Enable RLS
ALTER TABLE host_payouts ENABLE ROW LEVEL SECURITY;

-- RLS policies for host_payouts
DROP POLICY IF EXISTS "Hosts can view their own payouts" ON host_payouts;
CREATE POLICY "Hosts can view their own payouts" ON host_payouts FOR SELECT
  USING (auth.uid() = host_id);

DROP POLICY IF EXISTS "Hosts can create payout requests" ON host_payouts;
CREATE POLICY "Hosts can create payout requests" ON host_payouts FOR INSERT
  WITH CHECK (auth.uid() = host_id AND status = 'pending');

DROP POLICY IF EXISTS "Admins can view all payouts" ON host_payouts;
CREATE POLICY "Admins can view all payouts" ON host_payouts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update payouts" ON host_payouts;
CREATE POLICY "Admins can update payouts" ON host_payouts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
    )
  );

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_host_payouts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_host_payouts_updated_at ON host_payouts;
CREATE TRIGGER trigger_update_host_payouts_updated_at
  BEFORE UPDATE ON host_payouts
  FOR EACH ROW
  EXECUTE FUNCTION update_host_payouts_updated_at();
