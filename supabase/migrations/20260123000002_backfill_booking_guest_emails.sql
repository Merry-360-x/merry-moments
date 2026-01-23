-- Backfill guest_email for existing bookings from auth.users
-- This fixes the issue where old bookings don't have guest email populated

UPDATE bookings
SET guest_email = auth.users.email
FROM auth.users
WHERE bookings.guest_id = auth.users.id
  AND bookings.guest_email IS NULL
  AND bookings.guest_id IS NOT NULL;

-- Add a comment explaining the fix
COMMENT ON COLUMN bookings.guest_email IS 'Guest email address - populated from auth.users.email for registered users or entered directly for guest checkouts';
