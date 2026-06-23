-- ─────────────────────────────────────────────────────────────
-- Extended notification system: delete, role_target, admin
-- triggers, charge/dispute triggers, check-in triggers
-- ─────────────────────────────────────────────────────────────

-- 0. Fix notify_edge_function to use net.http_post (pg_net v0.19.5+)
CREATE OR REPLACE FUNCTION public.notify_edge_function(payload JSONB)
RETURNS void AS $$
DECLARE
  edge_url TEXT := current_setting('app.settings.edge_function_base_url', TRUE)
                  || '/functions/v1/send-notification';
  anon_key TEXT := current_setting('app.settings.supabase_anon_key', TRUE);
BEGIN
  IF edge_url IS NULL OR edge_url = '/functions/v1/send-notification' THEN
    edge_url := 'https://uwgiostcetoxotfnulfm.supabase.co/functions/v1/send-notification';
  END IF;
  PERFORM net.http_post(
    url := edge_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(anon_key, current_setting('app.settings.supabase_anon_key', TRUE)),
      'apikey', COALESCE(anon_key, current_setting('app.settings.supabase_anon_key', TRUE))
    ),
    body := payload,
    params := '{}'::jsonb,
    timeout_milliseconds := 5000
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. Add role_target column to notifications table
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS role_target VARCHAR(20) DEFAULT NULL;

-- 2. Delete a single notification
CREATE OR REPLACE FUNCTION public.delete_notification(p_id UUID, p_user_id UUID)
RETURNS void AS $$
BEGIN
  DELETE FROM public.notifications
  WHERE id = p_id AND user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Helper: send notification to all admin users
CREATE OR REPLACE FUNCTION public.notify_all_admins(p_payload JSONB)
RETURNS void AS $$
DECLARE
  admin_rec RECORD;
  admin_payload JSONB;
BEGIN
  FOR admin_rec IN
    SELECT id FROM profiles
    WHERE id IN (
      SELECT user_id FROM user_roles WHERE role = 'admin'
    )
  LOOP
    admin_payload := jsonb_set(p_payload, '{userId}', to_jsonb(admin_rec.id::text));
    PERFORM public.notify_edge_function(admin_payload);
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Post-booking charge triggers ──

CREATE OR REPLACE FUNCTION public.on_charge_insert()
RETURNS TRIGGER AS $$
DECLARE
  booking_rec RECORD;
BEGIN
  SELECT id, guest_id, host_id, title, guest_name
  INTO booking_rec
  FROM bookings b WHERE b.id = NEW.booking_id;

  -- Notify guest: new charge added
  PERFORM public.notify_edge_function(jsonb_build_object(
    'userId', booking_rec.guest_id,
    'type', 'new_charge_added',
    'title', 'New Charge Added',
    'body', 'Your host has added an extra charge of '
         || NEW.currency || ' ' || NEW.amount::text
         || ' to booking ' || NEW.booking_id || '. Tap to review and respond.',
    'screenRoute', '/post-booking/' || NEW.booking_id,
    'data', jsonb_build_object('charge_id', NEW.id, 'booking_id', NEW.booking_id)
  ));

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.on_charge_status_change()
RETURNS TRIGGER AS $$
DECLARE
  booking_rec RECORD;
BEGIN
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;

  SELECT id, guest_id, host_id, title, guest_name
  INTO booking_rec
  FROM bookings b WHERE b.id = NEW.booking_id;

  IF NEW.status = 'paid' THEN
    -- Notify host: charge paid by guest
    PERFORM public.notify_edge_function(jsonb_build_object(
      'userId', booking_rec.host_id,
      'type', 'extra_charge_paid',
      'title', 'Extra Charge Paid',
      'body', COALESCE(booking_rec.guest_name, 'The guest')
           || ' has paid the extra charge of '
           || NEW.currency || ' ' || NEW.amount::text
           || ' for booking ' || NEW.booking_id || '.',
      'screenRoute', '/host/bookings/' || NEW.booking_id,
      'data', jsonb_build_object('charge_id', NEW.id, 'booking_id', NEW.booking_id)
    ));
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Dispute triggers ──

