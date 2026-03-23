-- Add profile_picture_url column to mentors table
ALTER TABLE mentors
ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;

-- Add comment to column
COMMENT ON COLUMN mentors.profile_picture_url IS 'Public URL to the mentor''s profile picture stored in Supabase Storage';

-- Create index for faster queries (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_mentors_profile_picture_url
ON mentors(profile_picture_url)
WHERE profile_picture_url IS NOT NULL;
