-- Aggressive schema cache reload by making a trivial schema change
-- This forces PostgREST to completely reload the schema cache

-- Drop and recreate a harmless function to trigger full schema reload
DROP FUNCTION IF EXISTS public.force_schema_reload();

CREATE FUNCTION public.force_schema_reload()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS 'SELECT NULL';

-- Execute the reload
SELECT public.force_schema_reload();

-- Send multiple reload signals
DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
  PERFORM pg_notify('pgrst', 'reload config');
END $$;

NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
