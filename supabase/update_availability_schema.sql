ALTER TABLE public.availability ADD COLUMN specific_date DATE;
-- Update policies to include specific_date in checks if needed (existing are based on mentor_id, so it's fine)
