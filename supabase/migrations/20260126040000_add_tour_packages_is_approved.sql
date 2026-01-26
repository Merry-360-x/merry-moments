-- Add is_approved column to tour_packages if it doesn't exist
ALTER TABLE tour_packages
ADD COLUMN IF NOT EXISTS is_approved boolean DEFAULT true;

-- Set existing tours to approved
UPDATE tour_packages
SET is_approved = true
WHERE is_approved IS NULL;
