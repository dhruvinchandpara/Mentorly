# Admin Pending Session Review Queue Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the student's pre-work reason and a historical-actionables panel to each card in the admin "Pending Session Approvals" queue, and replace the reject flow's `window.prompt()` with a required-reason modal, all styled against the real Mesa brand tokens.

**Architecture:** All changes live in the existing admin Sessions page (`src/app/dashboard/admin/sessions/page.tsx`) and its server actions (`src/app/dashboard/admin/actions.ts`). A new pure validator (`validateRejectionReason`) is added alongside the existing `validateBookingForm` in `src/lib/booking-validation.ts` and enforced both client-side (disables the modal's submit button) and server-side (in `rejectBooking`). A new `RejectReasonModal` component wraps the existing (currently-unused) `src/components/ui/dialog.tsx` primitives — Base UI's `Dialog.Root`/`Popup` already provides focus trap and Escape-to-close, so no new a11y plumbing is needed. No new libraries, no new database migrations (the `sessions` table, its columns, the `rejection_reason_required` CHECK constraint, and `idx_sessions_student_mentor_history` all already exist).

**Tech Stack:** Next.js 16 App Router, React 19 client component (`'use client'`), Supabase JS client (browser, via `useAuth()`), Base UI (`@base-ui/react`) for the dialog/button primitives, Tailwind v4 with Mesa design tokens in `globals.css`, Vitest for pure-logic unit tests (`environment: 'node'`, `src/**/*.test.ts` only — no component/DOM test runner is configured in this repo, so the modal and page changes are verified manually via `npm run dev`, not with automated component tests).

**Spec:** Prompt #3 (v2): Admin Pre-Session Review Queue (pasted in full in the conversation that produced this plan — no separate file). Design tokens: `.claude/skills/mentorly-ui-ux/SKILL.md`.

## Global Constraints

- Read/write the `sessions` table directly for everything this plan touches — never the legacy `bookings` compatibility view (it doesn't expose `pre_work_reason`, `student_actionables`, or `key_insights` anyway).
- Historical actionables must be found by `post_session_submitted_at IS NOT NULL`, **not** by `status = 'completed'` — show them regardless of whether the prior session was ever approved, per the finalized decision. Flag with an "Unapproved" badge when `status !== 'completed'`.
- Reject requires a non-empty reason; the DB already enforces this with `CHECK (status <> 'rejected' OR rejection_reason IS NOT NULL)` (`mentorly_schema_migration.sql:122-123`) — client and server validation must not rely on the DB constraint alone, since a blank/whitespace string is technically non-null.
- Colors/type: only the tokens from `.claude/skills/mentorly-ui-ux/SKILL.md` — Ivory Whisper `#FFFBF3`, Cream Butter `#FBF4D7` (`bg-muted` resolves to this — see `globals.css:21,71`), Deep Teal Black `#0F1919`, Crimson Brick `#BA3B41` (hover `#A8343A`), Lemon Yellow `#E5E55A` (pale tint `#FBF7D9` for badges — see `status-badge.tsx:23`), warm hairline border `#E8E1D2` (`border-border`/`--line`). Manrope everywhere inside cards/badges/modals; Newsreader only on a top-level page title (this screen already has none inside the touched section, so no serif usage here at all).
- Approve = solid Deep Teal Black fill (`#0F1919`) / Ivory Whisper text. Reject = solid Crimson Brick fill (`#BA3B41`) / white text. These must never share a color on this screen.
- No new npm dependencies, no new toast library — reuse the existing inline `feedback` banner pattern already on this page (`page.tsx:299-315`) for the "Session request rejected" message, since no toast primitive exists anywhere in this codebase.

---

## Known pre-existing bug this plan must fix to make the feature visible at all

`getSessionState()` (`src/app/dashboard/admin/sessions/page.tsx:217-226`) currently only recognizes `session.status === 'pending'` as the pending state. But the real `session_status` enum (`reconcile_schema_migration.sql:11-23`) has no `'pending'` value — new rows are created with `status = 'requested'`. Since the page's Supabase query already succeeds against the real `sessions` table (no error, so the `bookings`-view fallback never triggers), every session in the Pending Approvals section today evaluates to `getSessionState() === 'requested'` and is silently filtered out of `pendingSessions` (`page.tsx:249`). **The Pending Approvals card currently never renders anything for real data.** Task 3 below fixes this as a prerequisite — without it, none of the new UI in this plan would ever be reachable to test.

---

### Task 1: Add `validateRejectionReason` to booking-validation.ts

**Files:**
- Modify: `src/lib/booking-validation.ts`
- Test: `src/lib/booking-validation.test.ts`

**Interfaces:**
- Produces: `validateRejectionReason(reason: string): BookingFormValidation` (reuses the existing `BookingFormValidation` union type already exported from this file: `{ valid: true } | { valid: false; error: string }`).

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/booking-validation.test.ts`:

```ts
describe('validateRejectionReason', () => {
  it('rejects an empty reason', () => {
    const result = validateRejectionReason('')
    expect(result.valid).toBe(false)
  })

  it('rejects a whitespace-only reason', () => {
    const result = validateRejectionReason('   ')
    expect(result.valid).toBe(false)
  })

  it('rejects a reason longer than 500 characters', () => {
    const result = validateRejectionReason('a'.repeat(501))
    expect(result.valid).toBe(false)
  })

  it('accepts a valid reason', () => {
    const result = validateRejectionReason('Please provide more detail on what you would like to cover')
    expect(result.valid).toBe(true)
  })
})
```

Update the import line at the top of the file to include the new function:

```ts
import { validateBookingForm, validateRejectionReason, isValidDuration, DURATION_OPTIONS } from './booking-validation'
```

- [ ] **Step 2: Run the tests and verify they fail**

Run: `npm run test -- src/lib/booking-validation.test.ts`
Expected: FAIL — `validateRejectionReason is not a function` (or a TypeScript error to that effect).

- [ ] **Step 3: Implement `validateRejectionReason`**

Append to `src/lib/booking-validation.ts`:

```ts
export function validateRejectionReason(reason: string): BookingFormValidation {
  if (!reason.trim()) {
    return { valid: false, error: 'A rejection reason is required' }
  }
  if (reason.length > 500) {
    return { valid: false, error: 'Reason must be 500 characters or less' }
  }
  return { valid: true }
}
```

- [ ] **Step 4: Run the tests and verify they pass**

Run: `npm run test -- src/lib/booking-validation.test.ts`
Expected: PASS, all tests including the 4 new ones.

- [ ] **Step 5: Commit**

```bash
git add src/lib/booking-validation.ts src/lib/booking-validation.test.ts
git commit -m "feat: add validateRejectionReason for the admin reject flow"
```

---

### Task 2: Require a validated reason in `rejectBooking`

**Files:**
- Modify: `src/app/dashboard/admin/actions.ts:554-583`
- Test: `src/app/dashboard/admin/actions.test.ts` (new)

**Interfaces:**
- Consumes: `validateRejectionReason` from `@/lib/booking-validation` (produced in Task 1).
- Produces: `rejectBooking(bookingId: string, reason: string): Promise<{ success: true } | { success: false; error: string }>` — **signature change**: `reason` becomes required (was `reason?: string`), and an invalid/empty reason now returns `{ success: false, error }` instead of silently substituting `'Declined by administrator'`. Task 6 (the page wiring) is the only caller and is updated in this same plan, so this is not a breaking change to any other consumer — confirmed no other caller exists (`rejectBooking` is only imported in `src/app/dashboard/admin/sessions/page.tsx:5`).

- [ ] **Step 1: Write the failing test**

Create `src/app/dashboard/admin/actions.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => {
    throw new Error('rejectBooking should validate the reason before creating a Supabase client')
  },
  getAdminUserId: () => {
    throw new Error('not needed for this test')
  },
}))

