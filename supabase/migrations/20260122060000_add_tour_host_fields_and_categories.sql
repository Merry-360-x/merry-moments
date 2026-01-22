-- Add tour host fields to profiles table and update tours table for better tour management

-- Add tour guide specific fields to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS years_of_experience INTEGER,
ADD COLUMN IF NOT EXISTS languages_spoken TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS tour_guide_bio TEXT;

-- Add comments for documentation
COMMENT ON COLUMN profiles.years_of_experience IS 'Years of experience as a tour guide';
COMMENT ON COLUMN profiles.languages_spoken IS 'Array of languages the tour guide speaks (e.g., English, French, Kinyarwanda)';
COMMENT ON COLUMN profiles.tour_guide_bio IS 'Short biography/introduction for tour guides';

-- Update tours table to support multiple categories and PDF itinerary
ALTER TABLE tours
ADD COLUMN IF NOT EXISTS categories TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS itinerary_pdf_url TEXT;

-- Add comments
COMMENT ON COLUMN tours.categories IS 'Array of tour categories (e.g., [Adventure, Cultural, Wildlife])';
COMMENT ON COLUMN tours.itinerary_pdf_url IS 'URL to uploaded tour itinerary PDF document';

-- Migrate existing single category to categories array
UPDATE tours
SET categories = ARRAY[category]::TEXT[]
WHERE category IS NOT NULL AND (categories IS NULL OR array_length(categories, 1) IS NULL);

-- Create index for better query performance on categories
CREATE INDEX IF NOT EXISTS idx_tours_categories ON tours USING GIN(categories);
