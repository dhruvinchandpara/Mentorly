# Mentorly Information Architecture (IA) Restructure Plan

## Executive Summary
Currently, the Mentorly application displays features for Student, Mentor, and Admin personas on single, monolithic dashboard pages. This causes cognitive overload and clutters the UI.

This document outlines a new Information Architecture (IA) designed around **Progressive Disclosure**, separating features into clearly delineated tabs or navigation routes. The goal is to retain all existing backend functionality but reorganize the UI to prioritize immediate user goals.

---

## IA Categorization Framework
Every feature in the app must be categorized into one of three buckets for each persona:

1. **Actionable (High Prominence):** The primary tools users need to "do their job" immediately (e.g., joining a call, booking a session, approving a mentor).
2. **Consumption (Medium Prominence):** Data and information the user needs to monitor or digest (e.g., upcoming schedule, key metrics, past history).
3. **Configuration (Low Prominence):** Foundational setups, profile editing, and security settings. These are "set it and forget it" actions that must be hidden behind dedicated "Settings" or "Profile" tabs to keep the main dashboards clean.

---

## 1. Student Persona IA

**Goal:** Focus entirely on the immediate next action (joining a call or finding a mentor) while keeping past history accessible but secondary.

### UI Structure (Top or Sidebar Navigation)
*   **Home / Overview:** 
    *   *Hero Section:* "Next Upcoming Session" prominently displayed with a large "Join Call" button (active 5 mins before).
    *   *Quick Actions:* Prominent "Find a Mentor" Call-to-Action.
    *   *Digest:* A quick glance at the next 2-3 upcoming sessions.
*   **Explore Mentors (The Marketplace):**
    *   Remains the main discovery hub with search and expertise filters.
*   **My Sessions (Dedicated Page):**
    *   *Tabs:* "Upcoming", "Past", "Cancelled".
    *   *Details:* Full list of all sessions with options to add to Google Calendar.
*   **Settings / Profile:**
    *   Basic info (Name, Email), linked accounts (Google Auth), and Sign Out.

### Student IA Diagram
```mermaid
graph TD
    classDef main fill:#4F46E5,stroke:#3730A3,color:white,font-weight:bold
    classDef nav fill:#F1F5F9,stroke:#CBD5E1,color:#0F172A
    classDef section fill:#E0E7FF,stroke:#8B5CF6,color:#1E1B4B
    classDef action fill:#10B981,stroke:#059669,color:white
    classDef config fill:#F3F4F6,stroke:#9CA3AF,color:#374151
    
    A[Student Login]:::main --> B
    
    subgraph Navigation
        B[Dashboard Home]:::nav
        C[Explore Mentors]:::nav
        D[My Sessions]:::nav
        E[Profile & Settings]:::nav
    end
    
    B --- B1
    C --- C1
    D --- D1
    E --- E1

    subgraph Home Tab
        B1[Next Upcoming Session]:::section --> B2[Join Call Button]:::action
        B1 --> B3[Next 2-3 Sessions Digest]:::section
        B1 --> B4[Find Mentor CTA]:::action
    end
    
    subgraph Explore Tab
        C1[Search Bar]:::section
        C1 --> C2[Expertise Filters]:::section
        C1 --> C3[Mentor Directory Grid]:::section
        C3 --> C4[Mentor Profile Page]:::section
        C4 --> C5[Book Session Flow]:::action
    end
    
    subgraph Sessions Tab
        D1[Upcoming Sessions List]:::section
        D1 --> D2[Add to Google Calendar]:::action
        D1 --> D3[Past Sessions History]:::section
        D1 --> D4[Cancelled Sessions]:::section
    end
    
    subgraph Settings Tab
        E1[Personal Info Name/Email]:::config
        E1 --> E2[Sign Out]:::config
    end
```

---

## 2. Mentor Persona IA

**Goal:** Separate day-to-day operations (managing calls) from configuration (setting up the profile/availability). The dashboard must be a command center, not a setup wizard.

### UI Structure (Sidebar Navigation)
*   **Dashboard (Command Center):**
    *   *Immediate Focus:* "Today's Schedule" or "Next Session" prominently displayed.
    *   *Metrics Strip:* Upcoming sessions, completed sessions, total earned (₹).
    *   *Action Items:* "Sessions Pending Review" (where they must manually click "Mark as Completed" to track earnings).
*   **Calendar / Availability (The Engine):**
    *   *Main View:* Visual weekly calendar showing availability.
    *   *Manage Availability:* Dedicated section to set recurring weekly hours.
    *   *Date Overrides:* Section to add specific date blocks or extra slots.
*   **Session History:**
    *   Clean table of all past sessions, statuses, and individual session earnings.
*   **Profile (Public Facing):**
    *   Edit Bio, Work Background, Expertise Tags.
    *   *Preview:* Button to see exactly how students view their profile.
    *   *Read-Only:* Display their Hourly Rate (noting that only Admin can change it).
*   **Account Security (Settings):**
    *   Auth Provider Details (Google OAuth vs Email/Password).
    *   Change Password (if applicable).
    *   Delete Account / Data Export (Danger Zone).
    *   Sign Out.

