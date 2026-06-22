-- Schedule the cron-reminders Edge Function to run every hour
SELECT cron.schedule(
  'hourly-reminders',
  '0 * * * *',
  $$
  SELECT extensions.net_http_post(
    url := 'https://uwgiostcetoxotfnulfm.supabase.co/functions/v1/cron-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(
        current_setting('app.settings.supabase_anon_key', TRUE),
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
      )
    ),
    body := '{}'
  );
  $$
);