CREATE OR REPLACE FUNCTION public.on_dispute_insert()
RETURNS TRIGGER AS $$
DECLARE
  booking_rec RECORD;
  guest_name TEXT;
  host_name TEXT;
BEGIN
  SELECT b.id, b.guest_id, b.host_id, b.guest_name
  INTO booking_rec
  FROM bookings b WHERE b.id = NEW.booking_id;

  SELECT COALESCE(p.full_name, 'Guest') INTO guest_name
  FROM profiles p WHERE p.user_id = NEW.opened_by;

  SELECT COALESCE(p.full_name, 'Host') INTO host_name
  FROM profiles p WHERE p.user_id = booking_rec.host_id;

  IF NEW.opened_by = booking_rec.guest_id THEN
    -- Notify host: dispute opened by guest
    PERFORM public.notify_edge_function(jsonb_build_object(
      'userId', booking_rec.host_id,
      'type', 'dispute_opened',
      'title', 'Dispute Opened by Guest',
      'body', guest_name || ' has opened a dispute on booking '
           || NEW.booking_id || '. Tap to review the claim and respond.',
      'screenRoute', '/host/disputes/' || NEW.id,
      'data', jsonb_build_object('dispute_id', NEW.id, 'booking_id', NEW.booking_id)
    ));
  END IF;

  -- Notify all admins
  PERFORM public.notify_all_admins(jsonb_build_object(
    'userId', '',
    'type', 'dispute_requires_admin',
    'title', 'Dispute Requires Admin Review',
    'body', 'A dispute has been opened on booking ' || NEW.booking_id
         || ' between ' || guest_name || ' and ' || host_name
         || '. Assign a resolution agent.',
    'screenRoute', '/admin/disputes',
    'data', jsonb_build_object('dispute_id', NEW.id, 'booking_id', NEW.booking_id)
  ));

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.on_dispute_status_change()
RETURNS TRIGGER AS $$
DECLARE
  booking_rec RECORD;
BEGIN
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;

  SELECT b.id, b.guest_id, b.host_id
  INTO booking_rec
  FROM bookings b WHERE b.id = NEW.booking_id;

  -- If resolved in guest's favor, notify guest
  IF NEW.status = 'resolved_guest' THEN
    PERFORM public.notify_edge_function(jsonb_build_object(
      'userId', booking_rec.guest_id,
      'type', 'dispute_resolved',
      'title', 'Dispute Resolved in Your Favor',
      'body', 'Your dispute for booking ' || NEW.booking_id
           || ' has been reviewed and resolved. No additional charge will be applied.',
      'screenRoute', '/my-bookings/' || NEW.booking_id,
      'data', jsonb_build_object('dispute_id', NEW.id, 'booking_id', NEW.booking_id)
    ));
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Guest check-in trigger (when booking status changes to 'checked_in') ──

CREATE OR REPLACE FUNCTION public.on_booking_guest_checkin()
RETURNS TRIGGER AS $$
DECLARE
  prop_name TEXT;
BEGIN
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;

  SELECT COALESCE(NEW.title, p.title, 'Property') INTO prop_name
  FROM (SELECT NULL::text) dummy
  LEFT JOIN properties p ON p.id = NEW.property_id;

  IF NEW.status = 'checked_in' THEN
    PERFORM public.notify_edge_function(jsonb_build_object(
      'userId', NEW.host_id,
      'type', 'guest_checked_in',
      'title', 'Guest Checked In',
      'body', COALESCE(NEW.guest_name, 'A guest') || ' has checked into '
           || prop_name || '. Their stay runs until ' || NEW.check_out || '.',
      'screenRoute', '/host/bookings/' || NEW.id,
      'data', jsonb_build_object('booking_id', NEW.id)
    ));
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Review for guest (when host reviews a guest after checkout) ──

CREATE OR REPLACE FUNCTION public.on_guest_review_insert()
RETURNS TRIGGER AS $$
DECLARE
  booking_rec RECORD;
  host_name TEXT;
  prop_name TEXT;