vi.mock('@/lib/google-calendar-oauth', () => ({
  createGoogleMeetingWithOAuth: () => {
    throw new Error('not needed for this test')
  },
}))

vi.mock('@/lib/google-oauth', () => ({
  isGoogleConnected: () => {
    throw new Error('not needed for this test')
  },
}))

import { rejectBooking } from './actions'

describe('rejectBooking validation', () => {
  it('rejects an empty reason without touching the database', async () => {
    const result = await rejectBooking('session-1', '')
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/reason/i)
  })

  it('rejects a whitespace-only reason without touching the database', async () => {
    const result = await rejectBooking('session-1', '   ')
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/reason/i)
  })
})
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `npm run test -- src/app/dashboard/admin/actions.test.ts`
Expected: FAIL — the mocked `createAdminClient` throws, because today's `rejectBooking` calls it unconditionally before looking at `reason` at all.

- [ ] **Step 3: Update `rejectBooking` to validate first**

Replace `src/app/dashboard/admin/actions.ts:554-583` with:

```ts
export async function rejectBooking(bookingId: string, reason: string) {
  const validation = validateRejectionReason(reason)
  if (!validation.valid) {
    return { success: false, error: validation.error }
  }

  try {
    const supabase = createAdminClient()

    const { error: sessErr } = await supabase
      .from('sessions')
      .update({ status: 'rejected', rejection_reason: reason.trim() })
      .eq('id', bookingId)

    if (sessErr) {
      return { success: false, error: sessErr.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Reject booking error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred.',
    }
  }
}
```

