-- Add is_guest_booking column to bookings table to support guest checkout
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS is_guest_booking BOOLEAN DEFAULT FALSE;

-- Update existing bookings: if guest_id is null, mark as guest booking
UPDATE bookings
SET is_guest_booking = (guest_id IS NULL)
WHERE is_guest_booking IS NULL;
