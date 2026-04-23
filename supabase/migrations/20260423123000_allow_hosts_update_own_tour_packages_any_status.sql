-- Allow hosts to update their own tour packages regardless of current status.
-- The existing policy only permits updates while the row is in draft/rejected,
-- but the web and Flutter host dashboards both offer edit actions for broader
-- package states, which causes owner updates to fail at the RLS layer.

DROP POLICY IF EXISTS "Hosts can update own tour packages" ON public.tour_packages;

CREATE POLICY "Hosts can update own tour packages"
  ON public.tour_packages
  FOR UPDATE
  TO authenticated
  USING (host_id = auth.uid())
  WITH CHECK (host_id = auth.uid());

NOTIFY pgrst, 'reload schema';
