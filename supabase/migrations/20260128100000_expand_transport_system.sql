-- Expand transport system to support Airport Transfers, Car Rentals, Intracity, and Intercity rides

-- Create transport service types enum
DO $$ BEGIN
  CREATE TYPE transport_service_type AS ENUM ('airport_transfer', 'car_rental', 'intracity_ride', 'intercity_ride');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create car types enum
DO $$ BEGIN
  CREATE TYPE car_type AS ENUM ('SUV', 'Sedan', 'Hatchback', 'Coupe', 'Wagon', 'Van', 'Minibus', 'Truck', 'Luxury');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create transmission types enum
DO $$ BEGIN
  CREATE TYPE transmission_type AS ENUM ('Automatic', 'Manual', 'Hybrid');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create fuel types enum
DO $$ BEGIN
  CREATE TYPE fuel_type AS ENUM ('Petrol', 'Diesel', 'Electric', 'Hybrid');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create drive train types enum
DO $$ BEGIN
  CREATE TYPE drive_train_type AS ENUM ('FWD', 'RWD', 'AWD', '4WD');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add new columns to transport_vehicles table
ALTER TABLE transport_vehicles
ADD COLUMN IF NOT EXISTS service_type transport_service_type DEFAULT 'car_rental',
ADD COLUMN IF NOT EXISTS car_brand TEXT,
ADD COLUMN IF NOT EXISTS car_model TEXT,
ADD COLUMN IF NOT EXISTS car_year INTEGER,
ADD COLUMN IF NOT EXISTS car_type car_type,
ADD COLUMN IF NOT EXISTS transmission transmission_type,
ADD COLUMN IF NOT EXISTS fuel_type fuel_type,
ADD COLUMN IF NOT EXISTS drive_train drive_train_type,
ADD COLUMN IF NOT EXISTS daily_price DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS weekly_price DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS monthly_price DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS interior_images JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS exterior_images JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS key_features JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS insurance_document_url TEXT,
ADD COLUMN IF NOT EXISTS registration_document_url TEXT,
ADD COLUMN IF NOT EXISTS roadworthiness_certificate_url TEXT,
ADD COLUMN IF NOT EXISTS owner_identification_url TEXT;

-- Update existing price_per_day to daily_price for consistency
UPDATE transport_vehicles 
SET daily_price = price_per_day 
WHERE daily_price IS NULL AND price_per_day IS NOT NULL;

-- Create airport transfer routes table
CREATE TABLE IF NOT EXISTS airport_transfer_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_location TEXT NOT NULL,
  to_location TEXT NOT NULL,
  distance_km DECIMAL(5, 2),
  base_price DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'RWF',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(from_location, to_location)
);

-- Create airport transfer pricing table (operators set their prices for fixed routes)
CREATE TABLE IF NOT EXISTS airport_transfer_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES transport_vehicles(id) ON DELETE CASCADE,
  route_id UUID NOT NULL REFERENCES airport_transfer_routes(id) ON DELETE CASCADE,
  price DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'RWF',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(vehicle_id, route_id)
);

-- Insert default airport routes for Kigali
INSERT INTO airport_transfer_routes (from_location, to_location, distance_km, base_price, currency) VALUES
  ('Kigali International Airport', 'Remera', 10.5, 15000, 'RWF'),
  ('Remera', 'Kigali International Airport', 10.5, 15000, 'RWF'),
  ('Kigali International Airport', 'City Center', 12.0, 18000, 'RWF'),
  ('City Center', 'Kigali International Airport', 12.0, 18000, 'RWF'),
  ('Kigali International Airport', 'Kimihurura', 8.5, 12000, 'RWF'),
  ('Kimihurura', 'Kigali International Airport', 8.5, 12000, 'RWF'),
  ('Kigali International Airport', 'Nyarutarama', 9.0, 13000, 'RWF'),
  ('Nyarutarama', 'Kigali International Airport', 9.0, 13000, 'RWF'),
  ('Kigali International Airport', 'Kacyiru', 11.0, 16000, 'RWF'),
  ('Kacyiru', 'Kigali International Airport', 11.0, 16000, 'RWF')
ON CONFLICT (from_location, to_location) DO NOTHING;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_transport_vehicles_service_type ON transport_vehicles(service_type);
CREATE INDEX IF NOT EXISTS idx_transport_vehicles_car_type ON transport_vehicles(car_type);
CREATE INDEX IF NOT EXISTS idx_transport_vehicles_transmission ON transport_vehicles(transmission);
CREATE INDEX IF NOT EXISTS idx_airport_transfer_routes_from ON airport_transfer_routes(from_location);
CREATE INDEX IF NOT EXISTS idx_airport_transfer_routes_to ON airport_transfer_routes(to_location);
CREATE INDEX IF NOT EXISTS idx_airport_transfer_pricing_vehicle ON airport_transfer_pricing(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_airport_transfer_pricing_route ON airport_transfer_pricing(route_id);

-- Enable RLS
ALTER TABLE airport_transfer_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE airport_transfer_pricing ENABLE ROW LEVEL SECURITY;

-- RLS Policies for airport_transfer_routes (public read, admin write)
DROP POLICY IF EXISTS "Anyone can view active routes" ON airport_transfer_routes;
CREATE POLICY "Anyone can view active routes"
  ON airport_transfer_routes FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Admin can manage routes" ON airport_transfer_routes;
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='id'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='role'
  ) THEN
    DROP POLICY IF EXISTS "Admin can manage routes" ON airport_transfer_routes;
    CREATE POLICY "Admin can manage routes"
      ON airport_transfer_routes FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
        )
      );
  END IF;
END $$;

-- RLS Policies for airport_transfer_pricing
DROP POLICY IF EXISTS "Anyone can view pricing" ON airport_transfer_pricing;
CREATE POLICY "Anyone can view pricing"
  ON airport_transfer_pricing FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Vehicle owners can manage their pricing" ON airport_transfer_pricing;
CREATE POLICY "Vehicle owners can manage their pricing"
  ON airport_transfer_pricing FOR ALL
  USING (
    vehicle_id IN (
      SELECT id FROM transport_vehicles
      WHERE created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admin can manage all pricing" ON airport_transfer_pricing;
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='id'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='role'
  ) THEN
    DROP POLICY IF EXISTS "Admin can manage all pricing" ON airport_transfer_pricing;
    CREATE POLICY "Admin can manage all pricing"
      ON airport_transfer_pricing FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
        )
      );
  END IF;
END $$;

-- Add comments
COMMENT ON COLUMN transport_vehicles.service_type IS 'Type of transport service: airport_transfer, car_rental, intracity_ride, intercity_ride';
COMMENT ON COLUMN transport_vehicles.daily_price IS 'Daily rental price for car rentals';
COMMENT ON COLUMN transport_vehicles.weekly_price IS 'Weekly rental price for car rentals';
COMMENT ON COLUMN transport_vehicles.monthly_price IS 'Monthly rental price for car rentals';
COMMENT ON COLUMN transport_vehicles.interior_images IS 'Array of URLs for interior photos';
COMMENT ON COLUMN transport_vehicles.exterior_images IS 'Array of URLs for exterior photos';
COMMENT ON COLUMN transport_vehicles.key_features IS 'Array of key features like AC, Bluetooth, GPS';
COMMENT ON TABLE airport_transfer_routes IS 'Fixed routes for airport transfers with base prices';
COMMENT ON TABLE airport_transfer_pricing IS 'Operator-specific pricing for airport transfer routes';
