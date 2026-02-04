-- Create booking_change_requests table
CREATE TABLE IF NOT EXISTS booking_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Original booking dates
  original_start_date DATE NOT NULL,
  original_end_date DATE NOT NULL,
  
  -- Requested new dates
  requested_start_date DATE NOT NULL,
  requested_end_date DATE NOT NULL,
  
  -- Pricing information
  original_price DECIMAL(10, 2) NOT NULL,
  new_price DECIMAL(10, 2) NOT NULL,
  price_difference DECIMAL(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'RWF',
  
  -- Request details
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  
  -- Response from host
  host_response TEXT,
  responded_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add indexes
CREATE INDEX idx_booking_change_requests_booking ON booking_change_requests(booking_id);
CREATE INDEX idx_booking_change_requests_user ON booking_change_requests(user_id);
CREATE INDEX idx_booking_change_requests_host ON booking_change_requests(host_id);
CREATE INDEX idx_booking_change_requests_status ON booking_change_requests(status);

-- Enable RLS
ALTER TABLE booking_change_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own change requests
CREATE POLICY "Users can view own change requests"
  ON booking_change_requests
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create change requests for their own bookings
CREATE POLICY "Users can create change requests"
  ON booking_change_requests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can cancel their own pending requests
CREATE POLICY "Users can cancel own pending requests"
  ON booking_change_requests
  FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (status = 'cancelled');

-- Hosts can view change requests for their listings
CREATE POLICY "Hosts can view change requests"
  ON booking_change_requests
  FOR SELECT
  USING (auth.uid() = host_id);

-- Hosts can respond to change requests
CREATE POLICY "Hosts can respond to change requests"
  ON booking_change_requests
  FOR UPDATE
  USING (auth.uid() = host_id AND status = 'pending')
  WITH CHECK (status IN ('approved', 'rejected'));

-- Staff and admins can view all change requests
CREATE POLICY "Staff can view all change requests"
  ON booking_change_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('staff', 'admin')
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_booking_change_request_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_booking_change_request_timestamp
  BEFORE UPDATE ON booking_change_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_booking_change_request_timestamp();

-- Create function to log change request activity
CREATE OR REPLACE FUNCTION log_change_request_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- Log when request is created
  IF TG_OP = 'INSERT' THEN
    -- You can add logging here if needed
    RETURN NEW;
  END IF;
  
  -- Log when status changes
  IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    -- You can add logging here if needed
    RETURN NEW;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for activity logging
CREATE TRIGGER log_change_request_activity_trigger
  AFTER INSERT OR UPDATE ON booking_change_requests
  FOR EACH ROW
  EXECUTE FUNCTION log_change_request_activity();
