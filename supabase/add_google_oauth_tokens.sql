-- Add Google OAuth tokens to profiles table
-- This allows mentors to connect their Google accounts for creating Meet links

-- Add columns to store Google OAuth credentials
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS google_access_token TEXT,
ADD COLUMN IF NOT EXISTS google_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS google_token_expiry TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS google_connected BOOLEAN DEFAULT FALSE;

-- Create an index for quickly finding users with connected Google accounts
CREATE INDEX IF NOT EXISTS idx_profiles_google_connected
ON public.profiles(google_connected)
WHERE google_connected = true;

-- Add comment explaining the OAuth tokens
COMMENT ON COLUMN public.profiles.google_access_token IS 'OAuth2 access token for Google Calendar API (encrypted at application level)';
COMMENT ON COLUMN public.profiles.google_refresh_token IS 'OAuth2 refresh token for Google Calendar API (encrypted at application level)';
COMMENT ON COLUMN public.profiles.google_token_expiry IS 'When the access token expires (refresh needed after this time)';
COMMENT ON COLUMN public.profiles.google_connected IS 'Whether the user has connected their Google account';
