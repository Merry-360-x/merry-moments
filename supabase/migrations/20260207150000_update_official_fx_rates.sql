-- Update admin_dashboard_metrics with official BNR exchange rates
-- Official USD to RWF average rate: 1455.5 (from National Bank of Rwanda)

DROP FUNCTION IF EXISTS admin_dashboard_metrics();

CREATE OR REPLACE FUNCTION admin_dashboard_metrics()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
    v_users_total int := 0;
    v_users_suspended int := 0;
    v_hosts_total int := 0;
    v_properties_total int := 0;
    v_properties_published int := 0;
    v_tours_total int := 0;
    v_tours_published int := 0;
    v_vehicles_total int := 0;
    v_vehicles_published int := 0;
    v_bookings_total int := 0;
    v_bookings_pending int := 0;
    v_bookings_confirmed int := 0;
    v_bookings_completed int := 0;
    v_bookings_cancelled int := 0;
    v_bookings_paid int := 0;
    v_revenue_gross numeric := 0;
    v_refunds_total numeric := 0;
    v_reviews_total int := 0;
    v_reviews_hidden int := 0;
    v_orders_total int := 0;
    v_tickets_total int := 0;
    v_tickets_open int := 0;
    v_tickets_in_progress int := 0;
    v_tickets_resolved int := 0;
    v_incidents_total int := 0;
    v_incidents_open int := 0;
    v_blacklist_count int := 0;
    v_stories_total int := 0;
    
    -- Official BNR exchange rates (average rates to RWF)
    usd_to_rwf CONSTANT numeric := 1455.5;
    eur_to_rwf CONSTANT numeric := 1716.76225;
    gbp_to_rwf CONSTANT numeric := 1972.4936;
    kes_to_rwf CONSTANT numeric := 11.283036;
    ugx_to_rwf CONSTANT numeric := 0.408996;
    tzs_to_rwf CONSTANT numeric := 0.563279;
    aed_to_rwf CONSTANT numeric := 396.323917;
