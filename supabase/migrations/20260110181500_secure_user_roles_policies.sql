-- Secure user_roles policies (prevents self-escalation) and enable admin role management

-- IMPORTANT: previously the "Users can insert own roles" policy allowed privilege escalation.
-- This migration removes that policy and replaces it with safe admin/staff policies.

-- user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Remove dangerous / overly-broad policies
DROP POLICY IF EXISTS "Users can insert own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Staff and admins can insert roles" ON public.user_roles;

-- Admin-only role management
CREATE POLICY IF NOT EXISTS "Admins can view all roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY IF NOT EXISTS "Admins can insert roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY IF NOT EXISTS "Admins can delete roles"
  ON public.user_roles FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Staff can grant host role (needed for staff approvals)
CREATE POLICY IF NOT EXISTS "Staff can grant host role"
  ON public.user_roles FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'staff') AND role = 'host');