BEGIN
  SELECT b.id, b.guest_id, b.host_id, b.title, b.guest_name
  INTO booking_rec
  FROM bookings b WHERE b.id = NEW.booking_id;

  SELECT COALESCE(p.full_name, 'The host') INTO host_name
  FROM profiles p WHERE p.user_id = NEW.reviewer_id;

  prop_name := COALESCE(booking_rec.title, 'Property');

  -- Only notify if the reviewer is the HOST (reviewing the guest)
  IF NEW.reviewer_id = booking_rec.host_id THEN
    PERFORM public.notify_edge_function(jsonb_build_object(
      'userId', booking_rec.guest_id,
      'type', 'host_review_received',
      'title', 'Your Host Left You a Review',
      'body', host_name || ' has reviewed your stay at ' || prop_name
           || '. Tap to see what they said and leave your own review.',
      'screenRoute', '/review?booking_id=' || NEW.booking_id,
      'data', jsonb_build_object('review_id', NEW.id, 'booking_id', NEW.booking_id)
    ));
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Listing submitted trigger ──

CREATE OR REPLACE FUNCTION public.on_property_submitted()
RETURNS TRIGGER AS $$
DECLARE
  host_name TEXT;
BEGIN
  SELECT COALESCE(p.full_name, 'A host') INTO host_name
  FROM profiles p WHERE p.user_id = NEW.host_id;

  -- Notify all admins
  PERFORM public.notify_all_admins(jsonb_build_object(
    'userId', '',
    'type', 'listing_submitted',
    'title', 'New Listing Awaiting Review',
    'body', host_name || ' has submitted ' || NEW.title || ' for approval.',
    'screenRoute', '/admin/listings',
    'data', jsonb_build_object('property_id', NEW.id)
  ));

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Listing rejected trigger (host notification) ──

CREATE OR REPLACE FUNCTION public.on_property_rejected()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.is_published = NEW.is_published THEN RETURN NEW; END IF;

  -- Only fire when is_published goes from TRUE to FALSE by admin
  -- (indicates rejection/removal)
  IF NEW.is_published = FALSE AND OLD.is_published = TRUE THEN
    PERFORM public.notify_edge_function(jsonb_build_object(
      'userId', NEW.host_id,
      'type', 'listing_rejected',
      'title', 'Listing Needs Attention',
      'body', 'Your listing ' || NEW.title || ' was not approved. Tap to make changes.',
      'screenRoute', '/host/listings',
      'data', jsonb_build_object('property_id', NEW.id)
    ));
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Support ticket trigger (admin notification) ──

CREATE OR REPLACE FUNCTION public.on_support_ticket_insert()
RETURNS TRIGGER AS $$
DECLARE
  user_name TEXT;
BEGIN
  SELECT COALESCE(p.full_name, 'A user') INTO user_name
  FROM profiles p WHERE p.user_id = NEW.user_id;

  PERFORM public.notify_all_admins(jsonb_build_object(
    'userId', '',
    'type', 'new_support_ticket',
    'title', 'New Support Ticket',
    'body', user_name || ' submitted a support ticket: '
         || COALESCE(NEW.subject, 'No subject') || '.',
    'screenRoute', '/admin/support',
    'data', jsonb_build_object('ticket_id', NEW.id)
  ));

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Host registration trigger (admin notification) ──

CREATE OR REPLACE FUNCTION public.on_host_role_assigned()
RETURNS TRIGGER AS $$
DECLARE
  host_name TEXT;
BEGIN
  IF NEW.role = 'host' THEN
    SELECT COALESCE(p.full_name, 'A new host') INTO host_name
    FROM profiles p WHERE p.user_id = NEW.user_id;

    PERFORM public.notify_all_admins(jsonb_build_object(
      'userId', '',
      'type', 'host_registered',
      'title', 'New Host Registered',
      'body', host_name || ' has completed their host profile and is ready to list properties.',
      'screenRoute', '/admin/users',
      'data', jsonb_build_object('user_id', NEW.user_id)
    ));
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Apply new triggers ──

