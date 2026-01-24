-- Add support for tour and transport bookings alongside property bookings
-- This allows hosts to see only their relevant bookings from bulk orders

-- Add new columns to bookings table
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_type TEXT DEFAULT 'property' CHECK (booking_type IN ('property', 'tour', 'transport'));
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS tour_id UUID REFERENCES tour_packages(id) ON DELETE CASCADE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS transport_id UUID;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS order_id UUID;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_bookings_booking_type ON bookings(booking_type);
CREATE INDEX IF NOT EXISTS idx_bookings_tour_id ON bookings(tour_id);
CREATE INDEX IF NOT EXISTS idx_bookings_transport_id ON bookings(transport_id);
CREATE INDEX IF NOT EXISTS idx_bookings_order_id ON bookings(order_id);

-- Add comment explaining the schema
COMMENT ON COLUMN bookings.booking_type IS 'Type of booking: property, tour, or transport';
COMMENT ON COLUMN bookings.tour_id IS 'Reference to tour_packages if booking_type is tour';
COMMENT ON COLUMN bookings.transport_id IS 'Reference to transport if booking_type is transport';
COMMENT ON COLUMN bookings.order_id IS 'Groups multiple bookings made together (bulk orders)';
