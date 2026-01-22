-- Add payment_status field to bookings table for tracking payment state

-- Create payment_status enum type if it doesn't exist
DO $$ BEGIN
  CREATE TYPE payment_status_enum AS ENUM ('pending', 'paid', 'failed', 'refunded');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add payment_status column to bookings table
DO $$ 
BEGIN
  ALTER TABLE bookings 
  ADD COLUMN IF NOT EXISTS payment_status payment_status_enum DEFAULT 'pending';
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN bookings.payment_status IS 'Payment status: pending (awaiting payment), paid (payment received), failed (payment failed), refunded (payment refunded)';

-- Create index for faster querying by payment status
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON bookings(payment_status);

-- Update existing bookings based on their booking status
-- Completed and confirmed bookings are likely paid
UPDATE bookings 
SET payment_status = 'paid' 
WHERE (status = 'completed' OR status = 'confirmed') 
  AND payment_status IS NULL;

-- Cancelled bookings might need refunds
UPDATE bookings 
SET payment_status = 'pending' 
WHERE status = 'cancelled' 
  AND payment_status IS NULL;

-- Pending bookings need payment
UPDATE bookings 
SET payment_status = 'pending' 
WHERE status = 'pending' 
  AND payment_status IS NULL;
