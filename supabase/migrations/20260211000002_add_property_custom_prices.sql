-- Add custom pricing feature for properties on specific dates
-- Allows hosts to set custom prices for specific date ranges

-- Create table for date-specific custom prices
CREATE TABLE IF NOT EXISTS property_custom_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  custom_price_per_night NUMERIC(12, 2) NOT NULL,
  reason TEXT, -- Optional reason/note for the custom price
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  CONSTRAINT valid_date_range CHECK (end_date >= start_date),
  CONSTRAINT positive_price CHECK (custom_price_per_night > 0)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_property_custom_prices_property_id ON property_custom_prices(property_id);
CREATE INDEX IF NOT EXISTS idx_property_custom_prices_dates ON property_custom_prices(start_date, end_date);

-- Enable RLS
ALTER TABLE property_custom_prices ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view custom prices
CREATE POLICY "Anyone can view custom prices"
ON property_custom_prices FOR SELECT
USING (true);

-- Policy: Hosts can manage their own property prices
CREATE POLICY "Hosts can manage their property prices"
ON property_custom_prices FOR ALL
USING (
  created_by = auth.uid() OR
  property_id IN (
    SELECT id FROM properties WHERE host_id = auth.uid()
  )
);

-- Policy: Admins can manage all custom prices
CREATE POLICY "Admins can manage all custom prices"
ON property_custom_prices FOR ALL
USING (is_admin());

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
