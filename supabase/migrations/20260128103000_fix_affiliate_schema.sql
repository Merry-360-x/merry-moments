-- Fix affiliate schema to be consistent and idempotent

-- Add missing columns to affiliates
ALTER TABLE IF EXISTS affiliates
  ADD COLUMN IF NOT EXISTS affiliate_code TEXT,
  ADD COLUMN IF NOT EXISTS total_earnings DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pending_earnings DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_earnings DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Ensure affiliate_code uniqueness via unique index (only if column exists)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='affiliates' AND column_name='affiliate_code'
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS idx_affiliates_code_unique ON affiliates(affiliate_code);
  END IF;
END $$;

-- Add missing columns to affiliate_referrals
ALTER TABLE IF EXISTS affiliate_referrals
  ADD COLUMN IF NOT EXISTS referred_user_id UUID,
  ADD COLUMN IF NOT EXISTS referred_user_email TEXT,
  ADD COLUMN IF NOT EXISTS bookings_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_commission_earned DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS registered_at TIMESTAMPTZ DEFAULT now();

-- Add foreign key for referred_user_id if missing
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name='affiliate_referrals' AND constraint_name='affiliate_referrals_referred_user_id_fkey'
  ) THEN
    ALTER TABLE affiliate_referrals
      ADD CONSTRAINT affiliate_referrals_referred_user_id_fkey
      FOREIGN KEY (referred_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Ensure unique pair (affiliate_id, referred_user_id)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='affiliate_referrals' AND column_name='affiliate_id'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='affiliate_referrals' AND column_name='referred_user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_affiliate_referrals_unique_pair'
  ) THEN
    CREATE UNIQUE INDEX idx_affiliate_referrals_unique_pair ON affiliate_referrals(affiliate_id, referred_user_id);
  END IF;
END $$;

-- Add missing columns to affiliate_commissions
ALTER TABLE IF EXISTS affiliate_commissions
  ADD COLUMN IF NOT EXISTS booking_value DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS platform_commission DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS affiliate_commission DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5,2) DEFAULT 20.00,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

-- Ensure uniqueness per booking and affiliate
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_affiliate_commissions_booking_affiliate'
  ) THEN
    CREATE UNIQUE INDEX idx_affiliate_commissions_booking_affiliate ON affiliate_commissions(booking_id, affiliate_id);
  END IF;
END $$;

-- Add missing columns to affiliate_payouts
ALTER TABLE IF EXISTS affiliate_payouts
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'RWF',
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS payment_details JSONB,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS requested_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Recreate commission tracking trigger safely
DROP TRIGGER IF EXISTS trigger_track_affiliate_commission ON bookings;
CREATE OR REPLACE FUNCTION track_affiliate_commission()
RETURNS TRIGGER AS $$
DECLARE
  v_referral RECORD;
  v_platform_commission DECIMAL(10, 2);
  v_affiliate_commission DECIMAL(10, 2);
  v_platform_commission_rate DECIMAL(5, 2) := 10.00;
  v_affiliate_commission_rate DECIMAL(5, 2) := 20.00;
BEGIN
  IF NEW.status NOT IN ('confirmed', 'completed') THEN
    RETURN NEW;
  END IF;

  SELECT ar.* INTO v_referral
  FROM affiliate_referrals ar
  WHERE ar.referred_user_id = NEW.host_id
    AND ar.bookings_count < 5
    AND ar.status = 'active';

  IF FOUND THEN
    v_platform_commission := (NEW.total_price * v_platform_commission_rate / 100);
    v_affiliate_commission := (v_platform_commission * v_affiliate_commission_rate / 100);

    INSERT INTO affiliate_commissions (
      affiliate_id, referral_id, booking_id, booking_value,
      platform_commission, affiliate_commission, commission_rate, status
    )
    VALUES (
      v_referral.affiliate_id, v_referral.id, NEW.id, NEW.total_price,
      v_platform_commission, v_affiliate_commission, v_affiliate_commission_rate, 'approved'
    )
    ON CONFLICT (booking_id, affiliate_id) DO NOTHING;

    UPDATE affiliate_referrals
    SET 
      bookings_count = bookings_count + 1,
      total_commission_earned = total_commission_earned + v_affiliate_commission,
      status = CASE WHEN bookings_count + 1 >= 5 THEN 'completed' ELSE status END
    WHERE id = v_referral.id;

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

CREATE TRIGGER trigger_track_affiliate_commission
  AFTER INSERT OR UPDATE OF status ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION track_affiliate_commission();
