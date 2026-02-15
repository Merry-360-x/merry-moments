-- Fix admin_dashboard_metrics: do not treat small RWF amounts as USD
-- Root cause: previous logic converted RWF < 1000 using usd_to_rwf, inflating totals.

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

    usd_to_rwf CONSTANT numeric := 1455.5;
    eur_to_rwf CONSTANT numeric := 1716.76225;
    gbp_to_rwf CONSTANT numeric := 1972.4936;
    kes_to_rwf CONSTANT numeric := 11.283036;
    ugx_to_rwf CONSTANT numeric := 0.408996;
    tzs_to_rwf CONSTANT numeric := 0.563279;
    aed_to_rwf CONSTANT numeric := 396.323917;
BEGIN
    BEGIN
        SELECT COUNT(*) INTO v_users_total FROM auth.users;
    EXCEPTION WHEN OTHERS THEN v_users_total := 0;
    END;

    BEGIN
        SELECT COUNT(*) INTO v_users_suspended FROM profiles WHERE is_suspended = true;
    EXCEPTION WHEN OTHERS THEN v_users_suspended := 0;
    END;

    BEGIN
        SELECT COUNT(DISTINCT user_id) INTO v_hosts_total FROM user_roles WHERE role = 'host';
    EXCEPTION WHEN OTHERS THEN v_hosts_total := 0;
    END;

    BEGIN
        SELECT COUNT(*) INTO v_properties_total FROM properties;
        SELECT COUNT(*) INTO v_properties_published FROM properties WHERE is_published = true;
    EXCEPTION WHEN OTHERS THEN
        v_properties_total := 0;
        v_properties_published := 0;
    END;

    BEGIN
        SELECT COUNT(*) INTO v_tours_total FROM tours;
        SELECT COUNT(*) INTO v_tours_published FROM tours WHERE is_published = true;
    EXCEPTION WHEN OTHERS THEN
        v_tours_total := 0;
        v_tours_published := 0;
    END;

    BEGIN
        SELECT COUNT(*) INTO v_vehicles_total FROM transport_vehicles;
        SELECT COUNT(*) INTO v_vehicles_published FROM transport_vehicles WHERE is_published = true;
    EXCEPTION WHEN OTHERS THEN
        v_vehicles_total := 0;
        v_vehicles_published := 0;
    END;

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

    BEGIN
        SELECT COALESCE(SUM(
            CASE
                WHEN currency = 'RWF' THEN total_price
                WHEN currency = 'USD' THEN total_price * usd_to_rwf
                WHEN currency = 'EUR' THEN total_price * eur_to_rwf
                WHEN currency = 'GBP' THEN total_price * gbp_to_rwf
                WHEN currency = 'KES' THEN total_price * kes_to_rwf
                WHEN currency = 'UGX' THEN total_price * ugx_to_rwf
                WHEN currency = 'TZS' THEN total_price * tzs_to_rwf
                WHEN currency = 'AED' THEN total_price * aed_to_rwf
                ELSE total_price * usd_to_rwf
            END
        ), 0) INTO v_revenue_gross
        FROM bookings
        WHERE status IN ('confirmed', 'completed');
    EXCEPTION WHEN OTHERS THEN v_revenue_gross := 0;
    END;

    BEGIN
        SELECT COALESCE(SUM(
            CASE
                WHEN currency = 'RWF' THEN total_price
                WHEN currency = 'USD' THEN total_price * usd_to_rwf
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

    BEGIN
        SELECT COUNT(*) INTO v_reviews_total FROM property_reviews;
        SELECT COUNT(*) INTO v_reviews_hidden FROM property_reviews WHERE is_hidden = true;
    EXCEPTION WHEN OTHERS THEN
        v_reviews_total := 0;
        v_reviews_hidden := 0;
    END;

    BEGIN
        SELECT COUNT(*) INTO v_orders_total FROM trip_cart_items;
    EXCEPTION WHEN OTHERS THEN v_orders_total := 0;
    END;

    BEGIN
        SELECT COUNT(*) INTO v_tickets_total FROM support_tickets;
        SELECT COUNT(*) INTO v_tickets_open FROM support_tickets WHERE status = 'open';
        SELECT COUNT(*) INTO v_tickets_in_progress FROM support_tickets WHERE status = 'in_progress';
        SELECT COUNT(*) INTO v_tickets_resolved FROM support_tickets WHERE status IN ('resolved', 'closed');
    EXCEPTION WHEN OTHERS THEN
        v_tickets_total := 0;
        v_tickets_open := 0;
        v_tickets_in_progress := 0;
        v_tickets_resolved := 0;
    END;

    BEGIN
        SELECT COUNT(*) INTO v_incidents_total FROM incidents;
        SELECT COUNT(*) INTO v_incidents_open FROM incidents WHERE status = 'open';
    EXCEPTION WHEN OTHERS THEN
        v_incidents_total := 0;
        v_incidents_open := 0;
    END;

    BEGIN
        SELECT COUNT(*) INTO v_blacklist_count FROM blacklist;
    EXCEPTION WHEN OTHERS THEN v_blacklist_count := 0;
    END;

    BEGIN
        SELECT COUNT(*) INTO v_stories_total FROM stories;
    EXCEPTION WHEN OTHERS THEN v_stories_total := 0;
    END;

    result := jsonb_build_object(
        'users_total', v_users_total,
        'users_suspended', v_users_suspended,
        'hosts_total', v_hosts_total,
        'properties_total', v_properties_total,
        'properties_published', v_properties_published,
        'properties_featured', 0,
        'tours_total', v_tours_total,
        'tours_published', v_tours_published,
        'transport_services_total', v_vehicles_total,
        'transport_vehicles_total', v_vehicles_total,
        'transport_vehicles_published', v_vehicles_published,
        'transport_routes_total', 0,
        'transport_routes_published', 0,
        'bookings_total', v_bookings_total,
        'bookings_pending', v_bookings_pending,
        'bookings_confirmed', v_bookings_confirmed,
        'bookings_completed', v_bookings_completed,
        'bookings_cancelled', v_bookings_cancelled,
        'bookings_paid', v_bookings_paid,
        'revenue_gross', v_revenue_gross,
        'revenue_by_currency', jsonb_build_array(jsonb_build_object('currency', 'RWF', 'amount', v_revenue_gross)),
        'refunds_total', v_refunds_total,
        'reviews_total', v_reviews_total,
        'reviews_hidden', v_reviews_hidden,
        'orders_total', v_orders_total,
        'tickets_total', v_tickets_total,
        'tickets_open', v_tickets_open,
        'tickets_in_progress', v_tickets_in_progress,
        'tickets_resolved', v_tickets_resolved,
        'incidents_total', v_incidents_total,
        'incidents_open', v_incidents_open,
        'blacklist_count', v_blacklist_count,
        'stories_total', v_stories_total
    );

    RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_dashboard_metrics() TO authenticated;
COMMENT ON FUNCTION admin_dashboard_metrics() IS 'Returns flat dashboard metrics with official BNR FX; RWF is always treated as RWF.';
