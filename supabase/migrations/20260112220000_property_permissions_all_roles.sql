-- Allow hosts, admin, and staff to create and manage properties

DO $$
BEGIN
  -- Drop existing policies
  EXECUTE 'DROP POLICY IF EXISTS "Hosts can create properties" ON public.properties';
  EXECUTE 'DROP POLICY IF EXISTS "Hosts can update own properties" ON public.properties';
  EXECUTE 'DROP POLICY IF EXISTS "Hosts can delete own properties" ON public.properties';
  EXECUTE 'DROP POLICY IF EXISTS "Users can view own properties" ON public.properties';
  EXECUTE 'DROP POLICY IF EXISTS "Admin staff can create properties" ON public.properties';
  EXECUTE 'DROP POLICY IF EXISTS "Admin staff can manage all properties" ON public.properties';

  -- Policy: Hosts, Admin, Staff can create properties (INSERT)
  CREATE POLICY "Hosts can create properties"
    ON public.properties FOR INSERT
    TO authenticated
    WITH CHECK (
      auth.uid() = host_id
      AND (
        public.has_role(auth.uid(), 'host')
        OR public.has_role(auth.uid(), 'admin')
        OR public.has_role(auth.uid(), 'staff')
      )
    );

  -- Policy: Hosts can update their own properties
  CREATE POLICY "Hosts can update own properties"
    ON public.properties FOR UPDATE
    TO authenticated
    USING (auth.uid() = host_id)
    WITH CHECK (auth.uid() = host_id);

  -- Policy: Admin/Staff can update ANY property
  CREATE POLICY "Admin staff can manage all properties"
    ON public.properties FOR ALL
    TO authenticated
    USING (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'staff')
    )
    WITH CHECK (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'staff')
    );

  -- Policy: Hosts can delete their own properties
  CREATE POLICY "Hosts can delete own properties"
    ON public.properties FOR DELETE
    TO authenticated
    USING (auth.uid() = host_id);

  -- Policy: Users can view their own properties (even if not published)
  CREATE POLICY "Users can view own properties"
    ON public.properties FOR SELECT
    TO authenticated
    USING (auth.uid() = host_id);

END $$;
