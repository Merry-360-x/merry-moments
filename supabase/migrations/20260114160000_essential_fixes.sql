-- Essential fixes to enable admin dashboard functionality
-- This only adds what's absolutely necessary

-- 1. Add missing columns to properties table
DO $$ 
BEGIN
  ALTER TABLE properties ADD COLUMN address TEXT;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

DO $$ 
BEGIN
  ALTER TABLE properties ADD COLUMN name TEXT;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

DO $$ 
BEGIN
  ALTER TABLE properties ADD COLUMN lat NUMERIC;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

DO $$ 
BEGIN
  ALTER TABLE properties ADD COLUMN lng NUMERIC;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

DO $$ 
BEGIN
  ALTER TABLE properties ADD COLUMN main_image TEXT;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

DO $$ 
BEGIN
  ALTER TABLE properties ADD COLUMN weekly_discount NUMERIC DEFAULT 0;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

DO $$ 
BEGIN
  ALTER TABLE properties ADD COLUMN monthly_discount NUMERIC DEFAULT 0;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

DO $$ 
BEGIN
  ALTER TABLE properties ADD COLUMN cancellation_policy TEXT DEFAULT 'fair';
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

-- 2. Add loyalty_points to profiles
DO $$ 
BEGIN
  ALTER TABLE profiles ADD COLUMN loyalty_points INTEGER DEFAULT 0;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

-- 3. Update lat/lng from existing latitude/longitude
UPDATE properties SET lat = latitude WHERE lat IS NULL AND latitude IS NOT NULL;
UPDATE properties SET lng = longitude WHERE lng IS NULL AND longitude IS NOT NULL;

-- 4. Create admin RPC functions (recreate to handle conflicts)
CREATE OR REPLACE FUNCTION admin_dashboard_metrics()
RETURNS TABLE (
  total_users BIGINT,
  total_properties BIGINT,
  total_bookings BIGINT,
  total_host_applications BIGINT,
  pending_applications BIGINT,
  total_tours BIGINT,
  total_transport BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM auth.users) as total_users,
    (SELECT COUNT(*) FROM properties) as total_properties,
    (SELECT COUNT(*) FROM bookings) as total_bookings,
    (SELECT COUNT(*) FROM host_applications) as total_host_applications,
    (SELECT COUNT(*) FROM host_applications WHERE status = 'pending') as pending_applications,
    (SELECT COUNT(*) FROM tours) as total_tours,
    (SELECT COUNT(*) FROM transport_vehicles) as total_transport;
END;
$$;

CREATE OR REPLACE FUNCTION admin_list_users(_search TEXT DEFAULT '')
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMPTZ,
  roles TEXT[],
  avatar_url TEXT,
  phone TEXT,
  last_sign_in_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    au.id as user_id,
    au.email,
    p.full_name,
    au.created_at,
    COALESCE(
      ARRAY(
        SELECT ur.role::TEXT 
        FROM user_roles ur 
        WHERE ur.user_id = au.id
      ), 
      ARRAY[]::TEXT[]
    ) as roles,
    p.avatar_url,
    p.phone,
    au.last_sign_in_at
  FROM auth.users au
  LEFT JOIN profiles p ON p.user_id = au.id
  WHERE 
    CASE 
      WHEN _search = '' OR _search IS NULL THEN TRUE
      ELSE (
        au.email ILIKE '%' || _search || '%' OR 
        COALESCE(p.full_name, '') ILIKE '%' || _search || '%' OR
        COALESCE(p.phone, '') ILIKE '%' || _search || '%'
      )
    END
  ORDER BY au.created_at DESC;
END;
$$;

-- 5. Grant permissions
GRANT EXECUTE ON FUNCTION admin_dashboard_metrics() TO authenticated;
GRANT EXECUTE ON FUNCTION admin_list_users(TEXT) TO authenticated;

-- 6. Ensure admin role exists
INSERT INTO user_roles (user_id, role) 
SELECT id, 'admin'::app_role 
FROM auth.users 
WHERE email = 'bebisdavy@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- 7. Refresh schema cache
NOTIFY pgrst, 'reload schema';