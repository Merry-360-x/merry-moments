-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the auto-close job to run every hour
SELECT cron.schedule(
  'close-inactive-tickets',
  '0 * * * *',
  'SELECT close_inactive_tickets()'
);
