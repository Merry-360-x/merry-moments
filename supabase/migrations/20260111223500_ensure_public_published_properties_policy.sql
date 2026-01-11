-- Ensure guest-facing pages can read published properties under RLS.
DO $$
BEGIN
  IF to_regclass('public.properties') IS NOT NULL THEN
    ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

    EXECUTE 'DROP POLICY IF EXISTS "Anyone can view published properties" ON public.properties';
    EXECUTE 'CREATE POLICY "Anyone can view published properties" ON public.properties FOR SELECT USING (is_published = true)';
  END IF;
END$$;