Note this also drops the `bookings`-view fallback update per the Global Constraints (writes go to `sessions` directly, and a session row that already exists always has a matching `sessions` row since `bookings` is a view derived from `sessions` — the fallback was legacy-era dead weight for pre-migration rows that no longer applies here).

Add the import at the top of `src/app/dashboard/admin/actions.ts:1-5`:

```ts
'use server'

import { createAdminClient, getAdminUserId } from '@/lib/supabase/admin'
import { createGoogleMeetingWithOAuth } from '@/lib/google-calendar-oauth'
import { isGoogleConnected } from '@/lib/google-oauth'
import { validateRejectionReason } from '@/lib/booking-validation'
```

- [ ] **Step 4: Run the test and verify it passes**

Run: `npm run test -- src/app/dashboard/admin/actions.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/admin/actions.ts src/app/dashboard/admin/actions.test.ts
git commit -m "feat: require a validated reason in rejectBooking"
```

---

### Task 3: Fix pending-state detection and extend the session data model

**Files:**
- Modify: `src/app/dashboard/admin/sessions/page.tsx:36-58` (types), `78-174` (fetch/normalize), `217-226` (`getSessionState`), `328-348` (filter pills)

**Interfaces:**
- Produces: an extended `SessionInfo` type with `preWorkReason: string`, `keyInsights: string | null`, `studentActionables: string | null`, `postSessionSubmittedAt: string | null` — consumed by Task 4's rendering and the priorSession lookup.
- Produces: `getSessionState()` now treats `'requested'` as `'pending'`, matching the real enum.

This task has no automated test — it's a data-shape/query change in a client component with no test harness in this repo (see Tech Stack note above). Verify manually per the Manual Verification step at the end of this task.

- [ ] **Step 1: Replace the `SessionNoteInfo`/`SessionInfo` types**

Replace `src/app/dashboard/admin/sessions/page.tsx:36-58`:

```tsx
type PriorSessionInfo = {
  keyInsights: string | null;
  studentActionables: string | null;
  status: string;
  postSessionSubmittedAt: string;
} | null;

type SessionInfo = {
  id: string;
  studentId: string;
  mentorId: string;
  studentName: string;
  mentorName: string;
  startTime: string;
  endTime: string;
  duration: number;
  status: string;
  rejectionReason?: string | null;
  meetLink: string | null;
  preWorkReason: string;
  keyInsights: string | null;
  studentActionables: string | null;
  postSessionSubmittedAt: string | null;
};
```

