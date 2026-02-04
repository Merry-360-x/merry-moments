-- Test support ticket email notification
-- Run this in Supabase SQL Editor

INSERT INTO support_tickets (user_id, subject, message, category, status, priority)
VALUES (
  (SELECT id FROM auth.users LIMIT 1),
  '🧪 Test Ticket - Email Notification Check',
  'This is a test ticket to verify that email notifications are being sent to support@merry360x.com when new tickets are created. The database trigger should automatically send an email with ticket details.',
  'technical',
  'open',
  'medium'
)
RETURNING id, subject, created_at;

-- After running this, check the email inbox for support@merry360x.com
-- You should receive an email with:
-- • Subject: 🎫 [TECHNICAL] 🧪 Test Ticket - Email Notification Check
-- • Formatted HTML email with ticket details
-- • Customer information
-- • Link to customer support dashboard
-- • Reply-to set to the customer's email
