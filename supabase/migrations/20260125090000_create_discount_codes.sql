-- Create discount codes table
CREATE TABLE IF NOT EXISTS discount_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC NOT NULL CHECK (discount_value > 0),
  currency TEXT DEFAULT 'RWF',
  minimum_amount NUMERIC DEFAULT 0,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  host_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  applies_to TEXT DEFAULT 'all' CHECK (applies_to IN ('all', 'properties', 'tours', 'transport')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE discount_codes ENABLE ROW LEVEL SECURITY;

-- Policy: Hosts can manage their own discount codes
CREATE POLICY "Hosts can manage own discount codes"
  ON discount_codes
  FOR ALL
  USING (auth.uid() = host_id)
  WITH CHECK (auth.uid() = host_id);

-- Policy: Anyone can view active discount codes (for validation)
CREATE POLICY "Anyone can view active codes"
  ON discount_codes
  FOR SELECT
  USING (is_active = true AND (valid_until IS NULL OR valid_until > NOW()));

-- Index for faster lookups
CREATE INDEX idx_discount_codes_code ON discount_codes(code);
CREATE INDEX idx_discount_codes_host_id ON discount_codes(host_id);
CREATE INDEX idx_discount_codes_active ON discount_codes(is_active, valid_until);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_discount_codes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER discount_codes_updated_at
  BEFORE UPDATE ON discount_codes
  FOR EACH ROW
  EXECUTE FUNCTION update_discount_codes_updated_at();
