-- Allow students to view mentor availability
CREATE POLICY "Availability is viewable by everyone."
  ON public.availability FOR SELECT
  USING ( true );
