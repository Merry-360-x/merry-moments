-- Add refund calculation function based on cancellation policies

CREATE OR REPLACE FUNCTION calculate_refund_amount(
  booking_id_param UUID
)
RETURNS TABLE (
  refund_amount NUMERIC,
  refund_percentage INTEGER,
  policy_type TEXT,
  reason TEXT
) AS $$
DECLARE
  v_booking RECORD;
  v_property RECORD;
  v_tour RECORD;
  v_transport RECORD;
  v_check_in DATE;
  v_days_until_checkin INTEGER;
  v_total_price NUMERIC;
  v_policy_type TEXT;
  v_refund_pct INTEGER := 0;
  v_reason TEXT;
BEGIN
  -- Get booking details
  SELECT * INTO v_booking
  FROM bookings
  WHERE id = booking_id_param;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT 0::NUMERIC, 0, 'not_found'::TEXT, 'Booking not found'::TEXT;
    RETURN;
  END IF;
  
  v_check_in := v_booking.check_in;
  v_total_price := v_booking.total_price;
  v_days_until_checkin := v_check_in - CURRENT_DATE;
  
  -- Get cancellation policy based on booking type
  IF v_booking.booking_type = 'property' OR v_booking.property_id IS NOT NULL THEN
    SELECT cancellation_policy INTO v_property
    FROM properties
    WHERE id = v_booking.property_id;
    
    v_policy_type := COALESCE(v_property.cancellation_policy, 'fair');
    
  ELSIF v_booking.booking_type = 'tour' AND v_booking.tour_id IS NOT NULL THEN
    SELECT cancellation_policy_type INTO v_tour
    FROM tour_packages
    WHERE id = v_booking.tour_id;
    
    v_policy_type := COALESCE(v_tour.cancellation_policy_type, 'standard');
    
  ELSIF v_booking.booking_type = 'transport' AND v_booking.transport_id IS NOT NULL THEN
    -- Transport services - assume standard policy
    v_policy_type := 'standard';
  ELSE
    v_policy_type := 'standard';
  END IF;
  
  -- Calculate refund percentage based on policy and days until check-in
  CASE v_policy_type
    WHEN 'flexible' THEN
      IF v_days_until_checkin >= 1 THEN
        v_refund_pct := 100;
        v_reason := 'Flexible: Full refund (1+ days notice)';
      ELSE
        v_refund_pct := 0;
        v_reason := 'Flexible: No refund (less than 1 day notice)';
      END IF;
      
    WHEN 'moderate', 'standard' THEN
      IF v_days_until_checkin >= 5 THEN
        v_refund_pct := 100;
        v_reason := 'Moderate: Full refund (5+ days notice)';
      ELSIF v_days_until_checkin >= 3 THEN
        v_refund_pct := 50;
        v_reason := 'Moderate: 50% refund (3-4 days notice)';
      ELSE
        v_refund_pct := 0;
        v_reason := 'Moderate: No refund (less than 3 days notice)';
      END IF;
      
    WHEN 'strict' THEN
      IF v_days_until_checkin >= 14 THEN
        v_refund_pct := 100;
        v_reason := 'Strict: Full refund (14+ days notice)';
      ELSIF v_days_until_checkin >= 7 THEN
        v_refund_pct := 50;
        v_reason := 'Strict: 50% refund (7-13 days notice)';
      ELSE
        v_refund_pct := 0;
        v_reason := 'Strict: No refund (less than 7 days notice)';
      END IF;
      
    WHEN 'non_refundable' THEN
      v_refund_pct := 0;
      v_reason := 'Non-refundable: No refund allowed';
      
    WHEN 'fair' THEN
      IF v_days_until_checkin >= 7 THEN
        v_refund_pct := 100;
        v_reason := 'Fair: Full refund (7+ days notice)';
      ELSIF v_days_until_checkin >= 2 THEN
        v_refund_pct := 50;
        v_reason := 'Fair: 50% refund (2-6 days notice)';
      ELSE
        v_refund_pct := 0;
        v_reason := 'Fair: No refund (less than 2 days notice)';
      END IF;
      
    ELSE
      -- Default to moderate policy
      IF v_days_until_checkin >= 5 THEN
        v_refund_pct := 100;
        v_reason := 'Default: Full refund (5+ days notice)';
      ELSIF v_days_until_checkin >= 3 THEN
        v_refund_pct := 50;
        v_reason := 'Default: 50% refund (3-4 days notice)';
      ELSE
        v_refund_pct := 0;
        v_reason := 'Default: No refund (less than 3 days notice)';
      END IF;
  END CASE;
  
  -- Return the calculation
  RETURN QUERY SELECT 
    (v_total_price * v_refund_pct / 100)::NUMERIC as refund_amount,
    v_refund_pct as refund_percentage,
    v_policy_type,
    v_reason;
END;
$$ LANGUAGE plpgsql;

-- Add comment
COMMENT ON FUNCTION calculate_refund_amount IS 'Calculates refund amount for a booking based on cancellation policy and days until check-in';
