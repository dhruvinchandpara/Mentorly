-- ───────────────────────────────────────────────────────────────────────────
-- Migration: add_session_notes
-- Creates a shared, one-per-booking note for post-meeting task tracking.
-- Run this in the Supabase SQL Editor.
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.session_notes (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id        uuid        NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
  content           text        NOT NULL DEFAULT '',
  last_edited_by    uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  last_edited_at    timestamptz NOT NULL DEFAULT now(),
  is_locked         boolean     NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookup by booking
CREATE INDEX IF NOT EXISTS idx_session_notes_booking_id ON public.session_notes(booking_id);

-- ── Row Level Security ─────────────────────────────────────────────────────
ALTER TABLE public.session_notes ENABLE ROW LEVEL SECURITY;

-- Admins can read all notes
CREATE POLICY "Admins can read all session notes"
  ON public.session_notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Mentor of the booking can read & write their session notes
CREATE POLICY "Mentor can read their booking notes"
  ON public.session_notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      JOIN public.mentors m ON m.id = b.mentor_id
      WHERE b.id = session_notes.booking_id
        AND m.id = auth.uid()
    )
  );

CREATE POLICY "Mentor can upsert their booking notes"
  ON public.session_notes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bookings b
      JOIN public.mentors m ON m.id = b.mentor_id
      WHERE b.id = session_notes.booking_id
        AND m.id = auth.uid()
    )
  );

CREATE POLICY "Mentor can update their booking notes"
  ON public.session_notes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      JOIN public.mentors m ON m.id = b.mentor_id
      WHERE b.id = session_notes.booking_id
        AND m.id = auth.uid()
    )
  );

-- Student of the booking can read (view-only)
CREATE POLICY "Student can read their booking notes"
  ON public.session_notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = session_notes.booking_id
        AND b.student_id = auth.uid()
    )
  );

-- Nobody can delete notes
-- (No DELETE policy = no deletes allowed)
