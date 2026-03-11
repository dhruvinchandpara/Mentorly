-- Migration to support 15-minute slot-based bookings
-- This allows mentors to set availability windows, and students to book 15-minute slots within those windows

-- Add slot_count column to track how many consecutive 15-min slots were booked
-- slot_count = 1 means 15 minutes, slot_count = 2 means 30 minutes, etc.
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS slot_count INTEGER DEFAULT 1 CHECK (slot_count > 0);

-- Add comment to clarify the booking model
COMMENT ON COLUMN public.bookings.slot_count IS 'Number of consecutive 15-minute slots booked (1 = 15min, 2 = 30min, etc.)';

-- Update duration_minutes column to have a check constraint for 15-minute increments
-- First drop existing constraint if any
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_duration_check;

-- Add constraint to ensure duration is in 15-minute increments
ALTER TABLE public.bookings
ADD CONSTRAINT bookings_duration_check CHECK (duration_minutes % 15 = 0 AND duration_minutes >= 15);

-- Create an index on start_time and mentor_id for faster overlap queries
CREATE INDEX IF NOT EXISTS idx_bookings_mentor_time
ON public.bookings(mentor_id, start_time, end_time)
WHERE status = 'scheduled';

-- Add comment explaining the slot-based system
COMMENT ON TABLE public.bookings IS 'Bookings are slot-based: students book 15-minute slots within mentor availability windows. Multiple consecutive slots can be booked.';
