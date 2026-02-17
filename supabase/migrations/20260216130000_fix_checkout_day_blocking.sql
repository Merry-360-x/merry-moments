-- Fix blocked date ranges so checkout day is NOT blocked.
-- Booking stay range should be [check_in, check_out) which means blocked dates end at check_out - 1 day.

CREATE OR REPLACE FUNCTION block_dates_on_booking()
RETURNS TRIGGER AS $$
BEGIN
  -- Only block if status is confirmed or completed AND payment_status is paid
  IF NEW.status IN ('confirmed', 'completed') AND NEW.payment_status = 'paid' THEN
    INSERT INTO property_blocked_dates (property_id, start_date, end_date, reason, created_by)
    VALUES (
      NEW.property_id,
      NEW.check_in,
      GREATEST(NEW.check_in, NEW.check_out - INTERVAL '1 day')::date,
      'Booked',
      NEW.guest_id
    )
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION unblock_dates_on_booking_cancel()
RETURNS TRIGGER AS $$
BEGIN
  -- Support cleanup for both historical (end_date = check_out) and fixed (end_date = check_out - 1)
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    DELETE FROM property_blocked_dates
    WHERE property_id = NEW.property_id
      AND start_date = NEW.check_in
      AND end_date IN (
        NEW.check_out,
        GREATEST(NEW.check_in, NEW.check_out - INTERVAL '1 day')::date
      )
      AND reason = 'Booked';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
  GREATEST(b.check_in, b.check_out - INTERVAL '1 day')::date AS end_date,
  'Booking #' || LEFT(b.id::text, 8) AS reason,
  'booking' AS source,
  b.created_at
FROM bookings b
WHERE b.status IN ('pending', 'confirmed', 'completed')
  AND b.payment_status IN ('pending', 'paid')
  AND NOT EXISTS (
    SELECT 1 FROM property_blocked_dates pbd2
    WHERE pbd2.property_id = b.property_id
      AND pbd2.start_date = b.check_in
      AND pbd2.reason = 'Booked'
      AND pbd2.end_date IN (
        b.check_out,
        GREATEST(b.check_in, b.check_out - INTERVAL '1 day')::date
      )
  );

GRANT SELECT ON property_unavailable_dates TO authenticated, anon;

-- Backfill: convert historical blocked rows where end_date was saved as check_out.
UPDATE property_blocked_dates pbd
SET end_date = GREATEST(b.check_in, b.check_out - INTERVAL '1 day')::date
FROM bookings b
WHERE pbd.reason = 'Booked'
  AND pbd.property_id = b.property_id
  AND pbd.start_date = b.check_in
  AND pbd.end_date = b.check_out;

-- Backfill: insert missing blocked rows for confirmed/paid bookings using fixed end_date.
INSERT INTO property_blocked_dates (property_id, start_date, end_date, reason, created_by)
SELECT 
  b.property_id,
  b.check_in,
  GREATEST(b.check_in, b.check_out - INTERVAL '1 day')::date,
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
      AND pbd.reason = 'Booked'
      AND pbd.end_date IN (
        b.check_out,
        GREATEST(b.check_in, b.check_out - INTERVAL '1 day')::date
      )
  )
ON CONFLICT DO NOTHING;

COMMENT ON FUNCTION block_dates_on_booking IS 'Automatically creates blocked date entry for booking stay nights only (checkout day excluded).';
COMMENT ON FUNCTION unblock_dates_on_booking_cancel IS 'Removes corresponding blocked date entry when booking is cancelled (supports old/new end-date styles).';
