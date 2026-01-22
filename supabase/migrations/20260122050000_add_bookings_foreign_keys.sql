-- Fix foreign key relationships for bookings table to enable proper joins

-- Add foreign key constraint from bookings.guest_id to profiles.id if not exists
DO $$ 
BEGIN
  -- Check if foreign key exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'bookings_guest_id_fkey' 
    AND table_name = 'bookings'
  ) THEN
    -- Add the foreign key constraint
    ALTER TABLE bookings
    ADD CONSTRAINT bookings_guest_id_fkey
    FOREIGN KEY (guest_id)
    REFERENCES profiles(id)
    ON DELETE SET NULL;
    
    RAISE NOTICE 'Added foreign key constraint: bookings_guest_id_fkey';
  ELSE
    RAISE NOTICE 'Foreign key constraint bookings_guest_id_fkey already exists';
  END IF;
END $$;

-- Add foreign key constraint from bookings.host_id to profiles.id if not exists
DO $$ 
BEGIN
  -- Check if foreign key exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'bookings_host_id_fkey' 
    AND table_name = 'bookings'
  ) THEN
    -- Add the foreign key constraint
    ALTER TABLE bookings
    ADD CONSTRAINT bookings_host_id_fkey
    FOREIGN KEY (host_id)
    REFERENCES profiles(id)
    ON DELETE SET NULL;
    
    RAISE NOTICE 'Added foreign key constraint: bookings_host_id_fkey';
  ELSE
    RAISE NOTICE 'Foreign key constraint bookings_host_id_fkey already exists';
  END IF;
END $$;

-- Add foreign key constraint from bookings.property_id to properties.id if not exists
DO $$ 
BEGIN
  -- Check if foreign key exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'bookings_property_id_fkey' 
    AND table_name = 'bookings'
  ) THEN
    -- Add the foreign key constraint
    ALTER TABLE bookings
    ADD CONSTRAINT bookings_property_id_fkey
    FOREIGN KEY (property_id)
    REFERENCES properties(id)
    ON DELETE CASCADE;
    
    RAISE NOTICE 'Added foreign key constraint: bookings_property_id_fkey';
  ELSE
    RAISE NOTICE 'Foreign key constraint bookings_property_id_fkey already exists';
  END IF;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_bookings_guest_id ON bookings(guest_id);
CREATE INDEX IF NOT EXISTS idx_bookings_host_id ON bookings(host_id);
CREATE INDEX IF NOT EXISTS idx_bookings_property_id ON bookings(property_id);

COMMENT ON CONSTRAINT bookings_guest_id_fkey ON bookings IS 'Links booking to guest profile (nullable for guest checkouts)';
COMMENT ON CONSTRAINT bookings_host_id_fkey ON bookings IS 'Links booking to host profile';
COMMENT ON CONSTRAINT bookings_property_id_fkey ON bookings IS 'Links booking to property';