-- Post-booking charges
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'booking_charges') THEN
    DROP TRIGGER IF EXISTS trg_charge_insert_notify ON public.booking_charges;
    CREATE TRIGGER trg_charge_insert_notify
      AFTER INSERT ON public.booking_charges
      FOR EACH ROW
      EXECUTE FUNCTION public.on_charge_insert();

    DROP TRIGGER IF EXISTS trg_charge_status_notify ON public.booking_charges;
    CREATE TRIGGER trg_charge_status_notify
      AFTER UPDATE OF status ON public.booking_charges
      FOR EACH ROW
      EXECUTE FUNCTION public.on_charge_status_change();
  END IF;
END $$;

-- Disputes
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'disputes') THEN
    DROP TRIGGER IF EXISTS trg_dispute_insert_notify ON public.disputes;
    CREATE TRIGGER trg_dispute_insert_notify
      AFTER INSERT ON public.disputes
      FOR EACH ROW
      EXECUTE FUNCTION public.on_dispute_insert();

    DROP TRIGGER IF EXISTS trg_dispute_status_notify ON public.disputes;
    CREATE TRIGGER trg_dispute_status_notify
      AFTER UPDATE OF status ON public.disputes
      FOR EACH ROW
      EXECUTE FUNCTION public.on_dispute_status_change();
  END IF;
END $$;

-- Guest check-in (new status value)
DROP TRIGGER IF EXISTS trg_booking_guest_checkin ON public.bookings;
CREATE TRIGGER trg_booking_guest_checkin
  AFTER UPDATE OF status ON public.bookings
  FOR EACH ROW
  WHEN (NEW.status = 'checked_in')
  EXECUTE FUNCTION public.on_booking_guest_checkin();

-- Guest review (host reviews guest)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'reviews') THEN
    DROP TRIGGER IF EXISTS trg_guest_review_insert_notify ON public.reviews;
    CREATE TRIGGER trg_guest_review_insert_notify
      AFTER INSERT ON public.reviews
      FOR EACH ROW
      EXECUTE FUNCTION public.on_guest_review_insert();
  END IF;
END $$;

-- Listing submitted (when submitted_for_review becomes true)
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'properties'
    AND column_name = 'submitted_for_review'
  ) THEN
    DROP TRIGGER IF EXISTS trg_property_submitted_notify ON public.properties;
    CREATE TRIGGER trg_property_submitted_notify
      AFTER UPDATE OF submitted_for_review ON public.properties
      FOR EACH ROW
      WHEN (NEW.submitted_for_review = TRUE AND (OLD.submitted_for_review IS NULL OR OLD.submitted_for_review = FALSE))
      EXECUTE FUNCTION public.on_property_submitted();
  END IF;
END $$;

-- Listing rejected
DO $$
BEGIN
  DROP TRIGGER IF EXISTS trg_property_rejected_notify ON public.properties;
  CREATE TRIGGER trg_property_rejected_notify
    AFTER UPDATE OF is_published ON public.properties
    FOR EACH ROW
    WHEN (NEW.is_published = FALSE AND OLD.is_published = TRUE)
    EXECUTE FUNCTION public.on_property_rejected();
END $$;

-- Support tickets
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'support_tickets') THEN
    DROP TRIGGER IF EXISTS trg_support_ticket_insert_notify ON public.support_tickets;
    CREATE TRIGGER trg_support_ticket_insert_notify
      AFTER INSERT ON public.support_tickets
      FOR EACH ROW
      EXECUTE FUNCTION public.on_support_ticket_insert();
  END IF;
END $$;

-- Host role assignment
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_roles') THEN
    DROP TRIGGER IF EXISTS trg_host_role_assigned_notify ON public.user_roles;
    CREATE TRIGGER trg_host_role_assigned_notify
      AFTER INSERT ON public.user_roles
      FOR EACH ROW
      WHEN (NEW.role = 'host')
      EXECUTE FUNCTION public.on_host_role_assigned();
  END IF;
END $$;

-- Update booking status trigger to also handle 'checked_in' for guest notification
CREATE OR REPLACE FUNCTION public.on_booking_status_change_v2()
RETURNS TRIGGER AS $$
DECLARE
  prop_name TEXT;
  guest_name TEXT;
  location TEXT;
  booking_ref TEXT;
