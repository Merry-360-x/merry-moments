-- Fix RLS policies for host_applications to allow user inserts

DO $$
BEGIN
  -- Ensure RLS is enabled
  ALTER TABLE public.host_applications ENABLE ROW LEVEL SECURITY;

  -- Drop existing policies to recreate them cleanly
  DROP POLICY IF EXISTS "Users can create own host application" ON public.host_applications;
  DROP POLICY IF EXISTS "Users can view own host applications" ON public.host_applications;
  DROP POLICY IF EXISTS "Admin/staff can manage host applications" ON public.host_applications;
  DROP POLICY IF EXISTS "anyone_can_insert_host_application" ON public.host_applications;
  DROP POLICY IF EXISTS "users_can_view_own_applications" ON public.host_applications;
  DROP POLICY IF EXISTS "Users can update own draft applications" ON public.host_applications;

  -- Allow authenticated users to insert their own applications (most permissive)
  CREATE POLICY "Users can create own host application"
    ON public.host_applications
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

  -- Allow users to read their own applications
  CREATE POLICY "Users can view own host applications"
    ON public.host_applications
    FOR SELECT
    TO authenticated
    USING (
      auth.uid() = user_id 
      OR EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'staff')
      )
    );

  -- Allow users to update their own draft applications
  CREATE POLICY "Users can update own draft applications"
    ON public.host_applications
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id AND status = 'pending')
    WITH CHECK (auth.uid() = user_id);

  -- Admin/staff can do everything
  CREATE POLICY "Admin/staff can manage host applications"
    ON public.host_applications
    FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'staff')
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'staff')
      )
    );

END $$;
