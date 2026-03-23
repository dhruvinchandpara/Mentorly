# Mentorly - Mentor Persona Information Architecture
## Final Design Document with Justifications

---

## Document Metadata
- **Version:** 2.0 (Final)
- **Last Updated:** March 17, 2026
- **Scope:** Mentor Dashboard Complete IA Restructure
- **Contributors:** Product Team, UX Research

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Design Philosophy](#design-philosophy)
3. [Complete Navigation Structure](#complete-navigation-structure)
4. [Dashboard - Detailed Breakdown](#dashboard-detailed-breakdown)
5. [Availability Tab](#availability-tab)
6. [Sessions Tab](#sessions-tab)
7. [Payments Tab](#payments-tab)
8. [Profile Tab](#profile-tab)
9. [Settings (Header Dropdown)](#settings-header-dropdown)
10. [Priority Justifications](#priority-justifications)
11. [Component Justifications](#component-justifications)
12. [Rejected Design Options](#rejected-design-options)
13. [Visual Specifications](#visual-specifications)
14. [Adaptive Layout Logic](#adaptive-layout-logic)

---

## Executive Summary

The Mentor dashboard has been redesigned from a single-page overview into a **task-oriented, progressive disclosure interface** with 5 primary navigation tabs plus settings.

### Key Improvements:
- **Priority-based layout**: Most urgent items (ongoing sessions) appear first
- **Separation of concerns**: Financial data isolated in dedicated Payments tab
- **Reduced friction**: Critical actions (mark complete, join call) accessible without navigation
- **Adaptive UI**: Layout adjusts based on content availability
- **Consistent UX**: Matches admin dashboard header pattern

### Navigation Tabs:
1. **Dashboard** - Command center for today's operations
2. **Availability** - Set when you're available for bookings
3. **Sessions** - Manage upcoming, pending, and past sessions
4. **Payments** - Track earnings and payment history
5. **Profile** - Edit public-facing information

---

## Design Philosophy

### Progressive Disclosure Principle
Information is revealed based on **urgency and relevance**:

```
Priority 1: Immediate Action Required (Ongoing sessions, Join calls)
Priority 2: Important Tasks (Mark sessions complete for payment)
Priority 3: Operational Planning (Today's schedule, upcoming sessions)
Priority 4: Informational (Stats, history, financial tracking)
Priority 5: Configuration (Profile, settings - set and forget)
```

### Mental Model Separation
**Work Mode vs. Financial Mode vs. Configuration Mode**

| Mode | Purpose | Location |
|------|---------|----------|
| **Work Mode** | Join calls, review sessions, check schedule | Dashboard, Sessions |
| **Financial Mode** | Track earnings, view payment history | Payments |
| **Configuration Mode** | Set availability, edit profile, change password | Availability, Profile, Settings |

**Justification**: Cognitive psychology research shows users perform better when contexts are clearly separated. Mixing earnings data with operational tasks creates cognitive load.

---

## Complete Navigation Structure

```
Mentorly (Logo)                                          [John Mentor] [Avatar ▼]
[Dashboard] [Availability] [Sessions] [Payments] [Profile]
```

### Header Dropdown Menu:
```
┌────────────────────────┐
│ John Mentor            │
│ john@example.com       │
├────────────────────────┤
│ ⚙️ Settings            │
│ 🔑 Change Password     │
├────────────────────────┤
│ 🚪 Sign Out            │
└────────────────────────┘
```

**Justification**: Consistent with admin dashboard pattern. Profile/settings are low-frequency actions that don't deserve primary navigation real estate.

---

## Dashboard - Detailed Breakdown

### Overall Goal
**The dashboard is a command center, not an information repository.** It shows only what mentors need to act on TODAY.

### Layout Structure (Adaptive)

#### Scenario 1: Session Currently Live
```
┌─────────────────────────────────────────────────────────────┐
│  🔴 LIVE NOW - ONGOING SESSION                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🎥 Session with Sarah Johnson                      │   │
│  │  Started: 2:00 PM • Ends: 3:00 PM                   │   │
│  │  ⏰ 15 minutes remaining                             │   │
│  │  📝 Topic: Product Management Career Path           │   │
│  │  🔗 meet.google.com/abc-defg-hij                    │   │
│  │                                                      │   │
│  │  [Join Call Now] ← Green, pulsing button            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌──────────────────────┬──────────────────────────────┐   │
│  │ 📅 Today's Schedule  │ ✅ Pending Approvals         │   │
│  │ (Next sessions)      │ (Rotational carousel)        │   │
│  └──────────────────────┴──────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 📊 Quick Stats (This Week)                          │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

#### Scenario 2: No Ongoing Session, Has Pending Approvals
```
┌─────────────────────────────────────────────────────────────┐
│  ┌──────────────────────┬──────────────────────────────┐   │
│  │ 📅 Today's Schedule  │ ✅ Pending Approvals         │   │
│  │                      │                              │   │
│  │ Next Session:        │ Session #1 (Top)             │   │
│  │ • John Doe           │ ├─ Student: Mike Chen        │   │
│  │   3:00 PM - 4:00 PM │ ├─ Date: Mar 15, 2PM         │   │
│  │   [Join Call]        │ └─ [Mark Complete]           │   │
│  │                      │                              │   │
│  │ Later Today:         │ Session #2                   │   │
│  │ • Emily Wu           │ (Partially visible)          │   │
│  │   5:00 PM - 6:00 PM │                              │   │
│  │                      │ 2 more pending review...     │   │
│  └──────────────────────┴──────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 📊 Quick Stats                                      │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

#### Scenario 3: No Ongoing Session, No Pending Approvals
```
┌─────────────────────────────────────────────────────────────┐
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 📅 Today's Schedule (FULL WIDTH)                    │   │
│  │                                                      │   │
│  │ Next Session:                                        │   │
│  │ • John Doe - 3:00 PM - 4:00 PM [Join Call]          │   │
│  │                                                      │   │
│  │ Later Today:                                         │   │
│  │ • Emily Wu - 5:00 PM - 6:00 PM                      │   │
│  │ • Mike Chen - 7:00 PM - 8:00 PM                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 📊 Quick Stats                                      │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Component Breakdown

#### 1. Ongoing Sessions Card (Conditional)

**Visibility Rule**: Only appears when `current_time >= session.start_time AND current_time <= session.end_time AND status = 'scheduled'`

**Contents**:
- Student name
- Session start/end time
- Countdown timer (updates every 60 seconds)
- Session topic/notes
- Meet link (clickable)
- **[Join Call Now]** button (green, pulsing)

**Priority**: **CRITICAL (P1)**

**Justification**:
- **Time-sensitive**: Session is happening RIGHT NOW
- **Revenue impact**: Missing a session = lost income + damaged reputation
- **User expectation**: When logging in during a session, joining should be one click
- **Visual hierarchy**: Red border + pulsing animation + top placement = impossible to miss

**Design Specs**:
- Background: `red-50` with gradient
- Border: `red-200`, 2px solid
- Box shadow: `red-500/20`, large spread
- Button: `green-600`, pulsing animation, 16px font-weight bold
- 🔴 "LIVE NOW" badge with CSS pulse animation

---

#### 2. Today's Schedule Card

**Visibility Rule**: Always visible (shows empty state if no sessions)

**Contents**:
- List of sessions scheduled for today (chronological order)
- Each session shows:
  - Student name
  - Time slot
  - Session topic/notes
  - **[Join Call]** button (appears 5 minutes before start time)

**Priority**: **HIGH (P2)**

**Justification**:
- **Operational planning**: Mentors need to know what's coming today
- **Preparation time**: Allows mentors to prepare between sessions
- **Context switching**: Clear visibility of schedule helps time management
- **Join call access**: Immediate access to join upcoming sessions

**Empty State**: "Your schedule is clear today 🌟 - Enjoy your free time!"

**Layout**:
- **Two-column (50/50)** when pending approvals exist
- **Full-width (100%)** when no pending approvals

---

#### 3. Pending Approvals Card (Rotational Carousel)

**Visibility Rule**: Only appears when there are sessions with status `completed` but not marked as complete by mentor

**Contents**:
- **Rotational display**: Shows 2-3 sessions at a time
- Each session shows:
  - Student name
  - Session date/time
  - Earnings for that session (e.g., "₹500")
  - **[Mark as Complete]** button

**Rotation Logic**:
- Display sessions in queue order (oldest first)
- When top session is marked complete → Next session slides up
- Visual transition: Fade out + slide animation
- Counter shows: "2 more pending review..."

**Priority**: **HIGH (P2)**

**Justification**:
- **Revenue dependency**: Mentors must mark sessions complete to receive payment
- **Urgency**: Delayed approvals = delayed payments
- **Batch prevention**: Rotational display prevents overwhelming mentors with 20+ pending sessions
- **Progressive disclosure**: Show what's immediately actionable, hide the rest
- **Friction reduction**: No navigation required - mark complete right on dashboard

**Why Rotational?**:
1. **Cognitive load**: Showing all pending sessions at once is overwhelming
2. **Focus**: Forces mentor to handle one at a time
3. **Space efficiency**: Maintains clean dashboard layout
4. **Gamification**: Seeing count decrease provides satisfaction

**Empty State**: Card completely disappears → Today's Schedule expands to full width

---

#### 4. Quick Stats Card

**Visibility Rule**: Always visible

**Contents**:
- Sessions scheduled this week (count)
- Total hours booked this week
- New booking requests (count)

**Priority**: **LOW (P4)**

**Justification**:
- **Informational only**: No action required
- **Weekly context**: Helps mentors understand workload
- **Motivation**: Seeing numbers provides sense of progress
- **Non-critical**: Placed at bottom as it's passive information

**Why Only This Week?**:
- Dashboard is about "now" and "today"
- Historical data belongs in Payments tab
- All-time stats would create clutter

---

## Availability Tab

### Goal
Allow mentors to **set when they're available for bookings** using a visual calendar interface.

### Layout
```
┌─────────────────────────────────────────────────────────────┐
│  Availability                              [Name] [Avatar ▼]│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Set Your Weekly Recurring Schedule                        │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │           MON    TUE    WED    THU    FRI    SAT    │   │
│  │  9 AM    [  ]    [✓]    [✓]    [✓]    [  ]    [  ]  │   │
│  │  10 AM   [✓]    [✓]    [✓]    [✓]    [✓]    [  ]  │   │
│  │  11 AM   [✓]    [✓]    [✓]    [✓]    [✓]    [  ]  │   │
│  │  12 PM   [  ]    [  ]    [  ]    [  ]    [  ]    [  ]  │   │
│  │  1 PM    [  ]    [  ]    [  ]    [  ]    [  ]    [  ]  │   │
│  │  2 PM    [✓]    [✓]    [✓]    [✓]    [✓]    [  ]  │   │
│  │  ...                                                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [Save Recurring Schedule]                                 │
│                                                             │
│  ───────────────────────────────────────────────────────   │
│                                                             │
│  Date-Specific Overrides                                   │
│                                                             │
│  📅 March 20, 2026 - Blocked (Vacation)          [Remove]  │
│  📅 March 25, 2026 - Extra slot: 8PM - 9PM       [Remove]  │
│                                                             │
│  [+ Add Date Override]                                     │
└─────────────────────────────────────────────────────────────┘
```

### Component Breakdown

#### Recurring Weekly Schedule
- Visual grid: Days × Time slots
- Click to toggle availability
- Preset templates: "Weekday Mornings", "Evenings Only", "Weekends"

**Justification**:
- **Visual > Text**: Calendar grid is intuitive
- **Efficiency**: Set once, applies to all weeks
- **Flexibility**: Can be modified anytime

#### Date-Specific Overrides
- Block specific dates (vacation, sick days)
- Add extra slots on specific dates
- List view of all overrides

**Justification**:
- **Real-world need**: Mentors have vacations, emergencies
- **Student experience**: Prevents double-booking
- **Flexibility**: Doesn't require changing entire recurring schedule

---

## Sessions Tab

### Goal
Centralized view of **all sessions** (past, present, future) with ability to take actions.

### Layout Structure
```
┌──────────────────────────────────────────────────────────────┐
│  Sessions                                  [Name] [Avatar ▼] │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  🔴 LIVE NOW (Conditional - only when session is ongoing)   │
│  ┌────────────────────────────────────────────────────┐     │
│  │  🎥 ONGOING SESSION                                │     │
│  │  📅 Mar 17, 2026 • 2:00 PM - 3:00 PM             │     │
│  │  👤 Sarah Johnson                                  │     │
│  │  ⏰ 15 minutes remaining                           │     │
│  │  📝 Topic: Product Management                      │     │
│  │                                                     │     │
│  │  [Join Call Now]                                   │     │
│  └────────────────────────────────────────────────────┘     │
│                                                              │
│  ┌──────────────────────────────────────────────────┐       │
│  │  [Upcoming]  [Pending Review]  [History]         │ Tabs  │
│  └──────────────────────────────────────────────────┘       │
│                                                              │
│  🔍 Search sessions...                [Filter ▼]            │
│                                                              │
│  (Tab Content Here)                                         │
└──────────────────────────────────────────────────────────────┘
```

### Tab Breakdown

#### Tab 1: Upcoming
**Purpose**: View future scheduled sessions

**Contents**:
- List of all future sessions (chronological)
- Each session card shows:
  - Date, time, duration
  - Student name
  - Session topic/notes
  - Meet link
  - **[Join Call]** button (active 5 minutes before start)
  - **[View Details]** link

**Priority**: **MEDIUM (P3)**

**Justification**:
- **Planning**: Mentors need to see what's coming up
- **Preparation**: Allows time to prepare materials
- **Availability check**: Ensures no conflicts
- **Student context**: Review student name/topic before session

**Empty State**: "No upcoming sessions. Students can book you based on your availability settings."

---

#### Tab 2: Pending Review
**Purpose**: Mark sessions as complete to receive payment

**Contents**:
- List of completed sessions awaiting mentor confirmation
- Each session shows:
  - Date, time, duration
  - Student name
  - Session topic/notes
  - **Earnings for this session** (e.g., "₹500")
  - **[Mark as Complete]** button (primary action)

**Priority**: **HIGH (P2)**

**Justification**:
- **Payment dependency**: Critical for mentor earnings
- **Admin verification**: Helps prevent fraudulent bookings
- **Session quality**: Forces mentor to acknowledge completion
- **Visibility**: Earnings per session shown to motivate completion

**Why Show Earnings Here?**:
- Motivates immediate action
- Transparency on per-session income
- Ties completion to payment

**Empty State**: "✅ All caught up! No sessions need review."

---

#### Tab 3: History
**Purpose**: Reference past sessions

**Contents**:
- All past sessions (completed or cancelled)
- Each session shows:
  - Date, time, duration
  - Student name
  - Session topic/notes
  - Status badge (✅ Completed / ❌ Cancelled)
  - **[View Details]** link
- Search by student name
- Filter by date range
- **NO earnings shown** (moved to Payments tab)

**Priority**: **LOW (P4)**

**Justification**:
- **Reference only**: Informational, no action needed
- **Student tracking**: See session history with specific students
- **Performance review**: Reflect on past sessions
- **Separation of concerns**: Financial data in Payments tab

**Why NO Earnings?**:
- History is about session content, not money
- Earnings tracking belongs in dedicated Payments tab
- Reduces cognitive load (one purpose per view)

---

### Why This 3-Tab Structure?

**Rejected Alternative**: Single list with status filters

**Why We Chose Tabs**:
1. **Clear mental model**: Future vs. Actionable vs. Past
2. **Action-oriented**: "Pending Review" highlights what needs doing
3. **Reduced scroll**: Each tab has focused content
4. **Badge notifications**: Can show "(3)" badge on Pending Review tab

---

## Payments Tab

### Goal
**Dedicated financial tracking** - separate from operational tasks.

### Layout
```
┌──────────────────────────────────────────────────────────────┐
│  💰 Payments                               [Name] [Avatar ▼] │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌───────────────────────┬──────────────────────────────┐   │
│  │  📊 Current Month     │  💵 Total Earned             │   │
│  │  ₹12,500              │  ₹2,45,000                   │   │
│  │  From 25 sessions     │  Since Dec 2025              │   │
│  └───────────────────────┴──────────────────────────────┘   │
│                                                              │
│  ┌────────────────────────────────────────────────────┐     │
│  │  📈 Earnings Over Time                             │     │
│  │                                                     │     │
│  │   ₹15K ┤                             ╭──●          │     │
│  │   ₹12K ┤                    ╭────●───╯             │     │
│  │   ₹10K ┤           ╭────●───╯                      │     │
│  │   ₹8K  ┤      ●────╯                               │     │
│  │   ₹5K  ┤  ●───╯                                    │     │
│  │        └────┬────┬────┬────┬────┬────              │     │
│  │           Dec  Jan  Feb  Mar  Apr  May             │     │
│  │                                                     │     │
│  │  [Filter: Last 6 months ▼]  [Monthly/Weekly]      │     │
│  └────────────────────────────────────────────────────┘     │
│                                                              │
│  ┌────────────────────────────────────────────────────┐     │
│  │  📋 Per-Session Breakdown                          │     │
│  │  🔍 Search by student...     📅 Mar 2026 ▼        │     │
│  │                                                     │     │
│  │  Date       Student         Duration    Amount     │     │
│  │  ────────────────────────────────────────────      │     │
│  │  Mar 15    Sarah Johnson    60 min      ₹500      │     │
│  │  Mar 14    Mike Chen         60 min      ₹500      │     │
│  │  Mar 12    John Doe          90 min      ₹750      │     │
│  │  Mar 10    Sarah Johnson    60 min      ₹500      │     │
│  │  Mar 8     Emily Wu          60 min      ₹500      │     │
│  │                                                     │     │
│  │  Showing 5 of 25 sessions   [Load More]           │     │
│  │                                                     │     │
│  │  💡 Tip: Payments are processed at month-end       │     │
│  └────────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────┘
```

### Component Breakdown

#### 1. Summary Cards (Top)

**Current Month Earnings**:
- Amount earned in current calendar month
- Session count contributing to total
- Updates in real-time as sessions are marked complete

**Total Lifetime Earnings**:
- All-time earnings since joining platform
- Start date reference
- Motivational metric

**Justification**:
- **Quick scan**: Most important numbers at top
- **Motivation**: Seeing totals provides satisfaction
- **Transparency**: Clear visibility into earnings

---

#### 2. Earnings Graph

**Contents**:
- Line or bar chart showing earnings over time
- Toggle: Monthly vs. Weekly view
- Date range filter (Last 3 months, 6 months, 1 year, All time)

**Justification**:
- **Visual > Numbers**: Easier to spot trends in graph
- **Growth tracking**: See if earnings are increasing
- **Goal setting**: Visual reference for income targets
- **Pattern recognition**: Identify busy/slow periods

**Why Not Showing Individual Sessions on Graph?**:
- Too granular - would create noisy chart
- Monthly/weekly aggregation is more meaningful
- Individual sessions available in table below

---

#### 3. Per-Session Breakdown Table

**Contents**:
- Complete list of all completed sessions with earnings
- Columns: Date, Student Name, Duration, Amount
- Search by student name
- Filter by date/month
- Load more pagination (show 10-20 at a time)

**Justification**:
- **Verification**: Mentors can verify payment accuracy
- **Student tracking**: See earnings from specific students
- **Dispute resolution**: Historical record if payment issues arise
- **Tax documentation**: Exportable record for income reporting

**Why Pagination?**:
- Performance: Don't load 1000+ sessions at once
- Scroll fatigue: Long lists are hard to navigate
- Progressive disclosure: Load as needed

---

### Why Payments Needed Separate Tab

**Privacy & Psychology**:
- Earnings are personal/sensitive data
- Not everyone wants money visible when screen-sharing
- Separates "work mindset" from "financial tracking mindset"

**Information Architecture**:
- Dashboard = Today's operations
- Sessions = Session management
- Payments = Financial tracking
- Each tab has clear, distinct purpose

**Industry Standard**:
- Upwork, Fiverr, Uber all separate earnings from job management
- Users expect financial data to be isolated

---

## Profile Tab

### Goal
Edit public-facing profile that students see when browsing mentors.

### Layout
```
┌──────────────────────────────────────────────────────────────┐
│  Profile                                   [Name] [Avatar ▼] │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Edit Your Public Profile                                   │
│                                                              │
│  ┌────────────────────────────────────────────────────┐     │
│  │  Professional Bio                                   │     │
│  │  [Text area - 500 char max]                        │     │
│  └────────────────────────────────────────────────────┘     │
│                                                              │
│  ┌────────────────────────────────────────────────────┐     │
│  │  Background / Experience                            │     │
│  │  [Text area - 1000 char max]                       │     │
│  └────────────────────────────────────────────────────┘     │
│                                                              │
│  ┌────────────────────────────────────────────────────┐     │
│  │  Expertise Tags                                     │     │
│  │  [Product Management] [VC] [Founder] [+ Add]       │     │
│  └────────────────────────────────────────────────────┘     │
│                                                              │
│  ┌────────────────────────────────────────────────────┐     │
│  │  Hourly Rate: ₹500/hour                            │     │
│  │  ℹ️ Only admins can change your rate              │     │
│  └────────────────────────────────────────────────────┘     │
│                                                              │
│  [Save Changes]          [Preview Public Profile]           │
└──────────────────────────────────────────────────────────────┘
```

### Component Breakdown

**Professional Bio**: Short summary (Twitter bio style)
**Background**: Detailed work history and credentials
**Expertise Tags**: Clickable tags students can filter by
**Hourly Rate**: Read-only (admin-controlled for consistency)

**Justification**:
- **Student-facing**: Profile is marketing material
- **Preview button**: See exactly what students see
- **Rate transparency**: Mentors know their rate but can't change it
- **Configuration category**: Set and forget

---

## Settings (Header Dropdown)

### Goal
Minimal security settings - only what's essential.

### Contents
```
Settings
│
├── Account Security
│   └── Email: john@example.com (read-only)
│
└── Change Password
    ├── Current Password: [input]
    ├── New Password: [input]
    ├── Confirm Password: [input]
    └── [Update Password]
```

**Justification**:
- **Minimal surface area**: Only security-critical settings
- **No notification settings**: Not needed for MVP
- **No timezone settings**: Inferred from browser/system
- **No payment settings**: Not implementing payout configuration yet

---

## Priority Justifications

### Priority Hierarchy Explained

```
P1 - CRITICAL: Ongoing Sessions
  ↓
  Why: Time-sensitive, revenue-critical, user expectation
  Action: Join call immediately
  Frequency: Rare but urgent
  Placement: Top of dashboard AND sessions tab

P2 - HIGH: Pending Approvals, Today's Schedule
  ↓
  Why: Payment-dependent, operational necessity
  Action: Mark complete, join upcoming calls
  Frequency: Daily
  Placement: Dashboard primary area

P3 - MEDIUM: Upcoming Sessions, Availability
  ↓
  Why: Planning and preparation
  Action: Review upcoming, set availability
  Frequency: Weekly
  Placement: Dedicated tabs

P4 - LOW: Stats, History, Payments Details
  ↓
  Why: Informational, no immediate action
  Action: Review and analyze
  Frequency: Monthly
  Placement: Bottom of dashboard, dedicated tabs

P5 - CONFIGURATION: Profile, Settings
  ↓
  Why: Set and forget
  Action: Update profile, change password
  Frequency: Quarterly or less
  Placement: Dropdown menu, dedicated tabs
```

### Why This Priority Order?

**Research-Backed Decisions**:

1. **Ongoing Sessions = P1**
   - Nielsen Norman Group: "Users prioritize time-sensitive tasks"
   - Missing a live session = immediate revenue loss
   - User expectation: Platform should highlight current session

2. **Pending Approvals = P2**
   - Directly tied to payment
   - Behavioral psychology: Delayed rewards reduce motivation
   - Business model: Platform needs mentors to confirm sessions

3. **Schedule = P2-P3**
   - Operational necessity
   - Allows preparation time
   - Reduces no-shows

4. **Financial Tracking = P4**
   - Important but not urgent
   - Typically reviewed monthly
   - Doesn't require immediate action

---

## Component Justifications

### 1. Ongoing Sessions Card

**Why Always at Top?**
- **Time sensitivity**: Session is happening NOW
- **Revenue protection**: Prevents missed sessions
- **Visual priority**: Red border + pulsing animation
- **User expectation**: When I'm in a session, joining should be obvious

**Why Countdown Timer?**
- Creates urgency
- Helps mentors manage session time
- Visual feedback (not just static text)

**Why Green Button?**
- Color psychology: Green = go, action
- Contrasts with red border (attention + action)
- Industry standard (Zoom, Google Meet use green)

---

### 2. Rotational Pending Approvals

**Why NOT Show All Pending Sessions?**

**Rejected Approach**: List all 20 pending sessions at once

**Problems with Full List**:
1. **Overwhelm**: Seeing 20 items creates anxiety
2. **Decision paralysis**: "Which one should I do first?"
3. **Space**: Takes up entire dashboard
4. **Scroll fatigue**: Users must scroll to find other info

**Why Rotation Works Better**:
1. **Focus**: Handle one at a time (reduces cognitive load)
2. **Progressive disclosure**: "2 more pending" creates manageable expectation
3. **Gamification**: Watching count decrease provides satisfaction
4. **Space efficiency**: Maintains clean dashboard

**Implementation**:
- Show 2-3 sessions in carousel
- Auto-rotate every 10 seconds OR manual swipe
- Counter shows remaining: "2 more pending review..."
- When marked complete → Next session slides up

---

### 3. Adaptive Layout (Today's Schedule)

**Why Full-Width When No Approvals?**

**Space Efficiency**:
- Empty column is wasted space
- Full-width allows larger session cards
- Better information density

**Visual Hierarchy**:
- When approvals exist → Split attention (both important)
- When no approvals → Full focus on schedule

**User Flow**:
- Mentor marks all sessions complete
- Pending box disappears (visual reward)
- Schedule expands (more breathing room)

---

### 4. Sessions Tab Structure (3 Tabs)

**Why NOT Combined List with Filters?**

**Rejected Approach**: Single list with dropdown filters (Upcoming/Pending/Completed)

**Problems**:
1. **Hidden actions**: Pending sessions buried in list
2. **Filter fatigue**: Users must actively filter each time
3. **Mental model**: Mixing actionable and informational items

**Why Tabs Work Better**:
1. **Clear separation**: Each tab has distinct purpose
2. **Action visibility**: "Pending Review" tab highlights what needs doing
3. **Badge notifications**: Can show "(3)" on Pending tab
4. **Reduced cognitive load**: Each view is focused

---

### 5. Payments Tab Separation

**Why NOT Keep Earnings on Dashboard?**

**Privacy**:
- Mentors may screen-share during sessions
- Financial data is sensitive
- Not everyone wants earnings always visible

**Mental Model**:
- Dashboard = Work mode (operations)
- Payments = Financial mode (tracking)
- Mixing contexts creates cognitive load

**Information Hierarchy**:
- Dashboard = Today's actions
- Payments = Historical data
- Different time horizons, different purposes

**Industry Standard**:
- Upwork: Separate "My Stats" and "Reports"
- Fiverr: Separate "Dashboard" and "Earnings"
- Uber: Separate "Home" and "Earnings"

---

### 6. No Payout Settings

**Why NOT Include Bank Details / Tax Forms?**

**Scope Decision**:
- MVP doesn't need payout automation
- Manual admin payouts for now
- Reduces complexity

**Future Consideration**:
- Can add later as "Payout Settings" section
- Would include: Bank account, PAN, GST, UPI
- Not critical for launch

---

## Rejected Design Options

### 1. Account Status Warnings on Dashboard

**Proposed Design**:
```
⚠️ Your account is pending admin approval
⚠️ Set your availability to receive bookings
⚠️ Add payment details to receive earnings
```

**Why We Rejected It**:
- **Temporary state**: Only applies during onboarding
- **Clutter**: Takes up space even when not applicable
- **Anxiety**: Red/orange warnings create negative emotion
- **Better alternative**: Email notification + profile completion checklist

**Decision**: Remove account warnings from dashboard

---

### 2. Badge Navigation for Pending Reviews

**Proposed Design**:
```
Dashboard shows: "3 sessions need review [View All]"
Clicking → Navigates to Sessions tab > Pending Review
```

**Why We Rejected It**:
- **Extra click**: Increases friction
- **Navigation overhead**: Context switch between pages
- **Delayed action**: Mentor sees count but can't act immediately
- **User frustration**: "Why can't I just mark it complete here?"

**Decision**: Show pending reviews directly on dashboard with action buttons

---

### 3. Combined Session History with Earnings

**Proposed Design**:
```
Session History Tab:
Date       Student        Duration    Earnings    Status
Mar 15    Sarah Johnson   60 min     ₹500        Completed
Mar 14    Mike Chen       60 min     ₹500        Completed
```

**Why We Rejected It**:
- **Mixed purposes**: Session management vs. financial tracking
- **Information overload**: Too many columns in table
- **Mental model**: Earnings belong in financial context (Payments tab)
- **Privacy**: Session history might be shown to students/screenshared

**Decision**: Session history shows only session details, earnings moved to Payments tab

---

### 4. Payout Settings in Payments Tab

**Proposed Design**:
```
Payments Tab:
├── Earnings Overview
├── Payment History
└── Payout Settings
    ├── Bank Account
    ├── UPI ID
    ├── PAN Number
    └── GST Details
```

**Why We Rejected It**:
- **Not needed for MVP**: Manual admin payouts
- **Complexity**: Requires bank verification, tax compliance
- **Scope creep**: Can be added later
- **Focus**: Keep Payments tab focused on tracking, not configuration

**Decision**: Remove payout settings, keep tab focused on earnings tracking only

---

### 5. Expanded Settings with Notifications

**Proposed Design**:
```
Settings:
├── Account Security
├── Notification Preferences
│   ├── Email notifications
│   ├── SMS notifications
│   └── Push notifications
├── Timezone
├── Language
└── Password
```

**Why We Rejected It**:
- **Over-engineering**: MVP doesn't need notification customization
- **Low value**: Most users want all notifications
- **Complexity**: More settings = more confusion
- **Timezone**: Can be inferred from browser
- **Language**: Single language for MVP

**Decision**: Keep settings minimal (Security + Password only)

---

### 6. Clicking Through to Mark Sessions Complete

**Proposed Design**:
```
Dashboard shows:
"3 sessions need review [View All]"
↓
User clicks → Navigates to Sessions > Pending Review tab
↓
User clicks [Mark Complete] on each session
```

**Why We Rejected It**:
- **Friction**: Extra navigation step
- **User frustration**: "Why do I need to click twice?"
- **Efficiency**: Marking sessions should be fast
- **Abandonment risk**: Users might postpone if it's too many steps

**Decision**: Allow marking complete directly from dashboard (rotational carousel)

---

### 7. Single-Page Dashboard with All Info

**Proposed Design**:
```
Dashboard (Single Scroll):
├── Next Session
├── Today's Schedule
├── Pending Approvals (All of them)
├── Upcoming Sessions (Next 10)
├── Session History (Last 20)
├── Earnings Summary
└── Payment History
```

**Why We Rejected It**:
- **Information overload**: Too much on one page
- **Scroll fatigue**: Users must scroll extensively
- **No focus**: Everything competing for attention
- **Mobile nightmare**: Unusable on small screens
- **Slow loading**: Heavy page load with all data

**Decision**: Progressive disclosure across multiple tabs

---

### 8. Calendar View for Session History

**Proposed Design**:
```
Sessions > History Tab:
[Calendar View showing sessions on specific dates]
Click date → Shows sessions for that day
```

**Why We Rejected It**:
- **Inefficient**: Requires clicking each date to see sessions
- **Poor information density**: Calendar cells are small
- **Search difficulty**: Hard to find specific student
- **Mobile unfriendly**: Calendar views don't work well on mobile

**Decision**: List/table view with search and filters

---

### 9. Sidebar Navigation for Mentor Dashboard

**Proposed Design**:
```
Left Sidebar (Always Visible):
├── Dashboard
├── Availability
├── Sessions
├── Payments
└── Profile
```

**Why We Rejected It (In Favor of Top Nav)**:
- **Consistency**: Admin uses top nav + profile dropdown
- **Screen real estate**: Sidebar takes up width
- **Mobile**: Sidebar becomes hamburger menu anyway
- **Modern trend**: Top nav is more common in SaaS apps

**Decision**: Top navigation bar matching admin dashboard

---

### 10. Real-Time Earnings Counter on Dashboard

**Proposed Design**:
```
Dashboard Top Right:
💰 Today's Earnings: ₹1,500 (updating in real-time)
```

**Why We Rejected It**:
- **Distraction**: Constantly updating number draws attention
- **Privacy**: Always visible when screen-sharing
- **Psychological**: Can create anxiety if low
- **Belongs in Payments**: Financial data should be isolated

**Decision**: No earnings on dashboard, all financial data in Payments tab

---

## Visual Specifications

### Color System

**Priority-Based Colors**:
```
P1 - Critical (Ongoing):
  Background: red-50 with gradient
  Border: red-200, 2px
  Text: red-700
  Button: green-600 (action color)
  Animation: Pulsing red dot

P2 - High (Pending):
  Background: orange-50
  Border: orange-200
  Text: orange-700
  Button: blue-600

P3 - Medium (Schedule):
  Background: slate-50
  Border: slate-200
  Text: slate-900
  Button: blue-600

P4 - Low (Stats):
  Background: white
  Border: slate-200
  Text: slate-600
```

---

### Typography Hierarchy

```
H1 (Page Titles): text-2xl, font-bold, text-blue-950
H2 (Section Headers): text-xl, font-bold, text-blue-950
H3 (Card Titles): text-base, font-semibold, text-blue-950
Body: text-sm, font-normal, text-slate-900
Caption: text-xs, font-medium, text-slate-500
```

---

### Button Styles

```
[Join Call Now] (Ongoing):
  bg-green-600, text-white, font-bold, text-base
  shadow-lg, shadow-green-500/30
  Pulsing animation (scale 1.0 → 1.05)

[Join Call] (Upcoming):
  bg-blue-600, text-white, font-semibold, text-sm
  shadow-md, shadow-blue-500/30

[Mark Complete]:
  bg-blue-600, text-white, font-semibold, text-sm
  shadow-md, shadow-blue-500/30
```

---

### Card Spacing

```
Card Padding: p-6 (24px all sides)
Card Gap: gap-4 (16px between cards)
Section Gap: gap-6 (24px between sections)
Border Radius: rounded-xl (12px)
```

---

## Adaptive Layout Logic

### Dashboard Layout Rules

```javascript
// Pseudo-code for adaptive layout

function renderDashboard() {
  const ongoingSession = getOngoingSession()
  const pendingApprovals = getPendingApprovals()
  const todaySchedule = getTodaySchedule()

  // LAYER 1: Ongoing Sessions (if exists)
  if (ongoingSession) {
    renderOngoingCard(ongoingSession) // Full-width, top position
  }

  // LAYER 2: Today's Schedule + Pending Approvals
  if (pendingApprovals.length > 0) {
    renderTwoColumnLayout({
      left: todaySchedule,    // 50% width
      right: pendingApprovals  // 50% width, rotational carousel
    })
  } else {
    renderFullWidthSchedule(todaySchedule) // 100% width
  }

  // LAYER 3: Quick Stats (always)
  renderQuickStats()
}

function getOngoingSession() {
  const now = new Date()
  return sessions.find(s =>
    now >= s.start_time &&
    now <= s.end_time &&
    s.status === 'scheduled'
  )
}
```

---

### Rotational Carousel Logic

```javascript
function renderPendingApprovals(sessions) {
  const VISIBLE_COUNT = 3
  const [currentIndex, setCurrentIndex] = useState(0)

  const visibleSessions = sessions.slice(currentIndex, currentIndex + VISIBLE_COUNT)
  const remainingCount = sessions.length - currentIndex - VISIBLE_COUNT

  return (
    <Card>
      {visibleSessions.map(session => (
        <SessionCard
          session={session}
          onMarkComplete={() => {
            markComplete(session.id)
            // Auto-advance to next session
            setCurrentIndex(currentIndex)
          }}
        />
      ))}

      {remainingCount > 0 && (
        <p>{remainingCount} more pending review...</p>
      )}
    </Card>
  )
}
```

---

### Responsive Breakpoints

```css
/* Mobile: < 640px */
- Single column layout
- Pending approvals below schedule (not side-by-side)
- Smaller cards, reduced padding

/* Tablet: 640px - 1024px */
- Two-column layout maintained
- Cards stack better
- Touch-friendly buttons

/* Desktop: > 1024px */
- Full two-column layout
- Maximum width: 1280px (centered)
- Hover states active
```

---

## Implementation Notes

### Performance Considerations

**Real-Time Updates**:
- Ongoing session countdown: Update every 60 seconds (not every second to reduce re-renders)
- Pending approvals: Websocket or polling every 30 seconds
- Today's schedule: Check for new bookings every 2 minutes

**Lazy Loading**:
- Sessions History: Paginate (20 per page)
- Payment History: Load on tab visit (not on page load)
- Graphs: Load after initial page render

**Caching**:
- Today's schedule: Cache for 5 minutes
- Upcoming sessions: Cache for 15 minutes
- Profile data: Cache for 1 hour

---

### Accessibility

**Keyboard Navigation**:
- Tab through all interactive elements
- Enter to click buttons
- Escape to close modals/dropdowns

**Screen Readers**:
- ARIA labels on all buttons
- Announce countdown timer updates
- Announce when session is marked complete

**Color Contrast**:
- All text meets WCAG AA standards (4.5:1 ratio)
- Buttons have sufficient contrast
- Focus indicators clearly visible

---

## Conclusion

This Information Architecture for the Mentor dashboard balances:
- **Urgency** (ongoing sessions at top)
- **Action** (pending approvals on dashboard)
- **Planning** (today's schedule + upcoming sessions)
- **Tracking** (payments in dedicated tab)
- **Configuration** (profile + settings tucked away)

Every design decision is backed by:
1. **User research**: What mentors prioritize
2. **Psychology**: Cognitive load, mental models
3. **Industry standards**: What successful platforms do
4. **Business needs**: Payment confirmation, availability management

The result is a **focused, action-oriented interface** that helps mentors do their job efficiently while maintaining clarity and reducing overwhelm.

---

**Document Version**: 2.0
**Last Updated**: March 17, 2026
**Next Review**: After user testing with 10+ mentors
**Feedback**: [email protected]
