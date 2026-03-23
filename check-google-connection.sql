-- Check which mentors have connected their Google accounts
-- Run this in Supabase SQL Editor

SELECT
  id,
  email,
  full_name,
  role,
  google_connected,
  CASE
    WHEN google_refresh_token IS NOT NULL THEN 'Has refresh token'
    ELSE 'No refresh token'
  END as token_status,
  google_token_expiry
FROM profiles
WHERE role = 'mentor'
ORDER BY google_connected DESC, full_name;
