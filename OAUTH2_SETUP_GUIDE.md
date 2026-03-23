# Google OAuth2 Setup Guide

This guide will help you set up Google OAuth2 for automatic Google Meet link generation.

## Prerequisites

- Google Cloud Console access
- A Google account
- Your Mentorly application deployed or running locally

## Step 1: Create OAuth 2.0 Credentials

1. **Go to Google Cloud Console**
   - Navigate to https://console.cloud.google.com
   - Select your project: `turing-chess-488219-u6`

2. **Enable Google Calendar API** (if not already enabled)
   - Go to "APIs & Services" → "Library"
   - Search for "Google Calendar API"
   - Click "Enable"

3. **Create OAuth 2.0 Credentials**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth 2.0 Client ID"
   - If prompted, configure the OAuth consent screen first:
     - User Type: External (or Internal if you have Google Workspace)
     - App name: Mentorly
     - User support email: your email
     - Developer contact: your email
     - Scopes: Add the following scopes:
       - `https://www.googleapis.com/auth/calendar`
       - `https://www.googleapis.com/auth/calendar.events`
     - Test users: Add your email and any other mentor emails

4. **Configure OAuth Client**
   - Application type: Web application
   - Name: Mentorly OAuth Client
   - Authorized JavaScript origins:
     - `http://localhost:3000` (for development)
     - `https://yourdomain.com` (for production)
   - Authorized redirect URIs:
     - `http://localhost:3000/api/auth/google/callback` (for development)
     - `https://yourdomain.com/api/auth/google/callback` (for production)
   - Click "Create"

5. **Save Your Credentials**
   - Copy the Client ID
   - Copy the Client Secret
   - Save these securely

## Step 2: Update Environment Variables

Add the following to your `.env.local` file:

```bash
# Google OAuth2 Credentials (for Google Meet links)
GOOGLE_OAUTH_CLIENT_ID="your-client-id-here.apps.googleusercontent.com"
GOOGLE_OAUTH_CLIENT_SECRET="your-client-secret-here"
GOOGLE_OAUTH_REDIRECT_URI="http://localhost:3000/api/auth/google/callback"
```

**For production**, update the redirect URI:
```bash
GOOGLE_OAUTH_REDIRECT_URI="https://yourdomain.com/api/auth/google/callback"
```

## Step 3: Run Database Migration

Execute the database migration to add OAuth token columns:

```bash
# Connect to your Supabase database and run:
psql -h your-supabase-host -U postgres -d postgres -f supabase/add_google_oauth_tokens.sql
```

Or use the Supabase dashboard:
1. Go to your Supabase project
2. Navigate to "SQL Editor"
3. Paste the contents of `supabase/add_google_oauth_tokens.sql`
4. Click "Run"

## Step 4: Add Google Connection UI to Mentor Dashboard

Add the Google Account Connection component to your mentor dashboard:

```tsx
import { GoogleAccountConnection } from '@/components/GoogleAccountConnection'
import { createClient } from '@/lib/supabase/server'
import { isGoogleConnected } from '@/lib/google-oauth'

export default async function MentorDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const googleConnected = user ? await isGoogleConnected(user.id) : false

  return (
    <div>
      {/* Other dashboard content */}

      <GoogleAccountConnection
        userId={user!.id}
        initialConnected={googleConnected}
      />

      {/* Rest of dashboard */}
    </div>
  )
}
```

## Step 5: Test the Integration

1. **Start your development server**
   ```bash
   npm run dev
   ```

2. **Log in as a mentor**

3. **Connect your Google account**
   - Go to the mentor dashboard
   - Click "Connect Google Account"
   - Authorize the application
   - You should be redirected back with a success message

4. **Test booking creation**
   - Log in as a student
   - Book a session with the mentor
   - Verify that a Google Meet link is created
   - Check the mentor's Google Calendar to confirm the event was created

## OAuth Consent Screen Status

### Development/Testing
- Your app will show an "unverified app" warning
- You can bypass this by adding test users in the OAuth consent screen settings
- Add mentor email addresses as test users

### Production
- You'll need to verify your app with Google
- This requires submitting your app for review
- See: https://support.google.com/cloud/answer/9110914

## Troubleshooting

### "redirect_uri_mismatch" error
- Ensure the redirect URI in your OAuth client matches exactly with `GOOGLE_OAUTH_REDIRECT_URI`
- Include the full URL including the protocol (`http://` or `https://`)

### "invalid_grant" error
- The user's tokens have expired or been revoked
- Ask the mentor to reconnect their Google account

### "Google account not connected" error
- The mentor hasn't connected their Google account yet
- They need to click "Connect Google Account" in their dashboard

### Google Meet link not generated
- Verify the mentor has connected their Google account
- Check the server logs for detailed error messages
- Ensure the Google Calendar API is enabled

## Security Notes

1. **Token Storage**: OAuth tokens are stored in the database. Consider encrypting them at rest for production.
2. **Token Refresh**: The system automatically refreshes expired access tokens using the refresh token.
3. **Scope Limitation**: Only request the minimum required scopes (calendar and calendar.events).
4. **User Consent**: Users must explicitly authorize the application to access their Google Calendar.

## How It Works

1. **Mentor connects Google account**
   - Clicks "Connect Google Account"
   - Redirected to Google OAuth consent screen
   - Authorizes the application
   - OAuth tokens are saved to database

2. **Student books a session**
   - System checks if mentor has connected Google account
   - Uses mentor's OAuth tokens to create calendar event
   - Google automatically generates a Meet link
   - Meet link is saved to booking record

3. **Token refresh**
   - Access tokens expire after ~1 hour
   - System automatically uses refresh token to get new access token
   - No user interaction required

## Next Steps

- ✅ Set up OAuth credentials
- ✅ Update environment variables
- ✅ Run database migration
- ✅ Add UI component to dashboard
- ✅ Test the flow
- ⏭️ Deploy to production
- ⏭️ (Optional) Submit app for Google verification
