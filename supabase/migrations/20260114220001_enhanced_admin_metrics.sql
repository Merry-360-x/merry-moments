-- Enhanced admin dashboard metrics with better error handling and data validation
-- This replaces the previous function with more comprehensive metrics calculation

DROP FUNCTION IF EXISTS admin_dashboard_metrics();

CREATE OR REPLACE FUNCTION admin_dashboard_metrics()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
    users_count INT := 0;
    properties_count INT := 0;
    tours_count INT := 0;
    bookings_count INT := 0;
    revenue_amount NUMERIC := 0;
    revenue_by_currency_data JSONB := '[]'::jsonb;
BEGIN
    -- Get user counts with error handling
    BEGIN
        SELECT COUNT(*) INTO users_count FROM auth.users WHERE deleted_at IS NULL;
    EXCEPTION WHEN OTHERS THEN
        users_count := 0;
    END;
    
    -- Get properties count
    BEGIN
        SELECT COUNT(*) INTO properties_count FROM properties;
    EXCEPTION WHEN OTHERS THEN
        properties_count := 0;
    END;
    
    -- Get tours count  
    BEGIN
        SELECT COUNT(*) INTO tours_count FROM tours;
    EXCEPTION WHEN OTHERS THEN
        tours_count := 0;
    END;
    
    -- Get bookings count
    BEGIN
        SELECT COUNT(*) INTO bookings_count FROM bookings;
    EXCEPTION WHEN OTHERS THEN
        bookings_count := 0;
    END;
    
    -- Calculate revenue with proper currency handling
    BEGIN
        SELECT COALESCE(SUM(
            CASE 
                WHEN currency = 'USD' THEN total_price
                WHEN currency = 'RWF' THEN total_price / 1000  -- Convert RWF to USD approximately
                ELSE total_price
            END
        ), 0) INTO revenue_amount
        FROM bookings 
        WHERE status IN ('confirmed', 'completed', 'paid')
        AND total_price IS NOT NULL;
    EXCEPTION WHEN OTHERS THEN
        revenue_amount := 0;
    END;
    
    -- Get revenue by currency
    BEGIN
        SELECT COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'currency', currency,
                    'amount', total_amount
                )
            ), 
            '[]'::jsonb
        ) INTO revenue_by_currency_data
        FROM (
            SELECT 
                COALESCE(currency, 'USD') as currency,
                SUM(COALESCE(total_price, 0))::numeric as total_amount
            FROM bookings 
            WHERE status IN ('confirmed', 'completed', 'paid')
            AND total_price IS NOT NULL
            GROUP BY currency
            HAVING SUM(COALESCE(total_price, 0)) > 0
            ORDER BY total_amount DESC
            LIMIT 10
        ) revenue_data;
    EXCEPTION WHEN OTHERS THEN
        revenue_by_currency_data := '[]'::jsonb;
    END;

    -- Build comprehensive result
    SELECT jsonb_build_object(
        'users_total', users_count,
        'users_suspended', (
            SELECT COALESCE(COUNT(*), 0)::int 
            FROM profiles 
            WHERE is_suspended = true
        ),
        'hosts_total', (
            SELECT COALESCE(COUNT(DISTINCT user_id), 0)::int 
            FROM user_roles 
            WHERE role = 'host'
        ),
        'stories_total', 0,
        'properties_total', properties_count,
        'properties_published', (
            SELECT COALESCE(COUNT(*), 0)::int 
            FROM properties 
            WHERE is_published = true
        ),
        'properties_featured', (
            SELECT COALESCE(COUNT(*), 0)::int 
            FROM properties 
            WHERE is_published = true AND COALESCE(rating, 0) >= 4.0
        ),
        'tours_total', tours_count,
        'tours_published', (
            SELECT COALESCE(COUNT(*), 0)::int 
            FROM tours 
            WHERE is_published = true
        ),
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
        'bookings_total', bookings_count,
        'bookings_pending', (
            SELECT COALESCE(COUNT(*), 0)::int 
            FROM bookings 
            WHERE status = 'pending'
        ),
        'bookings_confirmed', (
            SELECT COALESCE(COUNT(*), 0)::int 
            FROM bookings 
            WHERE status IN ('confirmed', 'completed')
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
            WHERE status IN ('confirmed', 'completed', 'paid')
        ),
        'orders_total', (
            SELECT COALESCE(COUNT(*), 0)::int FROM trip_cart_items
        ),
        'reviews_total', (
            SELECT COALESCE(COUNT(*), 0)::int FROM property_reviews
        ),
        'reviews_hidden', (
            SELECT COALESCE(COUNT(*), 0)::int 
            FROM property_reviews
            WHERE is_hidden = true
        ),
        'tickets_total', 0,
        'tickets_open', 0,
        'tickets_in_progress', 0,
        'tickets_resolved', 0,
        'incidents_total', 0,
        'incidents_open', 0,
        'blacklist_count', 0,
        'revenue_gross', revenue_amount,
        'revenue_by_currency', revenue_by_currency_data,
        'refunds_total', 0
    ) INTO result;
    
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        -- Return error info for debugging in development
        RETURN jsonb_build_object(
            'error', true,
            'error_message', SQLERRM,
            'users_total', 0,
            'users_suspended', 0,
            'hosts_total', 0,
            'stories_total', 0,
            'properties_total', 0,
            'properties_published', 0,
            'properties_featured', 0,
            'tours_total', 0,
            'tours_published', 0,
            'transport_services_total', 0,
            'transport_vehicles_total', 0,
            'transport_vehicles_published', 0,
            'transport_routes_total', 0,
            'transport_routes_published', 0,
            'bookings_total', 0,
            'bookings_pending', 0,
            'bookings_confirmed', 0,
            'bookings_completed', 0,
            'bookings_cancelled', 0,
            'bookings_paid', 0,
            'orders_total', 0,
            'reviews_total', 0,
            'reviews_hidden', 0,
            'tickets_total', 0,
            'tickets_open', 0,
            'tickets_in_progress', 0,
            'tickets_resolved', 0,
            'incidents_total', 0,
            'incidents_open', 0,
            'blacklist_count', 0,
            'revenue_gross', 0,
            'revenue_by_currency', '[]'::jsonb,
            'refunds_total', 0
        );
END;
$$;