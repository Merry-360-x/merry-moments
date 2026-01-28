-- Combined new migrations to apply manually
-- Run this in Supabase SQL Editor

-- ============================================================
-- MIGRATION 1: Affiliate System
-- ============================================================

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

-- Create affiliate_referrals table
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

-- Create affiliate_commissions table
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

-- Create affiliate_payouts table
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
CREATE INDEX IF NOT EXISTS idx_affiliates_code ON affiliates(affiliate_code);
CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_affiliate ON affiliate_referrals(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_referred_user ON affiliate_referrals(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_affiliate ON affiliate_commissions(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_referral ON affiliate_commissions(referral_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_booking ON affiliate_commissions(booking_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_payouts_affiliate ON affiliate_payouts(affiliate_id);

-- Function to generate unique affiliate code
CREATE OR REPLACE FUNCTION generate_affiliate_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  exists BOOLEAN;
BEGIN
  LOOP
    code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
    SELECT EXISTS(SELECT 1 FROM affiliates WHERE affiliate_code = code) INTO exists;
    EXIT WHEN NOT exists;
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Function to track affiliate commission
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

-- Create trigger
DROP TRIGGER IF EXISTS trigger_track_affiliate_commission ON bookings;
CREATE TRIGGER trigger_track_affiliate_commission
  AFTER INSERT OR UPDATE OF status ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION track_affiliate_commission();

-- Enable RLS
ALTER TABLE affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_payouts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own affiliate account" ON affiliates;
CREATE POLICY "Users can view their own affiliate account" ON affiliates FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own affiliate account" ON affiliates;
CREATE POLICY "Users can create their own affiliate account" ON affiliates FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own affiliate account" ON affiliates;
CREATE POLICY "Users can update their own affiliate account" ON affiliates FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Affiliates can view their referrals" ON affiliate_referrals;
CREATE POLICY "Affiliates can view their referrals" ON affiliate_referrals FOR SELECT
  USING (affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Affiliates can view their commissions" ON affiliate_commissions;
CREATE POLICY "Affiliates can view their commissions" ON affiliate_commissions FOR SELECT
  USING (affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Affiliates can view their payouts" ON affiliate_payouts;
CREATE POLICY "Affiliates can view their payouts" ON affiliate_payouts FOR SELECT
  USING (affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Affiliates can create payout requests" ON affiliate_payouts;
CREATE POLICY "Affiliates can create payout requests" ON affiliate_payouts FOR INSERT
  WITH CHECK (affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid()));

-- ============================================================
-- MIGRATION 2: Expand Transport System
-- ============================================================

-- Create enums
DO $$ BEGIN
  CREATE TYPE transport_service_type AS ENUM ('airport_transfer', 'car_rental', 'intracity_ride', 'intercity_ride');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE car_type AS ENUM ('SUV', 'Sedan', 'Hatchback', 'Coupe', 'Wagon', 'Van', 'Minibus', 'Truck', 'Luxury');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE transmission_type AS ENUM ('Automatic', 'Manual', 'Hybrid');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE fuel_type AS ENUM ('Petrol', 'Diesel', 'Electric', 'Hybrid');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE drive_train_type AS ENUM ('FWD', 'RWD', 'AWD', '4WD');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Add columns to transport_vehicles
ALTER TABLE transport_vehicles
ADD COLUMN IF NOT EXISTS service_type transport_service_type DEFAULT 'car_rental',
ADD COLUMN IF NOT EXISTS car_brand TEXT,
ADD COLUMN IF NOT EXISTS car_model TEXT,
ADD COLUMN IF NOT EXISTS car_year INTEGER,
ADD COLUMN IF NOT EXISTS car_type car_type,
ADD COLUMN IF NOT EXISTS transmission transmission_type,
ADD COLUMN IF NOT EXISTS fuel_type fuel_type,
ADD COLUMN IF NOT EXISTS drive_train drive_train_type,
ADD COLUMN IF NOT EXISTS daily_price DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS weekly_price DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS monthly_price DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS interior_images JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS exterior_images JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS key_features JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS insurance_document_url TEXT,
ADD COLUMN IF NOT EXISTS registration_document_url TEXT,
ADD COLUMN IF NOT EXISTS roadworthiness_certificate_url TEXT,
ADD COLUMN IF NOT EXISTS owner_identification_url TEXT;

-- Update existing records
UPDATE transport_vehicles 
SET daily_price = price_per_day 
WHERE daily_price IS NULL AND price_per_day IS NOT NULL;

-- Create airport routes table
CREATE TABLE IF NOT EXISTS airport_transfer_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_location TEXT NOT NULL,
  to_location TEXT NOT NULL,
  distance_km DECIMAL(5, 2),
  base_price DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'RWF',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(from_location, to_location)
);

-- Create pricing table
CREATE TABLE IF NOT EXISTS airport_transfer_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES transport_vehicles(id) ON DELETE CASCADE,
  route_id UUID NOT NULL REFERENCES airport_transfer_routes(id) ON DELETE CASCADE,
  price DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'RWF',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(vehicle_id, route_id)
);

-- Insert default routes
INSERT INTO airport_transfer_routes (from_location, to_location, distance_km, base_price, currency) VALUES
  ('Kigali International Airport', 'Remera', 10.5, 15000, 'RWF'),
  ('Remera', 'Kigali International Airport', 10.5, 15000, 'RWF'),
  ('Kigali International Airport', 'City Center', 12.0, 18000, 'RWF'),
  ('City Center', 'Kigali International Airport', 12.0, 18000, 'RWF'),
  ('Kigali International Airport', 'Kimihurura', 8.5, 12000, 'RWF'),
  ('Kimihurura', 'Kigali International Airport', 8.5, 12000, 'RWF'),
  ('Kigali International Airport', 'Nyarutarama', 9.0, 13000, 'RWF'),
  ('Nyarutarama', 'Kigali International Airport', 9.0, 13000, 'RWF'),
  ('Kigali International Airport', 'Kacyiru', 11.0, 16000, 'RWF'),
  ('Kacyiru', 'Kigali International Airport', 11.0, 16000, 'RWF')
ON CONFLICT (from_location, to_location) DO NOTHING;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_transport_vehicles_service_type ON transport_vehicles(service_type);
CREATE INDEX IF NOT EXISTS idx_transport_vehicles_car_type ON transport_vehicles(car_type);
CREATE INDEX IF NOT EXISTS idx_transport_vehicles_transmission ON transport_vehicles(transmission);
CREATE INDEX IF NOT EXISTS idx_airport_transfer_routes_from ON airport_transfer_routes(from_location);
CREATE INDEX IF NOT EXISTS idx_airport_transfer_routes_to ON airport_transfer_routes(to_location);
CREATE INDEX IF NOT EXISTS idx_airport_transfer_pricing_vehicle ON airport_transfer_pricing(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_airport_transfer_pricing_route ON airport_transfer_pricing(route_id);

-- Enable RLS
ALTER TABLE airport_transfer_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE airport_transfer_pricing ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Anyone can view active routes" ON airport_transfer_routes;
CREATE POLICY "Anyone can view active routes" ON airport_transfer_routes FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Anyone can view pricing" ON airport_transfer_pricing;
CREATE POLICY "Anyone can view pricing" ON airport_transfer_pricing FOR SELECT USING (true);

DROP POLICY IF EXISTS "Vehicle owners can manage their pricing" ON airport_transfer_pricing;
CREATE POLICY "Vehicle owners can manage their pricing" ON airport_transfer_pricing FOR ALL
  USING (vehicle_id IN (SELECT id FROM transport_vehicles WHERE created_by = auth.uid()));
