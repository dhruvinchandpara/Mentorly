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

# Linting & Formatting
npm run lint             # Run ESLint
npm run format           # Format code with Prettier
npm run format:check     # Check formatting without changes

# Testing
npm run test             # Run Vitest tests
npm run test:ui          # Run tests with UI
npm run test:coverage    # Generate test coverage report

# Storybook (Component Development)
npm run storybook        # Start Storybook on port 6006
npm run build-storybook  # Build static Storybook
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

**Additional Tables:**
- `authorized_students` - Whitelist of approved student emails (admin-managed)

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
- Authorized Students: admins only (full CRUD)

**Slot-Based Bookings:**
- Bookings use 15-minute time slots (configurable via `slot_count` column)
- `slot_count = 1` means 15 minutes, `slot_count = 2` means 30 minutes, etc.
- Duration must be in 15-minute increments (`duration_minutes % 15 = 0`)
- Index on `(mentor_id, start_time, end_time)` for fast overlap detection

**Student Authorization:**
- New students must have their email pre-approved in `authorized_students` table
- Enforced via database trigger `handle_new_user()` on signup
- Prevents unauthorized student registrations

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
  /mentor                  - Mentor dashboard with collapsible sidebar
    /                      - Dashboard home (sessions overview)
    /availability          - Manage availability
    /sessions              - View all sessions
    /payments              - Payment history
    /profile               - Edit mentor profile
    /settings              - Account settings
  /admin                   - Admin panel with collapsible sidebar
    /                      - Admin dashboard home (stats)
    /sessions              - View all platform sessions
    /mentors               - Mentor management (approval)
    /students              - Student management
    /profile               - Admin profile settings
    /manage-admins         - Manage admin users
```

**Dashboard Layouts:**
- Both mentor and admin dashboards use dedicated layout components with collapsible sidebars
- Mentor layout: [src/app/dashboard/mentor/layout.tsx](src/app/dashboard/mentor/layout.tsx) (blue theme)
- Admin layout: [src/app/dashboard/admin/layout.tsx](src/app/dashboard/admin/layout.tsx) (indigo/purple gradient theme)
- Role protection enforced via `useEffect` checking `profile.role` and redirecting unauthorized users
- Layouts include navigation, breadcrumbs, and profile dropdown menus

### Styling & Design System

**Framework & Tools:**
- TailwindCSS 4 with PostCSS
- Lucide React for icons
- Custom fonts: Geist Sans and Geist Mono
- Shadcn UI components (customized)
- Base UI for headless components

**Design System:**
- Centralized design tokens in [src/lib/design-system.ts](src/lib/design-system.ts)
- Professional color palette: Primary Blue (trustworthy), Success Emerald, Warning Amber, Danger Red, Accent Purple
- Typography scale with precise line heights and letter spacing
- Consistent spacing (4px base unit), border radius, and shadow system
- Animation timings and easing curves defined
- Component patterns for buttons, cards, badges, and inputs

**Component Library:**
- Custom UI components in [src/components/ui/](src/components/ui/)
- Includes: buttons, cards, badges, tables, dropdowns, avatars, dialogs, tabs, etc.
- Special components: `stat-card.tsx`, `status-badge.tsx`, `animated-section.tsx`
- All components use design tokens for consistency

**Storybook Integration:**
- Component stories in [src/stories/](src/stories/)
- Run `npm run storybook` to view component library
- Includes accessibility testing via @storybook/addon-a11y
- Configured for Vite and Next.js integration

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

### Testing & Quality Assurance

**Testing Stack:**
- Vitest for unit and integration tests
- Playwright for browser testing (via @vitest/browser-playwright)
- Coverage reporting with @vitest/coverage-v8
- Storybook Vitest addon for component testing

**Linting & Formatting:**
- ESLint with Next.js config and TypeScript support
- Prettier with Tailwind CSS plugin and import sorting
- React Hooks and JSX accessibility linting enabled

**Running Tests:**
```bash
npm run test            # Run all tests
npm run test:ui         # Interactive test UI
npm run test:coverage   # Generate coverage report
```

### Development Tools & Dependencies

**Key Development Tools:**
- TypeScript 5 with strict mode
- Total TypeScript ts-reset for better type safety
- Type Fest for advanced TypeScript utilities
- React Query (TanStack) for server state management (devDependencies)
- Vite 8 for fast builds and HMR

**Notable Production Dependencies:**
- Next.js 16.1.6 with App Router
- React 19.2.3
- Supabase JS client + SSR helpers
- Google APIs for Calendar integration
- Class Variance Authority for component variants
- Tailwind Merge for class name merging
