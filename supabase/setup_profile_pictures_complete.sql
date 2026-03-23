-- 1. Add profile_picture_url column to mentors table
ALTER TABLE mentors ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;

-- 2. Enable RLS on storage.objects (if not already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can upload profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Public read access" ON storage.objects;
DROP POLICY IF EXISTS "Users can update profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete profile pictures" ON storage.objects;

-- 4. Create policy: Allow authenticated users to upload
CREATE POLICY "Users can upload profile pictures"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'profile-pictures');

-- 5. Create policy: Allow public read access
CREATE POLICY "Public read access"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'profile-pictures');

-- 6. Create policy: Allow authenticated users to update
CREATE POLICY "Users can update profile pictures"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'profile-pictures')
WITH CHECK (bucket_id = 'profile-pictures');

-- 7. Create policy: Allow authenticated users to delete
CREATE POLICY "Users can delete profile pictures"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'profile-pictures');
