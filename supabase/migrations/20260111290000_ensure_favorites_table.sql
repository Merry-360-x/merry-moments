-- Ensure favorites table exists in remote DB (fix "Could not find the table public.favorites").

DO $$
BEGIN
  IF to_regclass('public.favorites') IS NULL THEN
    CREATE TABLE public.favorites (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
      property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      UNIQUE (user_id, property_id)
    );
  END IF;

  -- Ensure RLS + policies exist (idempotent).
  ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

  EXECUTE 'DROP POLICY IF EXISTS "Users can view own favorites" ON public.favorites';
  EXECUTE 'CREATE POLICY "Users can view own favorites" ON public.favorites FOR SELECT USING (auth.uid() = user_id)';

  EXECUTE 'DROP POLICY IF EXISTS "Users can add favorites" ON public.favorites';
  EXECUTE 'CREATE POLICY "Users can add favorites" ON public.favorites FOR INSERT WITH CHECK (auth.uid() = user_id)';

  EXECUTE 'DROP POLICY IF EXISTS "Users can remove own favorites" ON public.favorites';
  EXECUTE 'CREATE POLICY "Users can remove own favorites" ON public.favorites FOR DELETE USING (auth.uid() = user_id)';
END$$;

