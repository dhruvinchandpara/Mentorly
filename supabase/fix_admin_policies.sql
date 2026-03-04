-- Fix: Create a SECURITY DEFINER function to check admin status
-- This avoids infinite recursion when RLS policies on profiles
-- try to query the profiles table itself.

-- Step 1: Create the helper function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- Step 2: Drop the old admin policies that caused recursion
DROP POLICY IF EXISTS "Admins can view all profiles." ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile." ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all mentors." ON public.mentors;
DROP POLICY IF EXISTS "Admins can update any mentor." ON public.mentors;
DROP POLICY IF EXISTS "Admins can view all bookings." ON public.bookings;
DROP POLICY IF EXISTS "Admins can update any booking." ON public.bookings;

-- Step 3: Recreate admin policies using the safe helper function

CREATE POLICY "Admins can view all profiles."
  ON public.profiles FOR SELECT
  USING ( public.is_admin() );

CREATE POLICY "Admins can update any profile."
  ON public.profiles FOR UPDATE
  USING ( public.is_admin() );

CREATE POLICY "Admins can view all mentors."
  ON public.mentors FOR SELECT
  USING ( public.is_admin() );

CREATE POLICY "Admins can update any mentor."
  ON public.mentors FOR UPDATE
  USING ( public.is_admin() );

CREATE POLICY "Admins can view all bookings."
  ON public.bookings FOR SELECT
  USING ( public.is_admin() );

CREATE POLICY "Admins can update any booking."
  ON public.bookings FOR UPDATE
  USING ( public.is_admin() );
