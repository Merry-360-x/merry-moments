-- Support image OR video attachments for stories.
DO $$
BEGIN
  IF to_regclass('public.stories') IS NOT NULL THEN
    ALTER TABLE public.stories
      ADD COLUMN IF NOT EXISTS media_url TEXT,
      ADD COLUMN IF NOT EXISTS media_type TEXT;

    -- Backfill from older image_url column if present and media_url is empty.
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='stories' AND column_name='image_url'
    ) THEN
      UPDATE public.stories
      SET media_url = image_url
      WHERE media_url IS NULL AND image_url IS NOT NULL;
    END IF;
  END IF;
END$$;

