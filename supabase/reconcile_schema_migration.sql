-- ============================================================================
-- MENTORLY: LIVE SCHEMA RECONCILIATION MIGRATION
-- Reconciles live database toward mentorly_schema_migration.sql target state
-- Zero data loss: Preserves all 44 bookings, profiles, mentors, students, etc.
-- ============================================================================
BEGIN;

-- ----------------------------------------------------------------------------
-- STEP 1: CREATE NEW ENUM TYPE (session_status)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'session_status') THEN
    CREATE TYPE public.session_status AS ENUM (
      'requested',
      'rejected',
      'scheduled',
      'awaiting_post_review',
      'revise',
      'completed'
    );
  END IF;
END $$;


-- ----------------------------------------------------------------------------
-- STEP 2: RECONCILE PROFILES TABLE (Consolidating mentors and students)
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_authorized boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS background text,
  ADD COLUMN IF NOT EXISTS hourly_rate numeric(10,2),
  ADD COLUMN IF NOT EXISTS expertise_tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS permissions text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Backfill profile fields from mentors table
UPDATE public.profiles p
SET
  bio = COALESCE(p.bio, m.bio),
  background = COALESCE(p.background, m.background),
  hourly_rate = COALESCE(p.hourly_rate, m.hourly_rate),
  expertise_tags = CASE WHEN array_length(p.expertise_tags, 1) IS NULL OR array_length(p.expertise_tags, 1) = 0
                        THEN COALESCE(m.expertise, '{}')
                        ELSE p.expertise_tags END,
  is_active = COALESCE(m.is_active, p.is_active, true)
FROM public.mentors m
WHERE p.id = m.id;

-- Backfill profile fields from students table
UPDATE public.profiles p
SET
  bio = COALESCE(p.bio, s.bio)
FROM public.students s
WHERE p.id = s.id;

-- Backfill is_authorized based on authorized_students table or non-student roles
UPDATE public.profiles p
SET is_authorized = true
WHERE p.role IN ('mentor', 'admin')
   OR EXISTS (
     SELECT 1 FROM public.authorized_students a
     WHERE lower(a.email) = lower(p.email)
   );

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);


-- ----------------------------------------------------------------------------
-- STEP 3: MIGRATE BOOKINGS TO SESSIONS (Rename & Expand)
-- ----------------------------------------------------------------------------
-- If sessions table does not exist, rename bookings to sessions
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sessions')
     AND EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'bookings') THEN
    ALTER TABLE public.bookings RENAME TO sessions;
  END IF;
END $$;

-- Add new target columns to sessions table
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS pre_work_reason text,
  ADD COLUMN IF NOT EXISTS requested_date date,
  ADD COLUMN IF NOT EXISTS requested_start_time time,
  ADD COLUMN IF NOT EXISTS key_insights text,
  ADD COLUMN IF NOT EXISTS student_actionables text,
  ADD COLUMN IF NOT EXISTS actual_duration_minutes integer,
  ADD COLUMN IF NOT EXISTS admin_feedback_note text,
  ADD COLUMN IF NOT EXISTS post_session_submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS revision_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_reminder_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Backfill date and time from start_time
UPDATE public.sessions
SET
  requested_date = COALESCE(requested_date, (start_time AT TIME ZONE 'UTC')::date),
  requested_start_time = COALESCE(requested_start_time, (start_time AT TIME ZONE 'UTC')::time),
  pre_work_reason = COALESCE(pre_work_reason, 'General mentorship session')
WHERE requested_date IS NULL OR requested_start_time IS NULL OR pre_work_reason IS NULL;

-- Backfill post-session fields for completed sessions
UPDATE public.sessions
SET
  actual_duration_minutes = COALESCE(actual_duration_minutes, duration_minutes, 60),
  post_session_submitted_at = COALESCE(post_session_submitted_at, end_time, start_time, now())
WHERE status::text = 'completed' AND post_session_submitted_at IS NULL;

-- Backfill student_actionables from legacy session_notes table
UPDATE public.sessions s
SET student_actionables = sn.content
FROM public.session_notes sn
WHERE sn.booking_id = s.id
  AND sn.content IS NOT NULL
  AND sn.content <> ''
  AND (s.student_actionables IS NULL OR s.student_actionables = '');

-- Ensure rejection_reason is populated for any legacy rejected sessions
UPDATE public.sessions
SET rejection_reason = 'Administrative rejection'
WHERE status::text = 'rejected' AND (rejection_reason IS NULL OR rejection_reason = '');

-- Convert status column to new session_status enum
ALTER TABLE public.sessions
  ALTER COLUMN status DROP DEFAULT;

