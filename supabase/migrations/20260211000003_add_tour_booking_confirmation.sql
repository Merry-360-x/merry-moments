-- Add requires_confirmation column to tour_packages table
-- This allows hosts to require manual confirmation for certain tours (e.g., volcano tours)

ALTER TABLE tour_packages
ADD COLUMN IF NOT EXISTS requires_confirmation boolean DEFAULT false;

-- Add comment explaining the field
COMMENT ON COLUMN tour_packages.requires_confirmation IS 'When true, bookings for this tour require host confirmation before being confirmed';

-- Also add a confirmation_required_reason field for hosts to explain
ALTER TABLE tour_packages
ADD COLUMN IF NOT EXISTS confirmation_required_reason text;

COMMENT ON COLUMN tour_packages.confirmation_required_reason IS 'Optional explanation for why confirmation is required (e.g., "Limited spots - volcano permit required")';

-- Add booking status values if they don't exist
-- Update bookings table to support pending_confirmation and rejected status
-- The status column should already exist, we just need to ensure these values are valid

-- Add host confirmation fields to bookings table
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS confirmation_status text DEFAULT NULL;

ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS confirmed_at timestamp with time zone;

ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS confirmed_by uuid REFERENCES auth.users(id);

ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS rejection_reason text;

ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS rejected_at timestamp with time zone;

-- Add comment
COMMENT ON COLUMN bookings.confirmation_status IS 'For tours requiring confirmation: pending, approved, rejected';
COMMENT ON COLUMN bookings.confirmed_at IS 'When the host confirmed the booking';
COMMENT ON COLUMN bookings.confirmed_by IS 'User ID of host who confirmed/rejected';
COMMENT ON COLUMN bookings.rejection_reason IS 'Reason provided if booking was rejected';

-- Create index for filtering pending confirmation bookings
CREATE INDEX IF NOT EXISTS idx_bookings_confirmation_status ON bookings (confirmation_status) WHERE confirmation_status IS NOT NULL;
