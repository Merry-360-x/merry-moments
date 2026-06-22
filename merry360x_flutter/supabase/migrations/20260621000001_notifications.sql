-- ─────────────────────────────────────────────────────────────
-- Notification system for Merry360x
-- ─────────────────────────────────────────────────────────────

-- 1. Notifications table (in-app notification history)
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(100) NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  screen_route TEXT,
  data JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id, is_read) WHERE NOT is_read;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(user_id, created_at DESC);

-- Auto-clean old notifications (keep 90 days)
SELECT cron.schedule(
  'cleanup-old-notifications',
  '0 3 * * *',
  $$DELETE FROM public.notifications WHERE created_at < NOW() - INTERVAL '90 days'$$
);

-- 2. Notification preferences table
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  push_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  email_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  booking_updates BOOLEAN NOT NULL DEFAULT TRUE,
  payment_updates BOOLEAN NOT NULL DEFAULT TRUE,
  messages BOOLEAN NOT NULL DEFAULT TRUE,
  reviews BOOLEAN NOT NULL DEFAULT TRUE,
  promotional BOOLEAN NOT NULL DEFAULT FALSE,
  reminders BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.create_default_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-create preferences when a user signs up
DROP TRIGGER IF EXISTS trg_create_preferences_on_signup ON auth.users;
CREATE TRIGGER trg_create_preferences_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_preferences();

-- 3. Mark notifications as read (UPSERT-safe)
CREATE OR REPLACE FUNCTION public.mark_notifications_read(
  p_user_id UUID,
  p_ids UUID[]
)
RETURNS void AS $$
BEGIN
  UPDATE public.notifications
  SET is_read = TRUE, read_at = NOW()
  WHERE user_id = p_user_id AND id = ANY(p_ids) AND NOT is_read;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Mark ALL notifications as read for a user
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read(p_user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.notifications
  SET is_read = TRUE, read_at = NOW()
  WHERE user_id = p_user_id AND NOT is_read;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Get unread count
CREATE OR REPLACE FUNCTION public.unread_notification_count(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  cnt INTEGER;
BEGIN
  SELECT COUNT(*) INTO cnt
  FROM public.notifications
  WHERE user_id = p_user_id AND NOT is_read;
  RETURN cnt;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. RLS: users can only see their own notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY notifications_select ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY notifications_insert ON public.notifications
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY notifications_update ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY preferences_select ON public.notification_preferences
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY preferences_update ON public.notification_preferences
  FOR UPDATE USING (user_id = auth.uid());

-- Allow service role to insert notifications for any user
CREATE POLICY notifications_service_insert ON public.notifications
  FOR INSERT TO service_role
  WITH CHECK (TRUE);

CREATE POLICY notifications_service_select ON public.notifications
  FOR SELECT TO service_role
  USING (TRUE);

-- 7. Helper: insert notification + return it
CREATE OR REPLACE FUNCTION public.insert_notification(
  p_user_id UUID,
  p_type VARCHAR(100),
  p_title TEXT,
  p_body TEXT,
  p_screen_route TEXT DEFAULT NULL,
  p_data JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  nid UUID;
BEGIN
  INSERT INTO public.notifications (user_id, type, title, body, screen_route, data)
  VALUES (p_user_id, p_type, p_title, p_body, p_screen_route, p_data)
  RETURNING id INTO nid;
  RETURN nid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
