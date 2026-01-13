-- Force PostgREST to reload its schema cache
-- This fixes the PGRST204 error when columns exist but aren't in the cache

NOTIFY pgrst, 'reload schema';
