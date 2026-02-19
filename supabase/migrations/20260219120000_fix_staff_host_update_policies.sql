-- Fix RLS policies so financial staff can mark bookings as paid
-- and hosts can mark their confirmed bookings as completed.

-- =============================================
-- FINANCIAL STAFF: Add UPDATE access to bookings
-- =============================================

DROP POLICY IF EXISTS "Financial staff can update bookings" ON bookings;
CREATE POLICY "Financial staff can update bookings"
  ON bookings FOR UPDATE
  USING (is_financial_staff())
  WITH CHECK (is_financial_staff());

-- =============================================
-- FINANCIAL STAFF: Add UPDATE access to checkout_requests
-- =============================================

DROP POLICY IF EXISTS "Financial staff can update checkout requests" ON checkout_requests;
CREATE POLICY "Financial staff can update checkout requests"
  ON checkout_requests FOR UPDATE
  USING (is_financial_staff())
  WITH CHECK (is_financial_staff());

-- =============================================
-- HOSTS: Replace restrictive update policy with a broader one
-- The old policy only allowed hosts to act on 'pending' bookings
-- and only allowed confirmed/cancelled as the result.
-- Now hosts can also mark their confirmed bookings as 'completed'
-- and update payment_status for bookings belonging to their listings.
-- =============================================

DROP POLICY IF EXISTS "Hosts can update own pending booking confirmations" ON bookings;

CREATE POLICY "Hosts can update own listing bookings"
ON bookings FOR UPDATE
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
)
WITH CHECK (
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

NOTIFY pgrst, 'reload schema';
