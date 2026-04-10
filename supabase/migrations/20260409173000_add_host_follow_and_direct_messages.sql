-- Social graph and direct host messaging with anti-scam protections.

CREATE OR REPLACE FUNCTION public.is_safe_direct_message(_body TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  normalized TEXT := lower(coalesce(_body, ''));
BEGIN
  IF length(trim(normalized)) = 0 THEN
    RETURN false;
  END IF;

  -- Block direct contact details and off-platform links.
  IF normalized ~* '([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})' THEN
    RETURN false;
  END IF;

  IF normalized ~* '(https?://|www\.)' THEN
    RETURN false;
  END IF;

  -- Broad phone pattern: +250 7xx xxx xxx, 07xx..., spaced, dashed or parenthesized.
  IF normalized ~* '(^|[^0-9])\+?[0-9][0-9\-\s\(\)]{6,}[0-9]([^0-9]|$)' THEN
    RETURN false;
  END IF;

  -- Block common off-platform exchange keywords.
  IF normalized ~* '\m(address|phone|telephone|whatsapp|telegram|snapchat|instagram|facebook|contact\s+me|call\s+me|text\s+me|dm\s+me)\M' THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

CREATE TABLE IF NOT EXISTS public.host_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT host_follows_unique_pair UNIQUE (follower_id, host_id),
  CONSTRAINT host_follows_not_self CHECK (follower_id <> host_id)
);

CREATE INDEX IF NOT EXISTS idx_host_follows_host_id
  ON public.host_follows (host_id);

CREATE INDEX IF NOT EXISTS idx_host_follows_follower_id
  ON public.host_follows (follower_id);

CREATE TABLE IF NOT EXISTS public.direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  read_at TIMESTAMPTZ,
  CONSTRAINT direct_messages_not_self CHECK (sender_id <> recipient_id),
  CONSTRAINT direct_messages_body_limit CHECK (char_length(body) BETWEEN 1 AND 1200),
  CONSTRAINT direct_messages_safe_body CHECK (public.is_safe_direct_message(body))
);

CREATE INDEX IF NOT EXISTS idx_direct_messages_sender_created
  ON public.direct_messages (sender_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_direct_messages_recipient_created
  ON public.direct_messages (recipient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_direct_messages_conversation
  ON public.direct_messages (LEAST(sender_id, recipient_id), GREATEST(sender_id, recipient_id), created_at DESC);

CREATE OR REPLACE FUNCTION public.touch_direct_messages_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := timezone('utc'::text, now());
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_direct_message_update_rules()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.sender_id <> OLD.sender_id
    OR NEW.recipient_id <> OLD.recipient_id
    OR NEW.body <> OLD.body
    OR NEW.created_at <> OLD.created_at THEN
    RAISE EXCEPTION 'Only read state can be updated on direct_messages';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_direct_messages_touch_updated_at ON public.direct_messages;
CREATE TRIGGER trg_direct_messages_touch_updated_at
BEFORE UPDATE ON public.direct_messages
FOR EACH ROW
EXECUTE FUNCTION public.touch_direct_messages_updated_at();

DROP TRIGGER IF EXISTS trg_direct_messages_update_rules ON public.direct_messages;
CREATE TRIGGER trg_direct_messages_update_rules
BEFORE UPDATE ON public.direct_messages
FOR EACH ROW
EXECUTE FUNCTION public.enforce_direct_message_update_rules();

ALTER TABLE public.host_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS host_follows_select_all ON public.host_follows;
CREATE POLICY host_follows_select_all
ON public.host_follows
FOR SELECT
TO authenticated, anon
USING (true);

DROP POLICY IF EXISTS host_follows_insert_self ON public.host_follows;
CREATE POLICY host_follows_insert_self
ON public.host_follows
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = follower_id);

DROP POLICY IF EXISTS host_follows_delete_self ON public.host_follows;
CREATE POLICY host_follows_delete_self
ON public.host_follows
FOR DELETE
TO authenticated
USING (auth.uid() = follower_id);

DROP POLICY IF EXISTS direct_messages_select_participant ON public.direct_messages;
CREATE POLICY direct_messages_select_participant
ON public.direct_messages
FOR SELECT
TO authenticated
USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

DROP POLICY IF EXISTS direct_messages_insert_sender ON public.direct_messages;
CREATE POLICY direct_messages_insert_sender
ON public.direct_messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND sender_id <> recipient_id
  AND public.is_safe_direct_message(body)
);

DROP POLICY IF EXISTS direct_messages_update_recipient ON public.direct_messages;
CREATE POLICY direct_messages_update_recipient
ON public.direct_messages
FOR UPDATE
TO authenticated
USING (auth.uid() = recipient_id)
WITH CHECK (auth.uid() = recipient_id);

GRANT SELECT ON public.host_follows TO authenticated, anon;
GRANT INSERT, DELETE ON public.host_follows TO authenticated;

GRANT SELECT ON public.direct_messages TO authenticated;
GRANT INSERT, UPDATE ON public.direct_messages TO authenticated;
