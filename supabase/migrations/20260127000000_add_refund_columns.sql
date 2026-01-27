-- Add refund tracking columns to bookings table
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS refund_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS refund_processed_at TIMESTAMPTZ;

-- Add comment for documentation
COMMENT ON COLUMN bookings.refund_amount IS 'Amount refunded to customer based on cancellation policy';
COMMENT ON COLUMN bookings.refund_processed_at IS 'Timestamp when refund was processed';

-- Create index for refund queries
CREATE INDEX IF NOT EXISTS idx_bookings_refund_status ON bookings(payment_status) WHERE payment_status = 'refunded';
