-- =============================================
-- RLS Policies for Student Marketplace & Booking
-- Run this in your Supabase SQL Editor
-- =============================================

-- 1. Allow everyone to read availability (students need to see mentor schedules)
-- The current policies only let mentors see their OWN availability.
create policy "Availability is viewable by everyone."
  on public.availability for select
  using ( true );

-- 2. (Optional) If you haven't already, ensure bookings insert policy works for students.
-- This should already exist from schema.sql, but verify:
-- create policy "Students can insert bookings."
--   on public.bookings for insert
--   with check ( auth.uid() = student_id );
