-- Make tour_packages fields nullable that shouldn't be strictly required
-- This allows tour packages to be created with minimal data and completed later

ALTER TABLE tour_packages 
  ALTER COLUMN itinerary_pdf_url DROP NOT NULL,
  ALTER COLUMN cover_image DROP NOT NULL,
  ALTER COLUMN cancellation_policy DROP NOT NULL;

-- Add helpful comments
COMMENT ON COLUMN tour_packages.itinerary_pdf_url IS 'Optional PDF itinerary URL - can be uploaded after initial creation';
COMMENT ON COLUMN tour_packages.cover_image IS 'Optional cover image - can be uploaded after initial creation';
COMMENT ON COLUMN tour_packages.cancellation_policy IS 'Optional cancellation policy - defaults can be used if not specified';
