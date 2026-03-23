# Google Meet Integration Setup Guide

## Current Issue
Your service account cannot create Google Meet links because Google restricts this feature. You're seeing the error:
```
Invalid conference type value
```

## Solutions

### Solution 1: Enable Domain-Wide Delegation (Recommended for Google Workspace)

If you have a Google Workspace account, follow these steps:

1. **Go to Google Cloud Console**
   - Navigate to https://console.cloud.google.com
   - Select your project (`turing-chess-488219-u6`)

2. **Enable Domain-Wide Delegation**
   - Go to IAM & Admin → Service Accounts
   - Find your service account: `mentorly-service-account@turing-chess-488219-u6.iam.gserviceaccount.com`
   - Click "Edit" → Check "Enable Google Workspace Domain-wide Delegation"
   - Save

3. **Configure in Google Workspace Admin Console**
   - Go to https://admin.google.com
   - Navigate to Security → API Controls → Domain-wide Delegation
   - Click "Add new"
   - Client ID: (get from service account page)
   - OAuth Scopes:
     ```
     https://www.googleapis.com/auth/calendar,
     https://www.googleapis.com/auth/calendar.events
     ```
   - Click "Authorize"

4. **Update the code to use domain-wide delegation**
   - Add the admin user email to impersonate in `.env.local`:
     ```
     GOOGLE_ADMIN_EMAIL=your-admin@yourdomain.com
     ```

### Solution 2: Use OAuth2 Instead of Service Account (Easier but requires user consent)

This approach uses a regular Google account instead of a service account.

1. **Create OAuth 2.0 Credentials**
   - Go to Google Cloud Console → APIs & Services → Credentials
   - Create OAuth 2.0 Client ID (Web application)
   - Add authorized redirect URIs: `http://localhost:3000/api/auth/google/callback`
   - Download the credentials JSON

2. **Update your application** to use OAuth2 flow where users authenticate with their Google account

### Solution 3: Use Third-Party Meeting Service (Quick Fix)

Continue using Jitsi (current fallback) or use another service like:
- **Whereby**: Simple API for creating meeting rooms
- **Daily.co**: Video API with good free tier
- **Zoom**: If you have a Zoom account with API access

### Solution 4: Custom Google Meet Link Generator (Workaround)

Create a Google Meet link manually using Google Calendar's "Add Google Meet" feature, then use the Google Calendar API to just create calendar events with custom conference data.

## Recommended Approach

For your Mentorly platform, I recommend **Solution 2 (OAuth2)** because:
- ✅ Works immediately without domain-wide delegation
- ✅ Users authenticate with their own Google accounts
- ✅ Meet links are created in the mentor's calendar
- ✅ More secure and follows Google's recommended practices
- ❌ Requires initial user consent (one-time setup per mentor)

Would you like me to implement OAuth2 authentication for Google Meet?

## Testing the Current Setup

The test failed because service accounts cannot create Meet links without additional configuration. The error "Invalid conference type value" confirms this limitation.
