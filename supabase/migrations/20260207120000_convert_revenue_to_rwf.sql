-- Update admin_dashboard_metrics to convert all revenue to RWF
-- USD to RWF conversion rate: 1 USD = 1350 RWF

DROP FUNCTION IF EXISTS admin_dashboard_metrics();

CREATE OR REPLACE FUNCTION admin_dashboard_metrics()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
    usd_to_rwf_rate CONSTANT numeric := 1350; -- 1 USD = 1350 RWF
BEGIN
    SELECT jsonb_build_object(
        -- User metrics
        'users_total', (
            SELECT COALESCE(COUNT(*), 0)::int FROM auth.users
        ),
        'users_suspended', (
            SELECT COALESCE(COUNT(*), 0)::int FROM profiles WHERE is_suspended = true
        ),
        'hosts_total', (
            SELECT COALESCE(COUNT(DISTINCT user_id), 0)::int FROM user_roles WHERE role = 'host'
        ),
        
        -- Property metrics
        'properties_total', (
            SELECT COALESCE(COUNT(*), 0)::int FROM properties
        ),
        'properties_published', (
            SELECT COALESCE(COUNT(*), 0)::int FROM properties WHERE is_published = true
        ),
        'properties_featured', (
            SELECT COALESCE(COUNT(*), 0)::int FROM properties WHERE is_featured = true
        ),
        
        -- Tour metrics (from tours table)
        'tours_total', (
            SELECT COALESCE(COUNT(*), 0)::int FROM tours
        ),
        'tours_published', (
            SELECT COALESCE(COUNT(*), 0)::int FROM tours WHERE is_published = true
        ),
        
        -- Tour packages metrics
        'tour_packages_total', (
            SELECT COALESCE(COUNT(*), 0)::int FROM tour_packages
        ),
        'tour_packages_approved', (
            SELECT COALESCE(COUNT(*), 0)::int FROM tour_packages WHERE status = 'approved'
        ),
        
        -- Transport metrics
        'transport_services_total', (
            SELECT COALESCE(COUNT(*), 0)::int FROM transport_vehicles
        ),
        'transport_vehicles_total', (
            SELECT COALESCE(COUNT(*), 0)::int FROM transport_vehicles
        ),
        'transport_vehicles_published', (
            SELECT COALESCE(COUNT(*), 0)::int FROM transport_vehicles WHERE is_published = true
        ),
        'transport_routes_total', 0,
        'transport_routes_published', 0,
        
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
        
        -- Revenue metrics - CONVERT ALL TO RWF
        -- If currency is USD (or amount < 1000 suggesting USD), multiply by rate
        'revenue_gross', (
            SELECT COALESCE(SUM(
                CASE 
                    WHEN currency = 'USD' OR (currency = 'RWF' AND total_price < 1000) THEN total_price * usd_to_rwf_rate
                    ELSE total_price
                END
            ), 0)::numeric 
            FROM bookings 
            WHERE status IN ('confirmed', 'completed')
        ),
        'revenue_by_currency', (
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object('currency', 'RWF', 'amount', total_rwf)
            ), '[{"currency": "RWF", "amount": 0}]'::jsonb)
            FROM (
                SELECT 
                    SUM(
                        CASE 
                            WHEN currency = 'USD' OR (currency = 'RWF' AND total_price < 1000) THEN total_price * usd_to_rwf_rate
                            ELSE total_price
                        END
                    )::numeric as total_rwf
                FROM bookings 
                WHERE status IN ('confirmed', 'completed')
                AND total_price IS NOT NULL
            ) revenue_data
            WHERE total_rwf > 0
        ),
        
        -- Refunds total - also convert to RWF
        'refunds_total', (
            SELECT COALESCE(SUM(
                CASE 
                    WHEN currency = 'USD' OR (currency = 'RWF' AND total_price < 1000) THEN total_price * usd_to_rwf_rate
                    ELSE total_price
                END
            ), 0)::numeric 
            FROM bookings 
            WHERE status = 'cancelled' 
            AND payment_status = 'refunded'
        ),
        
        -- Review metrics
        'reviews_total', (
            SELECT COALESCE(COUNT(*), 0)::int FROM property_reviews
        ),
        'reviews_hidden', (
            SELECT COALESCE(COUNT(*), 0)::int FROM property_reviews WHERE is_hidden = true
        ),
        
        -- Cart items
        'orders_total', (
            SELECT COALESCE(COUNT(*), 0)::int FROM trip_cart_items
        ),
        
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
        'incidents_total', (
            SELECT COALESCE(COUNT(*), 0)::int FROM incident_reports
        ),
        'incidents_open', (
            SELECT COALESCE(COUNT(*), 0)::int FROM incident_reports WHERE status = 'open'
        ),
        'blacklist_count', (
            SELECT COALESCE(COUNT(*), 0)::int FROM blacklist
        ),
        
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

COMMENT ON FUNCTION admin_dashboard_metrics() IS 'Returns comprehensive dashboard metrics for admin users with all revenue converted to RWF';
