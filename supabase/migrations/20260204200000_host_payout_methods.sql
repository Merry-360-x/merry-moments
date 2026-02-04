-- Create host_payout_methods table to store multiple payout methods (max 2)
CREATE TABLE IF NOT EXISTS public.host_payout_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  method_type TEXT NOT NULL CHECK (method_type IN ('mobile_money', 'bank_transfer')),
  is_primary BOOLEAN DEFAULT FALSE,
  
  -- Mobile Money fields
  phone_number TEXT,
  mobile_provider TEXT, -- MTN, Airtel
  
  -- Bank Transfer fields
  bank_name TEXT,
  bank_account_number TEXT,
  bank_account_name TEXT,
  bank_swift_code TEXT,
  
  -- Metadata
  nickname TEXT, -- e.g. "My MTN MoMo", "Business Account"
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_host_payout_methods_host_id ON public.host_payout_methods(host_id);

-- Add constraint to ensure max 2 payout methods per host
CREATE OR REPLACE FUNCTION check_max_payout_methods()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM host_payout_methods WHERE host_id = NEW.host_id) >= 2 THEN
    RAISE EXCEPTION 'Maximum of 2 payout methods allowed per host';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_max_payout_methods ON host_payout_methods;
CREATE TRIGGER enforce_max_payout_methods
  BEFORE INSERT ON host_payout_methods
  FOR EACH ROW
  EXECUTE FUNCTION check_max_payout_methods();

-- Ensure only one primary payout method
CREATE OR REPLACE FUNCTION ensure_single_primary_payout()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_primary = TRUE THEN
    UPDATE host_payout_methods 
    SET is_primary = FALSE 
    WHERE host_id = NEW.host_id AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS single_primary_payout ON host_payout_methods;
CREATE TRIGGER single_primary_payout
  AFTER INSERT OR UPDATE ON host_payout_methods
  FOR EACH ROW
  WHEN (NEW.is_primary = TRUE)
  EXECUTE FUNCTION ensure_single_primary_payout();

-- RLS Policies
ALTER TABLE host_payout_methods ENABLE ROW LEVEL SECURITY;

-- Hosts can view their own payout methods
CREATE POLICY "Hosts can view own payout methods"
  ON host_payout_methods FOR SELECT
  USING (auth.uid() = host_id);

-- Hosts can insert their own payout methods
CREATE POLICY "Hosts can insert own payout methods"
  ON host_payout_methods FOR INSERT
  WITH CHECK (auth.uid() = host_id);

-- Hosts can update their own payout methods
CREATE POLICY "Hosts can update own payout methods"
  ON host_payout_methods FOR UPDATE
  USING (auth.uid() = host_id);

-- Hosts can delete their own payout methods
CREATE POLICY "Hosts can delete own payout methods"
  ON host_payout_methods FOR DELETE
  USING (auth.uid() = host_id);

-- Admins and financial staff can view all payout methods
CREATE POLICY "Admins can view all payout methods"
  ON host_payout_methods FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role IN ('admin', 'staff')
    )
  );

COMMENT ON TABLE host_payout_methods IS 'Stores host payout methods (max 2 per host)';
