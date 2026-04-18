-- Add payment_phone column to bookings table.
-- This field stores the mobile money phone number used at checkout.
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS payment_phone TEXT;

COMMENT ON COLUMN bookings.payment_phone IS 'Mobile money phone number provided at checkout (e.g. +250785000000)';
