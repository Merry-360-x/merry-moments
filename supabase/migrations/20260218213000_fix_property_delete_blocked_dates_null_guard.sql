-- Prevent property deletion from causing NULL property_id inserts into property_blocked_dates.
-- Root cause: bookings can be updated with property_id = NULL during property deletes (ON DELETE SET NULL),
-- and trigger functions must skip block/unblock writes in that scenario.

CREATE OR REPLACE FUNCTION block_dates_on_booking()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.property_id IS NOT NULL
     AND NEW.check_in IS NOT NULL
     AND NEW.check_out IS NOT NULL
     AND NEW.status IN ('confirmed', 'completed')
     AND NEW.payment_status = 'paid' THEN
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
  IF NEW.property_id IS NOT NULL
     AND NEW.check_in IS NOT NULL
     AND NEW.check_out IS NOT NULL
     AND NEW.status = 'cancelled'
     AND OLD.status != 'cancelled' THEN
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

-- Safety cleanup in case older logic ever produced invalid rows.
DELETE FROM property_blocked_dates
WHERE property_id IS NULL;
