-- Blocked users table for user-to-user blocking.
-- Enables Guideline 1.2 compliance by letting users block abusive peers.

CREATE TABLE IF NOT EXISTS public.blocked_users (
  blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id)
);

-- Blocked users are always visible to the blocker.
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own blocks"
  ON public.blocked_users
  FOR ALL
  USING (blocker_id = auth.uid())
  WITH CHECK (blocker_id = auth.uid());

-- Allow reads from blocked users table for filtering conversations.
  -- This lets the app check if a user has blocked someone.
CREATE POLICY "Users can see if they are blocked"
  ON public.blocked_users
  FOR SELECT
  USING (blocked_id = auth.uid());

-- Grant access to authenticated users
GRANT ALL ON public.blocked_users TO authenticated;
