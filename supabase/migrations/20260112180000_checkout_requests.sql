-- Checkout requests: capture payer/contact info for guest + authed users at payment time
-- This enables "add to cart / request booking without account" while collecting full details at checkout.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'checkout_requests'
  ) THEN
    CREATE TABLE public.checkout_requests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      message TEXT,
      items JSONB NOT NULL DEFAULT '[]'::jsonb,
      status TEXT NOT NULL DEFAULT 'pending'
    );
  END IF;

  ALTER TABLE public.checkout_requests ENABLE ROW LEVEL SECURITY;

  -- Guest checkout requests
  EXECUTE 'DROP POLICY IF EXISTS "Anyone can create checkout requests" ON public.checkout_requests';
  EXECUTE 'CREATE POLICY "Anyone can create checkout requests"
    ON public.checkout_requests FOR INSERT
    TO anon
    WITH CHECK (
      user_id IS NULL
      AND name IS NOT NULL
      AND email IS NOT NULL
    )';

  -- Authenticated checkout requests
  EXECUTE 'DROP POLICY IF EXISTS "Users can create their checkout requests" ON public.checkout_requests';
  EXECUTE 'CREATE POLICY "Users can create their checkout requests"
    ON public.checkout_requests FOR INSERT
    TO authenticated
    WITH CHECK (
      (user_id IS NULL) OR (user_id = auth.uid())
    )';

  EXECUTE 'DROP POLICY IF EXISTS "Users can view their checkout requests" ON public.checkout_requests';
  EXECUTE 'CREATE POLICY "Users can view their checkout requests"
    ON public.checkout_requests FOR SELECT
    TO authenticated
    USING (
      user_id = auth.uid()
      OR public.has_role(auth.uid(), ''admin'')
      OR public.has_role(auth.uid(), ''staff'')
    )';

  EXECUTE 'DROP POLICY IF EXISTS "Admin/staff can manage checkout requests" ON public.checkout_requests';
  EXECUTE 'CREATE POLICY "Admin/staff can manage checkout requests"
    ON public.checkout_requests FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), ''admin'') OR public.has_role(auth.uid(), ''staff''))
    WITH CHECK (public.has_role(auth.uid(), ''admin'') OR public.has_role(auth.uid(), ''staff''))';
END $$;

