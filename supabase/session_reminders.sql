-- ----------------------------------------------------------------------------
-- SESSION REMINDERS
-- ----------------------------------------------------------------------------
-- Detects stale sessions and exposes them to the send-session-reminders
-- Edge Function (supabase/functions/send-session-reminders), which delivers
-- the actual email via Resend and stamps last_reminder_sent_at. This
-- migration adds only the detection query, an audit log table, and the
-- (project-specific) pg_cron schedule that invokes the Edge Function.
--
-- Reminder rules:
--   requested             > 24h since created_at               -> admins
--   awaiting_post_review  > 24h since post_session_submitted_at -> admins
--   revise                > 48h since revision_requested_at     -> mentor
-- Repeat interval after the first reminder: 24h, for all three rules.
-- last_reminder_sent_at is reset to null by reset_reminder_on_revision()
-- (see mentorly_schema_migration.sql) on every revise event, so a session
-- that's just been sent back for revision is immediately eligible again
-- once it passes the 48h threshold — this migration relies on that reset
-- rather than duplicating it.

-- ----------------------------------------------------------------------------
-- 1. Audit log — durable, queryable record of every reminder actually sent,
--    so this isn't a silent background process with no way to verify it.
-- ----------------------------------------------------------------------------
create table if not exists public.session_reminder_log (
  id               uuid primary key default gen_random_uuid(),
  session_id       uuid not null references public.sessions(id) on delete cascade,
  reminder_type    text not null check (reminder_type in ('requested_pending_admin', 'awaiting_post_review', 'revise_pending_mentor')),
  recipient_role   text not null check (recipient_role in ('admin', 'mentor')),
  recipient_emails text[] not null,
  sent_at          timestamptz not null default now()
);

create index if not exists idx_session_reminder_log_session on public.session_reminder_log(session_id);

alter table public.session_reminder_log enable row level security;

drop policy if exists "session_reminder_log_select_admin" on public.session_reminder_log;
create policy "session_reminder_log_select_admin"
  on public.session_reminder_log for select
  to authenticated
  using (public.is_admin());

-- ----------------------------------------------------------------------------
-- 2. Staleness-detection query, centralized in SQL so it can be tested
--    directly (select * from public.get_stale_session_reminders();) and
--    called by the Edge Function via RPC. Status is part of the query
--    itself (not just the timestamp), so a session that moves out of the
--    monitored status before its next reminder is due simply stops
--    matching — it can never receive a stray reminder afterward.
-- ----------------------------------------------------------------------------
create or replace function public.get_stale_session_reminders()
returns table (
  session_id     uuid,
  reminder_type  text,
  recipient_role text,
  mentor_id      uuid,
  mentor_name    text,
  mentor_email   text,
  student_name   text,
  stale_since    timestamptz
)
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select s.id, 'requested_pending_admin', 'admin', s.mentor_id,
         mp.full_name, mp.email, sp.full_name, s.created_at
  from public.sessions s
  join public.profiles sp on sp.id = s.student_id
  join public.profiles mp on mp.id = s.mentor_id
  where s.status = 'requested'
    and s.created_at < now() - interval '24 hours'
    and (s.last_reminder_sent_at is null or s.last_reminder_sent_at < now() - interval '24 hours')

  union all

  select s.id, 'awaiting_post_review', 'admin', s.mentor_id,
         mp.full_name, mp.email, sp.full_name, s.post_session_submitted_at
  from public.sessions s
  join public.profiles sp on sp.id = s.student_id
  join public.profiles mp on mp.id = s.mentor_id
  where s.status = 'awaiting_post_review'
    and s.post_session_submitted_at is not null
    and s.post_session_submitted_at < now() - interval '24 hours'
    and (s.last_reminder_sent_at is null or s.last_reminder_sent_at < now() - interval '24 hours')

  union all

  select s.id, 'revise_pending_mentor', 'mentor', s.mentor_id,
         mp.full_name, mp.email, sp.full_name, s.revision_requested_at
  from public.sessions s
  join public.profiles sp on sp.id = s.student_id
  join public.profiles mp on mp.id = s.mentor_id
  where s.status = 'revise'
    and s.revision_requested_at is not null
    and s.revision_requested_at < now() - interval '48 hours'
    and (s.last_reminder_sent_at is null or s.last_reminder_sent_at < now() - interval '24 hours');
$$;

revoke all on function public.get_stale_session_reminders() from public, anon, authenticated;
grant execute on function public.get_stale_session_reminders() to service_role;

-- ----------------------------------------------------------------------------
-- 3. Scheduled invocation via pg_cron + pg_net, calling the
--    send-session-reminders Edge Function every hour.
--
--    This block needs project-specific values that must never be committed
--    to git, so it's left commented out. To activate it:
--      1. Enable the "pg_cron" and "pg_net" extensions, if not already
--         enabled (Dashboard > Database > Extensions).
--      2. In the SQL editor (not this file), store the two secrets the
--         job needs:
--           select vault.create_secret('https://<your-project-ref>.supabase.co', 'project_url');
--           select vault.create_secret('<your-service-role-key>', 'service_role_key');
--      3. Run the cron.schedule() call below once, in the SQL editor.
-- ----------------------------------------------------------------------------

-- select cron.schedule(
--   'session-reminders-hourly',
--   '0 * * * *',
--   $cron$
--   select net.http_post(
--     url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
--            || '/functions/v1/send-session-reminders',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
--     ),
--     body := '{}'::jsonb
--   );
--   $cron$
-- );

-- To remove the schedule later: select cron.unschedule('session-reminders-hourly');
