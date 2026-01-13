-- Verify and ensure all required columns exist in host_applications table
-- This addresses PGRST204 errors when PostgREST can't find columns in its schema cache

DO $$
BEGIN
  -- Ensure all core columns exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='host_applications' AND column_name='full_name') THEN
    ALTER TABLE public.host_applications ADD COLUMN full_name TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='host_applications' AND column_name='phone') THEN
    ALTER TABLE public.host_applications ADD COLUMN phone TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='host_applications' AND column_name='about') THEN
    ALTER TABLE public.host_applications ADD COLUMN about TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='host_applications' AND column_name='business_name') THEN
    ALTER TABLE public.host_applications ADD COLUMN business_name TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='host_applications' AND column_name='hosting_location') THEN
    ALTER TABLE public.host_applications ADD COLUMN hosting_location TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='host_applications' AND column_name='review_notes') THEN
    ALTER TABLE public.host_applications ADD COLUMN review_notes TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='host_applications' AND column_name='reviewed_by') THEN
    ALTER TABLE public.host_applications ADD COLUMN reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Force schema cache reload
NOTIFY pgrst, 'reload schema';