This drops `SessionNoteInfo` and `SessionInfo.sessionNote` — Task 4 replaces the `SessionNotePanel`-based "previous session note" block with the new historical-actionables panel built directly from `keyInsights`/`studentActionables`, so the synthetic `session_notes` reconstruction is no longer needed.

- [ ] **Step 2: Add `post_session_submitted_at` to the query and drop the synthetic `session_notes` mapping**

Replace `src/app/dashboard/admin/sessions/page.tsx:82-106`:

```tsx
      const { data: sessData, error: sessErr } = await supabase
        .from('sessions')
        .select(`
          id, student_id, mentor_id,
          requested_date, requested_start_time, start_time, end_time,
          duration_minutes, actual_duration_minutes, status, rejection_reason, meet_link,
          pre_work_reason, student_actionables, key_insights, post_session_submitted_at,
          student_profiles:profiles!sessions_student_id_fkey(full_name),
          mentor_profiles:profiles!sessions_mentor_id_fkey(full_name)
        `)
        .order('requested_date', { ascending: false })

      if (!sessErr && sessData) {
        sessionsList = sessData.map((s: any) => ({
          ...s,
          start_time: s.start_time || (s.requested_date ? new Date(s.requested_date + 'T' + (s.requested_start_time || '00:00:00') + 'Z').toISOString() : null),
          mentor_profiles: s.mentor_profiles ? { profiles: s.mentor_profiles } : null,
        }))
      } else {
```

(The line `const { data: legacyData } = await supabase` and everything through the end of the `else` block at line 119 is unchanged — the `bookings`-view fallback still only fires as an error-recovery path when the `sessions` query itself errors, which already satisfies "read from `sessions` directly" for the primary path.)

- [ ] **Step 3: Replace the row-normalization map**

Replace `src/app/dashboard/admin/sessions/page.tsx:121-168` (the `if (sessionsList && Array.isArray(sessionsList)) { setSessions(...) }` block):

```tsx
      if (sessionsList && Array.isArray(sessionsList)) {
        setSessions(
          sessionsList.map((s: any) => {
            const studentName =
              s.student_profiles &&
              typeof s.student_profiles === 'object' &&
              'full_name' in s.student_profiles
                ? String(s.student_profiles.full_name || 'Unknown')
                : 'Unknown';

            const mentorName =
              s.mentor_profiles &&
              typeof s.mentor_profiles === 'object' &&
              'profiles' in s.mentor_profiles
                ? s.mentor_profiles.profiles &&
                  typeof s.mentor_profiles.profiles === 'object' &&
                  'full_name' in s.mentor_profiles.profiles
                  ? String(s.mentor_profiles.profiles.full_name || 'Unknown')
                  : 'Unknown'
                : 'Unknown';

            return {
              id: s.id || '',
              studentId: s.student_id || '',
              mentorId: s.mentor_id || '',
              studentName,
              mentorName,
              startTime: s.start_time || new Date().toISOString(),
              endTime: s.end_time || new Date().toISOString(),
              duration: typeof s.duration_minutes === 'number' ? s.duration_minutes : 60,
              status: s.status || 'scheduled',
              rejectionReason: s.rejection_reason || null,
              meetLink: s.meet_link || null,
              preWorkReason: s.pre_work_reason || '',
              keyInsights: s.key_insights || null,
              studentActionables: s.student_actionables || null,
              postSessionSubmittedAt: s.post_session_submitted_at || null,
            };
          })
        );
      }
```

- [ ] **Step 4: Fix `getSessionState` to recognize `'requested'`**

In `src/app/dashboard/admin/sessions/page.tsx:217-226`, change line 220:

```tsx
    if (session.status === 'pending' || session.status === 'requested') return 'pending';
```

- [ ] **Step 5: Fix the "Pending" filter pill count**

In `src/app/dashboard/admin/sessions/page.tsx:331`, change:

