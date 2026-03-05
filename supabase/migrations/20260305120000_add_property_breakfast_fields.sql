-- Optional breakfast pricing for property listings
ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS breakfast_available boolean DEFAULT false;

ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS breakfast_price_per_night numeric(10,2);

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conname = 'properties_breakfast_price_non_negative'
	) THEN
		ALTER TABLE public.properties
		ADD CONSTRAINT properties_breakfast_price_non_negative
		CHECK (breakfast_price_per_night IS NULL OR breakfast_price_per_night >= 0);
	END IF;
END $$;
