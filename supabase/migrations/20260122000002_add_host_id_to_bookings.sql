-- Add host_id column to bookings table
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS host_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN bookings.host_id IS 'The host/property owner ID for this booking';
