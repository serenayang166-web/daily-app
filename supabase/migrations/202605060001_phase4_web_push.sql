create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;
create extension if not exists vault with schema vault;

alter table public.reminder_settings
  add column if not exists last_daily_sent_at timestamptz,
  add column if not exists last_streak_sent_at timestamptz,
  add column if not exists last_behind_sent_at timestamptz,
  add column if not exists timezone text not null default 'Australia/Sydney';

comment on column public.reminder_settings.timezone is
  'IANA timezone used by the send-reminders Edge Function when comparing reminder times.';

-- One-time setup after deploying the Edge Function:
--
-- select vault.create_secret('https://YOUR_PROJECT_REF.supabase.co', 'project_url');
-- select vault.create_secret('YOUR_SERVICE_ROLE_KEY', 'service_role_key');
--
-- select cron.schedule(
--   'daily-app-send-reminders',
--   '*/5 * * * *',
--   $$
--   select net.http_post(
--     url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/send-reminders',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
--     ),
--     body := jsonb_build_object('triggered_at', now())
--   );
--   $$
-- );
