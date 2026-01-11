-- Backfill missing profiles and add host verification.

DO $$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL THEN
    -- Backfill core profile columns for older schemas (some remotes only have id/email, etc.).
    -- These columns are referenced by triggers/functions (e.g. loyalty award), so they must exist first.
    ALTER TABLE public.profiles
      ADD COLUMN IF NOT EXISTS full_name TEXT,
      ADD COLUMN IF NOT EXISTS avatar_url TEXT,
      ADD COLUMN IF NOT EXISTS phone TEXT,
      ADD COLUMN IF NOT EXISTS date_of_birth DATE,
      ADD COLUMN IF NOT EXISTS bio TEXT,
      ADD COLUMN IF NOT EXISTS loyalty_points INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS loyalty_awarded BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

    -- Some older schemas use profiles.id as the auth user id and have no user_id column.
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='profiles' AND column_name='user_id'
    ) THEN
      ALTER TABLE public.profiles ADD COLUMN user_id UUID;
      -- Best-effort backfill (common case: profiles.id == auth.users.id)
      UPDATE public.profiles SET user_id = id WHERE user_id IS NULL;
      BEGIN
        ALTER TABLE public.profiles
          ADD CONSTRAINT profiles_user_id_unique UNIQUE (user_id);
      EXCEPTION WHEN duplicate_object THEN
      END;
      BEGIN
        ALTER TABLE public.profiles
          ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN
      END;
    END IF;

    ALTER TABLE public.profiles
      ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT false;

    -- Backfill any missing profiles for existing auth users.
    INSERT INTO public.profiles (user_id, full_name)
    SELECT u.id, COALESCE(u.raw_user_meta_data->>'full_name', '')
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.user_id = u.id
    WHERE p.user_id IS NULL;

    -- Mark hosts as verified by default (can be adjusted later by admins).
    UPDATE public.profiles p
    SET is_verified = true
    WHERE EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = p.user_id AND ur.role::text = 'host'
    );

    -- Ensure policies exist to update own profile (idempotent).
    BEGIN
      EXECUTE 'DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles';
      EXECUTE 'CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)';
    EXCEPTION WHEN others THEN
    END;
  END IF;
END$$;

