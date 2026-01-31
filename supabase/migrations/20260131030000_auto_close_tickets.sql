-- Auto-close tickets after 24 hours of inactivity
-- This function will be called by a cron job or can be triggered manually

-- Add last_activity_at column to track activity
ALTER TABLE support_tickets 
ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ DEFAULT NOW();

-- Create function to update last_activity_at when messages are added
CREATE OR REPLACE FUNCTION update_ticket_last_activity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE support_tickets 
  SET last_activity_at = NOW()
  WHERE id = NEW.ticket_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for message inserts
DROP TRIGGER IF EXISTS trigger_update_ticket_activity ON support_ticket_messages;
CREATE TRIGGER trigger_update_ticket_activity
AFTER INSERT ON support_ticket_messages
FOR EACH ROW
EXECUTE FUNCTION update_ticket_last_activity();

-- Create function to auto-close inactive tickets
CREATE OR REPLACE FUNCTION close_inactive_tickets()
RETURNS INTEGER AS $$
DECLARE
  closed_count INTEGER;
BEGIN
  WITH closed AS (
    UPDATE support_tickets
    SET status = 'closed'
    WHERE status IN ('open', 'in_progress')
      AND last_activity_at < NOW() - INTERVAL '24 hours'
    RETURNING id
  )
  SELECT COUNT(*) INTO closed_count FROM closed;
  
  RETURN closed_count;
END;
$$ LANGUAGE plpgsql;

-- Update existing tickets to have last_activity_at
UPDATE support_tickets 
SET last_activity_at = COALESCE(
  (SELECT MAX(created_at) FROM support_ticket_messages WHERE ticket_id = support_tickets.id),
  created_at
)
WHERE last_activity_at IS NULL;

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_support_tickets_last_activity 
ON support_tickets(last_activity_at) 
WHERE status IN ('open', 'in_progress');
