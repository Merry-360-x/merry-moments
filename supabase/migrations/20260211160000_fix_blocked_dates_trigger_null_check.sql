-- Fix trigger to prevent inserting blocked dates with NULL property_id
-- This happens when a property is deleted and cascades SET NULL to bookings

-- Update the trigger function to check for NULL property_id
CREATE OR REPLACE FUNCTION block_dates_on_booking()
RETURNS TRIGGER AS $$
BEGIN
  -- IMPORTANT: Check if property_id is NOT NULL (prevents error when property is deleted)
  -- Only block if status is confirmed or completed AND payment_status is paid
  IF NEW.property_id IS NOT NULL 
     AND NEW.status IN ('confirmed', 'completed') 
     AND NEW.payment_status = 'paid' THEN
    -- Insert blocked date, ignore if already exists (ON CONFLICT)
    INSERT INTO property_blocked_dates (property_id, start_date, end_date, reason, created_by)
    VALUES (NEW.property_id, NEW.check_in, NEW.check_out, 'Booked', NEW.guest_id)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also update the unblock function safety
CREATE OR REPLACE FUNCTION unblock_dates_on_booking_cancel()
RETURNS TRIGGER AS $$
BEGIN
  -- Check property_id is not null before attempting delete
  IF NEW.property_id IS NOT NULL 
     AND NEW.status = 'cancelled' 
     AND OLD.status != 'cancelled' THEN
    DELETE FROM property_blocked_dates
    WHERE property_id = NEW.property_id
      AND start_date = NEW.check_in
      AND end_date = NEW.check_out
      AND reason = 'Booked';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Clean up any existing corrupted rows with NULL property_id
DELETE FROM property_blocked_dates WHERE property_id IS NULL;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
