-- Ensure property_blocked_dates table is in public schema and accessible via API
-- Drop and recreate to fix any schema issues

DROP TABLE IF EXISTS public.property_blocked_dates CASCADE;

CREATE TABLE public.property_blocked_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

CREATE INDEX idx_property_blocked_dates_property_id ON public.property_blocked_dates(property_id);
CREATE INDEX idx_property_blocked_dates_dates ON public.property_blocked_dates(start_date, end_date);

ALTER TABLE public.property_blocked_dates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view blocked dates"
ON public.property_blocked_dates FOR SELECT
USING (true);

CREATE POLICY "Hosts can manage their blocked dates"
ON public.property_blocked_dates FOR ALL
USING (
  created_by = auth.uid() OR
  property_id IN (
    SELECT id FROM public.properties WHERE host_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all blocked dates"
ON public.property_blocked_dates FOR ALL
USING (is_admin());

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
