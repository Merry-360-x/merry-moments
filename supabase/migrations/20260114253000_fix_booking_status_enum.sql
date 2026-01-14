-- Fix admin_dashboard_metrics - remove 'paid' status which doesn't exist
-- Valid booking statuses: 'pending', 'confirmed', 'cancelled', 'completed'

DROP FUNCTION IF EXISTS admin_dashboard_metrics();

CREATE OR REPLACE FUNCTION admin_dashboard_metrics()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        -- User metrics
        'users_total', (
            SELECT COALESCE(COUNT(*), 0)::int 
            FROM auth.users 
            WHERE deleted_at IS NULL
        ),
        'users_suspended', 0,
        'hosts_total', (
            SELECT COALESCE(COUNT(DISTINCT user_id), 0)::int 
            FROM user_roles 
            WHERE role = 'host'
        ),
        
        -- Content metrics
        'stories_total', 0,
        'properties_total', (
            SELECT COALESCE(COUNT(*), 0)::int FROM properties
        ),
        'properties_published', (
            SELECT COALESCE(COUNT(*), 0)::int 
            FROM properties 
            WHERE is_published = true
        ),
        'properties_featured', (
            SELECT COALESCE(COUNT(*), 0)::int 
            FROM properties 
            WHERE is_published = true AND COALESCE(rating, 0) >= 4.5
        ),
        'tours_total', (
            SELECT COALESCE(COUNT(*), 0)::int FROM tours
        ),
        'tours_published', (
            SELECT COALESCE(COUNT(*), 0)::int 
            FROM tours 
            WHERE is_published = true
        ),
        
        -- Transport metrics
        'transport_services_total', (
            COALESCE((SELECT COUNT(*) FROM transport_vehicles), 0) + 
            COALESCE((SELECT COUNT(*) FROM transport_routes), 0)
        ),
        'transport_vehicles_total', (
            SELECT COALESCE(COUNT(*), 0)::int FROM transport_vehicles
        ),
        'transport_vehicles_published', (
            SELECT COALESCE(COUNT(*), 0)::int 
            FROM transport_vehicles 
            WHERE is_published = true
        ),
        'transport_routes_total', (
            SELECT COALESCE(COUNT(*), 0)::int FROM transport_routes
        ),
        'transport_routes_published', (
            SELECT COALESCE(COUNT(*), 0)::int 
            FROM transport_routes 
            WHERE is_published = true
        ),
        
        -- Booking metrics (valid statuses: pending, confirmed, cancelled, completed)
        'bookings_total', (
            SELECT COALESCE(COUNT(*), 0)::int FROM bookings
        ),
        'bookings_pending', (
            SELECT COALESCE(COUNT(*), 0)::int 
            FROM bookings 
            WHERE status = 'pending'
        ),
        'bookings_confirmed', (
            SELECT COALESCE(COUNT(*), 0)::int 
            FROM bookings 
            WHERE status = 'confirmed'
        ),
        'bookings_completed', (
            SELECT COALESCE(COUNT(*), 0)::int 
            FROM bookings 
            WHERE status = 'completed'
        ),
        'bookings_cancelled', (
            SELECT COALESCE(COUNT(*), 0)::int 
            FROM bookings 
            WHERE status = 'cancelled'
        ),
        'bookings_paid', (
            SELECT COALESCE(COUNT(*), 0)::int 
            FROM bookings 
            WHERE status = 'completed'
        ),
        
        -- Revenue metrics
        'revenue_gross', (
            SELECT COALESCE(SUM(
                CASE 
                    WHEN currency = 'USD' THEN total_price
                    WHEN currency = 'RWF' THEN total_price / 1000
                    ELSE total_price
                END
            ), 0)::numeric
            FROM bookings 
            WHERE status IN ('confirmed', 'completed')
            AND total_price IS NOT NULL
        ),
        'revenue_by_currency', (
            SELECT COALESCE(
                jsonb_agg(
                    jsonb_build_object(
                        'currency', currency,
                        'amount', total_amount
                    )
                ), 
                '[]'::jsonb
            )
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
        
        -- Order metrics  
        'orders_total', (
            SELECT COALESCE(COUNT(*), 0)::int FROM trip_cart_items
        ),
        'refunds_total', 0,
        
        -- Support metrics
        'tickets_total', 0,
        'tickets_open', 0,
        'tickets_in_progress', 0,
        'tickets_resolved', 0,
        'incidents_total', 0,
        'incidents_open', 0,
        'blacklist_count', 0
    ) INTO result;
    
    RETURN result;
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'error', true,
        'error_message', SQLERRM,
        'users_total', 0,
        'properties_total', 0,
        'tours_total', 0,
        'bookings_total', 0,
        'revenue_gross', 0
    );
END;
$$;

GRANT EXECUTE ON FUNCTION admin_dashboard_metrics() TO authenticated;
