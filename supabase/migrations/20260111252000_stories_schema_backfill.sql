-- Fix/standardize stories schema + RLS so posting works on older remote databases.

DO $$
BEGIN
  IF to_regclass('public.stories') IS NULL THEN
    CREATE TABLE public.stories (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      image_url TEXT,
      media_url TEXT,
      media_type TEXT,
      listing_type TEXT,
      listing_id UUID,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
    );
  ELSE
    -- Add missing columns (older tables may exist with different shape).
    ALTER TABLE public.stories
      ADD COLUMN IF NOT EXISTS user_id UUID,
      ADD COLUMN IF NOT EXISTS title TEXT,
      ADD COLUMN IF NOT EXISTS body TEXT,
      ADD COLUMN IF NOT EXISTS image_url TEXT,
      ADD COLUMN IF NOT EXISTS media_url TEXT,
      ADD COLUMN IF NOT EXISTS media_type TEXT,
      ADD COLUMN IF NOT EXISTS listing_type TEXT,
      ADD COLUMN IF NOT EXISTS listing_id UUID,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

    -- Backfill user_id if missing but id matches auth users (best effort).
    UPDATE public.stories SET user_id = NULLIF(user_id, NULL);
  END IF;

  -- Ensure FK if possible.
  BEGIN
    ALTER TABLE public.stories
      ADD CONSTRAINT stories_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  EXCEPTION WHEN duplicate_object THEN
  END;

  -- Enable RLS + policies.
  ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

  EXECUTE 'DROP POLICY IF EXISTS "Anyone can read stories" ON public.stories';
  EXECUTE 'CREATE POLICY "Anyone can read stories" ON public.stories FOR SELECT USING (true)';

  EXECUTE 'DROP POLICY IF EXISTS "Users can create own stories" ON public.stories';
  EXECUTE 'CREATE POLICY "Users can create own stories" ON public.stories FOR INSERT WITH CHECK (auth.uid() = user_id)';

  EXECUTE 'DROP POLICY IF EXISTS "Users can update own stories" ON public.stories';
  EXECUTE 'CREATE POLICY "Users can update own stories" ON public.stories FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)';

  EXECUTE 'DROP POLICY IF EXISTS "Users can delete own stories" ON public.stories';
  EXECUTE 'CREATE POLICY "Users can delete own stories" ON public.stories FOR DELETE USING (auth.uid() = user_id)';
END$$;

