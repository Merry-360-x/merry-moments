-- Make provider_name (company name) required for transport vehicles

-- First update any existing vehicles without provider_name
UPDATE transport_vehicles 
SET provider_name = 'Company Name Required'
WHERE provider_name IS NULL OR provider_name = '';

-- Then make it NOT NULL with a constraint
ALTER TABLE transport_vehicles
ALTER COLUMN provider_name SET NOT NULL;

-- Add check constraint to prevent empty strings
ALTER TABLE transport_vehicles
ADD CONSTRAINT provider_name_not_empty 
CHECK (length(trim(provider_name)) > 0);

COMMENT ON COLUMN transport_vehicles.provider_name IS 'Company or business name providing the transport service (required)';
