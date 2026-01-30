-- Add metadata column to trip_cart_items for storing dates, guests, etc.

-- Add the metadata column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trip_cart_items' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE trip_cart_items ADD COLUMN metadata jsonb DEFAULT '{}';
  END IF;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN trip_cart_items.metadata IS 'JSON metadata for cart items: check_in, check_out, guests, nights, etc.';
