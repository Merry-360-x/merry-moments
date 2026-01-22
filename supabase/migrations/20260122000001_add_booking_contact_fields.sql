-- Add phone fields to bookings table
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS guest_phone TEXT,
ADD COLUMN IF NOT EXISTS guest_name TEXT,
ADD COLUMN IF NOT EXISTS guest_email TEXT;

COMMENT ON COLUMN bookings.guest_phone IS 'Phone number for all bookings (both logged in and guest users)';
COMMENT ON COLUMN bookings.guest_name IS 'Name for guest bookings (non-registered users)';
COMMENT ON COLUMN bookings.guest_email IS 'Email for guest bookings (non-registered users)';
