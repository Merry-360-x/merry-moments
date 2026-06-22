-- ─────────────────────────────────────────────────────────────
-- Database triggers for automatic notifications
-- Uses pg_net to async-call the send-notification Edge Function
-- ─────────────────────────────────────────────────────────────

-- Ensure pg_net extension exists
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Helper: call the send-notification Edge Function with a payload
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
  PERFORM extensions.net_http_post(
    url := edge_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(anon_key, current_setting('app.settings.supabase_anon_key', TRUE)),
      'apikey', COALESCE(anon_key, current_setting('app.settings.supabase_anon_key', TRUE))
    ),
    body := payload::text
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 1. Booking triggers ──

CREATE OR REPLACE FUNCTION public.on_booking_insert()
RETURNS TRIGGER AS $$
DECLARE
  prop_name TEXT;
  guest_name TEXT;
BEGIN
  -- Resolve property name
  SELECT COALESCE(NEW.title, p.title, 'Property') INTO prop_name
  FROM (SELECT NULL::text) dummy
  LEFT JOIN properties p ON p.id = NEW.property_id;

  guest_name := COALESCE(NEW.guest_name, 'A guest');

  -- New booking request → notify host
  PERFORM public.notify_edge_function(jsonb_build_object(
    'userId', NEW.host_id,
    'type', 'new_booking_request',
    'title', 'New Booking Request',
    'body', guest_name || ' wants to book ' || prop_name
             || ' (' || NEW.check_in || ' → ' || NEW.check_out || ').',
    'screenRoute', '/host/bookings/' || NEW.id,
    'data', jsonb_build_object('booking_id', NEW.id)
  ));

  -- Booking request sent → notify guest
  PERFORM public.notify_edge_function(jsonb_build_object(
    'userId', NEW.guest_id,
    'type', 'booking_request_sent',
    'title', 'Booking Request Sent',
    'body', 'Your booking request for ' || prop_name || ' has been sent.',
    'screenRoute', '/my-bookings/' || NEW.id,
    'data', jsonb_build_object('booking_id', NEW.id)
  ));

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.on_booking_status_change()
RETURNS TRIGGER AS $$
DECLARE
  prop_name TEXT;
  guest_name TEXT;
BEGIN
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;

  SELECT COALESCE(NEW.title, p.title, 'Property') INTO prop_name
  FROM (SELECT NULL::text) dummy
  LEFT JOIN properties p ON p.id = NEW.property_id;

  guest_name := COALESCE(NEW.guest_name, 'A guest');

  CASE NEW.status
    WHEN 'confirmed' THEN
      -- Notify guest
      PERFORM public.notify_edge_function(jsonb_build_object(
        'userId', NEW.guest_id,
        'type', 'booking_confirmed',
        'title', 'Booking Confirmed!',
        'body', prop_name || ' is confirmed! Check-in: ' || NEW.check_in || '.',
        'screenRoute', '/my-bookings/' || NEW.id,
        'data', jsonb_build_object('booking_id', NEW.id)
      ));
      -- If instant book, notify host too
      IF OLD.status = 'pending' AND (NEW.metadata->>'instant_book')::boolean = TRUE THEN
        PERFORM public.notify_edge_function(jsonb_build_object(
          'userId', NEW.host_id,
          'type', 'instant_booking_confirmed',
          'title', 'Instant Booking!',
          'body', guest_name || ' booked ' || prop_name
                   || ' (' || NEW.check_in || ' → ' || NEW.check_out || ').',
          'screenRoute', '/host/bookings/' || NEW.id,
          'data', jsonb_build_object('booking_id', NEW.id)
        ));
      END IF;

    WHEN 'cancelled' THEN
      -- Notify the other party
      IF OLD.status = 'pending' OR OLD.status = 'confirmed' THEN
        -- Guest cancelled → notify host
        PERFORM public.notify_edge_function(jsonb_build_object(
          'userId', NEW.host_id,
          'type', 'booking_cancelled_by_guest',
          'title', 'Booking Cancelled',
          'body', guest_name || ' cancelled their booking at ' || prop_name || '.',
          'screenRoute', '/host/bookings',
          'data', jsonb_build_object('booking_id', NEW.id)
        ));
      END IF;

    WHEN 'declined' THEN
      PERFORM public.notify_edge_function(jsonb_build_object(
        'userId', NEW.guest_id,
        'type', 'booking_declined',
        'title', 'Booking Declined',
        'body', 'Unfortunately, ' || prop_name || ' declined your booking request.',
        'screenRoute', '/my-bookings',
        'data', jsonb_build_object('booking_id', NEW.id)
      ));

    WHEN 'completed' THEN
      -- Guest checked out → notify host
      PERFORM public.notify_edge_function(jsonb_build_object(
        'userId', NEW.host_id,
        'type', 'guest_checked_out',
        'title', 'Guest Checked Out',
        'body', guest_name || ' checked out of ' || prop_name || '.',
        'screenRoute', '/host/bookings/' || NEW.id,
        'data', jsonb_build_object('booking_id', NEW.id)
      ));
  END CASE;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.on_booking_payment_change()
