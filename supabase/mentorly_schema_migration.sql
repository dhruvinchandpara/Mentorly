-- ============================================================================
-- MENTORLY — REVISED SCHEMA (TARGET STATE)
-- ============================================================================
-- This is the destination schema, not a verified diff against your current
-- database. Anti-Gravity should reconcile your existing tables toward this
-- shape (rename/alter where equivalents already exist) rather than blindly
-- running CREATE TABLE against a database that likely already has a mentors
-- table, a students table, and a sessions table under different names.
--
-- Covers, per the finalized answers:
--  1. Rejected requests are independent — no "supersedes" link.
--  2. Historical actionables ignore approval status (flagged in UI instead).
--  3. Revise loop is uncapped — full audit trail via session_revisions.
--  4. No separate "no-show" status — handled via Revise + reason.
--  5. Reminder timer resets on every revise event, not just first submission.
--  6. Payments is a read-only computed view — no invoice/payout table.
--  7. Actual duration is constrained to 15-minute multiples at the DB layer.
--  8. No permission gate on payments — all admins can read the view.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. ENUMS
-- ----------------------------------------------------------------------------

create type user_role as enum ('student', 'mentor', 'admin');

create type session_status as enum (
  'requested',            -- student submitted, awaiting admin pre-review
  'rejected',             -- admin rejected pre-session request
  'scheduled',            -- admin approved, meeting confirmed
  'awaiting_post_review', -- mentor submitted post-session form, admin reviewing
  'revise',               -- admin sent post-session form back to mentor
  'completed'             -- admin approved post-session form; hours count
);


-- ----------------------------------------------------------------------------
-- 2. PROFILES (consolidated — replaces separate mentor/student/admin tables)
-- ----------------------------------------------------------------------------
-- One row per person, linked 1:1 to Supabase Auth. Role-specific fields stay
-- nullable rather than split into role tables — simpler joins, and this app's
-- per-role field count is small enough that it doesn't justify normalization.

create table public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  full_name       text not null,
  email           text not null unique,
  role            user_role not null,

  -- student-only
  is_authorized   boolean not null default false,

  -- mentor-only
  bio             text,
  background      text,
  hourly_rate     numeric(10,2),
  expertise_tags  text[] not null default '{}',
  is_active       boolean not null default true,

  -- admin-only
  permissions     text[] not null default '{}',  -- e.g. {manage_mentors, manage_students, manage_admins}

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_profiles_role on public.profiles(role);

-- Auto-create a profile row whenever someone signs up via Supabase Auth.
-- Adjust the metadata keys to whatever your sign-up form actually sends.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.email,
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'student')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ----------------------------------------------------------------------------
-- 3. SESSIONS (unified — one row per booking, spans the entire lifecycle)
-- ----------------------------------------------------------------------------

create table public.sessions (
  id                          uuid primary key default gen_random_uuid(),
  student_id                  uuid not null references public.profiles(id),
  mentor_id                   uuid not null references public.profiles(id),

  -- pre-session request
  duration_minutes            integer not null check (duration_minutes in (15, 30, 45, 60)),
  pre_work_reason             text not null,
  requested_date              date not null,
  requested_start_time        time not null,

  status                      session_status not null default 'requested',
  rejection_reason            text,
  meet_link                   text,

  -- post-session form (mentor-submitted)
  key_insights                text,
  student_actionables         text,
  actual_duration_minutes     integer check (actual_duration_minutes is null or actual_duration_minutes % 15 = 0),
  admin_feedback_note         text,  -- optional, mentor to admin

  post_session_submitted_at   timestamptz,
  revision_requested_at       timestamptz,  -- reset on every revise event, drives reminder logic
  last_reminder_sent_at       timestamptz,

  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),

  constraint rejection_reason_required
    check (status <> 'rejected' or rejection_reason is not null)
);

