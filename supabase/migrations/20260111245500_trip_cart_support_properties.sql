-- Extend trip cart to support properties.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'trip_item_type'
  ) THEN
    BEGIN
      ALTER TYPE public.trip_item_type ADD VALUE IF NOT EXISTS 'property';
    EXCEPTION WHEN duplicate_object THEN
      -- no-op
    END;
  END IF;
END$$;

