-- Admin/staff user management helpers (list users with email) without exposing auth.users to the client.

CREATE OR REPLACE FUNCTION public.admin_list_users(_search TEXT DEFAULT NULL)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  created_at TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ,
  full_name TEXT,
  phone TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  is_allowed BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role::text IN ('admin','staff')
  ) INTO is_allowed;

  IF NOT is_allowed THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  RETURN QUERY
  SELECT
    u.id AS user_id,
    u.email::text AS email,
    u.created_at,
    u.last_sign_in_at,
    p.full_name,
    p.phone
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.user_id = u.id
  WHERE
    _search IS NULL
    OR _search = ''
    OR u.email ILIKE ('%' || _search || '%')
    OR COALESCE(p.full_name,'') ILIKE ('%' || _search || '%')
    OR COALESCE(p.phone,'') ILIKE ('%' || _search || '%')
    OR u.id::text ILIKE ('%' || _search || '%')
  ORDER BY u.created_at DESC
  LIMIT 500;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_users(TEXT) TO authenticated;

