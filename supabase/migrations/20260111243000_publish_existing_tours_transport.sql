-- Make existing tours/transport visible by default (publish existing rows).
-- This addresses older data where is_published was false or null.

DO $$
BEGIN
  IF to_regclass('public.tours') IS NOT NULL THEN
    UPDATE public.tours SET is_published = true WHERE is_published IS DISTINCT FROM true;
    ALTER TABLE public.tours ALTER COLUMN is_published SET DEFAULT true;
  END IF;

  IF to_regclass('public.transport_vehicles') IS NOT NULL THEN
    UPDATE public.transport_vehicles SET is_published = true WHERE is_published IS DISTINCT FROM true;
    ALTER TABLE public.transport_vehicles ALTER COLUMN is_published SET DEFAULT true;
  END IF;

  IF to_regclass('public.transport_routes') IS NOT NULL THEN
    UPDATE public.transport_routes SET is_published = true WHERE is_published IS DISTINCT FROM true;
    ALTER TABLE public.transport_routes ALTER COLUMN is_published SET DEFAULT true;
  END IF;

  IF to_regclass('public.transport_services') IS NOT NULL THEN
    UPDATE public.transport_services SET is_published = true WHERE is_published IS DISTINCT FROM true;
    ALTER TABLE public.transport_services ALTER COLUMN is_published SET DEFAULT true;
  END IF;
END$$;

