-- Create payment_transactions table for tracking payment provider transactions
CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN ('pawapay', 'dpo', 'stripe', 'manual')),
    transaction_id TEXT NOT NULL,
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    currency TEXT NOT NULL DEFAULT 'RWF',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'accepted', 'completed', 'failed', 'rejected', 'cancelled')),
    payment_method TEXT,
    phone_number TEXT,
    provider_response JSONB,
    failure_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    UNIQUE(provider, transaction_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payment_transactions_booking_id ON payment_transactions(booking_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_provider ON payment_transactions(provider);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_transaction_id ON payment_transactions(transaction_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_created_at ON payment_transactions(created_at DESC);

-- Enable RLS
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own payment transactions" ON payment_transactions FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM bookings 
        WHERE bookings.id = payment_transactions.booking_id 
        AND bookings.guest_id = auth.uid()
    )
);

CREATE POLICY "Admins can view all payment transactions" ON payment_transactions FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_roles.user_id = auth.uid() 
        AND user_roles.role = 'admin'
    )
);

CREATE POLICY "Staff can view all payment transactions" ON payment_transactions FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_roles.user_id = auth.uid() 
        AND user_roles.role IN ('admin', 'financial_staff', 'operations_staff')
    )
);

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_payment_transaction_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-updating timestamp
DROP TRIGGER IF EXISTS trigger_update_payment_transaction_timestamp ON payment_transactions;
CREATE TRIGGER trigger_update_payment_transaction_timestamp
    BEFORE UPDATE ON payment_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_transaction_timestamp();
