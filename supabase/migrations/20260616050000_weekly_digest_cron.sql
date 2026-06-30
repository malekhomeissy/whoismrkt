-- Activate weekly report cron via pg_cron + pg_net
-- Runs every Monday at 8am UTC

SELECT cron.schedule(
  'weekly-digest',
  '0 8 * * 1',
  $$
    SELECT net.http_post(
      url     := (SELECT value FROM vault.decrypted_secrets WHERE name = 'supabase_url') || '/functions/v1/weekly-report',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || (SELECT value FROM vault.decrypted_secrets WHERE name = 'service_role_key')
      ),
      body    := '{"trigger":"cron"}'::jsonb
    );
  $$
);