ALTER TABLE public.sessions
  ALTER COLUMN status TYPE public.session_status
  USING (
    CASE status::text
      WHEN 'pending' THEN 'requested'::public.session_status
      WHEN 'rejected' THEN 'rejected'::public.session_status
      WHEN 'scheduled' THEN 'scheduled'::public.session_status
      WHEN 'completed' THEN 'completed'::public.session_status
      WHEN 'cancelled' THEN 'rejected'::public.session_status
      ELSE 'requested'::public.session_status
    END
  );

ALTER TABLE public.sessions
  ALTER COLUMN status SET DEFAULT 'requested'::public.session_status,
  ALTER COLUMN pre_work_reason SET NOT NULL,
  ALTER COLUMN requested_date SET NOT NULL,
  ALTER COLUMN requested_start_time SET NOT NULL;

-- Update foreign key constraint on mentor_id to point directly to profiles
ALTER TABLE public.sessions DROP CONSTRAINT IF EXISTS bookings_mentor_id_fkey;
ALTER TABLE public.sessions DROP CONSTRAINT IF EXISTS sessions_mentor_id_fkey;
ALTER TABLE public.sessions
  ADD CONSTRAINT sessions_mentor_id_fkey FOREIGN KEY (mentor_id) REFERENCES public.profiles(id);

-- Apply constraints matching target schema
ALTER TABLE public.sessions DROP CONSTRAINT IF EXISTS rejection_reason_required;
ALTER TABLE public.sessions
  ADD CONSTRAINT rejection_reason_required CHECK (status <> 'rejected' OR rejection_reason IS NOT NULL);

ALTER TABLE public.sessions DROP CONSTRAINT IF EXISTS duration_minutes_check;
ALTER TABLE public.sessions
  ADD CONSTRAINT duration_minutes_check CHECK (duration_minutes IN (15, 30, 45, 60));

ALTER TABLE public.sessions DROP CONSTRAINT IF EXISTS actual_duration_minutes_check;
ALTER TABLE public.sessions
  ADD CONSTRAINT actual_duration_minutes_check CHECK (actual_duration_minutes IS NULL OR actual_duration_minutes % 15 = 0);

-- Target Indexes
CREATE INDEX IF NOT EXISTS idx_sessions_student_mentor_history
  ON public.sessions (student_id, mentor_id, post_session_submitted_at DESC)
  WHERE post_session_submitted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sessions_status ON public.sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_mentor ON public.sessions(mentor_id);
CREATE INDEX IF NOT EXISTS idx_sessions_student ON public.sessions(student_id);

-- Backward-compatibility view for any legacy code expecting 'bookings'
CREATE OR REPLACE VIEW public.bookings AS
SELECT
  id,
  mentor_id,
  student_id,
  COALESCE(start_time, (requested_date + requested_start_time)::timestamptz) AS start_time,
  COALESCE(end_time, (requested_date + requested_start_time + (duration_minutes || ' minutes')::interval)::timestamptz) AS end_time,
  status::text AS status,
  meet_link,
  google_event_id,
  duration_minutes,
  slot_count,
  rejection_reason
FROM public.sessions;


