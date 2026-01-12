-- Allow admin and staff to manage user roles

DO $$
BEGIN
  -- Ensure RLS is enabled
  ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

  -- Drop existing policies if they exist
  EXECUTE 'DROP POLICY IF EXISTS "Admin can manage all roles" ON public.user_roles';
  EXECUTE 'DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles';
  EXECUTE 'DROP POLICY IF EXISTS "Admin staff can insert roles" ON public.user_roles';
  EXECUTE 'DROP POLICY IF EXISTS "Admin staff can delete roles" ON public.user_roles';

  -- Policy: Admin/Staff can view all roles
  CREATE POLICY "Admin can manage all roles"
    ON public.user_roles FOR ALL
    TO authenticated
    USING (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'staff')
    )
    WITH CHECK (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'staff')
    );

  -- Policy: Users can view their own roles
  CREATE POLICY "Users can view own roles"
    ON public.user_roles FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

END $$;
