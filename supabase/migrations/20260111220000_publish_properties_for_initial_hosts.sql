-- Publish properties for initial host accounts so they appear on guest-facing pages.
-- Host emails:
-- - davyncidavy@gmail.com
-- - merry360x.marketing@yahoo.com
-- - firanzi53@gmail.com

DO $$
BEGIN
  IF to_regclass('public.properties') IS NOT NULL THEN
    -- Some older schemas may not have is_published; add it if missing.
    ALTER TABLE public.properties
      ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false;

    UPDATE public.properties
    SET is_published = true
    WHERE is_published IS DISTINCT FROM true
      AND host_id IN (
        SELECT id
        FROM auth.users
        WHERE lower(email) IN (
          'davyncidavy@gmail.com',
          'merry360x.marketing@yahoo.com',
          'firanzi53@gmail.com'
        )
      );
  END IF;
END$$;

