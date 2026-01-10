DO $$
BEGIN
	IF to_regclass('public.user_preferences') IS NOT NULL THEN
		ALTER TABLE public.user_preferences
		ADD COLUMN IF NOT EXISTS currency text;

		-- Default existing rows to RWF if missing
		UPDATE public.user_preferences
		SET currency = 'RWF'
		WHERE currency IS NULL;

		ALTER TABLE public.user_preferences
		ALTER COLUMN currency SET DEFAULT 'RWF';
	END IF;
END$$;
