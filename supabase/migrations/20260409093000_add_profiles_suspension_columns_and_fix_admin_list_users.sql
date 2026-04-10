-- Add missing suspension columns to profiles and align admin_list_users output
-- with real profile suspension state.

-- 1) Ensure profiles has suspension columns used by admin web/mobile.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN,
  ADD COLUMN IF NOT EXISTS suspension_reason TEXT,
  ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS suspended_by UUID;

UPDATE public.profiles
SET is_suspended = false
WHERE is_suspended IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN is_suspended SET DEFAULT false,
  ALTER COLUMN is_suspended SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    JOIN unnest(c.conkey) AS ck(attnum) ON true
    JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ck.attnum
    WHERE c.contype = 'f'
      AND n.nspname = 'public'
      AND t.relname = 'profiles'
      AND a.attname = 'suspended_by'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_suspended_by_fkey
      FOREIGN KEY (suspended_by) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_is_suspended_true
  ON public.profiles (is_suspended)
  WHERE is_suspended = true;

CREATE INDEX IF NOT EXISTS idx_profiles_suspended_by
  ON public.profiles (suspended_by)
  WHERE suspended_by IS NOT NULL;

-- 2) Update admin_list_users so suspension state comes from profiles.
CREATE OR REPLACE FUNCTION public.admin_list_users(_search TEXT DEFAULT '')
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  created_at TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ,
  full_name TEXT,
  phone TEXT,
  is_suspended BOOLEAN,
  is_verified BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can list users';
  END IF;

  RETURN QUERY
  SELECT
    u.id AS user_id,
    u.email::text AS email,
    u.created_at,
    u.last_sign_in_at,
    COALESCE(p.full_name, u.raw_user_meta_data->>'full_name')::text AS full_name,
    COALESCE(p.phone, u.phone)::text AS phone,
    COALESCE(p.is_suspended, false) AS is_suspended,
    u.email_confirmed_at IS NOT NULL AS is_verified
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.user_id = u.id
  WHERE
    u.deleted_at IS NULL
    AND (
      _search = ''
      OR u.email ILIKE '%' || _search || '%'
      OR p.full_name ILIKE '%' || _search || '%'
    )
  ORDER BY u.created_at DESC
  LIMIT 500;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_users(TEXT) TO authenticated;
