# Mentorly Manual Test Checklist

## Pre-Launch Critical Tests

**Test Environment:** ___________________
**Tester Name:** ___________________
**Date:** ___________________

---

## 1. AUTHENTICATION ✓

- [ ] **Google OAuth Login** - Sign in with Google successfully redirects to dashboard
- [ ] **Student sees Student Dashboard** - Role-based redirect works
- [ ] **Mentor sees Mentor Dashboard** - Role-based redirect works
- [ ] **Admin sees Admin Panel** - Role-based redirect works
- [ ] **Logout Works** - Sign out clears session, redirects to login
- [ ] **Access Control** - Student cannot access `/dashboard/admin` (blocked/redirected)

**Notes:**
```


```

---

## 2. STUDENT JOURNEY ✓

- [ ] **Browse Mentors** - `/explore` shows list of active mentors
- [ ] **Search/Filter** - Can filter mentors by expertise or name
- [ ] **View Mentor Profile** - Click mentor card → see bio, expertise, hourly rate
- [ ] **See Availability** - Mentor's available slots display in calendar
- [ ] **Book 30-min Session** - Select two consecutive 15-min slots, complete booking
- [ ] **Booking Confirmation** - Success message shows with booking details
- [ ] **Meeting Link Generated** - Jitsi or Google Meet link appears
- [ ] **Dashboard Shows Session** - Upcoming session displays on student dashboard
- [ ] **Join Call Button** - "Join Call" button is clickable near session time
- [ ] **Video Meeting Opens** - Clicking link opens Jitsi/Google Meet successfully

**Notes:**
```


```

---

## 3. MENTOR JOURNEY ✓

- [ ] **Pending Approval Banner** - New mentor sees "Account Pending Approval" warning
- [ ] **Set Weekly Availability** - Add recurring hours (e.g., Mon-Fri 9am-5pm)
- [ ] **Availability Appears** - Log in as student, verify slots are visible and bookable
- [ ] **See Booking Notification** - After student books, session appears on mentor dashboard
- [ ] **Today's Schedule** - Current day's sessions show prominently
- [ ] **Join Session** - Mentor clicks meeting link and enters same room as student
- [ ] **Sessions Pending Review** - Completed sessions show in "Pending Review" section
- [ ] **Mark as Completed** - Click "Mark as Completed" button
- [ ] **Earnings Update** - Total earnings increase after marking session complete
- [ ] **Edit Profile** - Update bio, background, expertise tags and save
- [ ] **View Hourly Rate** - Rate displays as read-only (only admin can edit)

**Notes:**
```


```

---

## 4. ADMIN OPERATIONS ✓

- [ ] **View Pending Mentors** - See list of mentors awaiting approval
- [ ] **Approve Mentor** - Click approve → status changes to "Active"
- [ ] **Approved Mentor Can Be Booked** - Student can now see and book with approved mentor
- [ ] **Edit Mentor Hourly Rate** - Change rate from $50 to $75, save successfully
- [ ] **Deactivate Mentor** - Toggle mentor to inactive → disappears from explore page
- [ ] **Add Single Authorized Student** - Manually enter email to whitelist
- [ ] **Bulk Upload CSV** - Upload CSV with 10+ emails, all added successfully
- [ ] **CSV Validation** - Upload invalid CSV → appropriate error message
- [ ] **Grant Admin Role** - Enter existing user email, promote to admin
- [ ] **Platform Metrics** - Dashboard shows total mentors, bookings, earnings

**Notes:**
```


```

---

## 5. BOOKING CONFLICTS & VALIDATION ✓

- [ ] **Double Booking Prevention** - Two students try same slot → second fails with error
- [ ] **Past Time Blocked** - Cannot book session in the past
- [ ] **Slot Granularity** - Only 15-minute increment slots are available
- [ ] **Duration Options** - Can book 15, 30, 45, 60-minute sessions
- [ ] **Timezone Display** - Times show in user's local timezone
- [ ] **Overlapping Slots** - Cannot select overlapping time periods

