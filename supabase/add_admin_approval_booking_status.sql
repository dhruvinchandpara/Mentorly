-- Migration to support Admin Approval Workflow for Session Bookings
-- 1. Add 'pending' and 'rejected' values to booking_status enum if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'pending' AND enumtypid = 'booking_status'::regtype) THEN
        ALTER TYPE public.booking_status ADD VALUE 'pending';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'rejected' AND enumtypid = 'booking_status'::regtype) THEN
        ALTER TYPE public.booking_status ADD VALUE 'rejected';
    END IF;
END $$;

-- 2. Add rejection_reason column to public.bookings table
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- 3. Update index to include 'pending' bookings when checking for overlapping slots
DROP INDEX IF EXISTS public.idx_bookings_mentor_time;

CREATE INDEX idx_bookings_mentor_time
ON public.bookings(mentor_id, start_time, end_time)
WHERE status IN ('scheduled', 'pending');
