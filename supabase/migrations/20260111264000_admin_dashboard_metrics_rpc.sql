-- Admin/staff dashboard metrics (revenue/bookings/orders/etc) as a secure RPC.

CREATE OR REPLACE FUNCTION public.admin_dashboard_metrics()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
SET row_security = off
AS $$
DECLARE
  is_allowed BOOLEAN;
  result JSONB;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role::text IN ('admin','staff')
  ) INTO is_allowed;

  IF NOT is_allowed THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  SELECT jsonb_build_object(
    'users_total', (SELECT COUNT(*) FROM auth.users),
    'stories_total', (SELECT COUNT(*) FROM public.stories),
    'properties_total', (SELECT COUNT(*) FROM public.properties),
    'properties_published', (SELECT COUNT(*) FROM public.properties WHERE is_published = true),
    'tours_total', (SELECT COUNT(*) FROM public.tours),
    'tours_published', (SELECT COUNT(*) FROM public.tours WHERE is_published = true),
    'transport_services_total', (SELECT COUNT(*) FROM public.transport_services),
    'transport_vehicles_total', (SELECT COUNT(*) FROM public.transport_vehicles),
    'transport_vehicles_published', (SELECT COUNT(*) FROM public.transport_vehicles WHERE is_published = true),
    'transport_routes_total', (SELECT COUNT(*) FROM public.transport_routes),
    'transport_routes_published', (SELECT COUNT(*) FROM public.transport_routes WHERE is_published = true),
    'bookings_total', (SELECT COUNT(*) FROM public.bookings),
    'bookings_pending', (SELECT COUNT(*) FROM public.bookings WHERE status = 'pending'),
    'bookings_paid', (SELECT COUNT(*) FROM public.bookings WHERE status = 'paid'),
    'orders_total', (SELECT COUNT(*) FROM public.trip_cart_items),
    'revenue_gross', (SELECT COALESCE(SUM(total_price), 0) FROM public.bookings WHERE status IS DISTINCT FROM 'cancelled'),
    'revenue_by_currency', (
      SELECT COALESCE(
        jsonb_agg(jsonb_build_object('currency', currency, 'amount', amount) ORDER BY currency),
        '[]'::jsonb
      )
      FROM (
        SELECT currency, COALESCE(SUM(total_price),0) AS amount
        FROM public.bookings
        WHERE status IS DISTINCT FROM 'cancelled'
        GROUP BY currency
      ) x
    )
  ) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_dashboard_metrics() TO authenticated;