**Notes:**
```


```

---

## 6. VIDEO CONFERENCING ✓

- [ ] **Jitsi Link Works** - Fallback Jitsi link always generates
- [ ] **Both Parties Join** - Mentor and student can both access same meeting room
- [ ] **No Lobby Mode** - Users join directly without moderator approval
- [ ] **Audio Starts Muted** - Microphone is muted by default
- [ ] **Video Starts On** - Camera is enabled by default
- [ ] **Google Meet (if configured)** - Google Meet link generates when credentials present
- [ ] **Google Calendar Event** - Event created on mentor's calendar with correct details

**Notes:**
```


```

---

## 7. MOBILE & RESPONSIVE ✓

- [ ] **Mobile Login (iPhone)** - Google OAuth works on mobile Safari
- [ ] **Mobile Login (Android)** - Google OAuth works on Chrome Mobile
- [ ] **Mobile Booking Flow** - Can browse mentors and book session on phone
- [ ] **Calendar View Mobile** - Availability calendar readable and usable on small screen
- [ ] **Meeting Join Mobile** - Video call opens properly on mobile browser

**Notes:**
```


```

---

## 8. ERROR HANDLING & EDGE CASES ✓

- [ ] **Network Error** - Disconnect internet during booking → user-friendly error appears
- [ ] **Empty States** - New student with no bookings sees helpful empty state message
- [ ] **Form Validation** - Submit booking form with missing fields → validation errors show
- [ ] **XSS Prevention** - Enter `<script>alert('test')</script>` in bio → sanitized/escaped
- [ ] **Invalid Email** - Try adding malformed email to authorized list → error message
- [ ] **Session Timeout** - Leave app idle 30+ mins, try action → re-authentication prompt

**Notes:**
```


```

---

## 9. DATA ACCURACY ✓

- [ ] **Session Duration Correct** - 30-min booking shows exactly 30 minutes
- [ ] **Earnings Calculation** - Session earnings = (duration/60) × hourly_rate
- [ ] **Timezone Consistency** - All users see same session time in their local timezone
- [ ] **Meeting Link Unique** - Each booking gets unique meeting room ID
- [ ] **Profile Updates Persist** - Changes to bio/expertise save and reload correctly

**Notes:**
```


```

---

## 10. ACCESSIBILITY BASICS ✓

- [ ] **Keyboard Navigation** - Can tab through forms and submit with Enter
- [ ] **Focus Indicators** - Focused elements have visible outline/highlight
- [ ] **Button Labels** - All buttons have clear, descriptive text
- [ ] **Error Messages** - Screen reader can announce form errors

**Notes:**
```


```

---

## QUICK SMOKE TEST (5 Minutes)

Run this minimal sequence to verify core functionality:

- [ ] **1. Login as Student** - Google OAuth → Student Dashboard
- [ ] **2. Book Session** - Find mentor → Book 30-min slot → Get meeting link
- [ ] **3. Join Meeting** - Click meeting link → Jitsi/Google Meet opens
- [ ] **4. Login as Mentor** - See booked session → Join same meeting
- [ ] **5. Mark Complete** - Mark session complete → Earnings update
- [ ] **6. Login as Admin** - Approve pending mentor → Edit hourly rate

**If all 6 pass → Core system is functional** ✓

---

## CRITICAL BUGS FOUND

| Priority | Issue Description | Steps to Reproduce | Screenshot/Video |
|----------|-------------------|-------------------|------------------|
| HIGH     |                   |                   |                  |
| MEDIUM   |                   |                   |                  |
| LOW      |                   |                   |                  |

---

## SIGN-OFF

**All Critical Tests Passed:** [ ] YES  [ ] NO

**Blocker Issues:** ___________________

**Ready for Production:** [ ] YES  [ ] NO

**Tester Signature:** ___________________
**Date:** ___________________
