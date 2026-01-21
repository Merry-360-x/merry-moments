-- Add payment_method and special_requests to bookings table
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS special_requests TEXT;

-- Add payment_method to checkout_requests table
ALTER TABLE checkout_requests
ADD COLUMN IF NOT EXISTS payment_method TEXT;

-- Update status column to include pending_confirmation
-- Note: This will only work if status is not an enum. If it is, we need to alter the enum type.
COMMENT ON COLUMN bookings.status IS 'Booking status: pending, pending_confirmation, confirmed, cancelled, completed';
COMMENT ON COLUMN checkout_requests.status IS 'Request status: pending, pending_confirmation, confirmed, cancelled, completed';
