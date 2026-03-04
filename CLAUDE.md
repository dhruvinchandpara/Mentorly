# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Mentorly is a mentorship marketplace platform connecting students with professional mentors for 1-on-1 video sessions. Built with Next.js 16 (App Router), React 19, Supabase, and integrated with Google Calendar/Meet.

## Development Commands

```bash
# Development
npm run dev              # Start dev server at http://localhost:3000

# Build & Production
npm run build            # Create production build
npm start                # Run production server

# Linting
npm run lint             # Run ESLint
```

## Architecture Overview

### Authentication & Authorization

**Role-Based Access Control (RBAC):**
- Three roles: `student`, `mentor`, `admin` (enum defined in database)
- Roles are set during signup via `raw_user_meta_data` and stored in `profiles` table
- Role assignment is handled by database trigger `handle_new_user()` on `auth.users` insert

**Auth Flow:**
- Client-side: `AuthContext` ([src/context/AuthContext.tsx](src/context/AuthContext.tsx)) provides `useAuth()` hook
- Server-side: Use `createClient()` from [src/lib/supabase/server.ts](src/lib/supabase/server.ts) in Server Components/Actions
- Admin operations: Use `createAdminClient()` from [src/lib/supabase/admin.ts](src/lib/supabase/admin.ts) for bypassing RLS
- Middleware: [src/middleware.ts](src/middleware.ts) handles session refresh and protects routes (redirects unauthenticated users to `/login`)

**Public routes:** `/`, `/explore`, `/login`, `/auth`, `/mentor/[id]`

### Database Architecture

**Core Tables:**
- `profiles` - User accounts (linked to `auth.users`), stores role
- `mentors` - Mentor-specific data (bio, expertise tags, hourly_rate, is_active)
- `availability` - Mentor schedules (weekly recurring + date-specific slots)
- `bookings` - Session reservations with status tracking and Google Meet links

**Key Relationships:**
- `mentors.id` → `profiles.id` (one-to-one)
- `bookings.mentor_id` → `mentors.id`
- `bookings.student_id` → `profiles.id`
- `availability.mentor_id` → `mentors.id`

**RLS Policies:**
- Profiles: public read, users can update their own
- Mentors: public read, mentors can update their own
- Bookings: users see bookings where they are student OR mentor
- Availability: mentors manage their own schedules, students can view for booking UI

**Schema Migrations:**
All SQL files are in `/supabase/` directory. Apply migrations manually in Supabase dashboard or via CLI.

### Booking Flow

1. **Student initiates booking** - Selects time slot from mentor's availability
2. **Server Action** - [src/app/actions/booking.ts](src/app/actions/booking.ts) `processBooking()` function:
   - Creates booking record (status: 'scheduled')
   - Calls Google Calendar API via [src/lib/google-calendar.ts](src/lib/google-calendar.ts)
   - Creates calendar event with Google Meet link
   - Updates booking with `meet_link` and `google_event_id`
3. **Both parties** receive calendar invites with Meet link via email
4. **Session lifecycle** tracked via booking status enum: `scheduled` → `completed` or `cancelled`

### Google Calendar Integration

**Service Account Authentication:**
- Uses JWT auth with Google service account credentials
- Required env vars: `GOOGLE_CLIENT_EMAIL`, `GOOGLE_PRIVATE_KEY`
- Service account must have calendar API enabled and domain-wide delegation configured
- Creates events on the service account's "primary" calendar
- Automatically generates Google Meet conference links via `conferenceData` API

**Implementation:** [src/lib/google-calendar.ts](src/lib/google-calendar.ts) - `createGoogleMeeting()` function

### Client vs Server Components

**Server Components (default):**
- Used for data fetching, SEO-critical pages
- Import Supabase client from `@/lib/supabase/server`

**Client Components ('use client'):**
- Pages with interactivity, forms, state management
- Most dashboard pages, explore page, booking UI
- Use `useAuth()` hook for accessing user/profile/supabase client
- Examples: [src/app/explore/page.tsx](src/app/explore/page.tsx), [src/app/dashboard/mentor/page.tsx](src/app/dashboard/mentor/page.tsx)

**Server Actions ('use server'):**
- Booking creation, admin operations requiring elevated privileges
- Example: [src/app/actions/booking.ts](src/app/actions/booking.ts)

### Routing Structure

```
/                          - Landing page
/login                     - Auth (sign in/sign up)
/explore                   - Browse mentors (public)
/mentor/[id]               - Mentor profile + booking (public)
/dashboard                 - Role-based redirect
  /student                 - Student bookings view
  /mentor                  - Mentor dashboard (availability, bookings, earnings)
  /admin                   - Admin panel (mentor approval)
    /mentors               - Mentor management
```

Dashboards are role-protected via client-side checks in page components using `useAuth()` and `router.replace()`.

### Styling

- TailwindCSS 4 with PostCSS
- Dark mode support via `dark:` variants (system preference)
- Custom color scheme: Indigo/Purple gradients for primary branding
- Lucide React for icons
- Custom fonts: Geist Sans and Geist Mono

### Environment Variables

Required variables (create `.env.local`):

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=    # For admin client

# Google Calendar API
GOOGLE_CLIENT_EMAIL=           # Service account email
GOOGLE_PRIVATE_KEY=            # Service account private key (with \n escaped)

# Optional
ADMIN_EMAIL=                   # Added to all calendar invites
```

### Key Patterns

**Availability System:**
- Mentors set weekly recurring hours (day_of_week: 0-6, start_time, end_time)
- Can also add date-specific slots (specific_date field)
- Both types stored in same `availability` table, differentiated by nullable fields

**Real-time Call Status:**
- Booking cards show dynamic status: 'upcoming', 'ready' (5min before), 'live', 'past'
- Implemented with client-side interval ticking every 30s
- See `getCallState()` in [src/app/dashboard/mentor/page.tsx](src/app/dashboard/mentor/page.tsx)

**Path Aliases:**
- `@/*` maps to `./src/*` (configured in tsconfig.json)
- Always use path aliases for imports within src/

## Common Development Tasks

### Adding a new role-protected page

1. Create page component with 'use client' directive
2. Use `useAuth()` hook to access user profile
3. Add role check and redirect if unauthorized
4. Update middleware if route needs server-side protection

### Modifying database schema

1. Create new SQL file in `/supabase/` directory
2. Apply migration in Supabase dashboard SQL editor
3. Update TypeScript types if needed (no auto-generation configured)
4. Add/update RLS policies for security

### Working with Server Actions

- Always use 'use server' directive
- Import `createAdminClient()` for operations requiring service role
- Return serializable objects only (no Date objects, use ISO strings)
- Handle errors gracefully and return error messages to client
