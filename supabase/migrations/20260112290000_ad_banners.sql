-- Rotating ad/announcement banners shown above header
-- Admin/staff can manage; public can read active banners

DO $$
BEGIN
  -- Create table if missing
  IF to_regclass('public.ad_banners') IS NULL THEN
    CREATE TABLE public.ad_banners (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      message TEXT NOT NULL,
      cta_label TEXT NULL,
      cta_url TEXT NULL,
      bg_color TEXT NULL,
      text_color TEXT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT true,
      starts_at TIMESTAMPTZ NULL,
      ends_at TIMESTAMPTZ NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  END IF;

  -- Add any missing columns (idempotent)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='ad_banners' AND column_name='message'
  ) THEN
    ALTER TABLE public.ad_banners ADD COLUMN message TEXT NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='ad_banners' AND column_name='cta_label'
  ) THEN
    ALTER TABLE public.ad_banners ADD COLUMN cta_label TEXT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='ad_banners' AND column_name='cta_url'
  ) THEN
    ALTER TABLE public.ad_banners ADD COLUMN cta_url TEXT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='ad_banners' AND column_name='bg_color'
  ) THEN
    ALTER TABLE public.ad_banners ADD COLUMN bg_color TEXT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='ad_banners' AND column_name='text_color'
  ) THEN
    ALTER TABLE public.ad_banners ADD COLUMN text_color TEXT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='ad_banners' AND column_name='sort_order'
  ) THEN
    ALTER TABLE public.ad_banners ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='ad_banners' AND column_name='is_active'
  ) THEN
    ALTER TABLE public.ad_banners ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='ad_banners' AND column_name='starts_at'
  ) THEN
    ALTER TABLE public.ad_banners ADD COLUMN starts_at TIMESTAMPTZ NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='ad_banners' AND column_name='ends_at'
  ) THEN
    ALTER TABLE public.ad_banners ADD COLUMN ends_at TIMESTAMPTZ NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='ad_banners' AND column_name='created_at'
  ) THEN
    ALTER TABLE public.ad_banners ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT now();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='ad_banners' AND column_name='updated_at'
  ) THEN
    ALTER TABLE public.ad_banners ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
  END IF;
END $$;

-- RLS
ALTER TABLE public.ad_banners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active banners" ON public.ad_banners;
DROP POLICY IF EXISTS "Admin staff can manage banners" ON public.ad_banners;

CREATE POLICY "Public can view active banners"
  ON public.ad_banners
  FOR SELECT
  USING (
    is_active = true
    AND (starts_at IS NULL OR starts_at <= now())
    AND (ends_at IS NULL OR ends_at >= now())
  );

CREATE POLICY "Admin staff can manage banners"
  ON public.ad_banners
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

