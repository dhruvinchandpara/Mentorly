# Google Meet Access Settings

## Issue: "Ask to Join" Permission Required

By default, Google Meet may require participants to "Ask to join" the meeting. This document explains how to ensure mentors and students can join directly without permission.

## Solution

### Option 1: Google Workspace Admin Settings (Recommended)

If you're using Google Workspace (formerly G Suite), the admin can configure default meeting access:

1. **Go to Google Admin Console**
   - Navigate to https://admin.google.com
   - Sign in as a Google Workspace admin

2. **Configure Google Meet Settings**
   - Go to **Apps** → **Google Workspace** → **Google Meet**
   - Click on **Meet video settings**

3. **Set Host Management**
   - Find "Host management" settings
   - Enable: **"Let people join meetings without asking"**
   - Or set: **"Anyone with the link can join"** for meetings

4. **Configure Access Settings**
   - Under "Access settings"
   - Set to: **"Anyone with the calendar event can join"**
   - This ensures calendar invitees don't need to ask permission

5. **Save Changes**
   - Click "Save"
   - Changes may take up to 24 hours to propagate

### Option 2: Individual Meeting Settings (Manual)

For each meeting created, the organizer can manually change settings:

1. **Open the Google Meet link**
2. **Click the 3-dot menu** (More options)
3. **Select "Meeting details"**
4. **Under "Access"**, choose:
   - **"Anyone with the link can join"** (most open)
   - Or **"People in your organization and invited guests"**
5. **Save the changes**

### Option 3: Use Google Calendar Event Settings

When creating events via the API (already implemented):

```typescript
const baseEvent = {
  summary: params.title,
  description: params.description,
  start: { dateTime: params.startTime },
  end: { dateTime: params.endTime },
  attendees: params.attendees.map(email => ({ email })),
  guestsCanModify: false,
  guestsCanInviteOthers: true,  // Allow guests to invite others
  guestsCanSeeOtherGuests: true, // Allow guests to see other attendees
  conferenceData: {
    createRequest: {
      requestId: requestId,
      conferenceSolutionKey: { type: 'hangoutsMeet' },
    },
  },
}
```

**Note**: The `guestsCanInviteOthers` and `guestsCanSeeOtherGuests` settings help, but don't guarantee direct access.

## Why Attendees See "Ask to Join"

Google Meet determines access based on:

1. **Organization membership** - People in the same Google Workspace org get direct access
2. **Calendar invitation status** - If attendees are on the calendar event, they should get direct access
3. **Google Meet settings** - Workspace admin settings override individual preferences
4. **Account type** - External users (not in the org) may need to ask to join

## Current Implementation

Our code already:
✅ Adds admin, mentor, and student as calendar attendees
✅ Sets `guestsCanInviteOthers: true`
✅ Sets `guestsCanSeeOtherGuests: true`
✅ Sends calendar invitations to all participants

## Recommended Actions

### For Google Workspace Accounts (mesaschool.co domain):

1. **Admin configures Workspace settings** (Option 1 above)
   - This is the most permanent and scalable solution
   - Ensures all future meetings allow invited guests to join directly

### For Personal Gmail Accounts:

1. **Use the same domain** - If possible, use Google Workspace for all accounts
2. **Manually adjust settings** - After meeting creation, organizer can change access settings
3. **Accept that external users may need to "ask to join"** - This is a Google Meet security feature

## Testing

After implementing changes:

1. Create a test booking
2. Have the student (using a different account) click the Meet link
3. Verify they can join directly without "Ask to join"
4. If they still see "Ask to join", check:
   - Are they added as a calendar attendee? (Check the calendar event)
   - Is the admin account a Google Workspace account?
   - Are Workspace admin settings configured correctly?

## Additional Notes

- **Google Workspace accounts** have more control over meeting access
- **Personal Gmail accounts** have limited control over who can join directly
- **External participants** (outside the organization) may always see "Ask to join" depending on Workspace security policies
- The admin account (`dhruvin_chandpara@ug29.mesaschool.co`) appears to be a Workspace account, which should allow proper access control

## Support

If participants still can't join directly after trying these solutions:

1. Verify the admin account is properly set up in Google Workspace
2. Check Google Workspace admin settings for Google Meet
3. Ensure calendar invitations are being sent correctly (check `sendUpdates: 'all'` in the code)
4. Consider contacting Google Workspace support for organization-specific settings
