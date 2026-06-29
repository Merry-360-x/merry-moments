-- Enforce block check on direct_messages insert at the DB level.
-- Two layers:
--   1. RLS policy (already existed, kept as first line of defence)
--   2. SECURITY DEFINER trigger (bypasses RLS on blocked_users subquery)

DROP POLICY IF EXISTS direct_messages_insert_sender ON public.direct_messages;

CREATE POLICY direct_messages_insert_sender ON public.direct_messages
  FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND sender_id <> recipient_id
    AND is_safe_direct_message(body)
    AND NOT EXISTS (
      SELECT 1 FROM public.blocked_users
      WHERE blocker_id = recipient_id
        AND blocked_id = auth.uid()
    )
  );

-- Trigger-based check (SECURITY DEFINER, bypasses RLS)
CREATE OR REPLACE FUNCTION public.check_block_on_direct_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.blocked_users
    WHERE blocker_id = NEW.recipient_id
      AND blocked_id = NEW.sender_id
  ) THEN
    RAISE EXCEPTION 'Message could not be delivered.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_block_on_direct_message ON public.direct_messages;
CREATE TRIGGER trg_check_block_on_direct_message
  BEFORE INSERT ON public.direct_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.check_block_on_direct_message();
