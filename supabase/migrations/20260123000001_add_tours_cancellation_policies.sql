-- Add cancellation policy fields to tours table if they don't exist
-- This migration adds default cancellation policies and custom policy support

DO $$ 
BEGIN
  -- Add cancellation_policy_type column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tours' AND column_name = 'cancellation_policy_type'
  ) THEN
    ALTER TABLE tours 
    ADD COLUMN cancellation_policy_type text DEFAULT 'standard';
  END IF;

  -- Add custom_cancellation_policy column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tours' AND column_name = 'custom_cancellation_policy'
  ) THEN
    ALTER TABLE tours 
    ADD COLUMN custom_cancellation_policy text;
  END IF;

  -- Add non_refundable_items column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tours' AND column_name = 'non_refundable_items'
  ) THEN
    ALTER TABLE tours 
    ADD COLUMN non_refundable_items text;
  END IF;

  -- Update existing tours with standard cancellation policy if null
  UPDATE tours 
  SET cancellation_policy_type = 'standard'
  WHERE cancellation_policy_type IS NULL;

END $$;

-- Add comments for documentation
COMMENT ON COLUMN tours.cancellation_policy_type IS 'Type of cancellation policy: standard, flexible, moderate, strict, custom';
COMMENT ON COLUMN tours.custom_cancellation_policy IS 'Custom cancellation policy text when type is custom';
COMMENT ON COLUMN tours.non_refundable_items IS 'JSON array of non-refundable items/charges';
