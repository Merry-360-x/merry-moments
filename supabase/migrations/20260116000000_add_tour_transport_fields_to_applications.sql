-- Add new fields to host_applications table for tour and transport listings

ALTER TABLE host_applications 
ADD COLUMN IF NOT EXISTS listing_description TEXT,
ADD COLUMN IF NOT EXISTS listing_tour_category TEXT,
ADD COLUMN IF NOT EXISTS listing_tour_duration_days INTEGER,
ADD COLUMN IF NOT EXISTS listing_tour_difficulty TEXT,
ADD COLUMN IF NOT EXISTS listing_tour_price_per_person NUMERIC,
ADD COLUMN IF NOT EXISTS listing_tour_max_group_size INTEGER,
ADD COLUMN IF NOT EXISTS listing_vehicle_type TEXT,
ADD COLUMN IF NOT EXISTS listing_vehicle_seats INTEGER,
ADD COLUMN IF NOT EXISTS listing_vehicle_price_per_day NUMERIC,
ADD COLUMN IF NOT EXISTS listing_vehicle_driver_included BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS listing_vehicle_provider_name TEXT;

-- Add comment explaining the fields
COMMENT ON COLUMN host_applications.listing_description IS 'Description for the listing (property, tour, or transport)';
COMMENT ON COLUMN host_applications.listing_tour_category IS 'Tour category (Adventure, Cultural, etc.)';
COMMENT ON COLUMN host_applications.listing_tour_duration_days IS 'Tour duration in days';
COMMENT ON COLUMN host_applications.listing_tour_difficulty IS 'Tour difficulty level (Easy, Moderate, Challenging)';
COMMENT ON COLUMN host_applications.listing_tour_price_per_person IS 'Tour price per person';
COMMENT ON COLUMN host_applications.listing_tour_max_group_size IS 'Maximum group size for tours';
COMMENT ON COLUMN host_applications.listing_vehicle_type IS 'Vehicle type (Car, SUV, Van, Bus, etc.)';
COMMENT ON COLUMN host_applications.listing_vehicle_seats IS 'Number of seats in vehicle';
COMMENT ON COLUMN host_applications.listing_vehicle_price_per_day IS 'Vehicle rental price per day';
COMMENT ON COLUMN host_applications.listing_vehicle_driver_included IS 'Whether driver is included with vehicle';
COMMENT ON COLUMN host_applications.listing_vehicle_provider_name IS 'Transport provider/company name';
