-- ============================================================================
-- MENTORLY: Generalize the student-only allowlist into a role-aware invite
-- list, and make Google sign-in the only way anyone (student, mentor, or
-- admin) gets an account — no more admin-generated passwords for any role.
--
-- What this changes:
--  1. Renames authorized_students -> authorized_users and adds columns to
--     hold the invited person's intended role plus whatever role-specific
--     profile data the admin entered up front (mentor bio/rate/etc, admin
--     permissions), so it can be applied the moment they first sign in.
--  2. Rewrites handle_new_user() so EVERY new sign-in (Google or
--     email/password) must have a matching authorized_users row, and takes
--     its role from that row rather than from client-supplied auth
--     metadata. Previously only role='student' was gated this way — a
--     mentor role could be self-selected on the public signup form with no
--     admin approval at all. This closes that gap for every role.
--  3. Adds a transaction-local bypass flag so handle_new_user() can insert
--     non-student roles into profiles without being blocked by
--     guard_profile_privilege_fields() (which normally only lets an
--     authenticated admin session set role/permissions/etc). The trigger
--     runs outside of any PostgREST/admin session, so auth.uid()/auth.role()
--     aren't populated there and is_admin() can't be relied on to pass.
--
-- Existing accounts are untouched: handle_new_user() only fires on INSERT
-- into auth.users, so nobody who already has a profile is affected either
-- way — this only changes how brand-new accounts get created going forward.
-- ============================================================================
BEGIN;

-- ----------------------------------------------------------------------------
-- STEP 1: Rename + extend the allowlist table
-- ----------------------------------------------------------------------------
ALTER TABLE public.authorized_students RENAME TO authorized_users;

ALTER TABLE public.authorized_users
  ADD COLUMN IF NOT EXISTS role user_role NOT NULL DEFAULT 'student',
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS background text,
  ADD COLUMN IF NOT EXISTS hourly_rate numeric(10,2),
  ADD COLUMN IF NOT EXISTS expertise_tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS permissions text[] NOT NULL DEFAULT '{}';

-- Existing rows were all students (the only role this table used to serve).
UPDATE public.authorized_users SET role = 'student' WHERE role IS NULL;

-- ----------------------------------------------------------------------------
-- STEP 2: Privilege-guard bypass for trigger-driven profile inserts
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_profile_privilege_fields()
RETURNS trigger AS $$
BEGIN
  IF public.is_admin()
     OR coalesce(current_setting('mentorly.bypass_privilege_guard', true), '') = 'true'
  THEN
    RETURN NEW;
  END IF;

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

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- STEP 3: Role-aware, invite-only signup trigger
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  invite public.authorized_users%ROWTYPE;
  resolved_full_name text;
BEGIN
  SELECT * INTO invite
  FROM public.authorized_users
  WHERE lower(email) = lower(new.email);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unauthorized sign-in: % has not been added by an admin.', new.email;
  END IF;

  resolved_full_name := coalesce(
    invite.full_name,
    new.raw_user_meta_data->>'full_name',
    split_part(new.email, '@', 1)
  );

  -- Let this INSERT set role/permissions/mentor fields even though there's
  -- no admin session on this connection (see STEP 2).
  PERFORM set_config('mentorly.bypass_privilege_guard', 'true', true);

  INSERT INTO public.profiles (
    id, email, full_name, role, is_authorized,
    bio, background, hourly_rate, expertise_tags, is_active, permissions
  )
  VALUES (
    new.id,
    new.email,
    resolved_full_name,
    invite.role,
    true,
    invite.bio,
    invite.background,
    invite.hourly_rate,
    invite.expertise_tags,
    invite.is_active,
    invite.permissions
  );

  RETURN new;
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'Error in handle_new_user: %', SQLERRM;
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ----------------------------------------------------------------------------
-- STEP 4: RLS — same admin-only management policy, new table name
-- ----------------------------------------------------------------------------
ALTER TABLE public.authorized_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage authorized students" ON public.authorized_users;
DROP POLICY IF EXISTS "Admins can manage authorized users" ON public.authorized_users;
CREATE POLICY "Admins can manage authorized users"
  ON public.authorized_users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

COMMIT;
