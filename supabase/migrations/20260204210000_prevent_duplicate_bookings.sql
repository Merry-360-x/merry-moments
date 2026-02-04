-- Add index to prevent duplicate bookings for the same order and item
-- This ensures we can't create two bookings for the same order_id + property_id/tour_id/transport_id

-- First, let's add an index for faster lookups
CREATE INDEX IF NOT EXISTS idx_bookings_order_id ON bookings(order_id);
CREATE INDEX IF NOT EXISTS idx_bookings_order_property ON bookings(order_id, property_id) WHERE property_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_order_tour ON bookings(order_id, tour_id) WHERE tour_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_order_transport ON bookings(order_id, transport_id) WHERE transport_id IS NOT NULL;

-- Add a function to prevent duplicate bookings
CREATE OR REPLACE FUNCTION prevent_duplicate_bookings()
RETURNS TRIGGER AS $$
BEGIN
  -- Check for property duplicates
  IF NEW.property_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM bookings 
    WHERE order_id = NEW.order_id 
    AND property_id = NEW.property_id 
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) THEN
    RAISE EXCEPTION 'Duplicate booking: order % already has a booking for property %', NEW.order_id, NEW.property_id;
  END IF;
  
  -- Check for tour duplicates
  IF NEW.tour_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM bookings 
    WHERE order_id = NEW.order_id 
    AND tour_id = NEW.tour_id 
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) THEN
    RAISE EXCEPTION 'Duplicate booking: order % already has a booking for tour %', NEW.order_id, NEW.tour_id;
  END IF;
  
  -- Check for transport duplicates
  IF NEW.transport_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM bookings 
    WHERE order_id = NEW.order_id 
    AND transport_id = NEW.transport_id 
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) THEN
    RAISE EXCEPTION 'Duplicate booking: order % already has a booking for transport %', NEW.order_id, NEW.transport_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to prevent duplicates
DROP TRIGGER IF EXISTS prevent_duplicate_bookings_trigger ON bookings;
CREATE TRIGGER prevent_duplicate_bookings_trigger
  BEFORE INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION prevent_duplicate_bookings();

COMMENT ON FUNCTION prevent_duplicate_bookings() IS 'Prevents duplicate bookings for the same order and item type';
