-- Allow hosts to create, update, and manage their own properties

DO $$
BEGIN
  -- Ensure the has_role function exists
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'has_role') THEN
    CREATE OR REPLACE FUNCTION public.has_role(user_id UUID, role_name TEXT)
    RETURNS BOOLEAN AS $fn$
    BEGIN
      RETURN EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = $1 AND ur.role = $2
      );
    END;
    $fn$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
  END IF;

  -- Drop existing policies if they exist
  EXECUTE 'DROP POLICY IF EXISTS "Hosts can create properties" ON public.properties';
  EXECUTE 'DROP POLICY IF EXISTS "Hosts can update own properties" ON public.properties';
  EXECUTE 'DROP POLICY IF EXISTS "Hosts can delete own properties" ON public.properties';
  EXECUTE 'DROP POLICY IF EXISTS "Hosts can view own properties" ON public.properties';
  EXECUTE 'DROP POLICY IF EXISTS "Users can view own properties" ON public.properties';

  -- Policy: Hosts can create properties (INSERT)
  CREATE POLICY "Hosts can create properties"
    ON public.properties FOR INSERT
    TO authenticated
    WITH CHECK (
      auth.uid() = host_id
      AND public.has_role(auth.uid(), 'host')
    );

  -- Policy: Hosts can update their own properties
  CREATE POLICY "Hosts can update own properties"
    ON public.properties FOR UPDATE
    TO authenticated
    USING (auth.uid() = host_id)
    WITH CHECK (auth.uid() = host_id);

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
