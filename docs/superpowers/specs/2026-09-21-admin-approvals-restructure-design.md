# Admin Dashboard Restructure: Approvals Split-View + Read-Only Sessions

Status: Approved for implementation planning
Date: 2026-09-21

## Summary

Split the admin dashboard's current single-page "Sessions" screen (which
today mixes a read-only session log with two actionable approval queues)
into two purpose-built screens:

- **Approvals** (new) — a split-view of the pre-session approval queue and
  the post-session review queue, with all admin actions (approve, reject,
  approve-post-session, send-for-revision).
- **Sessions** (reworked) — a flat, read-only, searchable log of every
  session regardless of status. No actions, no sub-tabs.

## Current state (baseline)

- Admin nav (`src/app/dashboard/admin/layout.tsx`): `navItems` array of
  `{label, href, icon}` → Home, Sessions, Mentors, Students. The
  `ClipboardCheck` icon is already imported but unused (uncommitted,
  half-finished prep for this work).
- `src/app/dashboard/admin/sessions/page.tsx` currently renders, in one
  long scroll, sourced from a single `fetchSessions()` call: "Pending
  Session Approvals" (actions: `approveBooking`, `rejectBooking` via
  `RejectReasonModal`), "Post-Session Review" (actions: `approvePostSession`,
  `sendSessionForRevision` via `RevisionReasonModal`), "Live Now",
  "Upcoming Approved Sessions" (paginated table), "Past & Rejected
  Sessions" (paginated table). Filtering today is a single text input
  (client-side `.includes()` on student/mentor name) plus status filter
  pills.
- Server actions live in `src/app/dashboard/admin/actions.ts`:
  `approveBooking`, `rejectBooking`, `saveSessionNote`, `lockSessionNote`,
  `approvePostSession`, `sendSessionForRevision`.
- Modals: `src/components/ui/reject-reason-modal.tsx`,
  `src/components/ui/revision-reason-modal.tsx` — reused as-is.
- Data source: `sessions` table is authoritative (renamed from `bookings`
  via `supabase/reconcile_schema_migration.sql`; `bookings` now exists
  only as a read-only compat view). Both `sessions/page.tsx` and
  `dashboard/admin/page.tsx` still contain a dead fallback path that
  queries the legacy `bookings` view on error. **Explicitly out of scope**
  for this restructure — left untouched, tracked as a separate cleanup.

## Deviations from the established design system (deliberate, user-approved)

The `mentorly-ui-ux` design guide's default heuristics (Hick's Law: prefer
sub-tabs over new nav items; no established split-view pattern; existing
grouped views use segmented tabs) argue against a 5th nav item and against
a split-view layout. This spec deliberately overrides both defaults,
confirmed with the user:

1. **New "Approvals" nav item** rather than folding pre/post-session into
   sub-tabs of Sessions — because Approvals and Sessions are different
   mental models (actionable queue vs. read-only log) and conflating them
   is what caused the current page to be overloaded.
2. **Split-view layout** (new pattern, no existing precedent in the app)
   rather than segmented tabs — because pre-session and post-session are
   two independent queues an admin may want to triage side by side, not
   sequential views of the same list.

All other aspects (colors, type, spacing, card patterns, modal patterns,
button semantics, status badge colors) follow the design system exactly
as documented — no other deviations.

## Architecture

### 1. Nav (`src/app/dashboard/admin/layout.tsx`)

Add to `navItems`, between Home and Sessions:

```ts
{
  label: 'Approvals',
  href: '/dashboard/admin/approvals',
  icon: ClipboardCheck, // already imported, currently unused
}
```

The nav item renders a pending-count badge (small pill, Lemon Yellow tint
per the "Requested/Awaiting" status color) showing
`pendingApprovalCount + postSessionReviewCount`. Count is fetched the same
way the existing admin home page fetches its metric cards (a `count`-only
Supabase query against `sessions`, filtered by status) — no new query
pattern needed, and it must update on navigation (re-fetch on route
mount, not cached indefinitely) so it doesn't go stale while an admin
works through the queue on another tab.

### 2. Approvals page (`src/app/dashboard/admin/approvals/page.tsx`)

