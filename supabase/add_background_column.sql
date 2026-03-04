-- Add background/experience column to mentors table
ALTER TABLE public.mentors
ADD COLUMN IF NOT EXISTS background text;

-- Allow admins to INSERT mentors (needed for admin-created mentors)
CREATE POLICY "Admins can insert mentors."
  ON public.mentors FOR INSERT
  WITH CHECK ( public.is_admin() );

-- Allow admins to INSERT profiles (needed for admin-created mentors)
CREATE POLICY "Admins can insert any profile."
  ON public.profiles FOR INSERT
  WITH CHECK ( public.is_admin() );
