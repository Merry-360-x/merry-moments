-- Allow admin/staff to view and manage properties (publish/unpublish) via RLS.
DO $$
BEGIN
  IF to_regclass('public.properties') IS NOT NULL THEN
    -- SELECT: allow admins/staff to view all properties (in addition to public published and host-owned policies).
    EXECUTE 'DROP POLICY IF EXISTS "Staff/admin can view all properties" ON public.properties';
    EXECUTE 'CREATE POLICY "Staff/admin can view all properties" ON public.properties FOR SELECT USING (
      EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role::text IN (''admin'',''staff''))
    )';

    -- UPDATE: allow admins/staff to update any property (e.g., set is_published).
    EXECUTE 'DROP POLICY IF EXISTS "Staff/admin can update any property" ON public.properties';
    EXECUTE 'CREATE POLICY "Staff/admin can update any property" ON public.properties FOR UPDATE USING (
      EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role::text IN (''admin'',''staff''))
    ) WITH CHECK (
      EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role::text IN (''admin'',''staff''))
    )';
  END IF;
END$$;

