-- Comprehensive fix for all RLS policies
-- This migration fixes potential circular dependency and permission issues

-- First, ensure the has_role function exists and is SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.has_role(p_user_id UUID, p_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = p_user_id AND role = p_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.has_role(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, TEXT) TO anon;

-- ============================================
-- USER_ROLES TABLE - Fix RLS
-- ============================================
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Anyone authenticated can read roles" ON public.user_roles;
DROP POLICY IF EXISTS "Service role can manage roles" ON public.user_roles;

-- Everyone authenticated can read all roles (needed for has_role function to work)
CREATE POLICY "Anyone authenticated can read roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (true);

-- Only admins/staff can insert/update/delete roles (check done via function)
CREATE POLICY "Admin can insert roles"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'staff'))
  );

CREATE POLICY "Admin can update roles"
  ON public.user_roles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'staff'))
  );

CREATE POLICY "Admin can delete roles"
  ON public.user_roles FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'staff'))
  );

-- ============================================
-- PROPERTIES TABLE - Fix RLS
-- ============================================
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view published properties" ON public.properties;
DROP POLICY IF EXISTS "Hosts can create properties" ON public.properties;
DROP POLICY IF EXISTS "Hosts can update own properties" ON public.properties;
DROP POLICY IF EXISTS "Hosts can delete own properties" ON public.properties;
DROP POLICY IF EXISTS "Users can view own properties" ON public.properties;
DROP POLICY IF EXISTS "Admin staff can manage all properties" ON public.properties;

-- Anyone can view published properties
CREATE POLICY "Anyone can view published properties"
  ON public.properties FOR SELECT
  USING (is_published = true);

-- Owners can view their own properties (even unpublished)
CREATE POLICY "Users can view own properties"
  ON public.properties FOR SELECT
  TO authenticated
  USING (auth.uid() = host_id);

-- Hosts can create properties
CREATE POLICY "Hosts can create properties"
  ON public.properties FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = host_id
    AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('host', 'admin', 'staff'))
  );

-- Owners can update their properties
CREATE POLICY "Hosts can update own properties"
  ON public.properties FOR UPDATE
  TO authenticated
  USING (auth.uid() = host_id)
  WITH CHECK (auth.uid() = host_id);

-- Owners can delete their properties
CREATE POLICY "Hosts can delete own properties"
  ON public.properties FOR DELETE
  TO authenticated
  USING (auth.uid() = host_id);

-- Admin/Staff can do anything
CREATE POLICY "Admin staff can manage all properties"
  ON public.properties FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'staff'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'staff'))
  );

-- ============================================
-- HOST_APPLICATIONS TABLE - Fix RLS
-- ============================================
DO $$
BEGIN
  IF to_regclass('public.host_applications') IS NOT NULL THEN
    ALTER TABLE public.host_applications ENABLE ROW LEVEL SECURITY;

    EXECUTE 'DROP POLICY IF EXISTS "Users can view own applications" ON public.host_applications';
    EXECUTE 'DROP POLICY IF EXISTS "Users can create own applications" ON public.host_applications';
    EXECUTE 'DROP POLICY IF EXISTS "Admin staff can manage applications" ON public.host_applications';

    -- Users can view their own applications
    CREATE POLICY "Users can view own applications"
      ON public.host_applications FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);

    -- Users can create their own applications
    CREATE POLICY "Users can create own applications"
      ON public.host_applications FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);

    -- Admin/Staff can manage all
    CREATE POLICY "Admin staff can manage applications"
      ON public.host_applications FOR ALL
      TO authenticated
      USING (
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'staff'))
      )
      WITH CHECK (
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'staff'))
      );
  END IF;
END $$;

-- ============================================
-- PROFILES TABLE - Ensure users can read/update own profile
-- ============================================
DO $$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL THEN
    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

    EXECUTE 'DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles';
    EXECUTE 'DROP POLICY IF EXISTS "Public profiles are viewable" ON public.profiles';

    -- Users can view their own profile
    CREATE POLICY "Users can view own profile"
      ON public.profiles FOR SELECT
      TO authenticated
      USING (auth.uid() = id OR auth.uid() = user_id);

    -- Users can update their own profile
    CREATE POLICY "Users can update own profile"
      ON public.profiles FOR UPDATE
      TO authenticated
      USING (auth.uid() = id OR auth.uid() = user_id)
      WITH CHECK (auth.uid() = id OR auth.uid() = user_id);

    -- Public profiles viewable by anyone
    CREATE POLICY "Public profiles are viewable"
      ON public.profiles FOR SELECT
      USING (true);
  END IF;
END $$;