RETURNS TRIGGER AS $$
DECLARE
  prop_name TEXT;
  amount_rwf NUMERIC;
BEGIN
  IF OLD.payment_status = NEW.payment_status THEN RETURN NEW; END IF;

  SELECT COALESCE(NEW.title, p.title, 'Property') INTO prop_name
  FROM (SELECT NULL::text) dummy
  LEFT JOIN properties p ON p.id = NEW.property_id;

  -- Convert to RWF if metadata has exchange rate
  amount_rwf := COALESCE(
    (NEW.metadata->>'totalAmountRWF')::numeric,
    NEW.total_amount * COALESCE((NEW.metadata->>'exchangeRateUsed')::numeric, 1)
  );

  CASE NEW.payment_status
    WHEN 'paid' THEN
      PERFORM public.notify_edge_function(jsonb_build_object(
        'userId', NEW.guest_id,
        'type', 'payment_success',
        'title', 'Payment Successful',
        'body', 'Payment of RWF ' || amount_rwf::text || ' received. Your booking is confirmed!',
        'screenRoute', '/my-bookings/' || NEW.id,
        'data', jsonb_build_object('booking_id', NEW.id)
      ));
    WHEN 'failed' THEN
      PERFORM public.notify_edge_function(jsonb_build_object(
        'userId', NEW.guest_id,
        'type', 'payment_failed',
        'title', 'Payment Failed',
        'body', 'Payment for ' || prop_name || ' failed. Please try again.',
        'screenRoute', '/checkout?booking_id=' || NEW.id,
        'data', jsonb_build_object('booking_id', NEW.id)
      ));
    WHEN 'refunded' THEN
      PERFORM public.notify_edge_function(jsonb_build_object(
        'userId', NEW.guest_id,
        'type', 'refund_issued',
        'title', 'Refund Issued',
        'body', 'A refund of RWF ' || amount_rwf::text || ' has been issued.',
        'screenRoute', '/my-bookings/' || NEW.id,
        'data', jsonb_build_object('booking_id', NEW.id)
      ));
  END CASE;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply booking triggers
DROP TRIGGER IF EXISTS trg_booking_insert_notify ON public.bookings;
CREATE TRIGGER trg_booking_insert_notify
  AFTER INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.on_booking_insert();

DROP TRIGGER IF EXISTS trg_booking_status_notify ON public.bookings;
CREATE TRIGGER trg_booking_status_notify
  AFTER UPDATE OF status ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.on_booking_status_change();

DROP TRIGGER IF EXISTS trg_booking_payment_notify ON public.bookings;
CREATE TRIGGER trg_booking_payment_notify
  AFTER UPDATE OF payment_status ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.on_booking_payment_change();

-- ── 2. Review triggers ──

CREATE OR REPLACE FUNCTION public.on_review_insert()
RETURNS TRIGGER AS $$
DECLARE
  prop_name TEXT;
  guest_name TEXT;
  booking_rec RECORD;
