-- Add payment_error column to checkout_requests for storing error messages

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'checkout_requests' 
    AND column_name = 'payment_error'
  ) THEN
    ALTER TABLE checkout_requests ADD COLUMN payment_error TEXT;
  END IF;
END $$;

COMMENT ON COLUMN checkout_requests.payment_error IS 'Error message from payment provider when payment fails';

-- Add missing FK for transport_id in bookings table
DO $$ 
BEGIN
  -- Check if the foreign key constraint already exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'bookings_transport_id_fkey'
    AND table_name = 'bookings'
  ) THEN
    -- First, remove any invalid transport_ids that don't exist in transport_vehicles
    UPDATE bookings 
    SET transport_id = NULL 
    WHERE transport_id IS NOT NULL 
    AND transport_id NOT IN (SELECT id FROM transport_vehicles);
    
    -- Now add the foreign key constraint
    ALTER TABLE bookings 
    ADD CONSTRAINT bookings_transport_id_fkey 
    FOREIGN KEY (transport_id) REFERENCES transport_vehicles(id) ON DELETE SET NULL;
  END IF;
END $$;

COMMENT ON COLUMN bookings.transport_id IS 'Reference to transport_vehicles if booking_type is transport';

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