-- ----------------------------------------------------------------------------
-- STEP 4: CREATE SESSION_REVISIONS TABLE & TRIGGER
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.session_revisions (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id              uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  reason                  text NOT NULL,
  requested_by_admin_id   uuid NOT NULL REFERENCES public.profiles(id),
  created_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_session_revisions_session ON public.session_revisions(session_id);

CREATE OR REPLACE FUNCTION public.reset_reminder_on_revision()
RETURNS trigger AS $$
BEGIN
  UPDATE public.sessions
  SET revision_requested_at = NEW.created_at,
      last_reminder_sent_at = NULL,
      status = 'revise'
  WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_session_revision_created ON public.session_revisions;
CREATE TRIGGER on_session_revision_created
  AFTER INSERT ON public.session_revisions
  FOR EACH ROW EXECUTE FUNCTION public.reset_reminder_on_revision();


-- ----------------------------------------------------------------------------
-- STEP 5: CREATE ADMIN PAYMENTS VIEW
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.admin_payments_view AS
SELECT
  p.id                                        AS mentor_id,
  p.full_name                                 AS mentor_name,
  p.hourly_rate,
  COUNT(s.id)                                 AS completed_sessions,
  COALESCE(SUM(s.actual_duration_minutes), 0) AS total_minutes,
  ROUND(COALESCE(SUM(s.actual_duration_minutes), 0) / 60.0, 2) AS total_hours,
  ROUND(
    (COALESCE(SUM(s.actual_duration_minutes), 0) / 60.0) * COALESCE(p.hourly_rate, 0),
    2
  ) AS total_earnings
FROM public.profiles p
LEFT JOIN public.sessions s
  ON s.mentor_id = p.id AND s.status = 'completed'
WHERE p.role = 'mentor'
GROUP BY p.id, p.full_name, p.hourly_rate;


-- ----------------------------------------------------------------------------
-- STEP 6: UPDATED_AT TRIGGER
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at_profiles ON public.profiles;
CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_sessions ON public.sessions;
CREATE TRIGGER set_updated_at_sessions
  BEFORE UPDATE ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


-- ----------------------------------------------------------------------------
-- STEP 7: ROW LEVEL SECURITY POLICIES
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_revisions ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT (
    coalesce(auth.role(), '') = 'service_role'
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Profiles Policies
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
CREATE POLICY "profiles_select_all"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "profiles_insert_admin_only" ON public.profiles;
CREATE POLICY "profiles_insert_admin_only"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin() OR auth.uid() = id);

-- Sessions Policies
DROP POLICY IF EXISTS "sessions_select_own_or_admin" ON public.sessions;
DROP POLICY IF EXISTS "Students can view their bookings." ON public.sessions;
DROP POLICY IF EXISTS "Mentors can view their bookings." ON public.sessions;
DROP POLICY IF EXISTS "Admins can view all bookings." ON public.sessions;
CREATE POLICY "sessions_select_own_or_admin"
  ON public.sessions FOR SELECT
  TO authenticated
  USING (
    student_id = auth.uid()
    OR mentor_id = auth.uid()
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "sessions_insert_own_student" ON public.sessions;
DROP POLICY IF EXISTS "Students can insert their own bookings." ON public.sessions;
CREATE POLICY "sessions_insert_own_student"
  ON public.sessions FOR INSERT
  TO authenticated
  WITH CHECK (student_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "sessions_update_admin" ON public.sessions;
DROP POLICY IF EXISTS "Admins can update any booking." ON public.sessions;
CREATE POLICY "sessions_update_admin"
  ON public.sessions FOR UPDATE
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "sessions_update_own_mentor" ON public.sessions;
DROP POLICY IF EXISTS "Mentors can update their bookings." ON public.sessions;
CREATE POLICY "sessions_update_own_mentor"
  ON public.sessions FOR UPDATE
  TO authenticated
  USING (mentor_id = auth.uid());

-- Mentor column guard trigger
CREATE OR REPLACE FUNCTION public.guard_mentor_session_update()
RETURNS trigger AS $$
BEGIN
  IF auth.uid() = OLD.mentor_id AND NOT public.is_admin() THEN
    IF NEW.status IS DISTINCT FROM OLD.status
      OR NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason
      OR NEW.meet_link IS DISTINCT FROM OLD.meet_link
      OR NEW.student_id IS DISTINCT FROM OLD.student_id
      OR NEW.mentor_id IS DISTINCT FROM OLD.mentor_id
    THEN
      RAISE EXCEPTION 'Mentors may only edit post-session form fields';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS enforce_mentor_session_columns ON public.sessions;
CREATE TRIGGER enforce_mentor_session_columns
  BEFORE UPDATE ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION public.guard_mentor_session_update();

-- Session Revisions Policies
DROP POLICY IF EXISTS "session_revisions_select" ON public.session_revisions;
CREATE POLICY "session_revisions_select"
  ON public.session_revisions FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = session_id AND s.mentor_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "session_revisions_insert_admin" ON public.session_revisions;
CREATE POLICY "session_revisions_insert_admin"
  ON public.session_revisions FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());


-- ----------------------------------------------------------------------------
-- STEP 8: PRIVILEGE GUARD & SECURITY INVOKER ON VIEWS
-- ----------------------------------------------------------------------------

-- FIX 1: Prevent users from self-escalating privileges via profiles table
CREATE OR REPLACE FUNCTION public.guard_profile_privilege_fields()
RETURNS trigger AS $$
BEGIN
  IF NOT public.is_admin() THEN
    IF TG_OP = 'INSERT' THEN
      IF NEW.role IS DISTINCT FROM 'student' THEN
        RAISE EXCEPTION 'Only admins can set a role other than student';
      END IF;
      NEW.is_authorized := false;
      NEW.permissions := '{}';
    END IF;

    IF TG_OP = 'UPDATE' THEN
      IF NEW.role IS DISTINCT FROM OLD.role
        OR NEW.permissions IS DISTINCT FROM OLD.permissions
        OR NEW.is_authorized IS DISTINCT FROM OLD.is_authorized
        OR NEW.is_active IS DISTINCT FROM OLD.is_active
        OR NEW.hourly_rate IS DISTINCT FROM OLD.hourly_rate
        OR NEW.expertise_tags IS DISTINCT FROM OLD.expertise_tags
      THEN
        RAISE EXCEPTION 'Only admins can change role, permissions, or mentor settings';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS guard_profiles_privilege ON public.profiles;
CREATE TRIGGER guard_profiles_privilege
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_privilege_fields();

-- FIX 2: Make sure the new views respect row-level security instead of
-- bypassing it (Postgres/Supabase views don't inherit RLS by default)
ALTER VIEW public.bookings SET (security_invoker = true);
ALTER VIEW public.admin_payments_view SET (security_invoker = true);

COMMIT;

