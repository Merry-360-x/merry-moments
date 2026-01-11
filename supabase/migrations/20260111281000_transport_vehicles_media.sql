-- Allow transport vehicles to have multiple images/videos (no mock data; real uploads only).
DO $$
BEGIN
  IF to_regclass('public.transport_vehicles') IS NOT NULL THEN
    ALTER TABLE public.transport_vehicles
      ADD COLUMN IF NOT EXISTS media TEXT[] DEFAULT '{}'::text[];

    -- Backfill from existing image_url if media is empty.
    UPDATE public.transport_vehicles
    SET media = ARRAY[image_url]
    WHERE (media IS NULL OR array_length(media, 1) IS NULL)
      AND image_url IS NOT NULL;
  END IF;
END$$;

