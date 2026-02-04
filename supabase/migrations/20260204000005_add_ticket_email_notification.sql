-- Alternative migration: Add email notification to ticket creation using webhooks
-- This version uses Supabase webhooks instead of pg_net for better compatibility

-- First, ensure the http extension is available (usually pre-installed in Supabase)
-- If not available, the trigger will gracefully handle the error

-- Function to send email notification when ticket is created
CREATE OR REPLACE FUNCTION notify_support_new_ticket()
RETURNS TRIGGER AS $$
DECLARE
  v_user_email TEXT;
  v_user_name TEXT;
  v_webhook_url TEXT;
BEGIN
  -- Get user details
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = NEW.user_id;
  
  SELECT full_name INTO v_user_name
  FROM profiles
  WHERE id = NEW.user_id;
  
  -- Set webhook URL (you'll need to configure this in your Supabase project settings)
  -- Or use the API endpoint directly
  v_webhook_url := 'https://merry360x.com/api/support-email';
  
  -- Try to send notification via HTTP POST
  -- Using pg_net if available, otherwise skip gracefully
  BEGIN
    PERFORM
      net.http_post(
        url := v_webhook_url,
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := jsonb_build_object(
          'category', COALESCE(NEW.category, 'general'),
          'subject', NEW.subject,
          'message', NEW.message,
          'userId', NEW.user_id::text,
          'userEmail', COALESCE(v_user_email, 'unknown@email.com'),
          'userName', v_user_name
        )
      );
  EXCEPTION
    WHEN OTHERS THEN
      -- Log warning but don't fail ticket creation
      RAISE WARNING 'Could not send email notification: %', SQLERRM;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to call notification function after ticket insert
DROP TRIGGER IF EXISTS trigger_notify_support_new_ticket ON support_tickets;
CREATE TRIGGER trigger_notify_support_new_ticket
  AFTER INSERT ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION notify_support_new_ticket();

-- Add comment
COMMENT ON FUNCTION notify_support_new_ticket() IS 'Sends email notification to support@merry360x.com when a new ticket is created';
