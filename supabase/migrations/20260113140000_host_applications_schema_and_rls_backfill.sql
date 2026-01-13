-- Ensure host_applications has required columns + RLS policies for user submissions.
-- Idempotent so it can safely run on older/newer schemas.

DO $$
BEGIN
  -- Table existence (some environments may not have it)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='host_applications'
  ) THEN
    CREATE TABLE public.host_applications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'pending',
      full_name TEXT,
      phone TEXT,
      business_name TEXT,
      hosting_location TEXT,
      about TEXT,
      review_notes TEXT,
      reviewed_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL
    );
  END IF;

  -- Columns used by the Become Host application (add if missing)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='host_applications' AND column_name='applicant_type') THEN
    ALTER TABLE public.host_applications ADD COLUMN applicant_type TEXT NOT NULL DEFAULT 'individual';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='host_applications' AND column_name='listing_title') THEN
    ALTER TABLE public.host_applications ADD COLUMN listing_title TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='host_applications' AND column_name='listing_location') THEN
    ALTER TABLE public.host_applications ADD COLUMN listing_location TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='host_applications' AND column_name='listing_property_type') THEN
    ALTER TABLE public.host_applications ADD COLUMN listing_property_type TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='host_applications' AND column_name='listing_price_per_night') THEN
    ALTER TABLE public.host_applications ADD COLUMN listing_price_per_night NUMERIC;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='host_applications' AND column_name='listing_currency') THEN
    ALTER TABLE public.host_applications ADD COLUMN listing_currency TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='host_applications' AND column_name='listing_max_guests') THEN
    ALTER TABLE public.host_applications ADD COLUMN listing_max_guests INTEGER;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='host_applications' AND column_name='listing_bedrooms') THEN
    ALTER TABLE public.host_applications ADD COLUMN listing_bedrooms INTEGER;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='host_applications' AND column_name='listing_bathrooms') THEN
    ALTER TABLE public.host_applications ADD COLUMN listing_bathrooms INTEGER;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='host_applications' AND column_name='listing_amenities') THEN
    ALTER TABLE public.host_applications ADD COLUMN listing_amenities TEXT[];
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='host_applications' AND column_name='listing_images') THEN
    ALTER TABLE public.host_applications ADD COLUMN listing_images TEXT[];
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='host_applications' AND column_name='business_tin') THEN
    ALTER TABLE public.host_applications ADD COLUMN business_tin TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='host_applications' AND column_name='business_certificate_url') THEN
    ALTER TABLE public.host_applications ADD COLUMN business_certificate_url TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='host_applications' AND column_name='national_id_number') THEN
    ALTER TABLE public.host_applications ADD COLUMN national_id_number TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='host_applications' AND column_name='national_id_photo_url') THEN
    ALTER TABLE public.host_applications ADD COLUMN national_id_photo_url TEXT;
  END IF;

  -- Ensure has_role exists for admin/staff policies.
  -- IMPORTANT: Do NOT "CREATE OR REPLACE" if it already exists because some environments have
  -- a different parameter naming (e.g. p_user_id) and Postgres rejects renaming params.
  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'has_role'
  ) THEN
    EXECUTE 'CREATE FUNCTION public.has_role(p_user_id uuid, p_role text)
    RETURNS boolean
    LANGUAGE sql
    STABLE
    AS $fn$
      select exists (
        select 1 from public.user_roles ur
        where ur.user_id = p_user_id and ur.role::text = p_role
      );
    $fn$';
  END IF;

  ALTER TABLE public.host_applications ENABLE ROW LEVEL SECURITY;

  -- Users can submit their own application
  EXECUTE 'DROP POLICY IF EXISTS "Users can create own host application" ON public.host_applications';
  EXECUTE 'CREATE POLICY "Users can create own host application"
    ON public.host_applications FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid())';

  -- Users can read their own applications
  EXECUTE 'DROP POLICY IF EXISTS "Users can view own host applications" ON public.host_applications';
  EXECUTE 'CREATE POLICY "Users can view own host applications"
    ON public.host_applications FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() OR public.has_role(auth.uid(), ''admin'') OR public.has_role(auth.uid(), ''staff''))';

  -- Admin/staff can manage all host applications
  EXECUTE 'DROP POLICY IF EXISTS "Admin/staff can manage host applications" ON public.host_applications';
  EXECUTE 'CREATE POLICY "Admin/staff can manage host applications"
    ON public.host_applications FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), ''admin'') OR public.has_role(auth.uid(), ''staff''))
    WITH CHECK (public.has_role(auth.uid(), ''admin'') OR public.has_role(auth.uid(), ''staff''))';
END $$;

