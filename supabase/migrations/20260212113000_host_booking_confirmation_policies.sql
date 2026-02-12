-- Host booking confirmation policies
-- Allows hosts to view and action pending booking requests for their own listings.

DROP POLICY IF EXISTS "Hosts can view their property bookings" ON bookings;
DROP POLICY IF EXISTS "Hosts can view own listing bookings" ON bookings;
DROP POLICY IF EXISTS "Hosts can update own pending booking confirmations" ON bookings;

CREATE POLICY "Hosts can view own listing bookings"
ON bookings FOR SELECT
TO authenticated
USING (
  (
    booking_type = 'property'
    AND EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = bookings.property_id
      AND properties.host_id = auth.uid()
    )
  )
  OR
  (
    booking_type = 'tour'
    AND EXISTS (
      SELECT 1 FROM tour_packages
      WHERE tour_packages.id = bookings.tour_id
      AND tour_packages.host_id = auth.uid()
    )
  )
  OR
  (
    booking_type = 'transport'
    AND EXISTS (
      SELECT 1 FROM transport_vehicles
      WHERE transport_vehicles.id = bookings.transport_id
      AND transport_vehicles.created_by = auth.uid()
    )
  )
);

CREATE POLICY "Hosts can update own pending booking confirmations"
ON bookings FOR UPDATE
TO authenticated
USING (
  (
    confirmation_status = 'pending'
    OR status = 'pending'
  )
  AND (
    (
      booking_type = 'property'
      AND EXISTS (
        SELECT 1 FROM properties
        WHERE properties.id = bookings.property_id
        AND properties.host_id = auth.uid()
      )
    )
    OR
    (
      booking_type = 'tour'
      AND EXISTS (
        SELECT 1 FROM tour_packages
        WHERE tour_packages.id = bookings.tour_id
        AND tour_packages.host_id = auth.uid()
      )
    )
    OR
    (
      booking_type = 'transport'
      AND EXISTS (
        SELECT 1 FROM transport_vehicles
        WHERE transport_vehicles.id = bookings.transport_id
        AND transport_vehicles.created_by = auth.uid()
      )
    )
  )
)
WITH CHECK (
  (
    confirmation_status = 'approved'
    AND status = 'confirmed'
    AND confirmed_by = auth.uid()
  )
  OR
  (
    confirmation_status = 'rejected'
    AND status = 'cancelled'
    AND confirmed_by = auth.uid()
  )
);
