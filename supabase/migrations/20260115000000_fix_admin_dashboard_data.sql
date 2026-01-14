-- Fix admin dashboard data loading issues
-- 1. Recreate admin_list_users function with proper security
-- 2. Create ad_banners table for banner management

-- ==============================================
-- ADMIN_LIST_USERS FUNCTION
-- ==============================================

DROP FUNCTION IF EXISTS admin_list_users(TEXT);
DROP FUNCTION IF EXISTS admin_list_users();

CREATE OR REPLACE FUNCTION admin_list_users(_search TEXT DEFAULT '')
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
  -- Check if user is admin
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can list users';
  END IF;

  RETURN QUERY
  SELECT 
    u.id as user_id,
    u.email::text as email,
    u.created_at,
    u.last_sign_in_at,
    COALESCE(p.full_name, u.raw_user_meta_data->>'full_name')::text as full_name,
    COALESCE(p.phone, u.phone)::text as phone,
    false as is_suspended,  -- Default to false (column doesn't exist in profiles)
    u.email_confirmed_at IS NOT NULL as is_verified
  FROM auth.users u
  LEFT JOIN profiles p ON p.user_id = u.id
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

GRANT EXECUTE ON FUNCTION admin_list_users(TEXT) TO authenticated;

COMMENT ON FUNCTION admin_list_users(TEXT) IS 'Lists all users for admin dashboard with optional search filter';

-- ==============================================
-- AD_BANNERS TABLE
-- ==============================================

-- Create ad_banners table if it doesn't exist
CREATE TABLE IF NOT EXISTS ad_banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message TEXT NOT NULL,
  cta_label TEXT,
  cta_url TEXT,
  bg_color TEXT DEFAULT 'rgba(239, 68, 68, 0.08)',
  text_color TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE ad_banners ENABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ad_banners_active ON ad_banners(is_active);
CREATE INDEX IF NOT EXISTS idx_ad_banners_sort_order ON ad_banners(sort_order);
CREATE INDEX IF NOT EXISTS idx_ad_banners_dates ON ad_banners(starts_at, ends_at);

-- RLS Policies for ad_banners

-- Everyone can view active banners
DROP POLICY IF EXISTS "Anyone can view active banners" ON ad_banners;
CREATE POLICY "Anyone can view active banners"
ON ad_banners FOR SELECT
TO authenticated, anon
USING (
  is_active = true 
  AND (starts_at IS NULL OR starts_at <= NOW())
  AND (ends_at IS NULL OR ends_at >= NOW())
);

-- Admins can view all banners
DROP POLICY IF EXISTS "Admins can view all banners" ON ad_banners;
CREATE POLICY "Admins can view all banners"
ON ad_banners FOR SELECT
TO authenticated
USING (public.is_admin() = true);

-- Admins can insert banners
DROP POLICY IF EXISTS "Admins can insert banners" ON ad_banners;
CREATE POLICY "Admins can insert banners"
ON ad_banners FOR INSERT
TO authenticated
WITH CHECK (public.is_admin() = true);

-- Admins can update banners
DROP POLICY IF EXISTS "Admins can update banners" ON ad_banners;
CREATE POLICY "Admins can update banners"
ON ad_banners FOR UPDATE
TO authenticated
USING (public.is_admin() = true)
WITH CHECK (public.is_admin() = true);

-- Admins can delete banners
DROP POLICY IF EXISTS "Admins can delete banners" ON ad_banners;
CREATE POLICY "Admins can delete banners"
ON ad_banners FOR DELETE
TO authenticated
USING (public.is_admin() = true);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ad_banners_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ad_banners_updated_at ON ad_banners;
CREATE TRIGGER ad_banners_updated_at
  BEFORE UPDATE ON ad_banners
  FOR EACH ROW
  EXECUTE FUNCTION update_ad_banners_updated_at();

COMMENT ON TABLE ad_banners IS 'Promotional banners displayed across the site';
