-- Create table for blocked dates on properties
CREATE TABLE IF NOT EXISTS property_blocked_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT, -- e.g., 'booked', 'maintenance', 'personal use'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Ensure end date is after or equal to start date
  CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

-- Create index for faster date range queries
CREATE INDEX IF NOT EXISTS idx_property_blocked_dates_property_id ON property_blocked_dates(property_id);
CREATE INDEX IF NOT EXISTS idx_property_blocked_dates_dates ON property_blocked_dates(start_date, end_date);

-- Enable RLS
ALTER TABLE property_blocked_dates ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view blocked dates
CREATE POLICY "Anyone can view blocked dates"
ON property_blocked_dates FOR SELECT
USING (true);

-- Policy: Host can manage their property's blocked dates
CREATE POLICY "Hosts can manage their blocked dates"
ON property_blocked_dates FOR ALL
USING (
  created_by = auth.uid() OR
  property_id IN (
    SELECT id FROM properties WHERE host_id = auth.uid()
  )
);

-- Policy: Admins can manage all blocked dates
CREATE POLICY "Admins can manage all blocked dates"
ON property_blocked_dates FOR ALL
USING (
  auth.uid() IN (
    SELECT user_id FROM user_roles WHERE role = 'admin'
  )
);

-- Function to automatically block dates when booking is confirmed
CREATE OR REPLACE FUNCTION block_dates_on_booking()
RETURNS TRIGGER AS $$
BEGIN
  -- Only block if status is confirmed or paid
  IF NEW.status IN ('confirmed', 'completed') AND NEW.payment_status = 'paid' THEN
    INSERT INTO property_blocked_dates (property_id, start_date, end_date, reason, created_by)
    VALUES (NEW.property_id, NEW.check_in, NEW.check_out, 'booked', NEW.guest_id)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-block dates on booking
DROP TRIGGER IF EXISTS trigger_block_dates_on_booking ON bookings;
CREATE TRIGGER trigger_block_dates_on_booking
  AFTER INSERT OR UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION block_dates_on_booking();

-- Function to check date availability
CREATE OR REPLACE FUNCTION check_date_availability(
  p_property_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM property_blocked_dates
    WHERE property_id = p_property_id
    AND (
      (start_date <= p_start_date AND end_date >= p_start_date) OR
      (start_date <= p_end_date AND end_date >= p_end_date) OR
      (start_date >= p_start_date AND end_date <= p_end_date)
    )
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE property_blocked_dates IS 'Stores blocked dates for properties (bookings, maintenance, etc.)';
COMMENT ON FUNCTION check_date_availability IS 'Check if a date range is available for a property';
