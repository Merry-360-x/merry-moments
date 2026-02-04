-- Fix admin_dashboard_metrics function - transport_vehicles uses is_published, not is_available

DROP FUNCTION IF EXISTS admin_dashboard_metrics();

CREATE OR REPLACE FUNCTION admin_dashboard_metrics()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        -- User metrics
        'users_total', (
            SELECT COALESCE(COUNT(*), 0)::int FROM auth.users
        ),
        'hosts_total', (
            SELECT COALESCE(COUNT(DISTINCT user_id), 0)::int FROM user_roles WHERE role = 'host'
        ),
        
        -- Property metrics
        'properties_total', (
            SELECT COALESCE(COUNT(*), 0)::int FROM properties
        ),
        'properties_live', (
            SELECT COALESCE(COUNT(*), 0)::int FROM properties WHERE is_published = true
        ),
        
        -- Tour metrics (from tours table)
        'tours_total', (
            SELECT COALESCE(COUNT(*), 0)::int FROM tours
        ),
        'tours_live', (
            SELECT COALESCE(COUNT(*), 0)::int FROM tours WHERE is_published = true
        ),
        
        -- Tour packages metrics
        'tour_packages_total', (
            SELECT COALESCE(COUNT(*), 0)::int FROM tour_packages
        ),
        'tour_packages_approved', (
            SELECT COALESCE(COUNT(*), 0)::int FROM tour_packages WHERE status = 'approved'
        ),
        
        -- Vehicle metrics - use is_published NOT is_available
        'vehicles_total', (
            SELECT COALESCE(COUNT(*), 0)::int FROM transport_vehicles
        ),
        'vehicles_live', (
            SELECT COALESCE(COUNT(*), 0)::int FROM transport_vehicles WHERE is_published = true
        ),
        
        -- Host application metrics
        'host_applications_total', (
            SELECT COALESCE(COUNT(*), 0)::int FROM host_applications
        ),
        'host_applications_pending', (
            SELECT COALESCE(COUNT(*), 0)::int FROM host_applications WHERE status = 'pending'
        ),
        
        -- Booking metrics
        'bookings_total', (
            SELECT COALESCE(COUNT(*), 0)::int FROM bookings
        ),
        'bookings_pending', (
            SELECT COALESCE(COUNT(*), 0)::int FROM bookings WHERE status = 'pending'
        ),
        'bookings_confirmed', (
            SELECT COALESCE(COUNT(*), 0)::int FROM bookings WHERE status = 'confirmed'
        ),
        'bookings_completed', (
            SELECT COALESCE(COUNT(*), 0)::int FROM bookings WHERE status = 'completed'
        ),
        'bookings_cancelled', (
            SELECT COALESCE(COUNT(*), 0)::int FROM bookings WHERE status = 'cancelled'
        ),
        'bookings_paid', (
            SELECT COALESCE(COUNT(*), 0)::int FROM bookings WHERE payment_status = 'paid'
        ),
        
        -- Revenue metrics with currency breakdown
        'revenue_gross', (
            SELECT COALESCE(SUM(total_price), 0)::numeric FROM bookings WHERE status IN ('confirmed', 'completed')
        ),
        'revenue_by_currency', (
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object('currency', currency, 'amount', total_amount)
            ), '[]'::jsonb)
            FROM (
                SELECT 
                    COALESCE(currency, 'USD') as currency,
                    SUM(COALESCE(total_price, 0))::numeric as total_amount
                FROM bookings 
                WHERE status IN ('confirmed', 'completed')
                AND total_price IS NOT NULL
                GROUP BY currency
                HAVING SUM(COALESCE(total_price, 0)) > 0
                ORDER BY total_amount DESC
                LIMIT 10
            ) revenue_data
        ),
        
        -- Review metrics
        'reviews_total', (
            SELECT COALESCE(COUNT(*), 0)::int FROM property_reviews
        ),
        'reviews_hidden', 0,
        
        -- Cart items
        'orders_total', (
            SELECT COALESCE(COUNT(*), 0)::int FROM trip_cart_items
        ),
        'refunds_total', 0,
        
        -- Support ticket metrics
        'tickets_total', (
            SELECT COALESCE(COUNT(*), 0)::int FROM support_tickets
        ),
        'tickets_open', (
            SELECT COALESCE(COUNT(*), 0)::int FROM support_tickets WHERE status = 'open'
        ),
        'tickets_in_progress', (
            SELECT COALESCE(COUNT(*), 0)::int FROM support_tickets WHERE status = 'in_progress'
        ),
        'tickets_resolved', (
            SELECT COALESCE(COUNT(*), 0)::int FROM support_tickets WHERE status IN ('resolved', 'closed')
        ),
        
        -- Safety metrics
        'incidents_total', 0,
        'incidents_open', 0,
        'blacklist_count', 0,
        
        -- Suspended hosts count
        'suspended_hosts', (
            SELECT COALESCE(COUNT(*), 0)::int FROM host_applications WHERE suspended = true
        ),
        
        -- Stories count
        'stories_total', (
            SELECT COALESCE(COUNT(*), 0)::int FROM stories
        )
    ) INTO result;
    
    RETURN result;
EXCEPTION WHEN OTHERS THEN
    -- Return error details for debugging
    RETURN jsonb_build_object(
        'error', true,
        'error_message', SQLERRM,
        'users_total', 0,
        'properties_total', 0,
        'tours_total', 0,
        'bookings_total', 0,
        'revenue_gross', 0,
        'tickets_open', 0
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION admin_dashboard_metrics() TO authenticated;

COMMENT ON FUNCTION admin_dashboard_metrics() IS 'Returns comprehensive dashboard metrics for admin users';
