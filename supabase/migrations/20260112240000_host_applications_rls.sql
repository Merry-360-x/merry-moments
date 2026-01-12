-- RLS policies for host_applications table

DO $$
BEGIN
  -- Ensure the table exists
  IF to_regclass('public.host_applications') IS NULL THEN
    RAISE NOTICE 'host_applications table does not exist, skipping';
    RETURN;
  END IF;

  -- Enable RLS
  ALTER TABLE public.host_applications ENABLE ROW LEVEL SECURITY;

  -- Drop existing policies
  EXECUTE 'DROP POLICY IF EXISTS "Users can view own applications" ON public.host_applications';
  EXECUTE 'DROP POLICY IF EXISTS "Users can create own applications" ON public.host_applications';
  EXECUTE 'DROP POLICY IF EXISTS "Admin staff can manage applications" ON public.host_applications';

  -- Policy: Users can view their own applications
  CREATE POLICY "Users can view own applications"
    ON public.host_applications FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

  -- Policy: Users can create their own applications
  CREATE POLICY "Users can create own applications"
    ON public.host_applications FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

  -- Policy: Admin/Staff can manage all applications
  CREATE POLICY "Admin staff can manage applications"
    ON public.host_applications FOR ALL
    TO authenticated
    USING (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'staff')
    )
    WITH CHECK (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'staff')
    );

END $$;
