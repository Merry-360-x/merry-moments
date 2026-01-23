-- Add cancellation policy to tours table
ALTER TABLE tours 
ADD COLUMN IF NOT EXISTS cancellation_policy TEXT DEFAULT 'fair' CHECK (cancellation_policy IN ('strict', 'fair', 'lenient'));

-- Add cancellation policy to tour_packages table
ALTER TABLE tour_packages 
ADD COLUMN IF NOT EXISTS cancellation_policy TEXT DEFAULT 'fair' CHECK (cancellation_policy IN ('strict', 'fair', 'lenient'));

-- Add nickname to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS nickname TEXT;

-- Create index for faster nickname lookups
CREATE INDEX IF NOT EXISTS idx_profiles_nickname ON profiles(nickname);

-- Comment on columns for documentation
COMMENT ON COLUMN tours.cancellation_policy IS 'Cancellation policy: strict, fair, or lenient';
COMMENT ON COLUMN tour_packages.cancellation_policy IS 'Cancellation policy: strict, fair, or lenient';
COMMENT ON COLUMN profiles.nickname IS 'Display name for hosts and users';
