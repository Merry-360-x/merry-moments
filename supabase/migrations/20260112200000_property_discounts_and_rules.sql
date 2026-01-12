-- Migration: Add discounts and rules to properties

DO $$
BEGIN
  -- Add discount columns
  ALTER TABLE public.properties
    ADD COLUMN IF NOT EXISTS weekly_discount NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS monthly_discount NUMERIC DEFAULT 0;

  -- Add rules columns
  ALTER TABLE public.properties
    ADD COLUMN IF NOT EXISTS check_in_time TIME DEFAULT '14:00',
    ADD COLUMN IF NOT EXISTS check_out_time TIME DEFAULT '11:00',
    ADD COLUMN IF NOT EXISTS smoking_allowed BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS events_allowed BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS pets_allowed BOOLEAN DEFAULT FALSE;

  -- Add comments
  COMMENT ON COLUMN public.properties.weekly_discount IS 'Percentage discount for stays of 7+ days';
  COMMENT ON COLUMN public.properties.monthly_discount IS 'Percentage discount for stays of 28+ days';
  COMMENT ON COLUMN public.properties.check_in_time IS 'Check-in time for the property';
  COMMENT ON COLUMN public.properties.check_out_time IS 'Check-out time for the property';
  COMMENT ON COLUMN public.properties.smoking_allowed IS 'Whether smoking is allowed';
  COMMENT ON COLUMN public.properties.events_allowed IS 'Whether events are allowed';
  COMMENT ON COLUMN public.properties.pets_allowed IS 'Whether pets are allowed';

END $$;
