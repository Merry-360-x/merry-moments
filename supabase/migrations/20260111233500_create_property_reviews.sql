-- Real review rows for properties (for "All reviews" and host stats).

-- Ensure bookings has guest_id/property_id columns (older schemas compatibility).
DO $$
BEGIN
  IF to_regclass('public.bookings') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'guest_id'
    ) THEN
      ALTER TABLE public.bookings ADD COLUMN guest_id UUID;
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
      END;
    END IF;

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
      END;
    END IF;
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.property_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
  reviewer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (booking_id)
);

ALTER TABLE public.property_reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can read reviews for published properties.
DROP POLICY IF EXISTS "Anyone can read reviews for published properties" ON public.property_reviews;
CREATE POLICY "Anyone can read reviews for published properties"
  ON public.property_reviews FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.properties p
      WHERE p.id = property_id AND p.is_published = true
    )
  );

-- Guests can create reviews only for their own booking (real, no mock).
DROP POLICY IF EXISTS "Guests can create reviews for own booking" ON public.property_reviews;
CREATE POLICY "Guests can create reviews for own booking"
  ON public.property_reviews FOR INSERT
  WITH CHECK (
    auth.uid() = reviewer_id
    AND EXISTS (
      SELECT 1
      FROM public.bookings b
      WHERE b.id = booking_id
        AND b.guest_id = auth.uid()
        AND b.property_id = property_id
    )
  );

