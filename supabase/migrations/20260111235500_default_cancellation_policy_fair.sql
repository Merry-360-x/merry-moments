-- Ensure we only use the supported cancellation policy types we show in the UI.
-- (We previously used 'flexible' as a default; migrate it to 'fair'.)

DO $$
BEGIN
  IF to_regclass('public.properties') IS NOT NULL THEN
    UPDATE public.properties
    SET cancellation_policy = 'fair'
    WHERE cancellation_policy IS NULL OR cancellation_policy = 'flexible';

    ALTER TABLE public.properties
      ALTER COLUMN cancellation_policy SET DEFAULT 'fair';
  END IF;
END$$;

