-- Add review_token to bookings for tokenized email review links
DO $$ BEGIN
  ALTER TABLE bookings ADD COLUMN review_token UUID DEFAULT gen_random_uuid();
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Create unique index on review_token
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_review_token ON bookings(review_token) WHERE review_token IS NOT NULL;

-- Backfill existing bookings with review tokens
UPDATE bookings SET review_token = gen_random_uuid() WHERE review_token IS NULL;

-- Add service_rating and service_comment to property_reviews
DO $$ BEGIN
  ALTER TABLE property_reviews ADD COLUMN service_rating INTEGER CHECK (service_rating >= 1 AND service_rating <= 5);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE property_reviews ADD COLUMN service_comment TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Track whether review email was sent
DO $$ BEGIN
  ALTER TABLE bookings ADD COLUMN review_email_sent BOOLEAN DEFAULT false;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
