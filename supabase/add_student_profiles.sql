-- Create students table for student bios and profiles
CREATE TABLE IF NOT EXISTS public.students (
  id uuid references public.profiles(id) not null primary key,
  bio text,
  created_at timestamp with time zone default now()
);

-- Enable RLS on students table
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- Students are viewable by everyone (mentors can see student bios)
CREATE POLICY "Students are viewable by everyone."
  ON public.students FOR SELECT
  USING (true);

-- Students can insert their own profile
CREATE POLICY "Students can insert their own profile."
  ON public.students FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Students can update their own profile
CREATE POLICY "Students can update their own profile."
  ON public.students FOR UPDATE
  USING (auth.uid() = id);

-- Admins can manage all student profiles
CREATE POLICY "Admins can manage student profiles."
  ON public.students FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
