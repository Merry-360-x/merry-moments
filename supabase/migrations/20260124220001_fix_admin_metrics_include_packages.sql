-- Update admin_dashboard_metrics to include tour_packages

-- Drop the old function first
DROP FUNCTION IF EXISTS admin_dashboard_metrics();

CREATE OR REPLACE FUNCTION admin_dashboard_metrics()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'users_total', (SELECT COUNT(*) FROM auth.users),
    'hosts_total', (SELECT COUNT(DISTINCT user_id) FROM user_roles WHERE role = 'host'),
    'properties_total', (SELECT COUNT(*) FROM properties),
    'properties_published', (SELECT COUNT(*) FROM properties WHERE is_published = true),
    'bookings_total', (SELECT COUNT(*) FROM bookings),
    'bookings_pending', (SELECT COUNT(*) FROM bookings WHERE status = 'pending_confirmation'),
    'applications_total', (SELECT COUNT(*) FROM host_applications),
    'applications_pending', (SELECT COUNT(*) FROM host_applications WHERE status = 'pending'),
    'tours_total', (SELECT COUNT(*) FROM tours) + (SELECT COUNT(*) FROM tour_packages),
    'transport_total', (SELECT COUNT(*) FROM transport_vehicles),
    'revenue_gross', (
      SELECT COALESCE(SUM(total_price), 0) 
      FROM bookings 
      WHERE status IN ('completed', 'confirmed')
    ),
    'checkout_requests_total', (SELECT COUNT(*) FROM checkout_requests),
    'checkout_requests_pending', (SELECT COUNT(*) FROM checkout_requests WHERE status = 'pending_confirmation')
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION admin_dashboard_metrics() TO authenticated;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
