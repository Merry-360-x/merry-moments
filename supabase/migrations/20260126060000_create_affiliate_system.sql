-- Create affiliates table
CREATE TABLE IF NOT EXISTS affiliates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    referral_code TEXT NOT NULL UNIQUE,
    company_name TEXT,
    website_url TEXT,
    commission_rate DECIMAL(5,2) DEFAULT 10.00 CHECK (commission_rate >= 0 AND commission_rate <= 100),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'rejected')),
    total_earnings DECIMAL(12,2) DEFAULT 0.00,
    total_referrals INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(user_id)
);

-- Create affiliate referrals table (track clicks)
CREATE TABLE IF NOT EXISTS affiliate_referrals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
    referral_code TEXT NOT NULL,
    visitor_ip TEXT,
    user_agent TEXT,
    landing_page TEXT,
    converted BOOLEAN DEFAULT false,
    booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create affiliate commissions table
CREATE TABLE IF NOT EXISTS affiliate_commissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    referral_id UUID REFERENCES affiliate_referrals(id) ON DELETE SET NULL,
    amount DECIMAL(12,2) NOT NULL CHECK (amount >= 0),
    commission_rate DECIMAL(5,2) NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')),
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create affiliate payouts table
CREATE TABLE IF NOT EXISTS affiliate_payouts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    payment_method TEXT NOT NULL,
    payment_details JSONB,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add referral_code to bookings table
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS referral_code TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS affiliate_id UUID REFERENCES affiliates(id) ON DELETE SET NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_affiliates_user_id ON affiliates(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliates_referral_code ON affiliates(referral_code);
CREATE INDEX IF NOT EXISTS idx_affiliates_status ON affiliates(status);
CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_affiliate_id ON affiliate_referrals(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_code ON affiliate_referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_affiliate_id ON affiliate_commissions(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_booking_id ON affiliate_commissions(booking_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_payouts_affiliate_id ON affiliate_payouts(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_bookings_referral_code ON bookings(referral_code);

-- Enable RLS
ALTER TABLE affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_payouts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for affiliates
CREATE POLICY "affiliates_read_own" ON affiliates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "affiliates_insert_own" ON affiliates FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "affiliates_update_own" ON affiliates FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "affiliates_admin_all" ON affiliates FOR ALL USING (
    EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_roles.user_id = auth.uid() 
        AND user_roles.role = 'admin'
    )
);

-- RLS Policies for affiliate referrals
CREATE POLICY "affiliate_referrals_insert_public" ON affiliate_referrals FOR INSERT WITH CHECK (true);
CREATE POLICY "affiliate_referrals_read_own" ON affiliate_referrals FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM affiliates 
        WHERE affiliates.id = affiliate_referrals.affiliate_id 
        AND affiliates.user_id = auth.uid()
    )
);
CREATE POLICY "affiliate_referrals_admin_all" ON affiliate_referrals FOR ALL USING (
    EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_roles.user_id = auth.uid() 
        AND user_roles.role = 'admin'
    )
);

-- RLS Policies for affiliate commissions
CREATE POLICY "affiliate_commissions_read_own" ON affiliate_commissions FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM affiliates 
        WHERE affiliates.id = affiliate_commissions.affiliate_id 
        AND affiliates.user_id = auth.uid()
    )
);
CREATE POLICY "affiliate_commissions_admin_all" ON affiliate_commissions FOR ALL USING (
    EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_roles.user_id = auth.uid() 
        AND user_roles.role = 'admin'
    )
);

-- RLS Policies for affiliate payouts
CREATE POLICY "affiliate_payouts_read_own" ON affiliate_payouts FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM affiliates 
        WHERE affiliates.id = affiliate_payouts.affiliate_id 
        AND affiliates.user_id = auth.uid()
    )
);
CREATE POLICY "affiliate_payouts_insert_own" ON affiliate_payouts FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM affiliates 
        WHERE affiliates.id = affiliate_payouts.affiliate_id 
        AND affiliates.user_id = auth.uid()
    )
);
CREATE POLICY "affiliate_payouts_admin_all" ON affiliate_payouts FOR ALL USING (
    EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_roles.user_id = auth.uid() 
        AND user_roles.role = 'admin'
    )
);

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
DECLARE
    code TEXT;
    exists BOOLEAN;
BEGIN
    LOOP
        -- Generate random 8-character alphanumeric code
        code := upper(substring(md5(random()::text) from 1 for 8));
        
        -- Check if code already exists
        SELECT EXISTS(SELECT 1 FROM affiliates WHERE referral_code = code) INTO exists;
        
        IF NOT exists THEN
            RETURN code;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically create commission when booking is confirmed
CREATE OR REPLACE FUNCTION create_affiliate_commission()
RETURNS TRIGGER AS $$
DECLARE
    affiliate_record RECORD;
    commission_amount DECIMAL(12,2);
    referral_record RECORD;
BEGIN
    -- Only create commission if booking has referral_code and payment is confirmed
    IF NEW.referral_code IS NOT NULL AND NEW.payment_status = 'paid' THEN
        -- Get affiliate info
        SELECT * INTO affiliate_record 
        FROM affiliates 
        WHERE referral_code = NEW.referral_code AND status = 'active';
        
        IF affiliate_record.id IS NOT NULL THEN
            -- Calculate commission
            commission_amount := NEW.total_price * (affiliate_record.commission_rate / 100);
            
            -- Find the referral record
            SELECT * INTO referral_record
            FROM affiliate_referrals
            WHERE referral_code = NEW.referral_code
            AND converted = false
            ORDER BY created_at DESC
            LIMIT 1;
            
            -- Create commission record
            INSERT INTO affiliate_commissions (
                affiliate_id,
                booking_id,
                referral_id,
                amount,
                commission_rate,
                status
            ) VALUES (
                affiliate_record.id,
                NEW.id,
                referral_record.id,
                commission_amount,
                affiliate_record.commission_rate,
                'pending'
            );
            
            -- Mark referral as converted
            IF referral_record.id IS NOT NULL THEN
                UPDATE affiliate_referrals 
                SET converted = true, booking_id = NEW.id 
                WHERE id = referral_record.id;
            END IF;
            
            -- Update affiliate stats
            UPDATE affiliates 
            SET total_referrals = total_referrals + 1
            WHERE id = affiliate_record.id;
            
            -- Update booking affiliate_id
            NEW.affiliate_id := affiliate_record.id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for commission creation
DROP TRIGGER IF EXISTS trigger_create_affiliate_commission ON bookings;
CREATE TRIGGER trigger_create_affiliate_commission
    BEFORE INSERT OR UPDATE OF payment_status ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION create_affiliate_commission();

-- Function to update affiliate earnings when commission is paid
CREATE OR REPLACE FUNCTION update_affiliate_earnings()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
        UPDATE affiliates 
        SET total_earnings = total_earnings + NEW.amount
        WHERE id = NEW.affiliate_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for earnings update
DROP TRIGGER IF EXISTS trigger_update_affiliate_earnings ON affiliate_commissions;
CREATE TRIGGER trigger_update_affiliate_earnings
    AFTER UPDATE ON affiliate_commissions
    FOR EACH ROW
    WHEN (NEW.status IS DISTINCT FROM OLD.status)
    EXECUTE FUNCTION update_affiliate_earnings();
