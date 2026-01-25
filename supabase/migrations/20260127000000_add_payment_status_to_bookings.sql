-- Add payment_status column to bookings table if it doesn't exist
-- This column tracks the payment lifecycle: pending -> requested -> paid

DO $$ 
BEGIN
  -- Check if payment_status column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' 
    AND column_name = 'payment_status'
  ) THEN
    ALTER TABLE bookings 
    ADD COLUMN payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'requested', 'paid', 'refunded', 'failed'));
  END IF;

  -- If column exists but doesn't have the right constraints, update it
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' 
    AND column_name = 'payment_status'
  ) THEN
    -- Drop existing constraint if it exists
    ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_payment_status_check;
    
    -- Add updated constraint
    ALTER TABLE bookings 
    ADD CONSTRAINT bookings_payment_status_check 
    CHECK (payment_status IN ('pending', 'requested', 'paid', 'refunded', 'failed'));
  END IF;
END $$;

-- Update existing bookings with NULL payment_status to 'pending'
UPDATE bookings 
SET payment_status = 'pending' 
WHERE payment_status IS NULL;

-- Add index for faster payment_status queries
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON bookings(payment_status);

-- Create a comment explaining the payment status workflow
COMMENT ON COLUMN bookings.payment_status IS 
'Payment lifecycle: pending (awaiting action) -> requested (payment reminder sent) -> paid (payment confirmed) | Other states: refunded, failed';
