-- Create function to get staff dashboard metrics with real data
-- This function calculates actual metrics from the bookings table

CREATE OR REPLACE FUNCTION get_staff_dashboard_metrics()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  total_bookings INTEGER;
  pending_count INTEGER;
  confirmed_count INTEGER;
  paid_count INTEGER;
  cancelled_count INTEGER;
  gross_revenue NUMERIC;
  revenue_by_curr JSON;
BEGIN
  -- Count bookings by status
  SELECT COUNT(*) INTO total_bookings FROM bookings;
  SELECT COUNT(*) INTO pending_count FROM bookings WHERE status = 'pending';
  SELECT COUNT(*) INTO confirmed_count FROM bookings WHERE status = 'confirmed';
  SELECT COUNT(*) INTO paid_count FROM bookings WHERE status = 'paid';
  SELECT COUNT(*) INTO cancelled_count FROM bookings WHERE status = 'cancelled';
  
  -- Calculate gross revenue (sum of paid bookings in USD equivalent)
  SELECT COALESCE(SUM(total_price), 0) INTO gross_revenue 
  FROM bookings 
  WHERE status = 'paid';
  
  -- Get revenue breakdown by currency
  SELECT COALESCE(
    json_agg(
      json_build_object(
        'currency', currency,
        'amount', total_amount
      )
    ),
    '[]'::json
  ) INTO revenue_by_curr
  FROM (
    SELECT 
      COALESCE(currency, 'USD') as currency,
      SUM(total_price) as total_amount
    FROM bookings
    WHERE status = 'paid'
    GROUP BY currency
    ORDER BY total_amount DESC
  ) revenue_data;
  
  -- Build the result JSON
  result := json_build_object(
    'bookings_total', total_bookings,
    'bookings_pending', pending_count,
    'bookings_confirmed', confirmed_count,
    'bookings_paid', paid_count,
    'bookings_cancelled', cancelled_count,
    'revenue_gross', gross_revenue,
    'revenue_by_currency', revenue_by_curr
  );
  
  RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_staff_dashboard_metrics() TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_staff_dashboard_metrics() IS 'Returns real-time metrics for the staff dashboard including booking counts and revenue data';
