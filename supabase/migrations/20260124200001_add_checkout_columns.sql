-- Check and add missing columns to checkout_requests table

-- Add email column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'checkout_requests' 
    AND column_name = 'email'
  ) THEN
    ALTER TABLE checkout_requests ADD COLUMN email TEXT NOT NULL DEFAULT 'noreply@example.com';
    -- Remove the default after adding
    ALTER TABLE checkout_requests ALTER COLUMN email DROP DEFAULT;
  END IF;
END $$;

-- Add name column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'checkout_requests' 
    AND column_name = 'name'
  ) THEN
    ALTER TABLE checkout_requests ADD COLUMN name TEXT NOT NULL DEFAULT 'Guest';
    -- Remove the default after adding
    ALTER TABLE checkout_requests ALTER COLUMN name DROP DEFAULT;
  END IF;
END $$;

-- Add phone column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'checkout_requests' 
    AND column_name = 'phone'
  ) THEN
    ALTER TABLE checkout_requests ADD COLUMN phone TEXT;
  END IF;
END $$;

-- Add message column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'checkout_requests' 
    AND column_name = 'message'
  ) THEN
    ALTER TABLE checkout_requests ADD COLUMN message TEXT;
  END IF;
END $$;

-- Add status column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'checkout_requests' 
    AND column_name = 'status'
  ) THEN
    ALTER TABLE checkout_requests ADD COLUMN status TEXT DEFAULT 'pending_confirmation';
  END IF;
END $$;

-- Add payment_method column if it doesn't exist (might already exist from previous migration)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'checkout_requests' 
    AND column_name = 'payment_method'
  ) THEN
    ALTER TABLE checkout_requests ADD COLUMN payment_method TEXT;
  END IF;
END $$;

-- Add items column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'checkout_requests' 
    AND column_name = 'items'
  ) THEN
    ALTER TABLE checkout_requests ADD COLUMN items JSONB NOT NULL DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_checkout_requests_user_id ON checkout_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_checkout_requests_email ON checkout_requests(email);
CREATE INDEX IF NOT EXISTS idx_checkout_requests_created_at ON checkout_requests(created_at DESC);