BEGIN
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;

  SELECT COALESCE(NEW.title, p.title, 'Property'),
         COALESCE(p.location, ''),
         COALESCE(p.city, p.location, '')
  INTO prop_name, location, booking_ref
  FROM (SELECT NULL::text) dummy
  LEFT JOIN properties p ON p.id = NEW.property_id;

  guest_name := COALESCE(NEW.guest_name, 'A guest');
  booking_ref := NEW.id;

  CASE NEW.status
    WHEN 'confirmed' THEN
      -- Guest: booking confirmed (with enhanced message)
      PERFORM public.notify_edge_function(jsonb_build_object(
        'userId', NEW.guest_id,
        'type', 'booking_confirmed',
        'title', 'Booking Confirmed 🎉',
        'body', 'Your booking for ' || prop_name || ' in ' || location
             || ' from ' || NEW.check_in || ' to ' || NEW.check_out
             || ' has been confirmed. Get ready for your stay.',
        'screenRoute', '/my-bookings/' || NEW.id,
        'data', jsonb_build_object('booking_id', NEW.id)
      ));

      -- Host: instant booking notice (if applicable)
      IF OLD.status = 'pending' AND (NEW.metadata->>'instant_book')::boolean = TRUE THEN
        PERFORM public.notify_edge_function(jsonb_build_object(
          'userId', NEW.host_id,
          'type', 'instant_booking_confirmed',
          'title', 'Instant Booking Received 🎉',
          'body', guest_name || ' just instantly booked ' || prop_name
               || ' from ' || NEW.check_in || ' to ' || NEW.check_out
               || '. Your calendar has been updated.',
          'screenRoute', '/host/bookings/' || NEW.id,
          'data', jsonb_build_object('booking_id', NEW.id)
        ));
      END IF;

      -- Host: payment received (if payment is already paid)
      IF NEW.payment_status = 'paid' THEN
        PERFORM public.notify_edge_function(jsonb_build_object(
          'userId', NEW.host_id,
          'type', 'payment_received',
          'title', 'Payment Received 💰',
          'body', 'You received a payment for booking ' || booking_ref || ' at ' || prop_name || '.',
          'screenRoute', '/host/earnings',
          'data', jsonb_build_object('booking_id', NEW.id)
        ));
      END IF;

    WHEN 'cancelled' THEN
      IF OLD.status IN ('pending', 'confirmed') THEN
        PERFORM public.notify_edge_function(jsonb_build_object(
          'userId', NEW.host_id,
          'type', 'booking_cancelled_by_guest',
          'title', 'Booking Cancelled',
          'body', guest_name || ' has cancelled their booking for ' || prop_name
               || ' from ' || NEW.check_in || ' to ' || NEW.check_out
               || '. Your calendar is now available for those dates.',
          'screenRoute', '/host/calendar',
          'data', jsonb_build_object('booking_id', NEW.id)
        ));
      END IF;

    WHEN 'declined' THEN
      PERFORM public.notify_edge_function(jsonb_build_object(
        'userId', NEW.guest_id,
        'type', 'booking_declined',
        'title', 'Booking Not Approved',
        'body', 'Unfortunately your booking request for ' || prop_name
             || ' was not approved by the host. Consider exploring similar stays nearby.',
        'screenRoute', '/explore',
        'data', jsonb_build_object('booking_id', NEW.id)
      ));

    WHEN 'completed' THEN
      PERFORM public.notify_edge_function(jsonb_build_object(
        'userId', NEW.host_id,
        'type', 'guest_checked_out',
        'title', 'Guest Checked Out',
        'body', guest_name || ' has checked out of ' || prop_name
             || '. The property is now available. Don\'t forget to leave a review.',
        'screenRoute', '/host/reviews/' || NEW.id,
        'data', jsonb_build_object('booking_id', NEW.id)
      ));

    WHEN 'checked_in' THEN
      PERFORM public.notify_edge_function(jsonb_build_object(
        'userId', NEW.host_id,
        'type', 'guest_checked_in',
        'title', 'Guest Checked In',
        'body', guest_name || ' has checked into ' || prop_name
             || '. Their stay runs until ' || NEW.check_out || '.',
        'screenRoute', '/host/bookings/' || NEW.id,
        'data', jsonb_build_object('booking_id', NEW.id)
      ));
  END CASE;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update booking payment trigger with enhanced messages
