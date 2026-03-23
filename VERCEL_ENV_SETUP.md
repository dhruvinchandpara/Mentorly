# Vercel Environment Variables Setup

This document lists all the environment variables you need to configure in your Vercel deployment.

## 🔧 Required Environment Variables

### 1. Supabase Configuration

These variables connect your app to Supabase database:

```
NEXT_PUBLIC_SUPABASE_URL=https://xospchwwcsstkppvernn.supabase.co
```
- **Where to find**: Supabase Dashboard → Project Settings → API → Project URL

```
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
- **Where to find**: Supabase Dashboard → Project Settings → API → Project API keys → `anon` `public`

```
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
- **Where to find**: Supabase Dashboard → Project Settings → API → Project API keys → `service_role` `secret`
- **⚠️ IMPORTANT**: This is a secret key - keep it secure!

---

### 2. Google Service Account (Legacy - Optional)

These were used for the old service account method. You may still have them:

```
GOOGLE_CLIENT_EMAIL=mentorly-service-account@turing-chess-488219-u6.iam.gserviceaccount.com
```

```
GOOGLE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMIIEuwIBADANBgkqhkiG9w0BAQEF...
```

**Note**: These are no longer actively used since we switched to OAuth, but they don't hurt to keep.

---

### 3. Admin Email Configuration ⚠️ **MUST UPDATE**

```
ADMIN_EMAIL=dhruvin_chandpara@ug29.mesaschool.co
```
- **Purpose**: Identifies which user account is the meeting organizer
- **⚠️ CRITICAL**: This MUST match your production admin email
- **Current value**: `dhruvin_chandpara@ug29.mesaschool.co`
- **What to do**: If your production admin uses a different email, update this!

---

### 4. Google OAuth Configuration ⚠️ **MUST UPDATE**

These enable the Google Calendar integration:

```
GOOGLE_OAUTH_CLIENT_ID=your-client-id.apps.googleusercontent.com
```
- **Where to find**: Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client IDs

```
GOOGLE_OAUTH_CLIENT_SECRET=your-client-secret
```
- **Where to find**: Same location as Client ID
- **⚠️ IMPORTANT**: This is a secret - keep it secure!

```
GOOGLE_OAUTH_REDIRECT_URI=https://your-domain.vercel.app/api/auth/google/callback
```
- **⚠️ CRITICAL**: Update this with your actual Vercel domain
- **Examples**:
  - Production: `https://mentorly.vercel.app/api/auth/google/callback`
  - Custom domain: `https://mentorly.mesaschool.co/api/auth/google/callback`
- **Current (localhost)**: `http://localhost:3000/api/auth/google/callback`

---

## 📝 Step-by-Step Setup in Vercel

### Step 1: Access Vercel Environment Variables

1. Go to your Vercel project dashboard
2. Click on **Settings** tab
3. Click on **Environment Variables** in the sidebar

### Step 2: Add Each Variable

For each variable above:

1. Click **"Add New"** or **"Add Variable"**
2. Enter the **Key** (e.g., `NEXT_PUBLIC_SUPABASE_URL`)
3. Enter the **Value** (the actual value from above)
4. Select environments:
   - ✅ Production
   - ✅ Preview (optional)
   - ✅ Development (optional)
5. Click **Save**

### Step 3: Critical Updates Required

#### ⚠️ Update `GOOGLE_OAUTH_REDIRECT_URI`

**Current value** (won't work in production):
```
http://localhost:3000/api/auth/google/callback
```

**Change to your Vercel domain**:
```
https://your-app-name.vercel.app/api/auth/google/callback
```

Or if using custom domain:
```
https://mentorly.mesaschool.co/api/auth/google/callback
```

#### ⚠️ Update Google Cloud Console

After setting the redirect URI in Vercel, you MUST also update it in Google Cloud Console:

1. Go to https://console.cloud.google.com
2. Select project: `turing-chess-488219-u6`
3. Go to **APIs & Services** → **Credentials**
4. Click on your OAuth 2.0 Client ID
5. Under **Authorized redirect URIs**, add:
   ```
   https://your-app-name.vercel.app/api/auth/google/callback
   ```
6. Click **Save**

#### ⚠️ Verify `ADMIN_EMAIL`

Make sure the email in `ADMIN_EMAIL` matches the actual admin account in your production database:

1. Check your Supabase database → `profiles` table
2. Find the user with `role = 'admin'`
3. Use that user's email in the `ADMIN_EMAIL` variable

---

## 🔍 How to Verify After Deployment

After deploying with these environment variables:

1. **Check Build Logs**
   - Look for any environment variable errors
   - Ensure no "undefined" or "missing" errors

2. **Test Google OAuth**
   - Log in as admin
   - Go to Edit Profile
   - Try to connect Google account
   - You should be redirected to Google's consent screen
   - After authorizing, you should be redirected back to your app

3. **Test Meeting Creation**
   - Create a test booking
   - Verify the Google Meet link is generated
   - Check that admin is the organizer
   - Verify mentor and student are participants

---

## 🚨 Common Issues

### Issue: "Redirect URI mismatch"
**Solution**: The `GOOGLE_OAUTH_REDIRECT_URI` in Vercel must EXACTLY match the one in Google Cloud Console (including https:// and trailing path)

### Issue: "Admin not connected to Google"
**Solution**:
1. Verify `ADMIN_EMAIL` matches your production admin
2. Log in as that admin
3. Go to Edit Profile → Connect Google Account

### Issue: "Google Meet link not generated"
**Solution**:
1. Check that admin has connected their Google account
2. Verify all Google OAuth environment variables are set
3. Check Vercel function logs for errors

---

## 📋 Quick Checklist

Before deploying:

- [ ] All Supabase variables are set
- [ ] `ADMIN_EMAIL` matches your production admin email
- [ ] `GOOGLE_OAUTH_CLIENT_ID` is set
- [ ] `GOOGLE_OAUTH_CLIENT_SECRET` is set
- [ ] `GOOGLE_OAUTH_REDIRECT_URI` is updated to production URL
- [ ] Google Cloud Console redirect URI is updated to match
- [ ] Variables are set for "Production" environment in Vercel

After deploying:

- [ ] Admin can access the app
- [ ] Admin can navigate to Edit Profile
- [ ] Admin can see "Connect Google Account" button
- [ ] Google OAuth flow works (redirects to Google and back)
- [ ] Test booking creates a Google Meet link
- [ ] Admin is the meeting organizer

---

## 📞 Need Help?

If you encounter issues:

1. Check Vercel **Function Logs** for detailed error messages
2. Verify all environment variables are set correctly
3. Ensure Google Cloud Console OAuth settings match Vercel settings
4. Refer to [OAUTH2_SETUP_GUIDE.md](./OAUTH2_SETUP_GUIDE.md) for detailed setup instructions
5. Check [GOOGLE_MEET_ACCESS_SETUP.md](./GOOGLE_MEET_ACCESS_SETUP.md) for meeting access configuration

---

## 🔐 Security Notes

**Never commit these to Git:**
- ❌ `SUPABASE_SERVICE_ROLE_KEY`
- ❌ `GOOGLE_OAUTH_CLIENT_SECRET`
- ❌ `GOOGLE_PRIVATE_KEY`

**Safe to commit (public variables):**
- ✅ `NEXT_PUBLIC_SUPABASE_URL`
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- ✅ `GOOGLE_OAUTH_CLIENT_ID`
- ✅ `GOOGLE_OAUTH_REDIRECT_URI`
- ✅ `ADMIN_EMAIL`

All sensitive variables should only be set in Vercel's environment variables dashboard.
