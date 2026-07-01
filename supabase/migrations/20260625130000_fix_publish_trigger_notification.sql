-- Fix publish/unpublish blocking due to broken notify_edge_function.
--
-- The live notify_edge_function calls extensions.net_http_post which does
-- NOT exist (the real function is net.http_post from pg_net).  Every time
-- is_published is set to TRUE the trigger fires, the function errors out,
-- and the entire UPDATE is rolled back.
--
-- Unpublish (FALSE) works because the trigger skips the notification call.
--
-- Fix: correct the function reference AND add exception handling so
-- notification failures never block the database operation.

-- Fix notify_edge_function: use net.http_post (not extensions.net_http_post)
-- and wrap in exception handler so failures never block the caller.
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
  BEGIN
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
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'notify_edge_function HTTP post failed: %', SQLERRM;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix on_property_status_change: wrap the notification call in exception
-- handler so a broken notification never blocks publishing.
CREATE OR REPLACE FUNCTION public.on_property_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.is_published = NEW.is_published THEN RETURN NEW; END IF;

  IF NEW.is_published = TRUE THEN
    BEGIN
      PERFORM public.notify_edge_function(jsonb_build_object(
        'userId', NEW.host_id,
        'type', 'listing_approved',
        'title', 'Listing Approved!',
        'body', NEW.title || ' is now live and visible to guests.',
        'screenRoute', '/host/listings',
        'data', jsonb_build_object('property_id', NEW.id)
      ));
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'on_property_status_change notify failed for property %: %', NEW.id, SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix other notification trigger functions so they also survive failures.
-- on_booking_insert
CREATE OR REPLACE FUNCTION public.on_booking_insert()
RETURNS TRIGGER AS $$
DECLARE
  prop_name TEXT;
  guest_name TEXT;
BEGIN
  SELECT COALESCE(NEW.title, p.title, 'Property') INTO prop_name
  FROM (SELECT NULL::text) dummy
  LEFT JOIN properties p ON p.id = NEW.property_id;

  guest_name := COALESCE(NEW.guest_name, 'A guest');

  BEGIN
    PERFORM public.notify_edge_function(jsonb_build_object(
      'userId', NEW.host_id,
      'type', 'new_booking_request',
      'title', 'New Booking Request',
      'body', guest_name || ' wants to book ' || prop_name
               || ' (' || NEW.check_in || ' → ' || NEW.check_out || ').',
      'screenRoute', '/host/bookings/' || NEW.id,
      'data', jsonb_build_object('booking_id', NEW.id)
    ));
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'on_booking_insert host notify failed: %', SQLERRM;
  END;

  BEGIN
    PERFORM public.notify_edge_function(jsonb_build_object(
      'userId', NEW.guest_id,
      'type', 'booking_request_sent',
      'title', 'Booking Request Sent',
      'body', 'Your booking request for ' || prop_name || ' has been sent.',
      'screenRoute', '/my-bookings/' || NEW.id,
      'data', jsonb_build_object('booking_id', NEW.id)
    ));
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'on_booking_insert guest notify failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- on_booking_status_change
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
      BEGIN
        PERFORM public.notify_edge_function(jsonb_build_object(
          'userId', NEW.guest_id,
          'type', 'booking_confirmed',
          'title', 'Booking Confirmed!',
          'body', prop_name || ' is confirmed! Check-in: ' || NEW.check_in || '.',
          'screenRoute', '/my-bookings/' || NEW.id,
          'data', jsonb_build_object('booking_id', NEW.id)
        ));
      EXCEPTION
        WHEN OTHERS THEN
          RAISE WARNING 'on_booking_status_change confirmed guest notify failed: %', SQLERRM;
      END;
      IF OLD.status = 'pending' AND (NEW.metadata->>'instant_book')::boolean = TRUE THEN
        BEGIN
          PERFORM public.notify_edge_function(jsonb_build_object(
            'userId', NEW.host_id,
            'type', 'instant_booking_confirmed',
            'title', 'Instant Booking!',
            'body', guest_name || ' booked ' || prop_name
                     || ' (' || NEW.check_in || ' → ' || NEW.check_out || ').',
            'screenRoute', '/host/bookings/' || NEW.id,
            'data', jsonb_build_object('booking_id', NEW.id)
          ));
        EXCEPTION
          WHEN OTHERS THEN
            RAISE WARNING 'on_booking_status_change confirmed host notify failed: %', SQLERRM;
        END;
      END IF;

    WHEN 'cancelled' THEN
      IF OLD.status = 'pending' OR OLD.status = 'confirmed' THEN
        BEGIN
          PERFORM public.notify_edge_function(jsonb_build_object(
            'userId', NEW.host_id,
            'type', 'booking_cancelled_by_guest',
            'title', 'Booking Cancelled',
            'body', guest_name || ' cancelled their booking at ' || prop_name || '.',
            'screenRoute', '/host/bookings',
            'data', jsonb_build_object('booking_id', NEW.id)
          ));
        EXCEPTION
          WHEN OTHERS THEN
            RAISE WARNING 'on_booking_status_change cancelled notify failed: %', SQLERRM;
        END;
      END IF;

    WHEN 'declined' THEN
      BEGIN
        PERFORM public.notify_edge_function(jsonb_build_object(
          'userId', NEW.guest_id,
          'type', 'booking_declined',
          'title', 'Booking Declined',
          'body', 'Unfortunately, ' || prop_name || ' declined your booking request.',
          'screenRoute', '/my-bookings',
          'data', jsonb_build_object('booking_id', NEW.id)
        ));
      EXCEPTION
        WHEN OTHERS THEN
          RAISE WARNING 'on_booking_status_change declined notify failed: %', SQLERRM;
      END;

    WHEN 'completed' THEN
      BEGIN
        PERFORM public.notify_edge_function(jsonb_build_object(
          'userId', NEW.host_id,
          'type', 'guest_checked_out',
          'title', 'Guest Checked Out',
          'body', guest_name || ' checked out of ' || prop_name || '.',
          'screenRoute', '/host/bookings/' || NEW.id,
          'data', jsonb_build_object('booking_id', NEW.id)
        ));
      EXCEPTION
        WHEN OTHERS THEN
          RAISE WARNING 'on_booking_status_change completed notify failed: %', SQLERRM;
      END;
  END CASE;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- on_review_insert
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

  BEGIN
    PERFORM public.notify_edge_function(jsonb_build_object(
      'userId', booking_rec.host_id,
      'type', 'new_review',
      'title', 'New Review',
      'body', guest_name || ' left a ' || NEW.rating::text || '-star review for ' || prop_name || '.',
      'screenRoute', '/host/listings',
      'data', jsonb_build_object('review_id', NEW.id, 'booking_id', NEW.booking_id, 'rating', NEW.rating::text)
    ));
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'on_review_insert notify failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
