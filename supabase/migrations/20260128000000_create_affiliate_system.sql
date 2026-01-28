-- Create affiliates table
CREATE TABLE IF NOT EXISTS affiliates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  affiliate_code TEXT UNIQUE NOT NULL,
  total_earnings DECIMAL(10, 2) DEFAULT 0,
  pending_earnings DECIMAL(10, 2) DEFAULT 0,
  paid_earnings DECIMAL(10, 2) DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'banned')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create affiliate_referrals table (tracks operators referred by affiliates)
CREATE TABLE IF NOT EXISTS affiliate_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_user_email TEXT NOT NULL,
  bookings_count INTEGER DEFAULT 0,
  total_commission_earned DECIMAL(10, 2) DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'inactive')),
  registered_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(affiliate_id, referred_user_id)
);

-- Create affiliate_commissions table (tracks individual commission earnings)
CREATE TABLE IF NOT EXISTS affiliate_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  referral_id UUID NOT NULL REFERENCES affiliate_referrals(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  booking_value DECIMAL(10, 2) NOT NULL,
  platform_commission DECIMAL(10, 2) NOT NULL,
  affiliate_commission DECIMAL(10, 2) NOT NULL,
  commission_rate DECIMAL(5, 2) DEFAULT 20.00,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT now(),
  paid_at TIMESTAMPTZ,
  UNIQUE(booking_id, affiliate_id)
);

-- Create affiliate_payouts table (tracks payment to affiliates)
CREATE TABLE IF NOT EXISTS affiliate_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'RWF',
  payment_method TEXT NOT NULL,
  payment_details JSONB,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  requested_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ,
  notes TEXT
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_affiliates_user_id ON affiliates(user_id);
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='affiliates' AND column_name='affiliate_code'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_affiliates_code ON affiliates(affiliate_code);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='affiliate_referrals' AND column_name='affiliate_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_affiliate ON affiliate_referrals(affiliate_id);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='affiliate_referrals' AND column_name='referred_user_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_referred_user ON affiliate_referrals(referred_user_id);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='affiliate_commissions' AND column_name='affiliate_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_affiliate ON affiliate_commissions(affiliate_id);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='affiliate_commissions' AND column_name='referral_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_referral ON affiliate_commissions(referral_id);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='affiliate_commissions' AND column_name='booking_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_booking ON affiliate_commissions(booking_id);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='affiliate_payouts' AND column_name='affiliate_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_affiliate_payouts_affiliate ON affiliate_payouts(affiliate_id);
  END IF;
END $$;

-- Create function to generate unique affiliate code
CREATE OR REPLACE FUNCTION generate_affiliate_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  exists BOOLEAN;
BEGIN
  LOOP
    -- Generate 8 character alphanumeric code
    code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM affiliates WHERE affiliate_code = code) INTO exists;
    
    -- Exit loop if code is unique
    EXIT WHEN NOT exists;
  END LOOP;
  
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Create function to track affiliate referral from booking
CREATE OR REPLACE FUNCTION track_affiliate_commission()
RETURNS TRIGGER AS $$
DECLARE
  v_referral RECORD;
  v_platform_commission DECIMAL(10, 2);
  v_affiliate_commission DECIMAL(10, 2);
  v_platform_commission_rate DECIMAL(5, 2) := 10.00; -- 10% platform commission
  v_affiliate_commission_rate DECIMAL(5, 2) := 20.00; -- 20% of platform commission
BEGIN
  -- Only process confirmed/completed bookings
  IF NEW.status NOT IN ('confirmed', 'completed') THEN
    RETURN NEW;
  END IF;

  -- Find if the host (operator) was referred by an affiliate
  SELECT ar.* INTO v_referral
  FROM affiliate_referrals ar
  WHERE ar.referred_user_id = NEW.host_id
    AND ar.bookings_count < 5
    AND ar.status = 'active';

  -- If referral exists and hasn't reached 5 bookings yet
  IF FOUND THEN
    -- Calculate commissions
    v_platform_commission := (NEW.total_price * v_platform_commission_rate / 100);
    v_affiliate_commission := (v_platform_commission * v_affiliate_commission_rate / 100);

    -- Insert commission record (if not already exists)
    INSERT INTO affiliate_commissions (
      affiliate_id,
      referral_id,
      booking_id,
      booking_value,
      platform_commission,
      affiliate_commission,
      commission_rate,
      status
    )
    VALUES (
      v_referral.affiliate_id,
      v_referral.id,
      NEW.id,
      NEW.total_price,
      v_platform_commission,
      v_affiliate_commission,
      v_affiliate_commission_rate,
      'approved'
    )
    ON CONFLICT (booking_id, affiliate_id) DO NOTHING;

    -- Update referral bookings count and earnings
    UPDATE affiliate_referrals
    SET 
      bookings_count = bookings_count + 1,
      total_commission_earned = total_commission_earned + v_affiliate_commission,
      status = CASE WHEN bookings_count + 1 >= 5 THEN 'completed' ELSE status END
    WHERE id = v_referral.id;

    -- Update affiliate total earnings
    UPDATE affiliates
    SET 
      total_earnings = total_earnings + v_affiliate_commission,
      pending_earnings = pending_earnings + v_affiliate_commission,
      updated_at = now()
    WHERE id = v_referral.affiliate_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic commission tracking
