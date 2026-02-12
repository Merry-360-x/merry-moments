-- Add external hotel calendar integrations for anti-double-booking sync

CREATE TABLE IF NOT EXISTS public.property_calendar_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'ical',
  label TEXT,
  feed_url TEXT NOT NULL,
  feed_token TEXT NOT NULL DEFAULT md5(random()::text || clock_timestamp()::text),
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_synced_at TIMESTAMPTZ,
  last_sync_status TEXT,
  last_sync_error TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT property_calendar_integrations_provider_check CHECK (provider IN ('ical')),
  CONSTRAINT property_calendar_integrations_feed_token_unique UNIQUE (feed_token)
);

CREATE INDEX IF NOT EXISTS idx_property_calendar_integrations_property_id
  ON public.property_calendar_integrations(property_id);

CREATE INDEX IF NOT EXISTS idx_property_calendar_integrations_active
  ON public.property_calendar_integrations(is_active, property_id);

ALTER TABLE public.property_calendar_integrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Hosts can view own calendar integrations" ON public.property_calendar_integrations;
CREATE POLICY "Hosts can view own calendar integrations"
ON public.property_calendar_integrations FOR SELECT
USING (
  property_id IN (
    SELECT id FROM public.properties WHERE host_id = auth.uid()
  )
  OR is_admin()
);

DROP POLICY IF EXISTS "Hosts can manage own calendar integrations" ON public.property_calendar_integrations;
CREATE POLICY "Hosts can manage own calendar integrations"
ON public.property_calendar_integrations FOR ALL
USING (
  property_id IN (
    SELECT id FROM public.properties WHERE host_id = auth.uid()
  )
  OR is_admin()
)
WITH CHECK (
  property_id IN (
    SELECT id FROM public.properties WHERE host_id = auth.uid()
  )
  OR is_admin()
);

-- Keep updated_at in sync
CREATE OR REPLACE FUNCTION public.touch_property_calendar_integrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_property_calendar_integrations_updated_at ON public.property_calendar_integrations;
CREATE TRIGGER trg_property_calendar_integrations_updated_at
BEFORE UPDATE ON public.property_calendar_integrations
FOR EACH ROW
EXECUTE FUNCTION public.touch_property_calendar_integrations_updated_at();
