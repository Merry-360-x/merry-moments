-- Add payment_method and special_requests to bookings table
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS special_requests TEXT;

-- Add payment_method to checkout_requests table
ALTER TABLE checkout_requests
ADD COLUMN IF NOT EXISTS payment_method TEXT;

-- Add comments for documentation
COMMENT ON COLUMN bookings.payment_method IS 'Preferred payment method: mobile_money, bank_transfer, cash, card';
COMMENT ON COLUMN bookings.special_requests IS 'Guest special requests or notes';
COMMENT ON COLUMN checkout_requests.payment_method IS 'Preferred payment method: mobile_money, bank_transfer, cash, card';