CREATE OR REPLACE FUNCTION public.on_booking_payment_change_v2()
RETURNS TRIGGER AS $$
DECLARE
  prop_name TEXT;
  amount_val NUMERIC;
  currency_val TEXT;
BEGIN
  IF OLD.payment_status = NEW.payment_status THEN RETURN NEW; END IF;

  SELECT COALESCE(NEW.title, p.title, 'Property') INTO prop_name
  FROM (SELECT NULL::text) dummy
  LEFT JOIN properties p ON p.id = NEW.property_id;

  amount_val := COALESCE(
    (NEW.metadata->>'totalAmountRWF')::numeric,
    NEW.total_amount * COALESCE((NEW.metadata->>'exchangeRateUsed')::numeric, 1)
  );
  currency_val := COALESCE(NEW.currency, 'RWF');

  CASE NEW.payment_status
    WHEN 'paid' THEN
      -- Guest: payment success
      PERFORM public.notify_edge_function(jsonb_build_object(
        'userId', NEW.guest_id,
        'type', 'payment_success',
        'title', 'Payment Successful ✅',
        'body', 'Your payment of ' || currency_val || ' ' || amount_val::text
             || ' for booking ' || NEW.id || ' was processed successfully.',
        'screenRoute', '/my-bookings/' || NEW.id,
        'data', jsonb_build_object('booking_id', NEW.id)
      ));

      -- Host: payment received
      PERFORM public.notify_edge_function(jsonb_build_object(
        'userId', NEW.host_id,
        'type', 'payment_received',
        'title', 'Payment Received 💰',
        'body', 'You received a payment of ' || currency_val || ' ' || amount_val::text
             || ' for booking ' || NEW.id || ' at ' || prop_name || '.',
        'screenRoute', '/host/earnings',
        'data', jsonb_build_object('booking_id', NEW.id)
      ));

    WHEN 'failed' THEN
      PERFORM public.notify_edge_function(jsonb_build_object(
        'userId', NEW.guest_id,
        'type', 'payment_failed',
        'title', 'Payment Failed',
        'body', 'We could not process your payment of ' || currency_val || ' ' || amount_val::text
             || ' for ' || prop_name || '. Please update your payment method and try again.',
        'screenRoute', '/checkout?booking_id=' || NEW.id,
        'data', jsonb_build_object('booking_id', NEW.id)
      ));

    WHEN 'refunded' THEN
      PERFORM public.notify_edge_function(jsonb_build_object(
        'userId', NEW.guest_id,
        'type', 'refund_issued',
        'title', 'Refund Issued',
        'body', 'A refund of ' || currency_val || ' ' || amount_val::text
             || ' has been issued for booking ' || NEW.id || '.',
        'screenRoute', '/my-bookings/' || NEW.id,
        'data', jsonb_build_object('booking_id', NEW.id)
      ));
  END CASE;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Replace old trigger functions with the enhanced v2 versions
-- First drop existing triggers
DROP TRIGGER IF EXISTS trg_booking_status_notify ON public.bookings;
DROP TRIGGER IF EXISTS trg_booking_payment_notify ON public.bookings;

-- Update trigger functions to v2
-- Replace on_booking_status_change with on_booking_status_change_v2
CREATE OR REPLACE FUNCTION public.on_booking_status_change()
RETURNS TRIGGER AS $$
DECLARE
  prop_name TEXT;
  guest_name TEXT;
  location TEXT;
  booking_ref TEXT;
