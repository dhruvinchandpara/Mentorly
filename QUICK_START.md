# 🚀 Quick Start: Google Meet OAuth2

Get automatic Google Meet links working in 5 minutes!

## Prerequisites
- [ ] Google Cloud Console access
- [ ] Mentorly running locally or deployed
- [ ] Access to your Supabase database

## Step-by-Step Setup

### 1️⃣ Get Google OAuth Credentials (5 min)

1. Go to https://console.cloud.google.com/apis/credentials
2. Select project: `turing-chess-488219-u6`
3. Click "**+ CREATE CREDENTIALS**" → "**OAuth client ID**"
4. If asked, configure consent screen:
   - App name: **Mentorly**
   - User support email: **your email**
   - Add scopes: Click "Add or Remove Scopes"
     - Search and add: `https://www.googleapis.com/auth/calendar`
     - Search and add: `https://www.googleapis.com/auth/calendar.events`
   - Test users: Add your email
5. Back to Create OAuth client ID:
   - Application type: **Web application**
   - Name: **Mentorly**
   - Authorized redirect URIs: Click "**+ ADD URI**"
     - Add: `http://localhost:3000/api/auth/google/callback`
   - Click "**CREATE**"
6. **COPY** Client ID and Client Secret

### 2️⃣ Update Environment Variables (1 min)

Add to `.env.local`:
```bash
GOOGLE_OAUTH_CLIENT_ID="YOUR_CLIENT_ID_HERE"
GOOGLE_OAUTH_CLIENT_SECRET="YOUR_CLIENT_SECRET_HERE"
GOOGLE_OAUTH_REDIRECT_URI="http://localhost:3000/api/auth/google/callback"
```

### 3️⃣ Run Database Migration (1 min)

**Option A: Using Supabase Dashboard**
1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to **SQL Editor**
4. Copy and paste this SQL:

```sql
-- Add Google OAuth tokens to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS google_access_token TEXT,
ADD COLUMN IF NOT EXISTS google_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS google_token_expiry TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS google_connected BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_profiles_google_connected
ON public.profiles(google_connected)
WHERE google_connected = true;
```

5. Click "**RUN**"

**Option B: Using CLI**
```bash
cat supabase/add_google_oauth_tokens.sql | supabase db execute
```

### 4️⃣ Add UI to Mentor Dashboard (2 min)

Find your mentor dashboard page (likely `src/app/dashboard/mentor/page.tsx`) and update it:

```tsx
import { GoogleAccountConnection } from '@/components/GoogleAccountConnection'
import { createClient } from '@/lib/supabase/server'
import { isGoogleConnected } from '@/lib/google-oauth'

export default async function MentorDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check if Google account is connected
  const googleConnected = await isGoogleConnected(user.id)

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Mentor Dashboard</h1>

      {/* Add this component */}
      <div className="mb-8">
        <GoogleAccountConnection
          userId={user.id}
          initialConnected={googleConnected}
        />
      </div>

      {/* Rest of your dashboard content */}
    </div>
  )
}
```

### 5️⃣ Test It! (2 min)

1. **Start your app:**
   ```bash
   npm run dev
   ```

2. **Log in as a mentor**
   - Go to http://localhost:3000

3. **Connect Google account**
   - Click "Connect Google Account" button
   - Authorize the app (you may see "unverified app" warning - click "Continue")
   - You'll be redirected back with success message

4. **Test booking**
   - Log in as a student (or use another browser)
   - Book a session with the mentor
   - Check the booking - it should have a Google Meet link!
   - Check your Google Calendar - event should be there!

## ✅ Success Checklist

After setup, verify:
- [ ] Google OAuth credentials created
- [ ] Environment variables added to `.env.local`
- [ ] Database migration ran successfully
- [ ] UI component added to mentor dashboard
- [ ] Can see "Connect Google Account" button
- [ ] Can successfully connect Google account
- [ ] Bookings create Google Meet links
- [ ] Calendar events appear in Google Calendar

## 🐛 Common Issues

### "This app isn't verified"
**Solution:** Click "Advanced" → "Go to Mentorly (unsafe)" - This is normal for development.

### "redirect_uri_mismatch"
**Solution:** Double-check the redirect URI in Google Console matches exactly:
```
http://localhost:3000/api/auth/google/callback
```

### "Mentor has not connected their Google account"
**Solution:** The mentor needs to connect their Google account first before students can book.

### Server errors on connect
**Solution:** Check that:
- Environment variables are set correctly
- You restarted the dev server after adding env vars
- No typos in the credentials

## 📱 For Production

When deploying to production:

1. **Add production redirect URI** in Google Console:
   ```
   https://yourdomain.com/api/auth/google/callback
   ```

2. **Update environment variable** in production:
   ```bash
   GOOGLE_OAUTH_REDIRECT_URI="https://yourdomain.com/api/auth/google/callback"
   ```

3. **Verify your app** (optional but recommended):
   - Go to OAuth consent screen in Google Console
   - Click "Publish App"
   - For public use, submit for verification

## 🎉 Done!

You now have automatic Google Meet link generation working! Every time a student books a session, a Google Meet link is automatically created using the mentor's Google account.

## Need Help?

- See detailed guide: `OAUTH2_SETUP_GUIDE.md`
- Implementation details: `IMPLEMENTATION_SUMMARY.md`
- Original analysis: `GOOGLE_MEET_SETUP.md`
