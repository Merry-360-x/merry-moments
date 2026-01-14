-- Add selfie photo field to host applications
-- This allows hosts to upload both ID and selfie for verification

-- Add selfie_photo_url column to host_applications table
DO $$ 
BEGIN
  ALTER TABLE host_applications ADD COLUMN selfie_photo_url TEXT;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;