BEGIN
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;

  SELECT COALESCE(NEW.title, p.title, 'Property'),
         COALESCE(p.location, ''),
         COALESCE(p.city, p.location, '')
  INTO prop_name, location, booking_ref
  FROM (SELECT NULL::text) dummy
  LEFT JOIN properties p ON p.id = NEW.property_id;

  guest_name := COALESCE(NEW.guest_name, 'A guest');
  booking_ref := NEW.id;

  CASE NEW.status
    WHEN 'confirmed' THEN
      PERFORM public.notify_edge_function(jsonb_build_object(
        'userId', NEW.guest_id,
        'type', 'booking_confirmed',
        'title', 'Booking Confirmed 🎉',
        'body', 'Your booking for ' || prop_name || ' in ' || location
             || ' from ' || NEW.check_in || ' to ' || NEW.check_out
             || ' has been confirmed. Get ready for your stay.',
        'screenRoute', '/my-bookings/' || NEW.id,
        'data', jsonb_build_object('booking_id', NEW.id)
      ));

      IF OLD.status = 'pending' AND (NEW.metadata->>'instant_book')::boolean = TRUE THEN
        PERFORM public.notify_edge_function(jsonb_build_object(
          'userId', NEW.host_id,
          'type', 'instant_booking_confirmed',
          'title', 'Instant Booking Received 🎉',
          'body', guest_name || ' just instantly booked ' || prop_name
               || ' from ' || NEW.check_in || ' to ' || NEW.check_out
               || '. Your calendar has been updated.',
          'screenRoute', '/host/bookings/' || NEW.id,
          'data', jsonb_build_object('booking_id', NEW.id)
        ));

        IF NEW.payment_status = 'paid' THEN
          PERFORM public.notify_edge_function(jsonb_build_object(
            'userId', NEW.host_id,
            'type', 'payment_received',
            'title', 'Payment Received 💰',
            'body', 'You received a payment for booking ' || booking_ref || ' at ' || prop_name || '.',
            'screenRoute', '/host/earnings',
            'data', jsonb_build_object('booking_id', NEW.id)
          ));
        END IF;
      END IF;

    WHEN 'cancelled' THEN
      IF OLD.status IN ('pending', 'confirmed') THEN
        PERFORM public.notify_edge_function(jsonb_build_object(
          'userId', NEW.host_id,
          'type', 'booking_cancelled_by_guest',
          'title', 'Booking Cancelled',
          'body', guest_name || ' has cancelled their booking for ' || prop_name
               || ' from ' || NEW.check_in || ' to ' || NEW.check_out
               || '. Your calendar is now available for those dates.',
          'screenRoute', '/host/calendar',
          'data', jsonb_build_object('booking_id', NEW.id)
        ));
      END IF;

    WHEN 'declined' THEN
      PERFORM public.notify_edge_function(jsonb_build_object(
        'userId', NEW.guest_id,
        'type', 'booking_declined',
        'title', 'Booking Not Approved',
        'body', 'Unfortunately your booking request for ' || prop_name
             || ' was not approved by the host. Consider exploring similar stays nearby.',
        'screenRoute', '/explore',
        'data', jsonb_build_object('booking_id', NEW.id)
      ));

    WHEN 'completed' THEN
      PERFORM public.notify_edge_function(jsonb_build_object(
        'userId', NEW.host_id,
        'type', 'guest_checked_out',
        'title', 'Guest Checked Out',
        'body', guest_name || ' has checked out of ' || prop_name
             || '. The property is now available. Don\'t forget to leave a review.',
        'screenRoute', '/host/reviews/' || NEW.id,
        'data', jsonb_build_object('booking_id', NEW.id)
      ));

    WHEN 'checked_in' THEN
      PERFORM public.notify_edge_function(jsonb_build_object(
        'userId', NEW.host_id,
        'type', 'guest_checked_in',
        'title', 'Guest Checked In',
        'body', guest_name || ' has checked into ' || prop_name
             || '. Their stay runs until ' || NEW.check_out || '.',
        'screenRoute', '/host/bookings/' || NEW.id,
        'data', jsonb_build_object('booking_id', NEW.id)
      ));
  END CASE;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Replace payment trigger with enhanced version
CREATE OR REPLACE FUNCTION public.on_booking_payment_change()
RETURNS TRIGGER AS $$
DECLARE
  prop_name TEXT;
  amount_val NUMERIC;
  currency_val TEXT;