```tsx
            { value: 'pending', label: `Pending (${sessions.filter(s => s.status === 'pending' || s.status === 'requested').length})` },
```

- [ ] **Step 6: Manual verification**

Run: `npm run dev`, sign in as admin, go to Sessions. As a student, submit a fresh session request first if none exist (Prompt #2's booking flow). Confirm:
- The "Pending Session Approvals" card now appears and lists the new request (this was previously broken — confirm this is visibly different from before your change).
- No console/type errors from the removed `SessionNoteInfo` type or `sessionNote` field (Task 4 still needs to remove the now-dead `SessionNotePanel` JSX block that references `session.sessionNote`/`priorNotes` before this compiles cleanly — if you're executing tasks in order, expect a TypeScript error here until Task 4 lands; note it and continue, it's expected).

- [ ] **Step 7: Commit**

```bash
git add src/app/dashboard/admin/sessions/page.tsx
git commit -m "fix: recognize 'requested' status and fetch pre-work/actionables fields for pending sessions"
```

---

### Task 4: Render the pre-work reason and historical actionables panel

**Files:**
- Modify: `src/app/dashboard/admin/sessions/page.tsx:20` (imports), `371-493` (pending card body)

**Interfaces:**
- Consumes: `SessionInfo.preWorkReason`, `.keyInsights`, `.studentActionables`, `.postSessionSubmittedAt`, `.status` (Task 3).
- Consumes: `StatusBadge` from `@/components/ui/status-badge` (existing — variant `"pending"` already renders the exact "pale Lemon Yellow tint bg, Deep Teal Black text" pairing the design skill specifies for "Unapproved"; `rounded-[10px]` in that component is overridden to `rounded-full` per the pill-shape requirement, which `cn()`'s `twMerge` resolves correctly since it's a Tailwind-conflicting class).

- [ ] **Step 1: Drop the now-unused `FileText` icon and `SessionNotePanel` import**

In `src/app/dashboard/admin/sessions/page.tsx:6-20`, remove `FileText` from the lucide-react import list (no longer used once Step 2 below replaces the old block), and delete line 24:

```tsx
import { SessionNotePanel } from '@/components/ui/session-note-panel';
```

(Keep every other import unchanged. `SessionNotePanel` is not used anywhere else in this file per the codebase search done for this plan.)

- [ ] **Step 2: Replace the prior-notes computation and the pending-card body**

Replace `src/app/dashboard/admin/sessions/page.tsx:371-493` (from `const isLoading = actionLoading[session.id] || false;` through the closing `);` of the `.map()` callback) with:

```tsx
                const isLoading = actionLoading[session.id] || false;

                const priorSession: PriorSessionInfo = sessions
                  .filter(
                    (s) =>
                      s.studentId === session.studentId &&
                      s.mentorId === session.mentorId &&
                      s.id !== session.id &&
                      !!s.postSessionSubmittedAt
                  )
                  .sort(
                    (a, b) =>
                      new Date(b.postSessionSubmittedAt as string).getTime() -
                      new Date(a.postSessionSubmittedAt as string).getTime()
                  )
                  .map((s) => ({
                    keyInsights: s.keyInsights,
                    studentActionables: s.studentActionables,
                    status: s.status,
                    postSessionSubmittedAt: s.postSessionSubmittedAt as string,
                  }))[0] ?? null;

                return (
                  <div
                    key={session.id}
                    className="p-4 bg-white border border-warning/60 rounded-[16px] shadow-sm hover:shadow-md transition-all space-y-3"
                  >
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-[14px] bg-warning-bg text-warning flex items-center justify-center flex-shrink-0 shadow-sm">
                          <Clock className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {session.studentName}{' '}
                            <span className="font-normal text-muted-foreground">requested session with</span>{' '}
                            {session.mentorName}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5 text-[var(--fg-faint)]" />
                            <span>{formatDate(session.startTime)}</span>
                            <span>·</span>
                            <Clock className="w-3.5 h-3.5 text-[var(--fg-faint)]" />
                            <span>
                              {formatTime(session.startTime)} – {formatTime(session.endTime)} ({session.duration} min)
                            </span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                        <button
                          onClick={() => openRejectModal(session.id)}
                          disabled={isLoading}
                          className="px-4 py-2 text-xs font-semibold text-white bg-[#BA3B41] hover:bg-[#A8343A] rounded-full disabled:opacity-50 shadow-sm transition-all flex items-center gap-1.5"
                        >
                          <X className="w-3.5 h-3.5" />
                          Reject session
                        </button>
                        <button
                          onClick={() => handleApprove(session.id)}
                          disabled={isLoading}
                          className="px-4 py-2 text-xs font-semibold text-[#FFFBF3] bg-[#0F1919] hover:bg-[#1C2C2C] rounded-full disabled:opacity-50 shadow-sm transition-all flex items-center gap-1.5"
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              Creating Meet...
                            </>
                          ) : (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              Approve session
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {session.preWorkReason && (
                      <div className="pt-2 border-t border-border">
                        <p className="text-xs font-semibold text-muted-foreground mb-1">Reason for session:</p>
                        <p className="text-sm text-foreground">{session.preWorkReason}</p>
                      </div>
                    )}

                    {priorSession && (
                      <div className="rounded-[14px] bg-muted p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-foreground">
                            Previous session with this mentor
                          </span>
                          {priorSession.status !== 'completed' && (
                            <StatusBadge variant="pending" size="sm" icon={false} className="rounded-full">
                              Unapproved
                            </StatusBadge>
                          )}
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold text-muted-foreground">What happened last time</p>
                          <p className="text-sm text-foreground">
                            {priorSession.keyInsights || <span className="text-muted-foreground">Not recorded</span>}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold text-muted-foreground">Assigned before this session</p>
                          <p className="text-sm text-foreground">
                            {priorSession.studentActionables || <span className="text-muted-foreground">Not recorded</span>}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
```

Note `openRejectModal` (used above instead of the old `handleReject(session.id)`) is introduced in Task 6, which also removes the now-unused `X`/`Check` icon references are unaffected (still used) — only `handleReject`'s direct call site changes. If you're executing Task 4 before Task 6, `openRejectModal` will be undefined; that's expected and resolved in Task 6. Do not skip ahead and stub it here — Task 6 owns state ownership for the modal.

- [ ] **Step 3: Manual verification**

Run: `npm run dev`. As admin, open Sessions. For a first-time student/mentor pairing, confirm the "Reason for session:" text renders and no historical panel appears. For a pairing with a prior session that has `post_session_submitted_at` set (regardless of its `status`), confirm the Cream Butter panel renders with the correct `key_insights`/`student_actionables` text (or "Not recorded" placeholders), and the "Unapproved" badge shows only when that prior session's status isn't `completed`.

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/admin/sessions/page.tsx
git commit -m "feat: show pre-work reason and historical actionables on pending session cards"
```

---

### Task 5: Build the `RejectReasonModal` component

**Files:**
- Create: `src/components/ui/reject-reason-modal.tsx`

**Interfaces:**
- Consumes: `Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter` from `@/components/ui/dialog` (existing, currently unused elsewhere); `validateRejectionReason` from `@/lib/booking-validation` (Task 1).
- Produces: `<RejectReasonModal open, onOpenChange, onConfirm, submitting? />` where `onConfirm: (reason: string) => void` — consumed by Task 6.

This is a new, self-contained component with no existing component-test harness available (see Tech Stack note); verify manually in Task 6's step once it's wired into the page, since a modal has no meaningful behavior to check in isolation before it's mounted.

- [ ] **Step 1: Write the component**

Create `src/components/ui/reject-reason-modal.tsx`:

```tsx
'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { validateRejectionReason } from '@/lib/booking-validation';

type RejectReasonModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
  submitting?: boolean;
};

