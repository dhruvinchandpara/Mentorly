# ✅ Google Meet OAuth2 Setup Checklist

Use this checklist to ensure everything is set up correctly.

## 🔧 Prerequisites

- [ ] Have access to Google Cloud Console
- [ ] Have Supabase database access
- [ ] Running Mentorly locally or in production

---

## 📋 Setup Steps

### 1. Google Cloud Console Setup

- [ ] Go to https://console.cloud.google.com/apis/credentials
- [ ] Select project: `turing-chess-488219-u6`
- [ ] Enable Google Calendar API (if not already enabled)
- [ ] Click "Create Credentials" → "OAuth 2.0 Client ID"

#### OAuth Consent Screen (if first time)
- [ ] Configure consent screen
  - [ ] App name: **Mentorly**
  - [ ] User support email: _______________
  - [ ] Developer contact: _______________
- [ ] Add scopes:
  - [ ] `https://www.googleapis.com/auth/calendar`
  - [ ] `https://www.googleapis.com/auth/calendar.events`
- [ ] Add test users (mentor emails): _______________

#### OAuth Client Configuration
- [ ] Application type: **Web application**
- [ ] Name: **Mentorly**
- [ ] Authorized redirect URIs:
  - [ ] Development: `http://localhost:3000/api/auth/google/callback`
  - [ ] Production (if deploying): `https://yourdomain.com/api/auth/google/callback`
- [ ] Click "Create"
- [ ] Copy Client ID: _______________
- [ ] Copy Client Secret: _______________

---

### 2. Environment Variables

- [ ] Open `.env.local` file
- [ ] Add these variables:
  ```bash
  GOOGLE_OAUTH_CLIENT_ID="paste-client-id-here"
  GOOGLE_OAUTH_CLIENT_SECRET="paste-client-secret-here"
  GOOGLE_OAUTH_REDIRECT_URI="http://localhost:3000/api/auth/google/callback"
  ```
- [ ] Save the file
- [ ] Restart dev server (if running)

---

### 3. Database Migration

Choose one method:

#### Option A: Supabase Dashboard
- [ ] Go to https://supabase.com/dashboard
- [ ] Select your project
- [ ] Navigate to SQL Editor
- [ ] Open `supabase/add_google_oauth_tokens.sql`
- [ ] Copy contents
- [ ] Paste in SQL Editor
- [ ] Click "Run"
- [ ] Verify success message

#### Option B: CLI
- [ ] Run: `supabase db push supabase/add_google_oauth_tokens.sql`
- [ ] Verify migration successful

#### Verification
- [ ] Go to Table Editor in Supabase
- [ ] Check `profiles` table
- [ ] Verify new columns exist:
  - [ ] `google_access_token`
  - [ ] `google_refresh_token`
  - [ ] `google_token_expiry`
  - [ ] `google_connected`

---

### 4. Add UI Component

- [ ] Find mentor dashboard file: `src/app/dashboard/mentor/page.tsx`
- [ ] Add import at top:
  ```tsx
  import { GoogleAccountConnection } from '@/components/GoogleAccountConnection'
  import { isGoogleConnected } from '@/lib/google-oauth'
  ```
- [ ] Add check for Google connection:
  ```tsx
  const googleConnected = await isGoogleConnected(user.id)
  ```
- [ ] Add component to JSX:
  ```tsx
  <GoogleAccountConnection
    userId={user.id}
    initialConnected={googleConnected}
  />
  ```
- [ ] Save file

---

### 5. Testing

#### Start Development Server
- [ ] Run: `npm run dev`
- [ ] Verify no errors in console
- [ ] Navigate to http://localhost:3000

#### Test as Mentor
- [ ] Log in as mentor account
- [ ] Go to mentor dashboard
- [ ] See "Connect Google Account" button
- [ ] Click "Connect Google Account"
- [ ] Redirected to Google OAuth consent
- [ ] Click "Continue" (for unverified app warning)
- [ ] Authorize the application
- [ ] Redirected back to dashboard
- [ ] See "Connected" status with green checkmark
- [ ] Success message appears

#### Test Booking Flow
- [ ] Log out
- [ ] Log in as student (or use different browser)
- [ ] Find the mentor
- [ ] Book a session
- [ ] Verify booking succeeds
- [ ] Check booking details
- [ ] Verify Google Meet link is present
- [ ] Click Meet link to test

#### Verify in Google Calendar
- [ ] Open Google Calendar (mentor's account)
- [ ] Find the booked session event
- [ ] Verify event has:
  - [ ] Correct date/time
  - [ ] Mentor and student as attendees
  - [ ] Google Meet link
- [ ] Check student's email
- [ ] Verify calendar invite received

---

## 🐛 Troubleshooting

If you encounter issues, check these:

### "redirect_uri_mismatch" error
- [ ] Verify redirect URI in Google Console matches exactly:
  - Development: `http://localhost:3000/api/auth/google/callback`
  - Production: `https://yourdomain.com/api/auth/google/callback`
- [ ] Check no trailing slash
- [ ] Check http vs https

### "This app isn't verified" warning
- [ ] This is normal for development
- [ ] Click "Advanced" → "Go to Mentorly (unsafe)"
- [ ] For production, consider submitting for verification

### Environment variables not working
- [ ] Check `.env.local` exists in project root
- [ ] Verify no typos in variable names
- [ ] Restart dev server after adding variables
- [ ] Check quotes are correct ("double quotes")

### "Mentor has not connected Google account" error
- [ ] Verify mentor connected their account
- [ ] Check database: `profiles` table has `google_connected = true`
- [ ] Try disconnecting and reconnecting

### Google Meet link not generated
- [ ] Check server logs for errors
- [ ] Verify Google Calendar API is enabled
- [ ] Check OAuth tokens are saved in database
- [ ] Try reconnecting Google account

---

## 🚀 Production Deployment

When deploying to production:

### Before Deployment
- [ ] Add production redirect URI to Google Console
- [ ] Update environment variable:
  ```bash
  GOOGLE_OAUTH_REDIRECT_URI="https://yourdomain.com/api/auth/google/callback"
  ```
- [ ] Run database migration on production database
- [ ] Deploy code to production
- [ ] Verify all mentors reconnect their Google accounts

### Post-Deployment
- [ ] Test OAuth flow in production
- [ ] Verify bookings create Meet links
- [ ] Monitor logs for errors
- [ ] (Optional) Submit app for Google verification

---

## ✅ Final Verification

Everything is working if:
- [ ] Mentors can connect Google accounts
- [ ] Connection status shows "Connected" with green checkmark
- [ ] Students can book sessions
- [ ] Bookings automatically get Google Meet links
- [ ] Calendar events appear in mentor's Google Calendar
- [ ] Email invites sent to both mentor and student
- [ ] Meet links are clickable and work
- [ ] No errors in server logs

---

## 📞 Need Help?

If stuck, refer to:
- **Quick setup**: `QUICK_START.md`
- **Detailed guide**: `OAUTH2_SETUP_GUIDE.md`
- **Technical details**: `IMPLEMENTATION_SUMMARY.md`
- **Full reference**: `GOOGLE_MEET_IMPLEMENTATION.md`

---

**Last Updated**: March 2026
**Status**: ✅ Ready for deployment