-- Historical-actionables lookup: most recent prior session for a given
-- student/mentor pair that has a submitted post-session form, regardless
-- of whether that session was ever approved (per answer #2).
create index idx_sessions_student_mentor_history
  on public.sessions (student_id, mentor_id, post_session_submitted_at desc)
  where post_session_submitted_at is not null;

create index idx_sessions_status on public.sessions(status);
create index idx_sessions_mentor on public.sessions(mentor_id);
create index idx_sessions_student on public.sessions(student_id);


-- ----------------------------------------------------------------------------
-- 4. SESSION_REVISIONS (audit trail for the uncapped revise loop)
-- ----------------------------------------------------------------------------
-- Per answer #3: no cap on revise cycles, so history must live in its own
-- table rather than a single "reason" column that a new revise would overwrite.

create table public.session_revisions (
  id                      uuid primary key default gen_random_uuid(),
  session_id              uuid not null references public.sessions(id) on delete cascade,
  reason                  text not null,
  requested_by_admin_id   uuid not null references public.profiles(id),
  created_at              timestamptz not null default now()
);

create index idx_session_revisions_session on public.session_revisions(session_id);

-- Every time admin sends a session back for revision, reset the reminder
-- clock (answer #5: reminders apply to revise resubmissions too, not just
-- the original post-session submission).
create or replace function public.reset_reminder_on_revision()
returns trigger as $$
begin
  update public.sessions
  set revision_requested_at = new.created_at,
      last_reminder_sent_at = null,
      status = 'revise'
  where id = new.session_id;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_session_revision_created
  after insert on public.session_revisions
  for each row execute function public.reset_reminder_on_revision();


-- ----------------------------------------------------------------------------
-- 5. PAYMENTS VIEW (read-only — answer #6, no persisted invoice table)
-- ----------------------------------------------------------------------------
-- A GROUP BY view is not updatable in Postgres by default, which gives us
-- "read-only" for free — no separate permission logic needed to enforce it.

create view public.admin_payments_view as
select
  p.id                                        as mentor_id,
  p.full_name                                 as mentor_name,
  p.hourly_rate,
  count(s.id)                                 as completed_sessions,
  coalesce(sum(s.actual_duration_minutes), 0) as total_minutes,
  round(coalesce(sum(s.actual_duration_minutes), 0) / 60.0, 2) as total_hours,
  round(
    (coalesce(sum(s.actual_duration_minutes), 0) / 60.0) * coalesce(p.hourly_rate, 0),
    2
  ) as total_earnings
from public.profiles p
left join public.sessions s
  on s.mentor_id = p.id and s.status = 'completed'
where p.role = 'mentor'
group by p.id, p.full_name, p.hourly_rate;


-- ----------------------------------------------------------------------------
-- 6. UPDATED_AT MAINTENANCE
-- ----------------------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at_profiles
  before update on public.profiles
  for each row execute function public.touch_updated_at();

create trigger set_updated_at_sessions
  before update on public.sessions
  for each row execute function public.touch_updated_at();


-- ----------------------------------------------------------------------------
-- 7. ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.sessions enable row level security;
alter table public.session_revisions enable row level security;

create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer stable;

-- Profiles: everyone authenticated can read (mentor marketplace, admin
-- management screens all need this). Writes are self-only or admin-only.
create policy profiles_select_all
  on public.profiles for select
  to authenticated
  using (true);

create policy profiles_update_own
  on public.profiles for update
  to authenticated
  using (id = auth.uid() or public.is_admin());

create policy profiles_insert_admin_only
  on public.profiles for insert
  to authenticated
  with check (public.is_admin());

-- Sessions: students and mentors see only their own; admins see everything.
create policy sessions_select_own_or_admin
  on public.sessions for select
  to authenticated
  using (
    student_id = auth.uid()
    or mentor_id = auth.uid()
    or public.is_admin()
  );

create policy sessions_insert_own_student
  on public.sessions for insert
  to authenticated
  with check (student_id = auth.uid());

-- Admins can update any field (approve/reject/revise/complete).
create policy sessions_update_admin
  on public.sessions for update
  to authenticated
  using (public.is_admin());

-- Mentors can update their own sessions, but RLS is row-level, not
-- column-level — the trigger below stops a mentor from touching admin-only
-- fields (status, rejection_reason, meet_link) via this same policy.
create policy sessions_update_own_mentor
  on public.sessions for update
  to authenticated
  using (mentor_id = auth.uid());

create or replace function public.guard_mentor_session_update()
returns trigger as $$
begin
  if auth.uid() = old.mentor_id and not public.is_admin() then
    if new.status is distinct from old.status
      or new.rejection_reason is distinct from old.rejection_reason
      or new.meet_link is distinct from old.meet_link
      or new.student_id is distinct from old.student_id
      or new.mentor_id is distinct from old.mentor_id
    then
      raise exception 'Mentors may only edit post-session form fields';
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger enforce_mentor_session_columns
  before update on public.sessions
  for each row execute function public.guard_mentor_session_update();

-- Session revisions: admins write, admin + the session's mentor can read.
create policy session_revisions_select
  on public.session_revisions for select
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.sessions s
      where s.id = session_id and s.mentor_id = auth.uid()
    )
  );

create policy session_revisions_insert_admin
  on public.session_revisions for insert
  to authenticated
  with check (public.is_admin());

-- Payments view: every admin, no permission gate (answer #8). Views inherit
-- RLS from their underlying tables, so admins already pass via is_admin()
-- checks on profiles/sessions above — no separate grant needed.
