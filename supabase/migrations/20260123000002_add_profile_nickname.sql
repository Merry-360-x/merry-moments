-- Add nickname field to profiles table
-- This allows hosts to set a display name instead of using full legal name

DO $$ 
BEGIN
  -- Add nickname column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'nickname'
  ) THEN
    ALTER TABLE profiles 
    ADD COLUMN nickname text;
  END IF;

  -- Add index for faster nickname lookups
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'profiles' AND indexname = 'idx_profiles_nickname'
  ) THEN
    CREATE INDEX idx_profiles_nickname ON profiles(nickname);
  END IF;

END $$;

-- Add comment for documentation
COMMENT ON COLUMN profiles.nickname IS 'Optional display name for the user, shown instead of full_name when set';