New client component. Data: reuses the same `sessions` query logic
currently in `sessions/page.tsx` (student/mentor profile joins, no
`bookings` fallback — see scope note above, we don't touch that path, we
just don't replicate it into new code), split into two independent
fetches/subscriptions:

- Pre-session: `status = 'pending'`
- Post-session: status indicating a submitted-but-unreviewed post-session
  report

**Desktop (`md:` and up):** two-column `grid grid-cols-2 gap-6`, each
column independently scrollable (`overflow-y-auto`, own max-height),
each with a header (title + count, e.g. "Pre-session · 3").

**Mobile (`<md`):** a segmented pill toggle at the top (pill radius,
Cream Butter active-tab background per design tokens, matches the visual
language of the existing Upcoming/Pending/History tab control even though
the layout mechanism is new) switches between rendering only the
pre-session column or only the post-session column. Only the visible
column's data is fetched/rendered on mobile — not fetch-both-hide-one —
to avoid wasted requests on slow connections.

**Two new components**, page-local
(`src/app/dashboard/admin/approvals/components/`):
- `pre-session-queue.tsx` — extraction of today's "Pending Session
  Approvals" section: same card content, `approveBooking`/`rejectBooking`
  actions, `RejectReasonModal`.
- `post-session-queue.tsx` — extraction of today's "Post-Session Review"
  section: same card content, `approvePostSession`/`sendSessionForRevision`
  actions, `RevisionReasonModal`.

Both are wrapped in the new shared `ExpandableRow` component (see below).

### 3. New shared component: `ExpandableRow`

`src/components/ui/expandable-row.tsx`. Generic wrapper implementing the
progressive-disclosure heuristic:

- Collapsed (default): current queue-item-card summary line — name bold,
  context line muted (date/time), status badge, chevron affordance.
- Expanded (on click/tap, or Enter/Space when focused — keyboard
  accessible): reveals full detail exactly as currently always-shown
  today (key insights, student actionables, admin feedback note, action
  buttons). No new data fetch on expand — all detail data is already
  present in the row's props from the queue's existing fetch.
- One row expanded at a time is NOT required — independent expand state
  per row (simplest, matches how the existing cards have no such
  constraint today).

Props: `summary: ReactNode`, `children: ReactNode` (expanded content),
`defaultExpanded?: boolean`. Kept generic/content-agnostic so both queues
(and potentially other future review UIs) can reuse it without the
component knowing about sessions/bookings at all.

### 4. Sessions page rework (`src/app/dashboard/admin/sessions/page.tsx`)

- Remove the "Pending Session Approvals" and "Post-Session Review"
  sections, their action buttons, and their modal usages entirely — those
  now live only on Approvals.
- Remove the status filter pills row.
- Single flat list/table (reuse existing paginated table component)
  showing sessions of **all** statuses together, most recent first.
- Replace the current plain text search input with `TagSearchInput`.

### 5. New shared component: `TagSearchInput`

`src/components/ui/tag-search-input.tsx`. Generic tag/pill autocomplete
input:

- Typing filters a dropdown of suggestions. Suggestions are the distinct
  student/mentor names present in the already-loaded sessions list
  (derived client-side — no new query, since the full list is already
  fetched for the flat table).
- Selecting a suggestion (click or Enter) converts it into a removable
  pill rendered inline in the input (pill radius per design tokens, ×
  to remove).
- Matching semantics: a session is shown if it involves **any** selected
  name (OR across tags) — matches the plan's stated behavior.
- No tags selected = show all sessions (current default state).
- Keyboard accessible: arrow keys through suggestions, Enter to select,
  Backspace on empty input removes the last pill.

Props designed generically (`suggestions: string[]`, `selected: string[]`,
`onChange`) so it isn't coupled to sessions data, consistent with keeping
new `components/ui/` additions reusable.

## Data flow & error handling

- No new server actions needed — Approvals reuses
  `approveBooking`/`rejectBooking`/`approvePostSession`/`sendSessionForRevision`
  from `src/app/actions.ts` (admin) unchanged.
- Existing error-handling pattern (toast on action failure, modal stays
  open on error so the admin doesn't lose their typed reason) is
  preserved as-is in both extracted queue components.
- Nav badge count query failure: fail soft (badge simply omitted/shows
  nothing), never blocks nav rendering.

## Testing

- Vitest unit tests for `ExpandableRow` (collapsed/expanded toggle,
  keyboard activation) and `TagSearchInput` (suggestion filtering, pill
  add/remove, OR-match filtering logic) as new isolated components.
- Existing action-button behavior (approve/reject/post-session-review)
  is moved, not rewritten — verify via manual test in the running app
  (per CLAUDE.md guidance to test UI changes in-browser) that the
  extracted queue components still call the right server actions and
  the modals still block submission without a reason.
- Manual responsive check: split-view at desktop width, toggle behavior
  under `768px`.
- Manual check: Sessions page search with 0, 1, and 2+ tags selected,
  confirming OR-match.

## Out of scope

- Legacy `bookings`-view fallback removal in `sessions/page.tsx` and
  `dashboard/admin/page.tsx` — separate follow-up.
- Any change to the underlying `sessions`/`bookings` schema or RLS
  policies.
- Any change to mentor-facing or student-facing pages.
