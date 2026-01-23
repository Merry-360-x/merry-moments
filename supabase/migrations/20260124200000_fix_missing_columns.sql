-- Add missing columns to profiles table for tour guide information
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS years_of_experience INTEGER,
ADD COLUMN IF NOT EXISTS languages_spoken TEXT[],
ADD COLUMN IF NOT EXISTS tour_guide_bio TEXT;

-- Add comments for tour guide columns in profiles
COMMENT ON COLUMN profiles.years_of_experience IS 'Years of experience for tour guides';
COMMENT ON COLUMN profiles.languages_spoken IS 'Languages spoken by tour guides';
COMMENT ON COLUMN profiles.tour_guide_bio IS 'Biography for tour guides';
