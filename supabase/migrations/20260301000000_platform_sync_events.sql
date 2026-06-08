-- Platform Sync Events - Cross-platform real-time synchronization
-- This migration creates the infrastructure for instant sync between Web, Flutter, and API

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Create platform_sync_events table
CREATE TABLE IF NOT EXISTS platform_sync_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type TEXT NOT NULL, -- e.g., 'property.created', 'booking.updated', 'tour_package.deleted'
  entity_type TEXT NOT NULL, -- 'property', 'tour', 'tour_package', 'transport_vehicle', 'booking', 'user', 'profile'
  entity_id UUID NOT NULL,
  payload JSONB DEFAULT '{}',
  source_platform TEXT NOT NULL, -- 'web', 'flutter', 'api', 'admin'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_platform_sync_events_entity 
  ON platform_sync_events (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_platform_sync_events_created_at 
  ON platform_sync_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_sync_events_source 
  ON platform_sync_events (source_platform);

-- Enable RLS
ALTER TABLE platform_sync_events ENABLE ROW LEVEL SECURITY;

-- Admin can view all sync events
DROP POLICY IF EXISTS "Admins can view all platform sync events" ON platform_sync_events;
CREATE POLICY "Admins can view all platform sync events" 
  ON platform_sync_events FOR SELECT USING (is_admin());

-- Service role can insert (for triggers)
DROP POLICY IF EXISTS "Service role can insert platform sync events" ON platform_sync_events;
CREATE POLICY "Service role can insert platform sync events" 
  ON platform_sync_events FOR INSERT WITH CHECK (true);

-- Enable realtime on platform_sync_events
ALTER PUBLICATION supabase_realtime ADD TABLE platform_sync_events;

-- 2. Create the notification trigger function
CREATE OR REPLACE FUNCTION notify_platform_sync()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  event_type TEXT;
  entity_type TEXT;
  payload JSONB;
  source_platform TEXT;
  table_name TEXT;
BEGIN
  -- Determine event type
  IF TG_OP = 'INSERT' THEN
    event_type := TG_TABLE_NAME || '.created';
  ELSIF TG_OP = 'UPDATE' THEN
    event_type := TG_TABLE_NAME || '.updated';
  ELSIF TG_OP = 'DELETE' THEN
    event_type := TG_TABLE_NAME || '.deleted';
  ELSE
    RETURN NEW;
  END IF;

  -- Map table name to entity type
  table_name := TG_TABLE_NAME;
  entity_type := CASE table_name
    WHEN 'properties' THEN 'property'
    WHEN 'tours' THEN 'tour'
    WHEN 'tour_packages' THEN 'tour_package'
    WHEN 'transport_vehicles' THEN 'transport_vehicle'
    WHEN 'transport_routes' THEN 'transport_route'
    WHEN 'bookings' THEN 'booking'
    WHEN 'profiles' THEN 'user'
    WHEN 'host_applications' THEN 'host_application'
    WHEN 'user_roles' THEN 'user_role'
    WHEN 'favorites' THEN 'wishlist'
    WHEN 'trip_cart_items' THEN 'trip_cart'
    WHEN 'notifications' THEN 'notification'
    WHEN 'stories' THEN 'story'
    WHEN 'property_reviews' THEN 'review'
    WHEN 'reviews' THEN 'review'
    WHEN 'checkout_requests' THEN 'checkout'
    WHEN 'charges' THEN 'charge'
    WHEN 'booking_modifications' THEN 'booking_modification'
    WHEN 'disputes' THEN 'dispute'
    WHEN 'host_payouts' THEN 'payout'
    WHEN 'wallet_accounts' THEN 'wallet'
    WHEN 'wallet_transactions' THEN 'wallet_transaction'
    WHEN 'support_tickets' THEN 'support_ticket'
    WHEN 'support_ticket_messages' THEN 'support_message'
    WHEN 'direct_messages' THEN 'direct_message'
    WHEN 'host_follows' THEN 'host_follow'
    WHEN 'affiliates' THEN 'affiliate'
    WHEN 'affiliate_referrals' THEN 'affiliate_referral'
    WHEN 'affiliate_commissions' THEN 'affiliate_commission'
    WHEN 'discount_codes' THEN 'discount_code'
    WHEN 'ad_banners' THEN 'ad_banner'
    WHEN 'property_blocked_dates' THEN 'blocked_date'
    WHEN 'property_custom_prices' THEN 'custom_price'
    WHEN 'availability_exceptions' THEN 'availability_exception'
    WHEN 'airport_transfer_pricing' THEN 'airport_transfer_pricing'
    ELSE table_name
  END;

  -- Build payload
  IF TG_OP = 'DELETE' THEN
    payload := jsonb_build_object('id', OLD.id);
  ELSE
    payload := to_jsonb(NEW);
  END IF;

  -- Get source platform from session variable (set by client)
  source_platform := COALESCE(
    NULLIF(current_setting('app.current_platform', true), ''),
    'unknown'
  );

  -- Insert into sync events table (triggers realtime)
  INSERT INTO platform_sync_events (event_type, entity_type, entity_id, payload, source_platform)
  VALUES (event_type, entity_type, COALESCE(NEW.id, OLD.id), payload, source_platform);

  -- Also send pg_notify for Edge Functions / external consumers
  PERFORM pg_notify('platform_sync', jsonb_build_object(
    'event_type', event_type,
    'entity_type', entity_type,
    'entity_id', COALESCE(NEW.id, OLD.id),
    'payload', payload,
    'source_platform', source_platform,
    'timestamp', NOW()
  )::TEXT);

  RETURN NEW;
END;
$$;

-- 3. Attach triggers to all core tables
-- Properties
DROP TRIGGER IF EXISTS sync_properties ON properties;
CREATE TRIGGER sync_properties
  AFTER INSERT OR UPDATE OR DELETE ON properties
  FOR EACH ROW EXECUTE FUNCTION notify_platform_sync();

-- Tours
DROP TRIGGER IF EXISTS sync_tours ON tours;
CREATE TRIGGER sync_tours
  AFTER INSERT OR UPDATE OR DELETE ON tours
  FOR EACH ROW EXECUTE FUNCTION notify_platform_sync();

-- Tour Packages
DROP TRIGGER IF EXISTS sync_tour_packages ON tour_packages;
CREATE TRIGGER sync_tour_packages
  AFTER INSERT OR UPDATE OR DELETE ON tour_packages
  FOR EACH ROW EXECUTE FUNCTION notify_platform_sync();

-- Transport Vehicles
DROP TRIGGER IF EXISTS sync_transport_vehicles ON transport_vehicles;
CREATE TRIGGER sync_transport_vehicles
  AFTER INSERT OR UPDATE OR DELETE ON transport_vehicles
  FOR EACH ROW EXECUTE FUNCTION notify_platform_sync();

-- Transport Routes
DROP TRIGGER IF EXISTS sync_transport_routes ON transport_routes;
CREATE TRIGGER sync_transport_routes
  AFTER INSERT OR UPDATE OR DELETE ON transport_routes
  FOR EACH ROW EXECUTE FUNCTION notify_platform_sync();

-- Bookings
DROP TRIGGER IF EXISTS sync_bookings ON bookings;
CREATE TRIGGER sync_bookings
  AFTER INSERT OR UPDATE OR DELETE ON bookings
  FOR EACH ROW EXECUTE FUNCTION notify_platform_sync();

-- Profiles
DROP TRIGGER IF EXISTS sync_profiles ON profiles;
CREATE TRIGGER sync_profiles
  AFTER INSERT OR UPDATE OR DELETE ON profiles
  FOR EACH ROW EXECUTE FUNCTION notify_platform_sync();

-- Host Applications
DROP TRIGGER IF EXISTS sync_host_applications ON host_applications;
CREATE TRIGGER sync_host_applications
  AFTER INSERT OR UPDATE OR DELETE ON host_applications
  FOR EACH ROW EXECUTE FUNCTION notify_platform_sync();

-- User Roles
DROP TRIGGER IF EXISTS sync_user_roles ON user_roles;
CREATE TRIGGER sync_user_roles
  AFTER INSERT OR UPDATE OR DELETE ON user_roles
  FOR EACH ROW EXECUTE FUNCTION notify_platform_sync();

-- Favorites (Wishlists)
DROP TRIGGER IF EXISTS sync_favorites ON favorites;
CREATE TRIGGER sync_favorites
  AFTER INSERT OR UPDATE OR DELETE ON favorites
  FOR EACH ROW EXECUTE FUNCTION notify_platform_sync();

-- Trip Cart Items
DROP TRIGGER IF EXISTS sync_trip_cart_items ON trip_cart_items;
CREATE TRIGGER sync_trip_cart_items
  AFTER INSERT OR UPDATE OR DELETE ON trip_cart_items
  FOR EACH ROW EXECUTE FUNCTION notify_platform_sync();

-- Notifications
DROP TRIGGER IF EXISTS sync_notifications ON notifications;
CREATE TRIGGER sync_notifications
  AFTER INSERT OR UPDATE OR DELETE ON notifications
  FOR EACH ROW EXECUTE FUNCTION notify_platform_sync();

-- Stories
DROP TRIGGER IF EXISTS sync_stories ON stories;
CREATE TRIGGER sync_stories
  AFTER INSERT OR UPDATE OR DELETE ON stories
  FOR EACH ROW EXECUTE FUNCTION notify_platform_sync();

-- Property Reviews
DROP TRIGGER IF EXISTS sync_property_reviews ON property_reviews;
CREATE TRIGGER sync_property_reviews
  AFTER INSERT OR UPDATE OR DELETE ON property_reviews
  FOR EACH ROW EXECUTE FUNCTION notify_platform_sync();

-- Reviews (generic)
DROP TRIGGER IF EXISTS sync_reviews ON reviews;
CREATE TRIGGER sync_reviews
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW EXECUTE FUNCTION notify_platform_sync();

-- Checkout Requests
DROP TRIGGER IF EXISTS sync_checkout_requests ON checkout_requests;
CREATE TRIGGER sync_checkout_requests
  AFTER INSERT OR UPDATE OR DELETE ON checkout_requests
  FOR EACH ROW EXECUTE FUNCTION notify_platform_sync();

-- Charges
DROP TRIGGER IF EXISTS sync_charges ON charges;
CREATE TRIGGER sync_charges
  AFTER INSERT OR UPDATE OR DELETE ON charges
  FOR EACH ROW EXECUTE FUNCTION notify_platform_sync();

-- Booking Modifications
DROP TRIGGER IF EXISTS sync_booking_modifications ON booking_modifications;
CREATE TRIGGER sync_booking_modifications
  AFTER INSERT OR UPDATE OR DELETE ON booking_modifications
  FOR EACH ROW EXECUTE FUNCTION notify_platform_sync();

-- Disputes
DROP TRIGGER IF EXISTS sync_disputes ON disputes;
CREATE TRIGGER sync_disputes
  AFTER INSERT OR UPDATE OR DELETE ON disputes
  FOR EACH ROW EXECUTE FUNCTION notify_platform_sync();

-- Host Payouts
DROP TRIGGER IF EXISTS sync_host_payouts ON host_payouts;
CREATE TRIGGER sync_host_payouts
  AFTER INSERT OR UPDATE OR DELETE ON host_payouts
  FOR EACH ROW EXECUTE FUNCTION notify_platform_sync();

-- Support Tickets
DROP TRIGGER IF EXISTS sync_support_tickets ON support_tickets;
CREATE TRIGGER sync_support_tickets
  AFTER INSERT OR UPDATE OR DELETE ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION notify_platform_sync();

-- Support Ticket Messages
DROP TRIGGER IF EXISTS sync_support_ticket_messages ON support_ticket_messages;
CREATE TRIGGER sync_support_ticket_messages
  AFTER INSERT OR UPDATE OR DELETE ON support_ticket_messages
  FOR EACH ROW EXECUTE FUNCTION notify_platform_sync();

-- Direct Messages
DROP TRIGGER IF EXISTS sync_direct_messages ON direct_messages;
CREATE TRIGGER sync_direct_messages
  AFTER INSERT OR UPDATE OR DELETE ON direct_messages
  FOR EACH ROW EXECUTE FUNCTION notify_platform_sync();

-- Host Follows
DROP TRIGGER IF EXISTS sync_host_follows ON host_follows;
CREATE TRIGGER sync_host_follows
  AFTER INSERT OR UPDATE OR DELETE ON host_follows
  FOR EACH ROW EXECUTE FUNCTION notify_platform_sync();

-- Affiliates
DROP TRIGGER IF EXISTS sync_affiliates ON affiliates;
CREATE TRIGGER sync_affiliates
  AFTER INSERT OR UPDATE OR DELETE ON affiliates
  FOR EACH ROW EXECUTE FUNCTION notify_platform_sync();

-- Discount Codes
DROP TRIGGER IF EXISTS sync_discount_codes ON discount_codes;
CREATE TRIGGER sync_discount_codes
  AFTER INSERT OR UPDATE OR DELETE ON discount_codes
  FOR EACH ROW EXECUTE FUNCTION notify_platform_sync();

-- Ad Banners
DROP TRIGGER IF EXISTS sync_ad_banners ON ad_banners;
CREATE TRIGGER sync_ad_banners
  AFTER INSERT OR UPDATE OR DELETE ON ad_banners
  FOR EACH ROW EXECUTE FUNCTION notify_platform_sync();

-- Property Blocked Dates
DROP TRIGGER IF EXISTS sync_property_blocked_dates ON property_blocked_dates;
CREATE TRIGGER sync_property_blocked_dates
  AFTER INSERT OR UPDATE OR DELETE ON property_blocked_dates
  FOR EACH ROW EXECUTE FUNCTION notify_platform_sync();

-- Property Custom Prices
DROP TRIGGER IF EXISTS sync_property_custom_prices ON property_custom_prices;
CREATE TRIGGER sync_property_custom_prices
  AFTER INSERT OR UPDATE OR DELETE ON property_custom_prices
  FOR EACH ROW EXECUTE FUNCTION notify_platform_sync();

-- Availability Exceptions
DROP TRIGGER IF EXISTS sync_availability_exceptions ON availability_exceptions;
CREATE TRIGGER sync_availability_exceptions
  AFTER INSERT OR UPDATE OR DELETE ON availability_exceptions
  FOR EACH ROW EXECUTE FUNCTION notify_platform_sync();

-- Airport Transfer Pricing
DROP TRIGGER IF EXISTS sync_airport_transfer_pricing ON airport_transfer_pricing;
CREATE TRIGGER sync_airport_transfer_pricing
  AFTER INSERT OR UPDATE OR DELETE ON airport_transfer_pricing
  FOR EACH ROW EXECUTE FUNCTION notify_platform_sync();

-- 4. Grant execute permissions
GRANT EXECUTE ON FUNCTION notify_platform_sync() TO authenticated;
GRANT EXECUTE ON FUNCTION notify_platform_sync() TO service_role;

-- 5. Create helper function to set platform context
CREATE OR REPLACE FUNCTION set_platform_context(platform TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM set_config('app.current_platform', platform, false);
END;
$$;

GRANT EXECUTE ON FUNCTION set_platform_context(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION set_platform_context(TEXT) TO service_role;

-- 6. Create a view for easy querying of recent sync events
CREATE OR REPLACE VIEW recent_platform_sync_events AS
SELECT 
  id,
  event_type,
  entity_type,
  entity_id,
  payload,
  source_platform,
  created_at
FROM platform_sync_events
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

GRANT SELECT ON recent_platform_sync_events TO authenticated;

-- 7. Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';