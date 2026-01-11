-- Secure user_roles policies (prevents self-escalation) and enable admin role management

-- IMPORTANT: previously the "Users can insert own roles" policy allowed privilege escalation.
-- This migration removes that policy and replaces it with safe admin/staff policies.

DO $$
BEGIN
  IF to_regclass('public.user_roles') IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM pg_proc p
       JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE n.nspname = 'public' AND p.proname = 'has_role'
     ) THEN
    EXECUTE 'ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY';

    -- Remove dangerous / overly-broad policies
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert own roles" ON public.user_roles';
    EXECUTE 'DROP POLICY IF EXISTS "Staff and admins can insert roles" ON public.user_roles';

    -- Admin-only role management
    EXECUTE 'DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles';
    EXECUTE 'CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role::text = ''admin''))';

    EXECUTE 'DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles';
    EXECUTE 'CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role::text = ''admin''))';

    EXECUTE 'DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles';
    EXECUTE 'CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role::text = ''admin''))';

    -- Staff can grant host role (needed for staff approvals)
    EXECUTE 'DROP POLICY IF EXISTS "Staff can grant host role" ON public.user_roles';
    EXECUTE 'CREATE POLICY "Staff can grant host role" ON public.user_roles FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role::text = ''staff'') AND role::text = ''host'')';
  END IF;
END$$;

