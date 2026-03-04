-- Admin RLS Policies for Mentorly
-- Run this in your Supabase SQL Editor

-- Admin can view ALL profiles
create policy "Admins can view all profiles."
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Admin can update ANY profile (e.g., change roles)
create policy "Admins can update any profile."
  on public.profiles for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Admin can view ALL mentors
create policy "Admins can view all mentors."
  on public.mentors for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Admin can update ANY mentor (approve/deactivate)
create policy "Admins can update any mentor."
  on public.mentors for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Admin can view ALL bookings
create policy "Admins can view all bookings."
  on public.bookings for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Admin can update ANY booking
create policy "Admins can update any booking."
  on public.bookings for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );
