-- Change all default currency values from RWF to USD
-- This migration updates table column defaults and existing data

BEGIN;

-- Update existing NULL currency values to USD for tables that exist
UPDATE properties SET currency = 'USD' WHERE currency IS NULL OR currency = '';
UPDATE transport_vehicles SET currency = 'USD' WHERE currency IS NULL OR currency = '';
UPDATE tours SET currency = 'USD' WHERE currency IS NULL OR currency = '';
UPDATE bookings SET currency = 'USD' WHERE currency IS NULL OR currency = '';
UPDATE host_applications SET listing_currency = 'USD' WHERE listing_currency IS NULL OR listing_currency = '';
UPDATE transport_routes SET currency = 'USD' WHERE currency IS NULL OR currency = '';
UPDATE user_preferences SET currency = 'USD' WHERE currency IS NULL OR currency = '';

-- Update table column defaults to USD
ALTER TABLE properties ALTER COLUMN currency SET DEFAULT 'USD';
ALTER TABLE transport_vehicles ALTER COLUMN currency SET DEFAULT 'USD';
ALTER TABLE tours ALTER COLUMN currency SET DEFAULT 'USD';
ALTER TABLE bookings ALTER COLUMN currency SET DEFAULT 'USD';
ALTER TABLE host_applications ALTER COLUMN listing_currency SET DEFAULT 'USD';
ALTER TABLE transport_routes ALTER COLUMN currency SET DEFAULT 'USD';
ALTER TABLE user_preferences ALTER COLUMN currency SET DEFAULT 'USD';

COMMIT;