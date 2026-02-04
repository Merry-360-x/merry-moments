-- Add support ticket activity logs table
-- This tracks all changes and updates to support tickets

-- Create support_ticket_logs table
CREATE TABLE IF NOT EXISTS support_ticket_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('created', 'status_changed', 'priority_changed', 'assigned', 'response_added', 'message_added', 'closed', 'reopened')),
  old_value TEXT,
  new_value TEXT,
  message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ticket_logs_ticket_id ON support_ticket_logs(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_logs_user_id ON support_ticket_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ticket_logs_action_type ON support_ticket_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_ticket_logs_created_at ON support_ticket_logs(created_at DESC);

-- Enable RLS
ALTER TABLE support_ticket_logs ENABLE ROW LEVEL SECURITY;

-- Policies: Support staff and admins can view all logs
CREATE POLICY "Support staff can view all ticket logs"
ON support_ticket_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('customer_support', 'admin')
    LIMIT 1
  )
);

-- Customers can view logs for their own tickets
CREATE POLICY "Users can view own ticket logs"
ON support_ticket_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM support_tickets
    WHERE support_tickets.id = support_ticket_logs.ticket_id
    AND support_tickets.user_id = auth.uid()
    LIMIT 1
  )
);

-- Only authenticated users can insert logs (system/staff)
CREATE POLICY "Authenticated users can create logs"
ON support_ticket_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Grant permissions
GRANT SELECT, INSERT ON support_ticket_logs TO authenticated;
GRANT SELECT ON support_ticket_logs TO anon;

-- Function to automatically log ticket creation
CREATE OR REPLACE FUNCTION log_ticket_creation()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO support_ticket_logs (
    ticket_id,
    user_id,
    action_type,
    new_value,
    message
  ) VALUES (
    NEW.id,
    NEW.user_id,
    'created',
    NEW.status,
    'Ticket created'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to automatically log ticket status changes
CREATE OR REPLACE FUNCTION log_ticket_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO support_ticket_logs (
      ticket_id,
      user_id,
      action_type,
      old_value,
      new_value,
      message
    ) VALUES (
      NEW.id,
      auth.uid(),
      'status_changed',
      OLD.status,
      NEW.status,
      'Status changed from ' || OLD.status || ' to ' || NEW.status
    );
  END IF;
  
  IF OLD.priority IS DISTINCT FROM NEW.priority THEN
    INSERT INTO support_ticket_logs (
      ticket_id,
      user_id,
      action_type,
      old_value,
      new_value,
      message
    ) VALUES (
      NEW.id,
      auth.uid(),
      'priority_changed',
      OLD.priority,
      NEW.priority,
      'Priority changed from ' || OLD.priority || ' to ' || NEW.priority
    );
  END IF;
  
  IF OLD.response IS NULL AND NEW.response IS NOT NULL THEN
    INSERT INTO support_ticket_logs (
      ticket_id,
      user_id,
      action_type,
      message
    ) VALUES (
      NEW.id,
      auth.uid(),
      'response_added',
      'Staff response added'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_log_ticket_creation ON support_tickets;
CREATE TRIGGER trigger_log_ticket_creation
  AFTER INSERT ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION log_ticket_creation();

DROP TRIGGER IF EXISTS trigger_log_ticket_updates ON support_tickets;
CREATE TRIGGER trigger_log_ticket_updates
  AFTER UPDATE ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION log_ticket_status_change();

-- Add comment
COMMENT ON TABLE support_ticket_logs IS 'Activity log for support ticket changes and updates';
