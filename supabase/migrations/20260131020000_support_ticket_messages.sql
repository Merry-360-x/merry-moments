-- Create support_ticket_messages table for chat-like conversation
CREATE TABLE IF NOT EXISTS support_ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id),
  sender_type TEXT NOT NULL CHECK (sender_type IN ('customer', 'staff')),
  sender_name TEXT,
  message TEXT NOT NULL,
  reply_to_id UUID REFERENCES support_ticket_messages(id),
  attachments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookup by ticket
CREATE INDEX IF NOT EXISTS idx_support_ticket_messages_ticket_id ON support_ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_ticket_messages_created_at ON support_ticket_messages(created_at);

-- Enable RLS
ALTER TABLE support_ticket_messages ENABLE ROW LEVEL SECURITY;

-- Users can view messages for their own tickets
CREATE POLICY "Users can view messages for own tickets" ON support_ticket_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM support_tickets 
      WHERE support_tickets.id = support_ticket_messages.ticket_id 
      AND support_tickets.user_id = auth.uid()
    )
  );

-- Users can insert messages for their own tickets
CREATE POLICY "Users can send messages for own tickets" ON support_ticket_messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM support_tickets 
      WHERE support_tickets.id = support_ticket_messages.ticket_id 
      AND support_tickets.user_id = auth.uid()
    )
    AND sender_type = 'customer'
  );

-- Staff can view all messages
CREATE POLICY "Staff can view all messages" ON support_ticket_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role IN ('admin', 'customer_support')
    )
  );

-- Staff can send messages to any ticket
CREATE POLICY "Staff can send messages" ON support_ticket_messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role IN ('admin', 'customer_support')
    )
    AND sender_type = 'staff'
  );

-- Allow public access to the table for authenticated users (needed for real-time)
CREATE POLICY "Authenticated users can subscribe" ON support_ticket_messages
  FOR SELECT
  USING (auth.uid() IS NOT NULL);
