-- Allow authenticated users to claim guest push tokens.
--
-- When a guest browses, syncAnonymous() inserts a token row with
-- user_id = NULL (anon RLS allows this).  When that user later signs
-- in, syncForUser() does an UPSERT on the same token.  Since the row
-- already exists, PostgreSQL performs an UPDATE, which is blocked by
-- the existing mobile_push_tokens_update_own policy because it checks
-- auth.uid() = user_id on the existing row (which is NULL).
--
-- This new policy lets any authenticated user UPDATE a row whose
-- user_id IS NULL, but WITH CHECK ensures they can only set user_id
-- to their own auth.uid().

DROP POLICY IF EXISTS mobile_push_tokens_claim_guest ON public.mobile_push_tokens;
CREATE POLICY mobile_push_tokens_claim_guest
  ON public.mobile_push_tokens
  FOR UPDATE
  TO authenticated
  USING (user_id IS NULL)
  WITH CHECK (auth.uid() = user_id);
