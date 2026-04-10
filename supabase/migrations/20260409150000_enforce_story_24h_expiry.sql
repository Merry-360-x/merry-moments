-- Enforce 24-hour story expiry at the database level.

ALTER TABLE public.stories
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

UPDATE public.stories
SET expires_at = COALESCE(
	expires_at,
	COALESCE(created_at, timezone('utc'::text, now())) + interval '24 hours'
)
WHERE expires_at IS NULL;

ALTER TABLE public.stories
ALTER COLUMN expires_at SET DEFAULT (timezone('utc'::text, now()) + interval '24 hours');

ALTER TABLE public.stories
ALTER COLUMN expires_at SET NOT NULL;

CREATE OR REPLACE FUNCTION public.set_story_expiry_from_created_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
	IF TG_OP = 'UPDATE' THEN
		NEW.created_at = COALESCE(OLD.created_at, NEW.created_at, timezone('utc'::text, now()));
	END IF;

	IF NEW.created_at IS NULL THEN
		NEW.created_at = timezone('utc'::text, now());
	END IF;

	IF NEW.expires_at IS NULL THEN
		NEW.expires_at = NEW.created_at + interval '24 hours';
	END IF;

	IF NEW.expires_at > NEW.created_at + interval '24 hours' THEN
		NEW.expires_at = NEW.created_at + interval '24 hours';
	END IF;

	IF TG_OP = 'UPDATE' AND OLD.expires_at IS NOT NULL AND NEW.expires_at > OLD.expires_at THEN
		NEW.expires_at = OLD.expires_at;
	END IF;

	RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_story_expiry ON public.stories;

CREATE TRIGGER trg_set_story_expiry
BEFORE INSERT OR UPDATE ON public.stories
FOR EACH ROW
EXECUTE FUNCTION public.set_story_expiry_from_created_at();

CREATE INDEX IF NOT EXISTS idx_stories_expires_at
ON public.stories (expires_at DESC);

DROP POLICY IF EXISTS "Anyone can view stories" ON public.stories;
DROP POLICY IF EXISTS "Anyone can view active stories" ON public.stories;

CREATE POLICY "Anyone can view active stories"
ON public.stories
FOR SELECT
TO authenticated, anon
USING (expires_at > timezone('utc'::text, now()));
