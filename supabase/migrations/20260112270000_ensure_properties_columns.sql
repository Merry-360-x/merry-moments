-- Ensure all required columns exist in properties table

-- Add missing columns if they don't exist
DO $$
BEGIN
  -- beds
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'beds') THEN
    ALTER TABLE public.properties ADD COLUMN beds INTEGER DEFAULT 1;
  END IF;

  -- cancellation_policy
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'cancellation_policy') THEN
    ALTER TABLE public.properties ADD COLUMN cancellation_policy TEXT DEFAULT 'fair';
  END IF;

  -- weekly_discount
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'weekly_discount') THEN
    ALTER TABLE public.properties ADD COLUMN weekly_discount INTEGER DEFAULT 0;
  END IF;

  -- monthly_discount
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'monthly_discount') THEN
    ALTER TABLE public.properties ADD COLUMN monthly_discount INTEGER DEFAULT 0;
  END IF;

  -- check_in_time
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'check_in_time') THEN
    ALTER TABLE public.properties ADD COLUMN check_in_time TEXT DEFAULT '14:00';
  END IF;

  -- check_out_time
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'check_out_time') THEN
    ALTER TABLE public.properties ADD COLUMN check_out_time TEXT DEFAULT '11:00';
  END IF;

  -- smoking_allowed
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'smoking_allowed') THEN
    ALTER TABLE public.properties ADD COLUMN smoking_allowed BOOLEAN DEFAULT false;
  END IF;

  -- events_allowed
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'events_allowed') THEN
    ALTER TABLE public.properties ADD COLUMN events_allowed BOOLEAN DEFAULT false;
  END IF;

  -- pets_allowed
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'pets_allowed') THEN
    ALTER TABLE public.properties ADD COLUMN pets_allowed BOOLEAN DEFAULT false;
  END IF;

  -- title
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'title') THEN
    ALTER TABLE public.properties ADD COLUMN title TEXT;
  END IF;

  -- description
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'description') THEN
    ALTER TABLE public.properties ADD COLUMN description TEXT;
  END IF;

  -- location
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'location') THEN
    ALTER TABLE public.properties ADD COLUMN location TEXT;
  END IF;

  -- property_type
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'property_type') THEN
    ALTER TABLE public.properties ADD COLUMN property_type TEXT DEFAULT 'Apartment';
  END IF;

  -- price_per_night
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'price_per_night') THEN
    ALTER TABLE public.properties ADD COLUMN price_per_night NUMERIC DEFAULT 0;
  END IF;

  -- currency
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'currency') THEN
    ALTER TABLE public.properties ADD COLUMN currency TEXT DEFAULT 'RWF';
  END IF;

  -- max_guests
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'max_guests') THEN
    ALTER TABLE public.properties ADD COLUMN max_guests INTEGER DEFAULT 2;
  END IF;

  -- bedrooms
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'bedrooms') THEN
    ALTER TABLE public.properties ADD COLUMN bedrooms INTEGER DEFAULT 1;
  END IF;

  -- bathrooms
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'bathrooms') THEN
    ALTER TABLE public.properties ADD COLUMN bathrooms INTEGER DEFAULT 1;
  END IF;

  -- amenities
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'amenities') THEN
    ALTER TABLE public.properties ADD COLUMN amenities TEXT[] DEFAULT '{}';
  END IF;

  -- images
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'images') THEN
    ALTER TABLE public.properties ADD COLUMN images TEXT[] DEFAULT '{}';
  END IF;

  -- host_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'host_id') THEN
    ALTER TABLE public.properties ADD COLUMN host_id UUID REFERENCES auth.users(id);
  END IF;

  -- is_published
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'is_published') THEN
    ALTER TABLE public.properties ADD COLUMN is_published BOOLEAN DEFAULT false;
  END IF;

  -- rating
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'rating') THEN
    ALTER TABLE public.properties ADD COLUMN rating NUMERIC DEFAULT 0;
  END IF;

  -- review_count
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'review_count') THEN
    ALTER TABLE public.properties ADD COLUMN review_count INTEGER DEFAULT 0;
  END IF;

  -- created_at
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'created_at') THEN
    ALTER TABLE public.properties ADD COLUMN created_at TIMESTAMPTZ DEFAULT now();
  END IF;

  -- updated_at
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'updated_at') THEN
    ALTER TABLE public.properties ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
  END IF;
END $$;

-- Ensure RLS is properly set up for properties
-- Drop and recreate policies to ensure they work

ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Anyone can view published properties" ON public.properties;
DROP POLICY IF EXISTS "Users can view own properties" ON public.properties;
DROP POLICY IF EXISTS "Hosts can create properties" ON public.properties;
DROP POLICY IF EXISTS "Hosts can update own properties" ON public.properties;
DROP POLICY IF EXISTS "Hosts can delete own properties" ON public.properties;
DROP POLICY IF EXISTS "Admin staff can manage all properties" ON public.properties;
DROP POLICY IF EXISTS "Authenticated users can insert properties" ON public.properties;

-- Simple policy: Anyone can see published properties
CREATE POLICY "Anyone can view published properties"
  ON public.properties FOR SELECT
  USING (is_published = true);

-- Simple policy: Users can see their own properties
CREATE POLICY "Users can view own properties"
  ON public.properties FOR SELECT
  TO authenticated
  USING (host_id = auth.uid());

-- Simple policy: Authenticated users can insert if they set themselves as host
CREATE POLICY "Authenticated users can insert properties"
  ON public.properties FOR INSERT
  TO authenticated
  WITH CHECK (host_id = auth.uid());

-- Simple policy: Users can update their own properties
CREATE POLICY "Hosts can update own properties"
  ON public.properties FOR UPDATE
  TO authenticated
  USING (host_id = auth.uid())
  WITH CHECK (host_id = auth.uid());

-- Simple policy: Users can delete their own properties
CREATE POLICY "Hosts can delete own properties"
  ON public.properties FOR DELETE
  TO authenticated
  USING (host_id = auth.uid());
