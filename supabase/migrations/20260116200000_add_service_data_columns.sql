-- Add JSON columns to store separate data for each service type
ALTER TABLE host_applications
ADD COLUMN IF NOT EXISTS accommodation_data JSONB,
ADD COLUMN IF NOT EXISTS tour_data JSONB,
ADD COLUMN IF NOT EXISTS transport_data JSONB,
ADD COLUMN IF NOT EXISTS selfie_photo_url TEXT,
ADD COLUMN IF NOT EXISTS listing_description TEXT;

-- Add tour fields that were missing
ALTER TABLE host_applications  
ADD COLUMN IF NOT EXISTS listing_tour_category TEXT,
ADD COLUMN IF NOT EXISTS listing_tour_duration_days INTEGER,
ADD COLUMN IF NOT EXISTS listing_tour_difficulty TEXT,
ADD COLUMN IF NOT EXISTS listing_tour_price_per_person NUMERIC,
ADD COLUMN IF NOT EXISTS listing_tour_max_group_size INTEGER;

-- Add transport fields that were missing
ALTER TABLE host_applications
ADD COLUMN IF NOT EXISTS listing_vehicle_type TEXT,
ADD COLUMN IF NOT EXISTS listing_vehicle_seats INTEGER,
ADD COLUMN IF NOT EXISTS listing_vehicle_price_per_day NUMERIC,
ADD COLUMN IF NOT EXISTS listing_vehicle_driver_included BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS listing_vehicle_provider_name TEXT;

COMMENT ON COLUMN host_applications.accommodation_data IS 'JSON data for accommodation service: {title, location, description, currency, images, property_type, price_per_night, max_guests, bedrooms, bathrooms, amenities}';
COMMENT ON COLUMN host_applications.tour_data IS 'JSON data for tour service: {title, location, description, currency, images, tour_category, tour_duration_days, tour_difficulty, tour_price_per_person, tour_max_group_size}';
COMMENT ON COLUMN host_applications.transport_data IS 'JSON data for transport service: {title, location, description, currency, images, vehicle_type, vehicle_seats, vehicle_price_per_day, vehicle_driver_included, vehicle_provider_name}';
