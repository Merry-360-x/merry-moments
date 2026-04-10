-- Store mobile push tokens for authenticated users.

CREATE TABLE IF NOT EXISTS public.mobile_push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL,
  platform text NOT NULL DEFAULT 'unknown'
    CHECK (platform IN ('ios', 'android', 'web', 'unknown')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, token)
);

CREATE INDEX IF NOT EXISTS idx_mobile_push_tokens_user_active
  ON public.mobile_push_tokens (user_id)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_mobile_push_tokens_token_active
  ON public.mobile_push_tokens (token)
  WHERE is_active = true;

CREATE OR REPLACE FUNCTION public.touch_mobile_push_tokens_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mobile_push_tokens_updated_at ON public.mobile_push_tokens;
CREATE TRIGGER trg_mobile_push_tokens_updated_at
BEFORE UPDATE ON public.mobile_push_tokens
FOR EACH ROW
EXECUTE FUNCTION public.touch_mobile_push_tokens_updated_at();

ALTER TABLE public.mobile_push_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mobile_push_tokens_select_own ON public.mobile_push_tokens;
CREATE POLICY mobile_push_tokens_select_own
ON public.mobile_push_tokens
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS mobile_push_tokens_insert_own ON public.mobile_push_tokens;
CREATE POLICY mobile_push_tokens_insert_own
ON public.mobile_push_tokens
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS mobile_push_tokens_update_own ON public.mobile_push_tokens;
CREATE POLICY mobile_push_tokens_update_own
ON public.mobile_push_tokens
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS mobile_push_tokens_delete_own ON public.mobile_push_tokens;
CREATE POLICY mobile_push_tokens_delete_own
ON public.mobile_push_tokens
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mobile_push_tokens TO authenticated;