export function RejectReasonModal({ open, onOpenChange, onConfirm, submitting = false }: RejectReasonModalProps) {
  const [reason, setReason] = useState('');

  const validation = validateRejectionReason(reason);
  const canSubmit = validation.valid && !submitting;

  const handleOpenChange = (next: boolean) => {
    if (!next) setReason('');
    onOpenChange(next);
  };

  const handleConfirm = () => {
    if (!canSubmit) return;
    onConfirm(reason.trim());
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-white rounded-[20px] border border-[#E8E1D2] ring-0 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#0F1919] font-semibold">Reject session request</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          <label htmlFor="rejection-reason" className="text-xs font-semibold text-[#4A5454]">
            Reason for rejection
          </label>
          <textarea
            id="rejection-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g., Please provide more detail on what you'd like to cover"
            rows={4}
            className="w-full rounded-[12px] border border-[#E8E1D2] bg-white px-3 py-2 text-sm text-[#0F1919] outline-none transition-colors focus-visible:border-[#E5E55A] focus-visible:ring-2 focus-visible:ring-[#E5E55A]"
          />
        </div>

        <DialogFooter className="bg-white border-t border-[#E8E1D2] rounded-b-[20px]">
          <button
            type="button"
            onClick={() => handleOpenChange(false)}
            disabled={submitting}
            className="px-4 py-2 text-sm font-semibold text-[#0F1919] border border-[#0F1919]/20 rounded-full hover:bg-[#FBF4D7] disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canSubmit}
            className="px-4 py-2 text-sm font-semibold text-white bg-[#BA3B41] hover:bg-[#A8343A] rounded-full disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Rejecting…' : 'Confirm Reject'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

Base UI's `Dialog.Popup` (wrapped by `DialogContent`) traps focus and closes on Escape natively — no extra code is needed for the accessibility requirements in the spec. The textarea's `focus-visible:ring-[#E5E55A]` satisfies the Lemon Yellow focus-ring requirement; overriding `DialogContent`'s default `rounded-xl ring-1 ring-foreground/10 bg-background` via `className` (which `cn()` resolves through `twMerge`) satisfies "white card, warm hairline border" instead of the generic default.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors introduced by this file (it isn't imported anywhere yet, so this mainly confirms it's syntactically/type-correct in isolation).

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/reject-reason-modal.tsx
git commit -m "feat: add RejectReasonModal component"
```

---

### Task 6: Wire the reject modal into the admin Sessions page

**Files:**
- Modify: `src/app/dashboard/admin/sessions/page.tsx:1-32` (imports), `60-72` (state), `194-213` (`handleReject` → modal-driven flow), end of the component's JSX (mount the modal)

**Interfaces:**
- Consumes: `RejectReasonModal` (Task 5), `rejectBooking(bookingId: string, reason: string)` (Task 2, now reason-required).
- Produces: `openRejectModal(sessionId: string)` — referenced by Task 4's Reject button (`onClick={() => openRejectModal(session.id)}`).

- [ ] **Step 1: Import the modal**

In `src/app/dashboard/admin/sessions/page.tsx`, add after line 24 (`import { SessionNotePanel } ...` — already removed in Task 4, so add after the `Input` import at line 23):

```tsx
import { RejectReasonModal } from '@/components/ui/reject-reason-modal';
```

- [ ] **Step 2: Add modal state**

In `src/app/dashboard/admin/sessions/page.tsx:60-72`, after the existing `feedback` state declaration (line 68), add:

```tsx
  const [rejectModalSessionId, setRejectModalSessionId] = useState<string | null>(null);
  const [rejectSubmitting, setRejectSubmitting] = useState(false);
```

- [ ] **Step 3: Replace `handleReject` with modal-driven handlers**

Replace `src/app/dashboard/admin/sessions/page.tsx:194-213`:

```tsx
  const openRejectModal = (bookingId: string) => {
    setRejectModalSessionId(bookingId);
  };

  const closeRejectModal = () => {
    if (rejectSubmitting) return;
    setRejectModalSessionId(null);
  };

  const handleConfirmReject = async (reason: string) => {
    const bookingId = rejectModalSessionId;
    if (!bookingId) return;

    setRejectSubmitting(true);
    setFeedback(null);
    try {
      const res = await rejectBooking(bookingId, reason);
      if (res.success) {
        setFeedback({ type: 'success', message: 'Session request rejected' });
        setRejectModalSessionId(null);
        await fetchSessions();
      } else {
        setFeedback({ type: 'error', message: res.error || 'Failed to reject session.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'An error occurred during rejection.' });
    } finally {
      setRejectSubmitting(false);
    }
  };
```

- [ ] **Step 4: Mount the modal**

At the very end of the component's returned JSX in `src/app/dashboard/admin/sessions/page.tsx`, immediately before the final closing `</div>` (the one that closes the `<div className="space-y-6">` wrapper — currently the last line of the `return (...)` block), add:

```tsx
      <RejectReasonModal
        open={rejectModalSessionId !== null}
        onOpenChange={(open) => {
          if (!open) closeRejectModal();
        }}
        onConfirm={handleConfirmReject}
        submitting={rejectSubmitting}
      />
```

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors. This also confirms Task 4's forward reference to `openRejectModal` now resolves.

- [ ] **Step 6: Manual verification — full reject flow**

Run: `npm run dev`. As admin, on a pending request card, click "Reject session":
- Confirm the modal opens, "Confirm Reject" is disabled with an empty textarea.
- Type a reason; confirm "Confirm Reject" becomes enabled.
- Tab through the modal with keyboard only; confirm focus stays trapped inside it and the textarea shows the Lemon Yellow focus ring.
- Press Escape; confirm the modal closes without rejecting.
- Reopen, enter a reason, click "Confirm Reject"; confirm the card disappears from the pending list, the "Session request rejected" banner appears, and (via Supabase dashboard or the student view) `status` is `'rejected'` with `rejection_reason` matching what was typed.
- Log in as that student; confirm the rejection and reason are visible (already wired up per `src/app/dashboard/student/page.tsx:140-143` and `src/app/dashboard/student/sessions/page.tsx:504-508` — no change needed there, this step is confirmation only).
- Resize to mobile width; confirm the card and modal both remain usable.

- [ ] **Step 7: Commit**

```bash
git add src/app/dashboard/admin/sessions/page.tsx
git commit -m "feat: replace window.prompt reject flow with RejectReasonModal"
```

---

## Self-Review Notes

- **Spec coverage:** pre-work reason display → Task 4. Historical actionables panel (regardless of approval, Unapproved badge, Cream Butter, key_insights/student_actionables labels, "Not recorded" fallback, no panel on first pairing) → Task 4. Reject requires reason, modal, disabled-until-filled, DB write → Tasks 1, 2, 5, 6. `sessions`-not-`bookings` reads → Task 3 (query) and Task 2 (write, fallback removed). Colors/typography/pill shapes/focus ring → Tasks 4 & 5, sourced from the design skill and the repo's own existing token usage (`bg-muted`, `status-badge.tsx`'s `pending` variant, `globals.css` vars). Approve unchanged functionally → untouched in all tasks except the `'requested'` status fix in Task 3, which was necessary for Approve to ever be reachable too. Student-side visibility of rejection reason → confirmed already working, called out as verification-only in Task 6 Step 6, not a new gap.
- **Placeholder scan:** no TBD/"add error handling"/"similar to Task N" — every step has literal code or a concrete manual-verification checklist.
- **Type consistency:** `PriorSessionInfo` defined in Task 3 Step 1, consumed with matching shape (`keyInsights`, `studentActionables`, `status`, `postSessionSubmittedAt`) in Task 4 Step 2. `rejectBooking(bookingId: string, reason: string)` signature from Task 2 matches the call site in Task 6 Step 3. `RejectReasonModal` props (`open`, `onOpenChange`, `onConfirm`, `submitting`) match Task 5's definition and Task 6's usage exactly.
