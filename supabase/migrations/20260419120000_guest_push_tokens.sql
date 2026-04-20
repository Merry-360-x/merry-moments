-- Allow guest/anonymous devices to register push tokens so they can
-- receive broadcast notifications even before signing in. When the
-- guest later signs in, syncForUser upserts on the token and attaches
-- their user_id to the same row.

-- 1. Make user_id nullable.
ALTER TABLE public.mobile_push_tokens
  ALTER COLUMN user_id DROP NOT NULL;

-- 2. Drop the old FK (re-added below as nullable-compatible).
ALTER TABLE public.mobile_push_tokens
  DROP CONSTRAINT IF EXISTS mobile_push_tokens_user_id_fkey;

-- Re-add FK: still enforced when user_id IS NOT NULL; CASCADE deletes
-- the row if the referenced user is removed (no orphaned tokens).
ALTER TABLE public.mobile_push_tokens
  ADD CONSTRAINT mobile_push_tokens_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. Replace (user_id, token) unique constraint with token-only unique
--    constraint so each physical device has exactly one row.
ALTER TABLE public.mobile_push_tokens
  DROP CONSTRAINT IF EXISTS mobile_push_tokens_user_id_token_key;

ALTER TABLE public.mobile_push_tokens
  ADD CONSTRAINT mobile_push_tokens_token_key UNIQUE (token);

-- 4. RLS policies for anon role.

-- Anon devices may insert a guest token row (user_id must be NULL).
DROP POLICY IF EXISTS mobile_push_tokens_insert_guest ON public.mobile_push_tokens;
CREATE POLICY mobile_push_tokens_insert_guest
ON public.mobile_push_tokens
FOR INSERT
TO anon
WITH CHECK (user_id IS NULL);

-- Anon devices may update their own guest row (still no user bound).
DROP POLICY IF EXISTS mobile_push_tokens_update_guest ON public.mobile_push_tokens;
CREATE POLICY mobile_push_tokens_update_guest
ON public.mobile_push_tokens
FOR UPDATE
TO anon
USING (user_id IS NULL)
WITH CHECK (user_id IS NULL);

GRANT INSERT, UPDATE ON public.mobile_push_tokens TO anon;