BEGIN
    -- Users
    BEGIN
        SELECT COUNT(*) INTO v_users_total FROM auth.users;
    EXCEPTION WHEN OTHERS THEN v_users_total := 0;
    END;
    
    BEGIN
        SELECT COUNT(*) INTO v_users_suspended FROM profiles WHERE is_suspended = true;
    EXCEPTION WHEN OTHERS THEN v_users_suspended := 0;
    END;
    
    -- Hosts
    BEGIN
        SELECT COUNT(DISTINCT user_id) INTO v_hosts_total FROM user_roles WHERE role = 'host';
    EXCEPTION WHEN OTHERS THEN v_hosts_total := 0;
    END;
    
    -- Properties
    BEGIN
        SELECT COUNT(*) INTO v_properties_total FROM properties;
        SELECT COUNT(*) INTO v_properties_published FROM properties WHERE is_published = true;
    EXCEPTION WHEN OTHERS THEN 
        v_properties_total := 0;
        v_properties_published := 0;
    END;
    
    -- Tours
    BEGIN
        SELECT COUNT(*) INTO v_tours_total FROM tours;
        SELECT COUNT(*) INTO v_tours_published FROM tours WHERE is_published = true;
    EXCEPTION WHEN OTHERS THEN 
        v_tours_total := 0;
        v_tours_published := 0;
    END;
    
    -- Vehicles
    BEGIN
        SELECT COUNT(*) INTO v_vehicles_total FROM transport_vehicles;
        SELECT COUNT(*) INTO v_vehicles_published FROM transport_vehicles WHERE is_published = true;
    EXCEPTION WHEN OTHERS THEN 
        v_vehicles_total := 0;
        v_vehicles_published := 0;
    END;
    
    -- Bookings
    BEGIN
        SELECT COUNT(*) INTO v_bookings_total FROM bookings;
        SELECT COUNT(*) INTO v_bookings_pending FROM bookings WHERE status = 'pending';
        SELECT COUNT(*) INTO v_bookings_confirmed FROM bookings WHERE status = 'confirmed';
        SELECT COUNT(*) INTO v_bookings_completed FROM bookings WHERE status = 'completed';
        SELECT COUNT(*) INTO v_bookings_cancelled FROM bookings WHERE status = 'cancelled';
        SELECT COUNT(*) INTO v_bookings_paid FROM bookings WHERE payment_status = 'paid';
    EXCEPTION WHEN OTHERS THEN 
        v_bookings_total := 0;
        v_bookings_pending := 0;
        v_bookings_confirmed := 0;
        v_bookings_completed := 0;
        v_bookings_cancelled := 0;
        v_bookings_paid := 0;
    END;
    
    -- Revenue - convert all currencies to RWF using official rates
    BEGIN
        SELECT COALESCE(SUM(
            CASE 
                WHEN currency = 'RWF' AND total_price >= 1000 THEN total_price
                WHEN currency = 'USD' OR (currency = 'RWF' AND total_price < 1000) THEN total_price * usd_to_rwf
                WHEN currency = 'EUR' THEN total_price * eur_to_rwf
                WHEN currency = 'GBP' THEN total_price * gbp_to_rwf
                WHEN currency = 'KES' THEN total_price * kes_to_rwf
                WHEN currency = 'UGX' THEN total_price * ugx_to_rwf
                WHEN currency = 'TZS' THEN total_price * tzs_to_rwf
                WHEN currency = 'AED' THEN total_price * aed_to_rwf
                ELSE total_price * usd_to_rwf  -- Default to USD rate for unknown currencies
            END
        ), 0) INTO v_revenue_gross
        FROM bookings 
        WHERE status IN ('confirmed', 'completed');
    EXCEPTION WHEN OTHERS THEN v_revenue_gross := 0;
    END;
    
    -- Refunds - convert all currencies to RWF
    BEGIN
        SELECT COALESCE(SUM(
            CASE 
                WHEN currency = 'RWF' AND total_price >= 1000 THEN total_price
                WHEN currency = 'USD' OR (currency = 'RWF' AND total_price < 1000) THEN total_price * usd_to_rwf
                WHEN currency = 'EUR' THEN total_price * eur_to_rwf
                WHEN currency = 'GBP' THEN total_price * gbp_to_rwf
                WHEN currency = 'KES' THEN total_price * kes_to_rwf
                WHEN currency = 'UGX' THEN total_price * ugx_to_rwf
                WHEN currency = 'TZS' THEN total_price * tzs_to_rwf
                WHEN currency = 'AED' THEN total_price * aed_to_rwf
                ELSE total_price * usd_to_rwf
            END
        ), 0) INTO v_refunds_total
        FROM bookings 
        WHERE status = 'cancelled' AND payment_status = 'refunded';
    EXCEPTION WHEN OTHERS THEN v_refunds_total := 0;
    END;
    
    -- Reviews
    BEGIN
        SELECT COUNT(*) INTO v_reviews_total FROM property_reviews;
        SELECT COUNT(*) INTO v_reviews_hidden FROM property_reviews WHERE is_hidden = true;
    EXCEPTION WHEN OTHERS THEN 
        v_reviews_total := 0;
        v_reviews_hidden := 0;
    END;
    
    -- Cart items
    BEGIN
        SELECT COUNT(*) INTO v_orders_total FROM trip_cart_items;
    EXCEPTION WHEN OTHERS THEN v_orders_total := 0;
    END;
    
    -- Support tickets
    BEGIN
        SELECT COUNT(*) INTO v_tickets_total FROM support_tickets;
        SELECT COUNT(*) INTO v_tickets_open FROM support_tickets WHERE status = 'open';
        SELECT COUNT(*) INTO v_tickets_in_progress FROM support_tickets WHERE status = 'in_progress';
        SELECT COUNT(*) INTO v_tickets_resolved FROM support_tickets WHERE status = 'resolved';
    EXCEPTION WHEN OTHERS THEN 
        v_tickets_total := 0;
        v_tickets_open := 0;
        v_tickets_in_progress := 0;
        v_tickets_resolved := 0;
    END;
    
    -- Incidents
    BEGIN
        SELECT COUNT(*) INTO v_incidents_total FROM incidents;
        SELECT COUNT(*) INTO v_incidents_open FROM incidents WHERE status = 'open';
    EXCEPTION WHEN OTHERS THEN 
        v_incidents_total := 0;
        v_incidents_open := 0;
    END;
    
    -- Blacklist
    BEGIN
        SELECT COUNT(*) INTO v_blacklist_count FROM blacklist;
    EXCEPTION WHEN OTHERS THEN v_blacklist_count := 0;
    END;
    
    -- Stories
    BEGIN
        SELECT COUNT(*) INTO v_stories_total FROM stories;
    EXCEPTION WHEN OTHERS THEN v_stories_total := 0;
    END;
    
    -- Build result
    result := jsonb_build_object(
        'users', jsonb_build_object(
            'total', v_users_total,
            'suspended', v_users_suspended
        ),
        'hosts', jsonb_build_object(
            'total', v_hosts_total
        ),
        'properties', jsonb_build_object(
            'total', v_properties_total,
            'published', v_properties_published,
            'featured', 0
        ),
        'tours', jsonb_build_object(
            'total', v_tours_total,
            'published', v_tours_published
        ),
        'vehicles', jsonb_build_object(
            'total', v_vehicles_total,
            'published', v_vehicles_published
        ),
        'bookings', jsonb_build_object(
            'total', v_bookings_total,
            'pending', v_bookings_pending,
            'confirmed', v_bookings_confirmed,
            'completed', v_bookings_completed,
            'cancelled', v_bookings_cancelled,
            'paid', v_bookings_paid
        ),
        'revenue', jsonb_build_object(
            'gross', v_revenue_gross,
            'currency', 'RWF'
        ),
        'refunds', jsonb_build_object(
            'total', v_refunds_total,
            'currency', 'RWF'
        ),
        'reviews', jsonb_build_object(
            'total', v_reviews_total,
            'hidden', v_reviews_hidden
        ),
        'orders', jsonb_build_object(
            'total', v_orders_total
        ),
        'tickets', jsonb_build_object(
            'total', v_tickets_total,
            'open', v_tickets_open,
            'in_progress', v_tickets_in_progress,
            'resolved', v_tickets_resolved
        ),
        'incidents', jsonb_build_object(
            'total', v_incidents_total,
            'open', v_incidents_open
        ),
        'blacklist', jsonb_build_object(
            'total', v_blacklist_count
        ),
        'stories', jsonb_build_object(
            'total', v_stories_total
        )
    );
    
    RETURN result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION admin_dashboard_metrics() TO authenticated;
