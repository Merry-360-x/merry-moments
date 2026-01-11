-- Backfill bookings schema for older databases so booking + reviews logic works.

DO $$
BEGIN
  IF to_regclass('public.bookings') IS NOT NULL THEN
    -- guest_id
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'guest_id'
    ) THEN
      ALTER TABLE public.bookings ADD COLUMN guest_id UUID;
      -- If an older column exists, copy it into guest_id.
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'user_id'
      ) THEN
        EXECUTE 'UPDATE public.bookings SET guest_id = user_id WHERE guest_id IS NULL';
      END IF;
      BEGIN
        ALTER TABLE public.bookings
          ADD CONSTRAINT bookings_guest_id_fkey FOREIGN KEY (guest_id) REFERENCES auth.users(id) ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN
        -- no-op
      END;
    END IF;

    -- property_id
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'property_id'
    ) THEN
      ALTER TABLE public.bookings ADD COLUMN property_id UUID;
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'listing_id'
      ) THEN
        EXECUTE 'UPDATE public.bookings SET property_id = listing_id WHERE property_id IS NULL';
      END IF;
      BEGIN
        ALTER TABLE public.bookings
          ADD CONSTRAINT bookings_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN
        -- no-op
      END;
    END IF;
  END IF;
END$$;