### Mentor IA Diagram
```mermaid
graph TD
    classDef main fill:#4F46E5,stroke:#3730A3,color:white,font-weight:bold
    classDef nav fill:#F1F5F9,stroke:#CBD5E1,color:#0F172A
    classDef section fill:#E0E7FF,stroke:#8B5CF6,color:#1E1B4B
    classDef action fill:#10B981,stroke:#059669,color:white
    classDef config fill:#F3F4F6,stroke:#9CA3AF,color:#374151
    classDef warning fill:#F59E0B,stroke:#D97706,color:white
    classDef danger fill:#EF4444,stroke:#B91C1C,color:white
    
    A[Mentor Login]:::main --> B
    
    subgraph Sidebar Navigation
        B[Overview Dashboard]:::nav
        C[Availability Calendar]:::nav
        D[Session History]:::nav
        E[Public Profile]:::nav
        F[Account Security]:::nav
    end
    
    B --- B1
    C --- C1
    D --- D1
    E --- E1
    F --- F1

    subgraph Overview Tab
        B1[Account Status Warning if Pending]:::warning
        B1 --> B2[Today's Schedule Focus]:::section
        B2 --> B3[Join Call Button]:::action
        B2 --> B4[Metrics Strip Sessions, Earnings]:::section
        B4 --> B5[Sessions Pending Review]:::warning
        B5 --> B6[Mark as Completed]:::action
    end
    
    subgraph Calendar Tab
        C1[Visual Weekly Calendar View]:::section
        C1 --> C2[Set Recurring Weekly Hours]:::config
        C1 --> C3[Add Date-Specific Overrides]:::config
    end
    
    subgraph History Tab
        D1[All Past Sessions Table]:::section
        D1 --> D2[Earnings per Session log]:::section
    end
    
    subgraph Profile Tab
        E1[Edit Bio, Background, Expertise]:::config
        E1 --> E2[View Read-Only Hourly Rate]:::section
        E1 --> E3[Preview Public Profile]:::action
    end
    
    subgraph Security Settings Tab
        F1[View Connection Google vs Auth]:::config
        F1 --> F2[Change Password]:::config
        F2 --> F3[Delete Account Danger Zone]:::danger
        F3 --> F4[Sign Out]:::config
    end
```

---

## 3. Admin Persona IA

**Goal:** Provide a high-level overview of platform health with drill-down capabilities for specific operational tasks. Highly sensitive configuration tasks must be isolated.

### UI Structure (Sidebar Navigation)
*   **Overview (Bird's Eye View):**
    *   *Key Metrics:* Total active mentors, total booked sessions, total platform hours completed (New), pending approvals.
    *   *Alerts:* Prominent notification for mentors awaiting approval.
    *   *Recent Activity:* Feed of latest registrations and bookings.
*   **Mentor Management:**
    *   *Table View:* List of all mentors, Emails, Status (Active/Pending), Earnings.
    *   *Actions:* Approve/Reject accounts, Edit Mentor Hourly Rates.
*   **Student Management:**
    *   *Table View:* List of all active students.
*   **Access Control & Config (The "Hidden" Area):**
    *   *Authorized Emails:* UI to upload CSV or manually enter allowed student emails (Whitelist).
    *   *Admin Roles:* UI to grant Admin access to other users. This must be separated from general Student/Mentor management to prevent mistakes.

### Admin IA Diagram
```mermaid
graph TD
    classDef main fill:#4F46E5,stroke:#3730A3,color:white,font-weight:bold
    classDef nav fill:#F1F5F9,stroke:#CBD5E1,color:#0F172A
    classDef section fill:#E0E7FF,stroke:#8B5CF6,color:#1E1B4B
    classDef action fill:#10B981,stroke:#059669,color:white
    classDef config fill:#F3F4F6,stroke:#9CA3AF,color:#374151
    classDef danger fill:#EF4444,stroke:#B91C1C,color:white
    
    A[Admin Login]:::main --> B
    
    subgraph Sidebar Navigation
        B[Platform Analytics]:::nav
        C[Manage Mentors]:::nav
        D[Manage Students]:::nav
        E[Access Control & Settings]:::nav
    end
    
    B --- B1
    C --- C1
    D --- D1
    E --- E1

    subgraph Dashboard Tab
        B1[Key Metrics Strip]:::section
        B1 --> B1a[Total Active Mentors]:::section
        B1 --> B1b[Total Bookings & Platform Hours]:::section
        B1 --> B2[Pending Master Approval Alert]:::action
        B1 --> B3[Recent Activity Feed]:::section
    end
    
    subgraph Mentors Tab
        C1[All Mentors Table View]:::section
        C1 --> C2[Approve / Reject Accounts]:::action
        C1 --> C3[Edit Mentor Hourly Rates]:::action
    end
    
    subgraph Students Tab
        D1[Active Students Table View]:::section
    end
    
    subgraph Security Settings Tab
        E1[Whitelist Authorized Student Emails]:::config
        E1 --> E2[Bulk Import Emails CSV]:::config
        E2 --> E3[Grant Admin Role to User]:::danger
        E3 --> E4[Sign Out]:::config
    end
```
