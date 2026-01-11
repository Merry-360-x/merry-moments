-- Public-facing host "about" field.
DO $$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL THEN
    ALTER TABLE public.profiles
      ADD COLUMN IF NOT EXISTS bio TEXT;
  END IF;
END$$;

