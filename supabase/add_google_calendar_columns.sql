ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS google_event_id TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 60;
-- Profiles table should have email (already does)

