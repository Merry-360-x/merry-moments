-- Clear all stories and allow admin/staff to manage stories.

DO $$
BEGIN
  IF to_regclass('public.stories') IS NOT NULL THEN
    -- Delete all existing stories (data reset).
    DELETE FROM public.stories;

    -- Ensure RLS enabled (safe if already).
    ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

    -- Admin/staff management policy.
    EXECUTE 'DROP POLICY IF EXISTS "Staff/admin can manage stories" ON public.stories';
    EXECUTE 'CREATE POLICY "Staff/admin can manage stories" ON public.stories FOR ALL USING (
      EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role::text IN (''admin'',''staff''))
    ) WITH CHECK (
      EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role::text IN (''admin'',''staff''))
    )';
  END IF;
END$$;

