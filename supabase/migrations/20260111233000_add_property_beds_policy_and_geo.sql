-- Add fields needed for richer listings:
-- - beds (for property cards)
-- - cancellation_policy (strict/fair/lenient)
-- - latitude/longitude (for "Nearby" search)

DO $$
BEGIN
  IF to_regclass('public.properties') IS NOT NULL THEN
    ALTER TABLE public.properties
      ADD COLUMN IF NOT EXISTS beds INTEGER DEFAULT 1,
      ADD COLUMN IF NOT EXISTS cancellation_policy TEXT DEFAULT 'flexible',
      ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;

    -- Keep values sane (best-effort; doesn't break if constraint already exists).
    BEGIN
      ALTER TABLE public.properties
        ADD CONSTRAINT properties_cancellation_policy_check
        CHECK (cancellation_policy IN ('strict', 'fair', 'flexible', 'lenient'));
    EXCEPTION WHEN duplicate_object THEN
      -- no-op
    END;
  END IF;
END$$;