BEGIN
  IF OLD.payment_status = NEW.payment_status THEN RETURN NEW; END IF;

  SELECT COALESCE(NEW.title, p.title, 'Property') INTO prop_name
  FROM (SELECT NULL::text) dummy
  LEFT JOIN properties p ON p.id = NEW.property_id;

  amount_val := COALESCE(
    (NEW.metadata->>'totalAmountRWF')::numeric,
    NEW.total_amount * COALESCE((NEW.metadata->>'exchangeRateUsed')::numeric, 1)
  );
  currency_val := COALESCE(NEW.currency, 'RWF');

  CASE NEW.payment_status
    WHEN 'paid' THEN
      PERFORM public.notify_edge_function(jsonb_build_object(
        'userId', NEW.guest_id,
        'type', 'payment_success',
        'title', 'Payment Successful ✅',
        'body', 'Your payment of ' || currency_val || ' ' || amount_val::text
             || ' for booking ' || NEW.id || ' was processed successfully.',
        'screenRoute', '/my-bookings/' || NEW.id,
        'data', jsonb_build_object('booking_id', NEW.id)
      ));

      PERFORM public.notify_edge_function(jsonb_build_object(
        'userId', NEW.host_id,
        'type', 'payment_received',
        'title', 'Payment Received 💰',
        'body', 'You received a payment of ' || currency_val || ' ' || amount_val::text
             || ' for booking ' || NEW.id || ' at ' || prop_name || '.',
        'screenRoute', '/host/earnings',
        'data', jsonb_build_object('booking_id', NEW.id)
      ));

    WHEN 'failed' THEN
      PERFORM public.notify_edge_function(jsonb_build_object(
        'userId', NEW.guest_id,
        'type', 'payment_failed',
        'title', 'Payment Failed',
        'body', 'We could not process your payment of ' || currency_val || ' ' || amount_val::text
             || ' for ' || prop_name || '. Please update your payment method and try again.',
        'screenRoute', '/checkout?booking_id=' || NEW.id,
        'data', jsonb_build_object('booking_id', NEW.id)
      ));

    WHEN 'refunded' THEN
      PERFORM public.notify_edge_function(jsonb_build_object(
        'userId', NEW.guest_id,
        'type', 'refund_issued',
        'title', 'Refund Issued',
        'body', 'A refund of ' || currency_val || ' ' || amount_val::text
             || ' has been issued for booking ' || NEW.id || '.',
        'screenRoute', '/my-bookings/' || NEW.id,
        'data', jsonb_build_object('booking_id', NEW.id)
      ));
  END CASE;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-create triggers pointing to updated functions
CREATE TRIGGER trg_booking_status_notify
  AFTER UPDATE OF status ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.on_booking_status_change();

CREATE TRIGGER trg_booking_payment_notify
  AFTER UPDATE OF payment_status ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.on_booking_payment_change();

-- Update message trigger with enhanced message for host/guest
CREATE OR REPLACE FUNCTION public.on_message_insert()
RETURNS TRIGGER AS $$
DECLARE
  sender_name TEXT;
  receiver_id TEXT;
  prop_name TEXT;
BEGIN
  SELECT COALESCE(p.full_name, p.email, 'Someone') INTO sender_name
  FROM profiles p WHERE p.user_id = NEW.sender_id;

  SELECT COALESCE(b.title, 'Property') INTO prop_name
  FROM bookings b WHERE b.id = NEW.booking_id;

  -- Determine receiver
  IF NEW.sender_id = NEW.booking_host_id THEN
    receiver_id := NEW.booking_guest_id;
    PERFORM public.notify_edge_function(jsonb_build_object(
      'userId', receiver_id,
      'type', 'new_message',
      'title', 'New Message from Your Host',
      'body', sender_name || ' sent you a message about your upcoming stay at ' || prop_name || '.',
      'screenRoute', '/messages/' || COALESCE(NEW.booking_id::text, NEW.id::text),
      'data', jsonb_build_object('message_id', NEW.id, 'booking_id', COALESCE(NEW.booking_id::text, ''))
    ));
  ELSE
    receiver_id := NEW.booking_host_id;
    PERFORM public.notify_edge_function(jsonb_build_object(
      'userId', receiver_id,
      'type', 'new_message',
      'title', 'New Message from Guest',
      'body', sender_name || ' sent you a message about their upcoming stay at ' || prop_name || '.',
      'screenRoute', '/host/messages/' || COALESCE(NEW.booking_id::text, NEW.id::text),
      'data', jsonb_build_object('message_id', NEW.id, 'booking_id', COALESCE(NEW.booking_id::text, ''))
    ));
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