BEGIN
  SELECT b.host_id, b.title, b.guest_name
  INTO booking_rec
  FROM bookings b WHERE b.id = NEW.booking_id;

  prop_name := COALESCE(booking_rec.title, 'Property');
  guest_name := COALESCE(booking_rec.guest_name, 'A guest');

  -- Notify host
  PERFORM public.notify_edge_function(jsonb_build_object(
    'userId', booking_rec.host_id,
    'type', 'new_review',
    'title', 'New Review',
    'body', guest_name || ' left a ' || NEW.rating::text || '-star review for ' || prop_name || '.',
    'screenRoute', '/host/listings',
    'data', jsonb_build_object('review_id', NEW.id, 'booking_id', NEW.booking_id, 'rating', NEW.rating::text)
  ));

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_review_insert_notify ON public.reviews;
CREATE TRIGGER trg_review_insert_notify
  AFTER INSERT ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.on_review_insert();

-- ── 3. Message triggers ──

CREATE OR REPLACE FUNCTION public.on_message_insert()
RETURNS TRIGGER AS $$
DECLARE
  sender_name TEXT;
  receiver_id TEXT;
  notif_type TEXT;
  screen_route TEXT;
BEGIN
  SELECT COALESCE(p.full_name, p.email, 'Someone') INTO sender_name
  FROM profiles p WHERE p.user_id = NEW.sender_id;

  -- Determine receiver
  IF NEW.sender_id = NEW.booking_host_id THEN
    receiver_id := NEW.booking_guest_id;
    notif_type := 'new_message';
    screen_route := '/messages/' || COALESCE(NEW.booking_id::text, NEW.id::text);
  ELSE
    receiver_id := NEW.booking_host_id;
    notif_type := 'new_message';
    screen_route := '/host/messages/' || COALESCE(NEW.booking_id::text, NEW.id::text);
  END IF;

  PERFORM public.notify_edge_function(jsonb_build_object(
    'userId', receiver_id,
    'type', notif_type,
    'title', 'Message from ' || sender_name,
    'body', LEFT(COALESCE(NEW.content, ''), 120),
    'screenRoute', screen_route,
    'data', jsonb_build_object('message_id', NEW.id, 'booking_id', COALESCE(NEW.booking_id::text, ''))
  ));

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'messages') THEN
    DROP TRIGGER IF EXISTS trg_message_insert_notify ON public.messages;
    CREATE TRIGGER trg_message_insert_notify
      AFTER INSERT ON public.messages
      FOR EACH ROW
      EXECUTE FUNCTION public.on_message_insert();
  END IF;
END $$;

-- ── 4. Property / listing status triggers ──

CREATE OR REPLACE FUNCTION public.on_property_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.is_published = NEW.is_published THEN RETURN NEW; END IF;

  IF NEW.is_published = TRUE THEN
    PERFORM public.notify_edge_function(jsonb_build_object(
      'userId', NEW.host_id,
      'type', 'listing_approved',
      'title', 'Listing Approved!',
      'body', NEW.title || ' is now live and visible to guests.',
      'screenRoute', '/host/listings',
      'data', jsonb_build_object('property_id', NEW.id)
    ));
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_property_status_notify ON public.properties;
CREATE TRIGGER trg_property_status_notify
  AFTER UPDATE OF is_published ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.on_property_status_change();

-- ── 5. Payout triggers ──

CREATE OR REPLACE FUNCTION public.on_payout_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;

  CASE NEW.status
    WHEN 'sent' THEN
      PERFORM public.notify_edge_function(jsonb_build_object(
        'userId', NEW.host_id,
        'type', 'payout_sent',
        'title', 'Payout Sent',
        'body', 'RWF ' || COALESCE(NEW.amount::text, '0') || ' has been sent to your account.',
        'screenRoute', '/host/payouts',
        'data', jsonb_build_object('payout_id', NEW.id)
      ));
    WHEN 'failed' THEN
      PERFORM public.notify_edge_function(jsonb_build_object(
        'userId', NEW.host_id,
        'type', 'payout_failed',
        'title', 'Payout Failed',
        'body', 'Payout of RWF ' || COALESCE(NEW.amount::text, '0')
               || ' failed. Update your payout details.',
        'screenRoute', '/host/payouts',
        'data', jsonb_build_object('payout_id', NEW.id)
      ));
  END CASE;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'host_payouts') THEN
    DROP TRIGGER IF EXISTS trg_payout_status_notify ON public.host_payouts;
    CREATE TRIGGER trg_payout_status_notify
      AFTER UPDATE OF status ON public.host_payouts
      FOR EACH ROW
      EXECUTE FUNCTION public.on_payout_change();
  END IF;
END $$;
