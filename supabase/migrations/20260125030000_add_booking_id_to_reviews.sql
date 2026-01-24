-- Add missing columns to property_reviews if they don't exist
DO $$ 
BEGIN
  -- Add booking_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'property_reviews' AND column_name = 'booking_id'
  ) THEN
    ALTER TABLE property_reviews ADD COLUMN booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE;
    CREATE INDEX idx_property_reviews_booking_id ON property_reviews(booking_id);
  END IF;

  -- Add is_hidden
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'property_reviews' AND column_name = 'is_hidden'
  ) THEN
    ALTER TABLE property_reviews ADD COLUMN is_hidden BOOLEAN DEFAULT false;
  END IF;

  -- Add updated_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'property_reviews' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE property_reviews ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
  END IF;

  -- Rename user_id to reviewer_id if needed
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'property_reviews' AND column_name = 'user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'property_reviews' AND column_name = 'reviewer_id'
  ) THEN
    ALTER TABLE property_reviews RENAME COLUMN user_id TO reviewer_id;
  END IF;
  
  -- Add reviewer_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'property_reviews' AND column_name IN ('user_id', 'reviewer_id')
  ) THEN
    ALTER TABLE property_reviews ADD COLUMN reviewer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Ensure necessary indexes exist
CREATE INDEX IF NOT EXISTS idx_property_reviews_reviewer_id ON property_reviews(reviewer_id);

-- Add missing columns to support_tickets if they don't exist
DO $$ 
BEGIN
  -- Add response column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'support_tickets' AND column_name = 'response'
  ) THEN
    ALTER TABLE support_tickets ADD COLUMN response TEXT;
  END IF;

  -- Add updated_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'support_tickets' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE support_tickets ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
  END IF;
END $$;

-- Update RLS policies for property_reviews

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Users can create reviews for their bookings" ON property_reviews;
DROP POLICY IF EXISTS "Users can update their own reviews" ON property_reviews;
DROP POLICY IF EXISTS "Anyone can view visible reviews" ON property_reviews;
DROP POLICY IF EXISTS "Staff can manage all reviews" ON property_reviews;

-- Recreate policies
CREATE POLICY "Anyone can view visible reviews"
  ON property_reviews
  FOR SELECT
  USING (NOT is_hidden OR auth.uid() = reviewer_id OR is_any_staff());

CREATE POLICY "Users can create reviews for their bookings"
  ON property_reviews
  FOR INSERT
  WITH CHECK (
    auth.uid() = reviewer_id
    AND (
      booking_id IS NULL
      OR EXISTS (
        SELECT 1 FROM bookings 
        WHERE id = booking_id 
        AND guest_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update their own reviews"
  ON property_reviews
  FOR UPDATE
  USING (auth.uid() = reviewer_id)
  WITH CHECK (auth.uid() = reviewer_id);

CREATE POLICY "Staff can manage all reviews"
  ON property_reviews
  FOR ALL
  USING (is_any_staff());

-- Create trigger for updated_at on property_reviews
DROP TRIGGER IF EXISTS update_property_reviews_updated_at ON property_reviews;
CREATE TRIGGER update_property_reviews_updated_at
  BEFORE UPDATE ON property_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create trigger for updated_at on support_tickets
DROP TRIGGER IF EXISTS update_support_tickets_updated_at ON support_tickets;
CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
