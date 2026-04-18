-- Allow hosts to view bookings for their own listings.
-- Previously only guest_id = auth.uid() and admins could SELECT bookings,
-- so the host dashboard always returned empty lists.

DROP POLICY IF EXISTS "Hosts can view their listing bookings" ON bookings;

CREATE POLICY "Hosts can view their listing bookings"
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
    AND (
      EXISTS (
        SELECT 1 FROM tours
        WHERE tours.id = bookings.tour_id
          AND (tours.host_id = auth.uid() OR tours.created_by = auth.uid() OR tours.guide_id = auth.uid())
      )
      OR EXISTS (
        SELECT 1 FROM tour_packages
        WHERE tour_packages.id = bookings.tour_id
          AND tour_packages.host_id = auth.uid()
      )
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

NOTIFY pgrst, 'reload schema';