CREATE TRIGGER trigger_track_affiliate_commission
  AFTER INSERT OR UPDATE OF status ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION track_affiliate_commission();

-- Enable RLS
ALTER TABLE affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_payouts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for affiliates
DROP POLICY IF EXISTS "Users can view their own affiliate account" ON affiliates;
CREATE POLICY "Users can view their own affiliate account"
  ON affiliates FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own affiliate account" ON affiliates;
CREATE POLICY "Users can create their own affiliate account"
  ON affiliates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own affiliate account" ON affiliates;
CREATE POLICY "Users can update their own affiliate account"
  ON affiliates FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for affiliate_referrals
DROP POLICY IF EXISTS "Affiliates can view their referrals" ON affiliate_referrals;
CREATE POLICY "Affiliates can view their referrals"
  ON affiliate_referrals FOR SELECT
  USING (
    affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid())
  );

-- RLS Policies for affiliate_commissions
DROP POLICY IF EXISTS "Affiliates can view their commissions" ON affiliate_commissions;
CREATE POLICY "Affiliates can view their commissions"
  ON affiliate_commissions FOR SELECT
  USING (
    affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid())
  );

-- RLS Policies for affiliate_payouts
DROP POLICY IF EXISTS "Affiliates can view their payouts" ON affiliate_payouts;
CREATE POLICY "Affiliates can view their payouts"
  ON affiliate_payouts FOR SELECT
  USING (
    affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Affiliates can create payout requests" ON affiliate_payouts;
CREATE POLICY "Affiliates can create payout requests"
  ON affiliate_payouts FOR INSERT
  WITH CHECK (
    affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid())
  );

-- Admin policies (staff can view all)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='id'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='role'
  ) THEN
    DROP POLICY IF EXISTS "Staff can view all affiliates" ON affiliates;
    CREATE POLICY "Staff can view all affiliates"
      ON affiliates FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role IN ('admin', 'staff', 'finance_staff')
        )
      );

    DROP POLICY IF EXISTS "Staff can view all referrals" ON affiliate_referrals;
    CREATE POLICY "Staff can view all referrals"
      ON affiliate_referrals FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role IN ('admin', 'staff', 'finance_staff')
        )
      );

    DROP POLICY IF EXISTS "Staff can view all commissions" ON affiliate_commissions;
    CREATE POLICY "Staff can view all commissions"
      ON affiliate_commissions FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role IN ('admin', 'staff', 'finance_staff')
        )
      );

    DROP POLICY IF EXISTS "Staff can view all payouts" ON affiliate_payouts;
    CREATE POLICY "Staff can view all payouts"
      ON affiliate_payouts FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role IN ('admin', 'staff', 'finance_staff')
        )
      );

    DROP POLICY IF EXISTS "Staff can update payouts" ON affiliate_payouts;
    CREATE POLICY "Staff can update payouts"
      ON affiliate_payouts FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role IN ('admin', 'finance_staff')
        )
      );
  END IF;
END $$;

-- Add comments
COMMENT ON TABLE affiliates IS 'Stores affiliate marketing accounts and their earnings';
COMMENT ON TABLE affiliate_referrals IS 'Tracks operators (hosts) referred by affiliates';
COMMENT ON TABLE affiliate_commissions IS 'Individual commission records for each qualifying booking';
COMMENT ON TABLE affiliate_payouts IS 'Payout requests and payments to affiliates';
COMMENT ON COLUMN affiliate_commissions.commission_rate IS 'Percentage of platform commission that affiliate earns (default 20%)';
