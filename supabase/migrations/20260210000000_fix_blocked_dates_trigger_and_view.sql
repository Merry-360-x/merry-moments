-- Re-create the trigger to auto-block dates when a booking is confirmed/paid
-- This was removed when the table was recreated with CASCADE

-- Function to automatically block dates when booking is confirmed
CREATE OR REPLACE FUNCTION block_dates_on_booking()
RETURNS TRIGGER AS $$
BEGIN
  -- Only block if status is confirmed or completed AND payment_status is paid
  IF NEW.status IN ('confirmed', 'completed') AND NEW.payment_status = 'paid' THEN
    -- Insert blocked date, ignore if already exists (ON CONFLICT)
    INSERT INTO property_blocked_dates (property_id, start_date, end_date, reason, created_by)
    VALUES (NEW.property_id, NEW.check_in, NEW.check_out, 'Booked', NEW.guest_id)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_block_dates_on_booking ON bookings;
CREATE TRIGGER trigger_block_dates_on_booking
  AFTER INSERT OR UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION block_dates_on_booking();

-- Also create a function to unblock dates when booking is cancelled
CREATE OR REPLACE FUNCTION unblock_dates_on_booking_cancel()
RETURNS TRIGGER AS $$
BEGIN
  -- If booking is cancelled, remove the blocked date entry
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    DELETE FROM property_blocked_dates
    WHERE property_id = NEW.property_id
      AND start_date = NEW.check_in
      AND end_date = NEW.check_out
      AND reason = 'Booked';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_unblock_dates_on_cancel ON bookings;
CREATE TRIGGER trigger_unblock_dates_on_cancel
  AFTER UPDATE ON bookings
  FOR EACH ROW
  WHEN (NEW.status = 'cancelled')
  EXECUTE FUNCTION unblock_dates_on_booking_cancel();

-- Fix RLS policies to ensure hosts can insert/update/delete their property's blocked dates
DROP POLICY IF EXISTS "Hosts can manage their blocked dates" ON property_blocked_dates;
CREATE POLICY "Hosts can manage their blocked dates"
ON property_blocked_dates FOR ALL
USING (
  -- Host owns the property
  property_id IN (
    SELECT id FROM properties WHERE host_id = auth.uid()
  )
  -- OR they created this blocked date entry
  OR created_by = auth.uid()
)
WITH CHECK (
  -- Host owns the property
  property_id IN (
    SELECT id FROM properties WHERE host_id = auth.uid()
  )
);

-- Create a view that combines blocked dates from both manual blocks and confirmed bookings
-- This provides a single source of truth for unavailable dates
DROP VIEW IF EXISTS property_unavailable_dates;
CREATE OR REPLACE VIEW property_unavailable_dates AS
SELECT 
  pbd.id,
  pbd.property_id,
  pbd.start_date,
  pbd.end_date,
  pbd.reason,
  'blocked' AS source,
  pbd.created_at
FROM property_blocked_dates pbd

UNION ALL

SELECT 
  b.id,
  b.property_id,
  b.check_in AS start_date,
  b.check_out AS end_date,
  'Booking #' || LEFT(b.id::text, 8) AS reason,
  'booking' AS source,
  b.created_at
FROM bookings b
WHERE b.status IN ('pending', 'confirmed', 'completed')
  AND b.payment_status IN ('pending', 'paid')
  -- Exclude bookings that already have a corresponding blocked_dates entry
  AND NOT EXISTS (
    SELECT 1 FROM property_blocked_dates pbd2
    WHERE pbd2.property_id = b.property_id
      AND pbd2.start_date = b.check_in
      AND pbd2.end_date = b.check_out
      AND pbd2.reason = 'Booked'
  );

-- Grant select on the view
GRANT SELECT ON property_unavailable_dates TO authenticated, anon;

-- Backfill: Insert blocked dates for existing confirmed/paid bookings that don't have entries
-- Only for bookings that have a valid property_id
INSERT INTO property_blocked_dates (property_id, start_date, end_date, reason, created_by)
SELECT 
  b.property_id,
  b.check_in,
  b.check_out,
  'Booked',
  b.guest_id
FROM bookings b
WHERE b.status IN ('confirmed', 'completed')
  AND b.payment_status = 'paid'
  AND b.property_id IS NOT NULL
  AND b.check_in IS NOT NULL
  AND b.check_out IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM property_blocked_dates pbd
    WHERE pbd.property_id = b.property_id
      AND pbd.start_date = b.check_in
      AND pbd.end_date = b.check_out
  )
ON CONFLICT DO NOTHING;

COMMENT ON VIEW property_unavailable_dates IS 'Combined view of all unavailable dates for properties (blocked dates + pending/confirmed bookings)';
COMMENT ON FUNCTION block_dates_on_booking IS 'Automatically creates a blocked date entry when a booking is confirmed and paid';
COMMENT ON FUNCTION unblock_dates_on_booking_cancel IS 'Removes the blocked date entry when a booking is cancelled';
