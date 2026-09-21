# Mentor Post-Session Form & Editable Revision State Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the mentor's single free-text "Shared Session Note" with a structured 4-field post-session form (key insights, student actionables, actual duration, optional admin note) that routes into an admin "Post-Session Review" queue, with an uncapped admin-revise loop back to the mentor.

**Architecture:** All new writes go through two `'use server'` action files: a new `src/app/actions/post-session.ts` (mentor-facing `submitPostSessionForm`) and two new exports on the existing `src/app/dashboard/admin/actions.ts` (`approvePostSession`, `sendSessionForRevision`). Two new pure validators (`validatePostSessionForm`, `validateRevisionReason`) live alongside `validateBookingForm`/`validateRejectionReason` in `src/lib/booking-validation.ts`. Two new components — `PostSessionForm` (the 4-field form, reused for both first submission and revise-resubmission) and `RevisionReasonModal` (clone of the existing `RejectReasonModal` pattern) — are added under `src/components/ui/`. `sendSessionForRevision` only inserts into `session_revisions`; the existing `on_session_revision_created` trigger (`reset_reminder_on_revision()`) is solely responsible for flipping `sessions.status` to `'revise'` and resetting `revision_requested_at`/`last_reminder_sent_at` — the action must never set `status` itself. No new libraries, no new database migrations (every column and the `session_revisions` table/trigger already exist per `supabase/reconcile_schema_migration.sql`).

**Tech Stack:** Next.js 16 App Router, React 19 client components, Supabase JS client (browser via `useAuth()` for reads, admin client via server actions for writes), Base UI (`@base-ui/react`) dialog primitives, Tailwind v4 with Mesa design tokens, Vitest for pure-logic/server-action unit tests (`src/**/*.test.ts` only — no component/DOM test runner in this repo, so all new components are verified manually via `npm run dev`).

**Spec:** Prompt #4: Mentor Post-Session Form & Editable Revision State (pasted in full in the conversation that produced this plan — no separate file). Design tokens: `.claude/skills/mentorly-ui-ux/SKILL.md`.

## Global Constraints

- Read/write the `sessions` table directly — never the legacy `bookings` compatibility view (it has no `key_insights`/`student_actionables`/`actual_duration_minutes`/`admin_feedback_note`/`post_session_submitted_at`/revision columns).
- `sendSessionForRevision` must **only** `INSERT INTO session_revisions` — never set `sessions.status` itself. The `on_session_revision_created` trigger owns that write (status → `'revise'`, `revision_requested_at` → `NEW.created_at`, `last_reminder_sent_at` → `NULL`). Setting status in application code would race the trigger.
- `actual_duration_minutes` must be validated client-side as a positive multiple of 15 before submission (clear inline error), in addition to the DB's own `actual_duration_minutes_check` constraint — do not rely on the DB constraint alone for UX.
- `key_insights` and `student_actionables` are required (non-empty after trim); `admin_feedback_note` is optional.
- Colors/type: only the tokens from `.claude/skills/mentorly-ui-ux/SKILL.md` — Deep Teal Black `#0F1919` (primary/affirmative fill), Crimson Brick `#BA3B41` (destructive only — **never** used for "send back for revision"), Peach Beige `#DFA396` (`var(--peach-beige)`, already defined in `globals.css:41`) as the icon/hover accent for the revision action, Lemon Yellow `#E5E55A` for focus rings and the `pending`/awaiting-review badge tint, warm hairline border `#E8E1D2`. Manrope everywhere inside these cards/badges/modals/forms.
- Status badges: reuse `StatusBadge` from `@/components/ui/status-badge` exactly as-is — `variant="pending"` already renders the correct pale-Lemon-Yellow/Deep-Teal-Black pairing for "awaiting review", `variant="revise"` already renders the correct Peach-Beige/Dark-Maroon pairing, `variant="completed"` already renders Cream Butter. **Do not add new variants** — they already exist in `src/components/ui/status-badge.tsx:21-34`.
- Approve = solid Deep Teal Black fill (`#0F1919`) / Ivory Whisper text, label "Approve session." Send back for revision = neutral outlined button (white/Deep-Teal-Black border) with a Peach Beige icon accent — **never** the same fill as Approve or Reject. These three actions must never share a fill color on the same screen.
- No new npm dependencies, no toast library — reuse the existing inline `feedback` banner pattern already on the admin Sessions page for confirmation messages.

---

## Known pre-existing inconsistency this plan must resolve to make the feature work at all

The codebase currently has **two disconnected implementations of "the mentor's post-session flow"**, and neither one is what Prompt #4 describes:

1. `src/app/dashboard/mentor/sessions/page.tsx` (the actual full-featured mentor Sessions page — tabs, search, pagination) still reads from the **legacy `bookings` view + `session_notes` table**, using the **old** status strings (`'pending' | 'scheduled' | 'completed' | 'cancelled' | 'rejected'`). This is exactly where today's "Shared Session Note" (`SessionNotePanel`) renders and where "Mark as Complete" directly sets `status = 'completed'` — i.e. it is the literal target the spec describes replacing. But the real `session_status` enum (`reconcile_schema_migration.sql:14-21`) has no `'pending'`/`'cancelled'` values, and the `bookings` view now returns the **new** enum values (`'requested'`, `'awaiting_post_review'`, `'revise'`, etc. — see `reconcile_schema_migration.sql:200-214`, which selects `status::text AS status` straight from `sessions`). So this page's own status filters (`b.status === 'pending'`, `b.status === 'cancelled'`) already silently match nothing for any session created through the current (Prompt #2/#3) booking flow.
2. `src/app/dashboard/mentor/page.tsx` (dashboard home) + `src/hooks/useMentorBookings.ts` already read from the **new** `sessions` table, but their "Mark as Completed" quick-action calls `sessions.status = 'completed'` **directly**, completely bypassing any review step. If left as-is, this button would let a mentor route around the entire feature this plan is building.

**Resolution:** Task 7 migrates `dashboard/mentor/sessions/page.tsx` from `bookings`/`session_notes` onto the `sessions` table (matching the pattern already used by `admin/sessions/page.tsx` and `useMentorBookings.ts`), and Tasks 8–9 remove the direct-complete bypass from the dashboard home quick action, replacing it with a link into the real form. `student/sessions/page.tsx` also depends on the legacy `bookings`/`session_notes` shape (via the same `SessionNotePanel`) — it is **out of scope** for this plan (the spec does not mention the student view) and is left untouched; `SessionNotePanel`, `saveSessionNote`, and `lockSessionNote` are therefore **not deleted**, only stopped-being-used from the mentor-facing files this plan touches.

---

### Task 1: Add `validatePostSessionForm` and `validateRevisionReason` to booking-validation.ts

**Files:**
- Modify: `src/lib/booking-validation.ts`
- Test: `src/lib/booking-validation.test.ts`

**Interfaces:**
- Produces: `validatePostSessionForm(input: { keyInsights: string; studentActionables: string; actualDurationMinutes: number; adminFeedbackNote?: string }): BookingFormValidation`
- Produces: `validateRevisionReason(reason: string): BookingFormValidation`

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/booking-validation.test.ts`:

```ts
describe('validatePostSessionForm', () => {
  const base = {
    keyInsights: 'We reviewed the resume and discussed interview prep',
    studentActionables: 'Apply to 3 roles and revise the summary section',
    actualDurationMinutes: 45,
  }

  it('rejects empty key insights', () => {
    const result = validatePostSessionForm({ ...base, keyInsights: '' })
    expect(result.valid).toBe(false)
  })

  it('rejects whitespace-only key insights', () => {
    const result = validatePostSessionForm({ ...base, keyInsights: '   ' })
    expect(result.valid).toBe(false)
  })

  it('rejects empty student actionables', () => {
    const result = validatePostSessionForm({ ...base, studentActionables: '' })
    expect(result.valid).toBe(false)
  })

  it('rejects a duration that is not a multiple of 15', () => {
    const result = validatePostSessionForm({ ...base, actualDurationMinutes: 20 })
    expect(result.valid).toBe(false)
    expect(result.valid === false && result.error).toMatch(/15-minute/i)
  })

  it('rejects a zero or negative duration', () => {
    const result = validatePostSessionForm({ ...base, actualDurationMinutes: 0 })
    expect(result.valid).toBe(false)
  })

  it('accepts a valid submission with no admin note', () => {
    const result = validatePostSessionForm(base)
    expect(result.valid).toBe(true)
  })

  it('accepts a valid submission with an admin note', () => {
    const result = validatePostSessionForm({ ...base, adminFeedbackNote: 'Great session, very engaged student.' })
    expect(result.valid).toBe(true)
  })

  it('rejects an admin note longer than 1000 characters', () => {
    const result = validatePostSessionForm({ ...base, adminFeedbackNote: 'a'.repeat(1001) })
    expect(result.valid).toBe(false)
  })
})

describe('validateRevisionReason', () => {
  it('rejects an empty reason', () => {
    const result = validateRevisionReason('')
    expect(result.valid).toBe(false)
  })

  it('rejects a whitespace-only reason', () => {
    const result = validateRevisionReason('   ')
    expect(result.valid).toBe(false)
  })

  it('rejects a reason longer than 500 characters', () => {
    const result = validateRevisionReason('a'.repeat(501))
    expect(result.valid).toBe(false)
  })

  it('accepts a valid reason', () => {
    const result = validateRevisionReason('The student actionables are too vague to follow up on')
    expect(result.valid).toBe(true)
  })
})
```

Update the import line at the top of the file:

```ts
import {
  validateBookingForm,
  validateRejectionReason,
  validatePostSessionForm,
  validateRevisionReason,
  isValidDuration,
  DURATION_OPTIONS,
} from './booking-validation'
```

- [ ] **Step 2: Run the tests and verify they fail**

Run: `npm run test -- src/lib/booking-validation.test.ts`
Expected: FAIL — `validatePostSessionForm is not a function` / `validateRevisionReason is not a function`.

- [ ] **Step 3: Implement both validators**

Append to `src/lib/booking-validation.ts`:

```ts
export function validatePostSessionForm(input: {
  keyInsights: string
  studentActionables: string
  actualDurationMinutes: number
  adminFeedbackNote?: string
}): BookingFormValidation {
  if (!input.keyInsights.trim()) {
    return { valid: false, error: 'Key insights are required' }
  }
  if (input.keyInsights.length > 2000) {
    return { valid: false, error: 'Key insights must be 2000 characters or less' }
  }
  if (!input.studentActionables.trim()) {
    return { valid: false, error: 'Student actionables are required' }
  }
  if (input.studentActionables.length > 2000) {
    return { valid: false, error: 'Student actionables must be 2000 characters or less' }
  }
  if (!Number.isFinite(input.actualDurationMinutes) || input.actualDurationMinutes <= 0) {
    return { valid: false, error: 'Duration must be a positive number of minutes' }
  }
  if (input.actualDurationMinutes % 15 !== 0) {
    return { valid: false, error: 'Duration must be in 15-minute increments' }
  }
  if (input.adminFeedbackNote && input.adminFeedbackNote.length > 1000) {
    return { valid: false, error: 'Admin note must be 1000 characters or less' }
  }
  return { valid: true }
}

export function validateRevisionReason(reason: string): BookingFormValidation {
  if (!reason.trim()) {
    return { valid: false, error: 'A revision reason is required' }
  }
  if (reason.length > 500) {
    return { valid: false, error: 'Reason must be 500 characters or less' }
  }
  return { valid: true }
}
```

- [ ] **Step 4: Run the tests and verify they pass**

Run: `npm run test -- src/lib/booking-validation.test.ts`
Expected: PASS, all tests including the new ones.

- [ ] **Step 5: Commit**

```bash
git add src/lib/booking-validation.ts src/lib/booking-validation.test.ts
git commit -m "feat: add validatePostSessionForm and validateRevisionReason"
```

---

### Task 2: Add the mentor-facing `submitPostSessionForm` server action

**Files:**
- Create: `src/app/actions/post-session.ts`
- Test: `src/app/actions/post-session.test.ts`

**Interfaces:**
- Consumes: `validatePostSessionForm` from `@/lib/booking-validation` (Task 1).
- Produces: `submitPostSessionForm(input: PostSessionFormInput): Promise<{ success: true } | { success: false; error: string }>` where `PostSessionFormInput = { sessionId: string; mentorId: string; keyInsights: string; studentActionables: string; actualDurationMinutes: number; adminFeedbackNote?: string }` — consumed by Task 5 (`PostSessionForm` component).

- [ ] **Step 1: Write the failing tests**

Create `src/app/actions/post-session.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest'

const { createAdminClientMock } = vi.hoisted(() => ({
  createAdminClientMock: vi.fn(() => {
    throw new Error('submitPostSessionForm should validate input before creating a Supabase client')
  }),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: createAdminClientMock,
}))

import { submitPostSessionForm } from './post-session'

const baseInput = {
  sessionId: 'session-1',
  mentorId: 'mentor-1',
  keyInsights: 'We covered resume review',
  studentActionables: 'Apply to 3 jobs this week',
  actualDurationMinutes: 45,
}

describe('submitPostSessionForm validation', () => {
  it('rejects a duration that is not a multiple of 15 without touching the database', async () => {
    const result = await submitPostSessionForm({ ...baseInput, actualDurationMinutes: 20 })
    expect(result.success).toBe(false)
    expect(result.success === false && result.error).toMatch(/15-minute/i)
    expect(createAdminClientMock).not.toHaveBeenCalled()
  })

  it('rejects missing key insights without touching the database', async () => {
    const result = await submitPostSessionForm({ ...baseInput, keyInsights: '' })
    expect(result.success).toBe(false)
    expect(result.success === false && result.error).toMatch(/key insights/i)
    expect(createAdminClientMock).not.toHaveBeenCalled()
  })

  it('rejects missing student actionables without touching the database', async () => {
    const result = await submitPostSessionForm({ ...baseInput, studentActionables: '' })
    expect(result.success).toBe(false)
    expect(result.success === false && result.error).toMatch(/actionables/i)
    expect(createAdminClientMock).not.toHaveBeenCalled()
  })

  it('passes validation and proceeds to the database layer for a valid submission', async () => {
    const result = await submitPostSessionForm(baseInput)
    expect(result.success).toBe(false)
    expect(result.success === false && result.error).toMatch(
      /should validate input before creating a Supabase client/
    )
  })
})
```

- [ ] **Step 2: Run the tests and verify they fail**

Run: `npm run test -- src/app/actions/post-session.test.ts`
Expected: FAIL — the module `./post-session` does not exist yet.

- [ ] **Step 3: Implement `submitPostSessionForm`**

Create `src/app/actions/post-session.ts`:

```ts
'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { validatePostSessionForm } from '@/lib/booking-validation'

export type PostSessionFormInput = {
  sessionId: string
  mentorId: string
  keyInsights: string
  studentActionables: string
  actualDurationMinutes: number
  adminFeedbackNote?: string
}

export async function submitPostSessionForm(input: PostSessionFormInput) {
  const validation = validatePostSessionForm({
    keyInsights: input.keyInsights,
    studentActionables: input.studentActionables,
    actualDurationMinutes: input.actualDurationMinutes,
    adminFeedbackNote: input.adminFeedbackNote,
  })
  if (!validation.valid) {
    return { success: false, error: validation.error }
  }

  try {
    const supabase = createAdminClient()

    const { data: session, error: fetchErr } = await supabase
      .from('sessions')
      .select('id, mentor_id, status')
      .eq('id', input.sessionId)
      .single()

    if (fetchErr || !session) {
      return { success: false, error: 'Session not found.' }
    }

    if (session.mentor_id !== input.mentorId) {
      return { success: false, error: 'Only the assigned mentor can submit this session report.' }
    }

    if (session.status !== 'scheduled' && session.status !== 'revise') {
      return {
        success: false,
        error: `This session cannot be submitted for review from its current status ("${session.status}").`,
      }
    }

    const { error: updateErr } = await supabase
      .from('sessions')
      .update({
        key_insights: input.keyInsights.trim(),
        student_actionables: input.studentActionables.trim(),
        actual_duration_minutes: input.actualDurationMinutes,
        admin_feedback_note: input.adminFeedbackNote?.trim() || null,
        post_session_submitted_at: new Date().toISOString(),
        status: 'awaiting_post_review',
      })
      .eq('id', input.sessionId)

    if (updateErr) {
      return { success: false, error: updateErr.message }
    }

    return { success: true }
  } catch (error) {
    console.error('submitPostSessionForm error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred.',
    }
  }
}
```

- [ ] **Step 4: Run the tests and verify they pass**

Run: `npm run test -- src/app/actions/post-session.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/actions/post-session.ts src/app/actions/post-session.test.ts
git commit -m "feat: add submitPostSessionForm server action"
```

---

### Task 3: Add `approvePostSession` and `sendSessionForRevision` to admin actions

**Files:**
- Modify: `src/app/dashboard/admin/actions.ts:1-6` (imports), end of file (new exports)
- Test: `src/app/dashboard/admin/actions.test.ts`

**Interfaces:**
- Consumes: `validateRevisionReason` from `@/lib/booking-validation` (Task 1).
- Produces: `approvePostSession(sessionId: string): Promise<{ success: true } | { success: false; error: string }>`
- Produces: `sendSessionForRevision(sessionId: string, reason: string, adminId: string): Promise<{ success: true } | { success: false; error: string }>` — consumed by Task 6.

- [ ] **Step 1: Write the failing tests**

Append to `src/app/dashboard/admin/actions.test.ts`:

```ts
import { sendSessionForRevision } from './actions'

describe('sendSessionForRevision validation', () => {
  it('rejects an empty reason without touching the database', async () => {
    const result = await sendSessionForRevision('session-1', '', 'admin-1')
    expect(result.success).toBe(false)
    expect(result.success === false && result.error).toMatch(/revision reason/i)
    expect(createAdminClientMock).not.toHaveBeenCalled()
  })

  it('rejects a whitespace-only reason without touching the database', async () => {
    const result = await sendSessionForRevision('session-1', '   ', 'admin-1')
    expect(result.success).toBe(false)
    expect(result.success === false && result.error).toMatch(/revision reason/i)
    expect(createAdminClientMock).not.toHaveBeenCalled()
  })
})
```

Update the `import { rejectBooking } from './actions'` line at the top of the file to:

```ts
import { rejectBooking, sendSessionForRevision } from './actions'
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `npm run test -- src/app/dashboard/admin/actions.test.ts`
Expected: FAIL — `sendSessionForRevision` is not exported from `./actions` yet.

- [ ] **Step 3: Implement both actions**

Update the import block at the top of `src/app/dashboard/admin/actions.ts:1-6`:

```ts
'use server'

import { createAdminClient, getAdminUserId } from '@/lib/supabase/admin'
import { createGoogleMeetingWithOAuth } from '@/lib/google-calendar-oauth'
import { isGoogleConnected } from '@/lib/google-oauth'
import { validateRejectionReason, validateRevisionReason } from '@/lib/booking-validation'
```

Append at the end of `src/app/dashboard/admin/actions.ts` (after `lockSessionNote`):

```ts
// ── Post-Session Review ──────────────────────────────────────────────────────

export async function approvePostSession(sessionId: string) {
  try {
    const supabase = createAdminClient()

    const { data: session, error: fetchErr } = await supabase
      .from('sessions')
      .select('id, status')
      .eq('id', sessionId)
      .single()

    if (fetchErr || !session) {
      return { success: false, error: 'Session not found.' }
    }

    if (session.status !== 'awaiting_post_review') {
      return {
        success: false,
        error: `Session is not awaiting post-session review (current status: ${session.status}).`,
      }
    }

    const { error: updateErr } = await supabase
      .from('sessions')
      .update({ status: 'completed' })
      .eq('id', sessionId)

    if (updateErr) {
      return { success: false, error: updateErr.message }
    }

    return { success: true }
  } catch (error) {
    console.error('approvePostSession error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred.',
    }
  }
}

/**
 * Sends a submitted post-session report back to the mentor for revision.
 * Only inserts into session_revisions — the on_session_revision_created trigger
 * (reset_reminder_on_revision()) is what flips sessions.status to 'revise' and
 * resets revision_requested_at/last_reminder_sent_at. Do not set status here.
 */
export async function sendSessionForRevision(sessionId: string, reason: string, adminId: string) {
  const validation = validateRevisionReason(reason)
  if (!validation.valid) {
    return { success: false, error: validation.error }
  }

  try {
    const supabase = createAdminClient()

    const { error: insertErr } = await supabase.from('session_revisions').insert({
      session_id: sessionId,
      reason: reason.trim(),
      requested_by_admin_id: adminId,
    })

    if (insertErr) {
      return { success: false, error: insertErr.message }
    }

    return { success: true }
  } catch (error) {
    console.error('sendSessionForRevision error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred.',
    }
  }
}
```

- [ ] **Step 4: Run the test and verify it passes**

Run: `npm run test -- src/app/dashboard/admin/actions.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/admin/actions.ts src/app/dashboard/admin/actions.test.ts
git commit -m "feat: add approvePostSession and sendSessionForRevision actions"
```

---

### Task 4: Build the `RevisionReasonModal` component

**Files:**
- Create: `src/components/ui/revision-reason-modal.tsx`

**Interfaces:**
- Consumes: `Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter` from `@/components/ui/dialog`; `validateRevisionReason` from `@/lib/booking-validation` (Task 1).
- Produces: `<RevisionReasonModal open, onOpenChange, onConfirm, submitting?, error? />` where `onConfirm: (reason: string) => void` — consumed by Task 6.

No automated test — mirrors `RejectReasonModal` exactly (see `src/components/ui/reject-reason-modal.tsx` for the reference pattern this clones), verified manually once mounted in Task 6.

- [ ] **Step 1: Write the component**

Create `src/components/ui/revision-reason-modal.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { validateRevisionReason } from '@/lib/booking-validation';

type RevisionReasonModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
  submitting?: boolean;
  error?: string | null;
};

export function RevisionReasonModal({
  open,
  onOpenChange,
  onConfirm,
  submitting = false,
  error = null,
}: RevisionReasonModalProps) {
  const [reason, setReason] = useState('');

  const validation = validateRevisionReason(reason);
  const canSubmit = validation.valid && !submitting;

  // Clear reason whenever the modal transitions to closed, regardless of whether
  // that came from a user-driven close or a controlled `open` prop change from the
  // parent (e.g. closing on a successful submit) — see RejectReasonModal for why
  // this must be driven by `open`, not just the onOpenChange callback.
  useEffect(() => {
    if (!open) setReason('');
  }, [open]);

  const handleOpenChange = (next: boolean) => {
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
          <DialogTitle className="text-[#0F1919] font-semibold flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-[#DFA396]" />
            Send back for revision
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          <label htmlFor="revision-reason" className="text-xs font-semibold text-[#4A5454]">
            Reason for revision
          </label>
          <textarea
            id="revision-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g., The student actionables are too vague to follow up on"
            rows={4}
            maxLength={500}
            className="w-full rounded-[12px] border border-[#E8E1D2] bg-white px-3 py-2 text-sm text-[#0F1919] outline-none transition-colors focus-visible:border-[#E5E55A] focus-visible:ring-2 focus-visible:ring-[#E5E55A]"
          />
          <p className="text-[11px] text-[#7C8585] text-right">{reason.length}/500</p>
        </div>

        {error && <p className="text-sm text-[#702327]">{error}</p>}

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
            className="px-4 py-2 text-sm font-semibold text-[#0F1919] bg-white border border-[#0F1919]/30 hover:bg-[var(--peach-beige)]/25 rounded-full disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Sending…' : 'Send back for revision'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

This is deliberately **not** the Crimson Brick fill used by `RejectReasonModal`'s confirm button — an outlined Deep-Teal-Black border with a Peach Beige icon accent, per the design system's requirement that revise stay visually distinct from both Approve (solid fill) and Reject (solid Crimson).

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors (not imported anywhere yet).

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/revision-reason-modal.tsx
git commit -m "feat: add RevisionReasonModal component"
```

---

### Task 5: Build the `PostSessionForm` component

**Files:**
- Create: `src/components/ui/post-session-form.tsx`

**Interfaces:**
- Consumes: `validatePostSessionForm` from `@/lib/booking-validation` (Task 1); `submitPostSessionForm` from `@/app/actions/post-session` (Task 2).
- Produces: `<PostSessionForm sessionId, mentorId, initial?, revisions?, onSubmitted />` where:
  - `initial?: { keyInsights: string; studentActionables: string; actualDurationMinutes: number; adminFeedbackNote: string } | null` — pre-fills the form (used for `revise` resubmission).
  - `revisions?: { reason: string; createdAt: string }[]` — reverse-chronological (newest first); the first entry renders as the advisory banner, the rest are the collapsed history list.
  - `onSubmitted: () => void` — called after a successful submission so the caller can refetch/remove the session from its actionable list.
  - Consumed by Task 7 (mentor Sessions page).

No automated test — form/DOM behavior with no component-test harness in this repo; verified manually in Task 7's manual-verification step once mounted on a real page.

- [ ] **Step 1: Write the component**

Create `src/components/ui/post-session-form.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { AlertCircle, ChevronDown, Loader2 } from 'lucide-react'
import { validatePostSessionForm } from '@/lib/booking-validation'
import { submitPostSessionForm } from '@/app/actions/post-session'

type Revision = { reason: string; createdAt: string }

type PostSessionFormProps = {
  sessionId: string
  mentorId: string
  initial?: {
    keyInsights: string
    studentActionables: string
    actualDurationMinutes: number
    adminFeedbackNote: string
  } | null
  revisions?: Revision[]
  onSubmitted: () => void
}

const fieldClass =
  'w-full rounded-[12px] border border-border bg-white px-3 py-2 text-sm text-foreground outline-none transition-colors focus-visible:border-[#E5E55A] focus-visible:ring-2 focus-visible:ring-[#E5E55A]'

export function PostSessionForm({ sessionId, mentorId, initial, revisions = [], onSubmitted }: PostSessionFormProps) {
  const [keyInsights, setKeyInsights] = useState(initial?.keyInsights ?? '')
  const [studentActionables, setStudentActionables] = useState(initial?.studentActionables ?? '')
  const [actualDurationMinutes, setActualDurationMinutes] = useState(
    initial?.actualDurationMinutes != null ? String(initial.actualDurationMinutes) : ''
  )
  const [adminFeedbackNote, setAdminFeedbackNote] = useState(initial?.adminFeedbackNote ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)

  const durationValue = Number(actualDurationMinutes)
  const validation = validatePostSessionForm({
    keyInsights,
    studentActionables,
    actualDurationMinutes: durationValue,
    adminFeedbackNote,
  })
  const durationError =
    actualDurationMinutes !== '' && (!Number.isFinite(durationValue) || durationValue <= 0 || durationValue % 15 !== 0)
      ? 'Duration must be in 15-minute increments'
      : null

  const [latestRevision, ...olderRevisions] = revisions

  const handleSubmit = async () => {
    if (!validation.valid) {
      setError(validation.error)
      return
    }
    setSubmitting(true)
    setError(null)
    const res = await submitPostSessionForm({
      sessionId,
      mentorId,
      keyInsights,
      studentActionables,
      actualDurationMinutes: durationValue,
      adminFeedbackNote,
    })
    setSubmitting(false)
    if (res.success) {
      onSubmitted()
    } else {
      setError(res.error || 'Failed to submit session report.')
    }
  }

  return (
    <div className="space-y-4">
      {latestRevision && (
        <div className="rounded-xl border border-warning/30 bg-warning-bg p-4 space-y-2">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">Sent back for revision</p>
              <p className="text-sm text-foreground/90">{latestRevision.reason}</p>
            </div>
          </div>

          {olderRevisions.length > 0 && (
            <div className="pl-6">
              <button
                type="button"
                onClick={() => setHistoryOpen((v) => !v)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${historyOpen ? 'rotate-180' : ''}`} />
                {historyOpen ? 'Hide' : 'Show'} {olderRevisions.length} earlier revision
                {olderRevisions.length > 1 ? 's' : ''}
              </button>
              {historyOpen && (
                <ul className="mt-2 space-y-2">
                  {olderRevisions.map((rev, i) => (
                    <li key={i} className="text-xs text-muted-foreground border-l-2 border-warning/30 pl-2">
                      {rev.reason}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor={`key-insights-${sessionId}`} className="text-xs font-semibold text-muted-foreground">
          Key insights
        </label>
        <textarea
          id={`key-insights-${sessionId}`}
          value={keyInsights}
          onChange={(e) => setKeyInsights(e.target.value)}
          placeholder="What did you cover in this session?"
          rows={3}
          className={fieldClass}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor={`actionables-${sessionId}`} className="text-xs font-semibold text-muted-foreground">
          Student actionables
        </label>
        <textarea
          id={`actionables-${sessionId}`}
          value={studentActionables}
          onChange={(e) => setStudentActionables(e.target.value)}
          placeholder="What should the student do before the next session?"
          rows={3}
          className={fieldClass}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor={`duration-${sessionId}`} className="text-xs font-semibold text-muted-foreground">
          Actual session duration (minutes)
        </label>
        <input
          id={`duration-${sessionId}`}
          type="number"
          step={15}
          min={15}
          value={actualDurationMinutes}
          onChange={(e) => setActualDurationMinutes(e.target.value)}
          placeholder="e.g., 45"
          className={fieldClass}
        />
        {durationError && <p className="text-xs text-destructive">{durationError}</p>}
      </div>

      <div className="space-y-1.5">
        <label htmlFor={`admin-note-${sessionId}`} className="text-xs font-semibold text-muted-foreground">
          Note to admin <span className="font-normal text-[var(--fg-faint)]">(optional)</span>
        </label>
        <textarea
          id={`admin-note-${sessionId}`}
          value={adminFeedbackNote}
          onChange={(e) => setAdminFeedbackNote(e.target.value)}
          placeholder="Anything the admin should know about this session"
          rows={2}
          className={fieldClass}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting || !validation.valid}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0F1919] hover:bg-[#1C2C2C] disabled:opacity-60 text-[#FFFBF3] rounded-full text-sm font-semibold transition-colors"
      >
        {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
        Submit for review
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors (not imported anywhere yet).

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/post-session-form.tsx
git commit -m "feat: add PostSessionForm component"
```

---

### Task 6: Add the "Post-Session Review" queue to the admin Sessions page

**Files:**
- Modify: `src/app/dashboard/admin/sessions/page.tsx:1-71` (imports/types/state), `85-162` (query/normalize), `219-228` (`getSessionState`), `241-259` (section filters), `330-337` (filter pills), `499-500` (insert new section), `699-711` (Past table status column), `764-772` (mount new modal)

**Interfaces:**
- Consumes: `approvePostSession`, `sendSessionForRevision` from `@/app/dashboard/admin/actions` (Task 3); `RevisionReasonModal` (Task 4).
- Produces: nothing new consumed elsewhere — this is the leaf UI for the admin side.

No automated test (client component with no test harness in this repo) — verify manually per Step 7.

- [ ] **Step 1: Extend `SessionInfo` and the fetch query**

In `src/app/dashboard/admin/sessions/page.tsx:42-58`, replace the `SessionInfo` type:

```tsx
type SessionInfo = {
  id: string;
  studentId: string;
  mentorId: string;
  studentName: string;
  mentorName: string;
  startTime: string;
  endTime: string;
  duration: number;
  actualDurationMinutes: number | null;
  status: string;
  rejectionReason?: string | null;
  meetLink: string | null;
  preWorkReason: string;
  keyInsights: string | null;
  studentActionables: string | null;
  adminFeedbackNote: string | null;
  postSessionSubmittedAt: string | null;
};
```

In `src/app/dashboard/admin/sessions/page.tsx:87-94`, add `admin_feedback_note` to the select:

```tsx
      const { data: sessData, error: sessErr } = await supabase
        .from('sessions')
        .select(`
          id, student_id, mentor_id,
          requested_date, requested_start_time, start_time, end_time,
          duration_minutes, actual_duration_minutes, status, rejection_reason, meet_link,
          pre_work_reason, student_actionables, key_insights, admin_feedback_note, post_session_submitted_at,
          student_profiles:profiles!bookings_student_id_fkey(full_name),
          mentor_profiles:profiles!sessions_mentor_id_fkey(full_name)
        `)
        .order('requested_date', { ascending: false })
```

In `src/app/dashboard/admin/sessions/page.tsx:137-153` (inside the row-normalization `.map()`), add the two new fields to the returned object:

```tsx
            return {
              id: s.id || '',
              studentId: s.student_id || '',
              mentorId: s.mentor_id || '',
              studentName,
              mentorName,
              startTime: s.start_time || new Date().toISOString(),
              endTime: s.end_time || new Date().toISOString(),
              duration: typeof s.duration_minutes === 'number' ? s.duration_minutes : 60,
              actualDurationMinutes: typeof s.actual_duration_minutes === 'number' ? s.actual_duration_minutes : null,
              status: s.status || 'scheduled',
              rejectionReason: s.rejection_reason || null,
              meetLink: s.meet_link || null,
              preWorkReason: s.pre_work_reason || '',
              keyInsights: s.key_insights || null,
              studentActionables: s.student_actionables || null,
              adminFeedbackNote: s.admin_feedback_note || null,
              postSessionSubmittedAt: s.post_session_submitted_at || null,
            };
```

- [ ] **Step 2: Add revision-modal state and admin approve/revise handlers**

In `src/app/dashboard/admin/sessions/page.tsx:60-71`, change the `useAuth()` destructure to also pull `profile`, and add new state:

```tsx
  const { supabase, profile, loading: authLoading } = useAuth();
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [rejectModalSessionId, setRejectModalSessionId] = useState<string | null>(null);
  const [rejectSubmitting, setRejectSubmitting] = useState(false);
  const [rejectError, setRejectError] = useState<string | null>(null);
  const [reviseModalSessionId, setReviseModalSessionId] = useState<string | null>(null);
  const [reviseSubmitting, setReviseSubmitting] = useState(false);
  const [reviseError, setReviseError] = useState<string | null>(null);
```

Add new handlers right after `handleConfirmReject` (after line 215, before `const now = new Date();`):

```tsx
  const handleApprovePostSession = async (sessionId: string) => {
    setActionLoading((prev) => ({ ...prev, [sessionId]: true }));
    setFeedback(null);
    try {
      const res = await approvePostSession(sessionId);
      if (res.success) {
        setFeedback({ type: 'success', message: 'Session approved and marked completed.' });
        await fetchSessions();
      } else {
        setFeedback({ type: 'error', message: res.error || 'Failed to approve session.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'An error occurred during approval.' });
    } finally {
      setActionLoading((prev) => ({ ...prev, [sessionId]: false }));
    }
  };

  const openReviseModal = (sessionId: string) => {
    setReviseError(null);
    setReviseModalSessionId(sessionId);
  };

  const closeReviseModal = () => {
    if (reviseSubmitting) return;
    setReviseModalSessionId(null);
  };

  const handleConfirmRevise = async (reason: string) => {
    const sessionId = reviseModalSessionId;
    if (!sessionId || !profile?.id) return;

    setReviseSubmitting(true);
    setFeedback(null);
    setReviseError(null);
    try {
      const res = await sendSessionForRevision(sessionId, reason, profile.id);
      if (res.success) {
        setFeedback({ type: 'success', message: 'Session sent back for revision.' });
        setReviseModalSessionId(null);
        await fetchSessions();
      } else {
        setReviseError(res.error || 'Failed to send session for revision.');
      }
    } catch (err: any) {
      setReviseError(err.message || 'An error occurred while sending for revision.');
    } finally {
      setReviseSubmitting(false);
    }
  };
```

Add the two new imports to the top import block (near `RejectReasonModal`):

```tsx
import { approveBooking, rejectBooking, approvePostSession, sendSessionForRevision } from '@/app/dashboard/admin/actions';
import { RejectReasonModal } from '@/components/ui/reject-reason-modal';
import { RevisionReasonModal } from '@/components/ui/revision-reason-modal';
```

And add `RotateCcw` to the `lucide-react` import list at the top of the file (alongside `Check`, `X`, etc.).

- [ ] **Step 3: Extend `getSessionState` and the section filters**

Replace `src/app/dashboard/admin/sessions/page.tsx:219-228`:

```tsx
  const getSessionState = (session: SessionInfo) => {
    const start = new Date(session.startTime);
    const end = new Date(session.endTime);
    if (session.status === 'pending' || session.status === 'requested') return 'pending';
    if (session.status === 'rejected') return 'rejected';
    if (session.status === 'completed') return 'completed';
    if (session.status === 'awaiting_post_review') return 'awaiting_post_review';
    if (session.status === 'revise') return 'revise';
    if (now >= start && now <= end && session.status === 'scheduled') return 'live';
    if (start > now && session.status === 'scheduled') return 'upcoming';
    return session.status;
  };
```

Replace `src/app/dashboard/admin/sessions/page.tsx:251-259`:

```tsx
  const pendingSessions = filteredSessions.filter((s) => getSessionState(s) === 'pending');
  const postSessionReviewSessions = filteredSessions.filter((s) => getSessionState(s) === 'awaiting_post_review');
  const liveSessions = filteredSessions.filter((s) => getSessionState(s) === 'live');
  const upcomingSessions = filteredSessions.filter((s) => getSessionState(s) === 'upcoming');
  const pastSessions = filteredSessions.filter((s) => {
    const state = getSessionState(s);
    return state !== 'pending' && state !== 'awaiting_post_review' && state !== 'live' && state !== 'upcoming';
  });
```

- [ ] **Step 4: Add the "Post-Session Review" filter pill**

In `src/app/dashboard/admin/sessions/page.tsx:330-337`, add a new pill after `'pending'`:

```tsx
          {[
            { value: 'all', label: 'All' },
            { value: 'pending', label: `Pending (${sessions.filter(s => s.status === 'pending' || s.status === 'requested').length})` },
            { value: 'awaiting_post_review', label: `Post-Session Review (${sessions.filter(s => s.status === 'awaiting_post_review').length})` },
            { value: 'live', label: 'Live' },
            { value: 'upcoming', label: 'Upcoming' },
            { value: 'completed', label: 'Completed' },
          ].map((filter) => (
```

- [ ] **Step 5: Render the Post-Session Review section**

Insert a new section immediately after the closing `)}` of the "Pending Approvals Section" block (i.e. right before the `{/* Live Sessions */}` comment at `src/app/dashboard/admin/sessions/page.tsx:500`):

```tsx
      {/* Post-Session Review Section */}
      {postSessionReviewSessions.length > 0 && (
        <Card className="border-[#0F1919]/10 shadow-sm bg-gradient-to-br from-[#FBF7D9]/50 to-white rounded-[20px]">
          <CardHeader className="pb-4 border-b border-[#0F1919]/10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-[16px] bg-[#FBF7D9] flex items-center justify-center shadow-sm">
                <BookOpen className="w-5 h-5 text-[#0F1919]" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-foreground">
                  Post-Session Review ({postSessionReviewSessions.length})
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Review the mentor's submitted session report, then approve or send it back for revision
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-3">
              {postSessionReviewSessions.map((session) => {
                const isLoading = actionLoading[session.id] || false;
                return (
                  <div
                    key={session.id}
                    className="p-4 bg-white border border-[#0F1919]/10 rounded-[16px] shadow-sm hover:shadow-md transition-all space-y-3"
                  >
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {session.mentorName}{' '}
                          <span className="font-normal text-muted-foreground">submitted a report for the session with</span>{' '}
                          {session.studentName}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-[var(--fg-faint)]" />
                          <span>{formatDate(session.startTime)}</span>
                          <span>·</span>
                          <Clock className="w-3.5 h-3.5 text-[var(--fg-faint)]" />
                          <span>
                            Scheduled {session.duration} min
                            {session.actualDurationMinutes != null ? ` · Actual ${session.actualDurationMinutes} min` : ''}
                          </span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                        <button
                          onClick={() => openReviseModal(session.id)}
                          disabled={isLoading}
                          className="px-4 py-2 text-xs font-semibold text-[#0F1919] bg-white border border-[#0F1919]/20 hover:bg-[var(--peach-beige)]/25 rounded-full disabled:opacity-50 shadow-sm transition-all flex items-center gap-1.5"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-[#DFA396]" />
                          Send back for revision
                        </button>
                        <button
                          onClick={() => handleApprovePostSession(session.id)}
                          disabled={isLoading}
                          className="px-4 py-2 text-xs font-semibold text-[#FFFBF3] bg-[#0F1919] hover:bg-[#1C2C2C] rounded-full disabled:opacity-50 shadow-sm transition-all flex items-center gap-1.5"
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              Approving...
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

                    <div className="pt-2 border-t border-border space-y-2">
                      <div>
                        <p className="text-[11px] font-semibold text-muted-foreground">Key insights</p>
                        <p className="text-sm text-foreground">{session.keyInsights}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold text-muted-foreground">Student actionables</p>
                        <p className="text-sm text-foreground">{session.studentActionables}</p>
                      </div>
                      {session.adminFeedbackNote && (
                        <div>
                          <p className="text-[11px] font-semibold text-muted-foreground">Note to admin</p>
                          <p className="text-sm text-foreground">{session.adminFeedbackNote}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

```

- [ ] **Step 6: Show a `revise` badge in the Past & Rejected table**

In `src/app/dashboard/admin/sessions/page.tsx:699-711`, replace the status `<TableCell>`:

```tsx
                      <TableCell className="text-right">
                        {session.status === 'rejected' ? (
                          <StatusBadge variant="rejected" size="sm">
                            Rejected
                          </StatusBadge>
                        ) : session.status === 'revise' ? (
                          <StatusBadge variant="revise" size="sm">
                            Needs revision
                          </StatusBadge>
                        ) : (
                          <StatusBadge
                            variant={getSessionState(session) === 'completed' ? 'completed' : 'upcoming'}
                            size="sm"
                          >
                            {getSessionState(session) === 'completed' ? 'Completed' : 'Scheduled'}
                          </StatusBadge>
                        )}
                      </TableCell>
```

- [ ] **Step 7: Mount the revision modal**

In `src/app/dashboard/admin/sessions/page.tsx:764-772`, add the new modal right after `<RejectReasonModal .../>`:

```tsx
      <RejectReasonModal
        open={rejectModalSessionId !== null}
        onOpenChange={(open) => {
          if (!open) closeRejectModal();
        }}
        onConfirm={handleConfirmReject}
        submitting={rejectSubmitting}
        error={rejectError}
      />

      <RevisionReasonModal
        open={reviseModalSessionId !== null}
        onOpenChange={(open) => {
          if (!open) closeReviseModal();
        }}
        onConfirm={handleConfirmRevise}
        submitting={reviseSubmitting}
        error={reviseError}
      />
    </div>
  );
}
```

- [ ] **Step 8: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 9: Manual verification**

Run: `npm run dev`. As admin, open Sessions. With a session in `awaiting_post_review` (created via Task 7's mentor-side form once that task lands — for now you can set one row's status manually via the Supabase dashboard to test this task in isolation), confirm:
- The "Post-Session Review" card and filter pill appear with the correct count.
- Key insights, student actionables, actual duration, and (if present) the admin note all render.
- "Approve session" sets status to `completed` and the card disappears; the "Session approved and marked completed." banner shows.
- "Send back for revision" opens the modal, submit is disabled until a reason is typed, and confirming inserts a `session_revisions` row, flips the session to `revise` (confirm via Supabase dashboard — `status`, `revision_requested_at`, and `last_reminder_sent_at` all updated by the trigger, not by this action), and the card disappears from Post-Session Review.
- The now-`revise` session shows a Peach Beige / Dark Maroon "Needs revision" badge in "Past & Rejected Sessions".
- Tab through the revision modal with keyboard only: focus trapped, Escape closes, Lemon Yellow focus ring visible on the textarea.

- [ ] **Step 10: Commit**

```bash
git add src/app/dashboard/admin/sessions/page.tsx
git commit -m "feat: add Post-Session Review queue to admin sessions page"
```

---

### Task 7: Migrate the mentor Sessions page onto the `sessions` table and mount `PostSessionForm`

**Files:**
- Modify (full rewrite): `src/app/dashboard/mentor/sessions/page.tsx`

**Interfaces:**
- Consumes: `PostSessionForm` (Task 5); `StatusBadge` variants `pending`/`revise`/`completed` (existing).
- Produces: nothing new consumed elsewhere — this is the mentor-facing leaf UI.

This task also resolves the "Known pre-existing inconsistency" above: it moves this page off `bookings`/`session_notes` and onto `sessions`, dropping `SessionNotePanel` entirely from this file (it stays intact and in use on `student/sessions/page.tsx`, which is out of scope).

No automated test — client component with no test harness in this repo; verify manually per Step 3.

- [ ] **Step 1: Replace the entire file**

Replace the full contents of `src/app/dashboard/mentor/sessions/page.tsx`:

```tsx
'use client'

import { useAuth } from '@/context/AuthContext'
import { useState, useEffect, useCallback } from 'react'
import {
  CheckCircle2, Clock, Calendar, Video, Radio,
  Loader2, Search, AlertCircle, ExternalLink, BookOpen, User, X, ChevronLeft, ChevronRight
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/status-badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PostSessionForm } from '@/components/ui/post-session-form'

const ITEMS_PER_PAGE = 10

interface SessionRow {
  id: string
  student_id: string
  start_time: string
  end_time: string
  duration_minutes: number
  actual_duration_minutes: number | null
  status: 'requested' | 'scheduled' | 'awaiting_post_review' | 'revise' | 'completed' | 'rejected'
  meet_link: string | null
  key_insights: string | null
  student_actionables: string | null
  admin_feedback_note: string | null
  student: { full_name: string; email: string; bio: string | null } | null
}

type RevisionRow = { session_id: string; reason: string; created_at: string }

function getSessionState(startTime: string, endTime: string) {
  const now = Date.now()
  const start = new Date(startTime).getTime()
  const end = new Date(endTime).getTime()
  const fiveMin = 5 * 60 * 1000
  if (now >= start && now <= end) return 'live'
  if (now >= start - fiveMin && now < start) return 'ready'
  if (now > end) return 'past'
  return 'upcoming'
}

type TabType = 'upcoming' | 'pending' | 'history'

export default function SessionsPage() {
  const { profile, supabase } = useAuth()
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [revisionsBySession, setRevisionsBySession] = useState<Record<string, RevisionRow[]>>({})
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('upcoming')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStudent, setSelectedStudent] = useState<SessionRow | null>(null)
  const [currentPage, setCurrentPage] = useState(1)

  // Tick to refresh session states
  const [, setTick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30_000)
    return () => clearInterval(id)
  }, [])

  const fetchSessions = useCallback(async () => {
    if (!profile?.id) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select(`
          id, student_id, start_time, end_time, duration_minutes, actual_duration_minutes,
          status, meet_link, key_insights, student_actionables, admin_feedback_note,
          student:profiles!bookings_student_id_fkey(full_name, email, bio)
        `)
        .eq('mentor_id', profile.id)
        .order('start_time', { ascending: false })

      if (error) {
        console.error('Error fetching sessions:', error)
        setSessions([])
        return
      }

      const rows = (data || []) as unknown as SessionRow[]
      setSessions(rows)

      const reviseIds = rows.filter(r => r.status === 'revise').map(r => r.id)
      if (reviseIds.length > 0) {
        const { data: revisionData } = await supabase
          .from('session_revisions')
          .select('session_id, reason, created_at')
          .in('session_id', reviseIds)
          .order('created_at', { ascending: false })

        const grouped: Record<string, RevisionRow[]> = {}
        for (const rev of revisionData || []) {
          grouped[rev.session_id] = grouped[rev.session_id] || []
          grouped[rev.session_id].push(rev)
        }
        setRevisionsBySession(grouped)
      } else {
        setRevisionsBySession({})
      }
    } catch (err: any) {
      console.error('Error fetching sessions:', err)
    } finally {
      setLoading(false)
    }
  }, [supabase, profile])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })

  const formatTime = (d: string) =>
    new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })

  const getRemainingTime = (endTime: string) => {
    const now = Date.now()
    const end = new Date(endTime).getTime()
    const diff = end - now
    const minutes = Math.floor(diff / 60000)
    return minutes > 0 ? `${minutes} min remaining` : 'Ending soon'
  }

  // Categorize sessions
  const now = new Date()

  const liveSessions = sessions.filter(s => {
    const state = getSessionState(s.start_time, s.end_time)
    return state === 'live' && s.status === 'scheduled'
  })

  const upcomingSessions = sessions.filter(s => {
    const state = getSessionState(s.start_time, s.end_time)
    return s.status === 'scheduled' && new Date(s.start_time) > now && state !== 'live'
  })

  // Actionable: a held session still waiting on the mentor's report, or one sent back for revision.
  const toSubmitSessions = sessions.filter(s =>
    (s.status === 'scheduled' && getSessionState(s.start_time, s.end_time) === 'past') || s.status === 'revise'
  )

  const historySessions = sessions.filter(s => s.status === 'completed')

  // Apply search filter
  const filterBySearch = (rows: SessionRow[]) => {
    if (!searchQuery) return rows
    return rows.filter(s =>
      s.student?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }

  const filteredUpcoming = filterBySearch(upcomingSessions)
  const filteredToSubmit = filterBySearch(toSubmitSessions)
  const filteredHistory = filterBySearch(historySessions)

  // Reset to page 1 when changing tabs or search
  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab, searchQuery])

  // Pagination logic
  const getCurrentPageData = (data: SessionRow[]) => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    const endIndex = startIndex + ITEMS_PER_PAGE
    return data.slice(startIndex, endIndex)
  }

  const getTotalPages = (data: SessionRow[]) => Math.ceil(data.length / ITEMS_PER_PAGE)

  const paginatedUpcoming = getCurrentPageData(filteredUpcoming)
  const paginatedToSubmit = getCurrentPageData(filteredToSubmit)
  const paginatedHistory = getCurrentPageData(filteredHistory)

  const upcomingTotalPages = getTotalPages(filteredUpcoming)
  const toSubmitTotalPages = getTotalPages(filteredToSubmit)
  const historyTotalPages = getTotalPages(filteredHistory)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-display font-semibold text-foreground tracking-tight">Sessions</h1>
        <p className="text-muted-foreground text-sm mt-1">
          View and manage all your mentoring sessions.
        </p>
      </div>

      {/* Student Profile Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/60 backdrop-blur-sm" onClick={() => setSelectedStudent(null)}>
          <div className="relative w-full max-w-2xl bg-card rounded-2xl shadow-2xl border border-border" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-[var(--primary-hover)] flex items-center justify-center text-white font-bold text-xl">
                  {(selectedStudent.student?.full_name || 'S').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </div>
                <div>
                  <p className="text-2xl font-semibold text-foreground">{selectedStudent.student?.full_name || 'Unknown Student'}</p>
                  <p className="text-sm text-muted-foreground">{selectedStudent.student?.email}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedStudent(null)}
                className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6">
              {/* Bio Section */}
              <div>
                <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2 uppercase tracking-wider">
                  <User className="w-4 h-4 text-primary" />
                  About This Student
                </p>
                {selectedStudent.student?.bio ? (
                  <div className="bg-muted rounded-xl p-4 border border-border">
                    <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                      {selectedStudent.student.bio}
                    </p>
                  </div>
                ) : (
                  <div className="bg-muted rounded-xl p-4 border border-dashed border-[var(--line-strong)] text-center">
                    <p className="text-sm text-muted-foreground italic">
                      This student hasn't added a bio yet.
                    </p>
                  </div>
                )}
              </div>

              {/* Session Info */}
              <div>
                <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2 uppercase tracking-wider">
                  <Calendar className="w-4 h-4 text-primary" />
                  Session Details
                </p>
                <div className="bg-accent rounded-xl p-4 border border-accent space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-primary" />
                    <span className="font-medium text-accent-foreground">{formatDate(selectedStudent.start_time)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-primary" />
                    <span className="text-accent-foreground">
                      {formatTime(selectedStudent.start_time)} – {formatTime(selectedStudent.end_time)} ({selectedStudent.duration_minutes} min)
                    </span>
                  </div>
                  {selectedStudent.meet_link && (
                    <div className="pt-2">
                      <a
                        href={selectedStudent.meet_link}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-[#0F1919] hover:bg-[#1C2C2C] text-[#FFFBF3] rounded-full text-sm font-semibold transition-colors"
                      >
                        <Video className="w-4 h-4" />
                        Join Meeting
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-border flex justify-end">
              <Button onClick={() => setSelectedStudent(null)} variant="outline">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Live Sessions (Always at top if exists) */}
      {liveSessions.length > 0 && (
        <Card className="border-destructive/30 bg-accent/30">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-destructive animate-pulse" />
              <CardTitle className="text-base text-foreground">Live Now - Ongoing Session</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {liveSessions.map(session => {
              const studentName = session.student?.full_name || 'Unknown Student'
              return (
                <div key={session.id} className="p-4 bg-card border border-destructive/30 rounded-xl shadow-sm space-y-3">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="space-y-2">
                      <p className="text-lg font-semibold text-foreground">
                        🎥 Session with {studentName}
                      </p>
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {formatTime(session.start_time)} – {formatTime(session.end_time)} ({session.duration_minutes} min)
                      </p>
                      <p className="text-sm text-destructive font-medium flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        ⏰ {getRemainingTime(session.end_time)}
                      </p>
                    </div>
                    {session.meet_link && (
                      <a
                        href={session.meet_link}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-success hover:opacity-90 text-white rounded-xl text-base font-bold shadow-lg shadow-success/30 animate-pulse transition-all"
                      >
                        <Video className="w-5 h-5" />
                        Join Call Now
                      </a>
                    )}
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-3 border-b border-border">
        <button
          onClick={() => setActiveTab('upcoming')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'upcoming'
              ? 'border-[#0F1919] text-[#0F1919]'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Upcoming ({filteredUpcoming.length})
        </button>
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'pending'
              ? 'border-[#0F1919] text-[#0F1919]'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          To Submit ({filteredToSubmit.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'history'
              ? 'border-[#0F1919] text-[#0F1919]'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          History ({filteredHistory.length})
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--fg-faint)]" />
        <Input
          placeholder="Search by student name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Tab Content */}
      {activeTab === 'upcoming' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upcoming Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredUpcoming.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-12 h-12 text-[var(--fg-faint)] mx-auto mb-3" />
                <p className="text-sm text-[var(--fg-faint)]">
                  {searchQuery ? 'No sessions match your search.' : 'No upcoming sessions. Students can book you based on your availability.'}
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {paginatedUpcoming.map(session => {
                    const studentName = session.student?.full_name || 'Unknown Student'
                    const state = getSessionState(session.start_time, session.end_time)
                    const isReady = state === 'ready'

                    return (
                      <div key={session.id} className="p-4 bg-muted border border-border rounded-lg hover:bg-accent transition-colors">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => setSelectedStudent(session)}
                              className="w-10 h-10 rounded-full bg-accent text-primary flex items-center justify-center font-bold text-sm hover:opacity-80 transition-colors cursor-pointer"
                            >
                              {studentName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                            </button>
                            <div>
                              <button
                                onClick={() => setSelectedStudent(session)}
                                className="text-sm font-medium text-foreground hover:text-primary transition-colors cursor-pointer"
                              >
                                {studentName}
                              </button>
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                <Calendar className="w-3 h-3" />
                                {formatDate(session.start_time)}
                              </p>
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatTime(session.start_time)} – {formatTime(session.end_time)} ({session.duration_minutes} min)
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {isReady && session.meet_link && (
                              <a
                                href={session.meet_link}
                                target="_blank"
                                rel="noreferrer"
                                className="px-4 py-2 bg-success hover:opacity-90 text-white rounded-lg text-sm font-semibold shadow-sm"
                              >
                                <Video className="w-4 h-4 inline mr-1" />
                                Join Call
                              </a>
                            )}
                            {!isReady && session.meet_link && (
                              <a
                                href={session.meet_link}
                                target="_blank"
                                rel="noreferrer"
                                className="px-3 py-1.5 border border-[var(--line-strong)] text-muted-foreground hover:border-primary/40 rounded-lg text-xs font-medium flex items-center gap-1"
                              >
                                <ExternalLink className="w-3 h-3" />
                                Meet Link
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Pagination */}
                {upcomingTotalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 mt-4 border-t border-border">
                    <p className="text-sm text-muted-foreground">
                      Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredUpcoming.length)} of {filteredUpcoming.length} sessions
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-muted-foreground bg-card border border-[var(--line-strong)] rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Previous
                      </button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: upcomingTotalPages }, (_, i) => i + 1).map(page => (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`w-10 h-10 text-sm font-medium rounded-lg transition-colors ${
                              currentPage === page
                                ? 'bg-[#0F1919] text-[#FFFBF3]'
                                : 'text-muted-foreground hover:bg-muted'
                            }`}
                          >
                            {page}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => setCurrentPage(p => Math.min(upcomingTotalPages, p + 1))}
                        disabled={currentPage === upcomingTotalPages}
                        className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-muted-foreground bg-card border border-[var(--line-strong)] rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Next
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'pending' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sessions To Submit</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredToSubmit.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-3" />
                <p className="text-sm text-[var(--fg-faint)]">
                  {searchQuery ? 'No sessions match your search.' : '✅ All caught up! No session reports are due.'}
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {paginatedToSubmit.map(session => {
                    const studentName = session.student?.full_name || 'Unknown Student'
                    const isRevise = session.status === 'revise'
                    const revisions = (revisionsBySession[session.id] || []).map(r => ({
                      reason: r.reason,
                      createdAt: r.created_at,
                    }))

                    return (
                      <div key={session.id} className="p-4 bg-warning-bg/40 border border-warning/30 rounded-lg space-y-4">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => setSelectedStudent(session)}
                              className="w-10 h-10 rounded-full bg-warning-bg text-warning flex items-center justify-center font-bold text-sm hover:opacity-80 transition-colors cursor-pointer"
                            >
                              {studentName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                            </button>
                            <div>
                              <button
                                onClick={() => setSelectedStudent(session)}
                                className="text-sm font-medium text-foreground hover:text-primary transition-colors cursor-pointer"
                              >
                                {studentName}
                              </button>
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                <Calendar className="w-3 h-3" />
                                {formatDate(session.start_time)}
                                <Clock className="w-3 h-3 ml-2" />
                                {formatTime(session.start_time)} – {formatTime(session.end_time)}
                              </p>
                            </div>
                          </div>
                          {isRevise && (
                            <StatusBadge variant="revise" size="sm">
                              Needs revision
                            </StatusBadge>
                          )}
                        </div>

                        <PostSessionForm
                          sessionId={session.id}
                          mentorId={profile?.id || ''}
                          initial={
                            isRevise
                              ? {
                                  keyInsights: session.key_insights || '',
                                  studentActionables: session.student_actionables || '',
                                  actualDurationMinutes: session.actual_duration_minutes || session.duration_minutes,
                                  adminFeedbackNote: session.admin_feedback_note || '',
                                }
                              : null
                          }
                          revisions={revisions}
                          onSubmitted={fetchSessions}
                        />
                      </div>
                    )
                  })}
                </div>

                {/* Pagination */}
                {toSubmitTotalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 mt-4 border-t border-border">
                    <p className="text-sm text-muted-foreground">
                      Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredToSubmit.length)} of {filteredToSubmit.length} sessions
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-muted-foreground bg-card border border-[var(--line-strong)] rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Previous
                      </button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: toSubmitTotalPages }, (_, i) => i + 1).map(page => (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`w-10 h-10 text-sm font-medium rounded-lg transition-colors ${
                              currentPage === page
                                ? 'bg-[#0F1919] text-[#FFFBF3]'
                                : 'text-muted-foreground hover:bg-muted'
                            }`}
                          >
                            {page}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => setCurrentPage(p => Math.min(toSubmitTotalPages, p + 1))}
                        disabled={currentPage === toSubmitTotalPages}
                        className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-muted-foreground bg-card border border-[var(--line-strong)] rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Next
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'history' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Session History</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredHistory.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="w-12 h-12 text-[var(--fg-faint)] mx-auto mb-3" />
                <p className="text-sm text-[var(--fg-faint)]">
                  {searchQuery ? 'No sessions match your search.' : 'No session history yet.'}
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {paginatedHistory.map(session => {
                    const studentName = session.student?.full_name || 'Unknown Student'
                    return (
                      <div key={session.id} className="p-4 bg-card border border-border rounded-lg space-y-3">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => setSelectedStudent(session)}
                              className="w-10 h-10 rounded-full bg-muted text-muted-foreground flex items-center justify-center font-bold text-sm hover:bg-accent transition-colors cursor-pointer"
                            >
                              {studentName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                            </button>
                            <div>
                              <button
                                onClick={() => setSelectedStudent(session)}
                                className="text-sm font-medium text-foreground hover:text-primary transition-colors cursor-pointer"
                              >
                                {studentName}
                              </button>
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                <Calendar className="w-3 h-3" />
                                {formatDate(session.start_time)}
                              </p>
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatTime(session.start_time)} – {formatTime(session.end_time)}
                                {session.actual_duration_minutes != null ? ` (${session.actual_duration_minutes} min actual)` : ''}
                              </p>
                            </div>
                          </div>
                          <StatusBadge variant="completed" size="sm">
                            Completed
                          </StatusBadge>
                        </div>
                        {(session.key_insights || session.student_actionables) && (
                          <div className="pt-2 border-t border-border space-y-2">
                            {session.key_insights && (
                              <div>
                                <p className="text-[11px] font-semibold text-muted-foreground">Key insights</p>
                                <p className="text-sm text-foreground">{session.key_insights}</p>
                              </div>
                            )}
                            {session.student_actionables && (
                              <div>
                                <p className="text-[11px] font-semibold text-muted-foreground">Student actionables</p>
                                <p className="text-sm text-foreground">{session.student_actionables}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Pagination */}
                {historyTotalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 mt-4 border-t border-border">
                    <p className="text-sm text-muted-foreground">
                      Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredHistory.length)} of {filteredHistory.length} sessions
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-muted-foreground bg-card border border-[var(--line-strong)] rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Previous
                      </button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: historyTotalPages }, (_, i) => i + 1).map(page => (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`w-10 h-10 text-sm font-medium rounded-lg transition-colors ${
                              currentPage === page
                                ? 'bg-[#0F1919] text-[#FFFBF3]'
                                : 'text-muted-foreground hover:bg-muted'
                            }`}
                          >
                            {page}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => setCurrentPage(p => Math.min(historyTotalPages, p + 1))}
                        disabled={currentPage === historyTotalPages}
                        className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-muted-foreground bg-card border border-[var(--line-strong)] rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Next
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual verification — happy path and revise loop**

Run: `npm run dev`, sign in as a mentor with at least one `scheduled` session whose `start_time`/`end_time` are in the past (use the Supabase dashboard to backdate one if needed). Confirm:
- It appears under "To Submit", with no revision banner, and an empty `PostSessionForm`.
- Typing an invalid duration (e.g. 20) shows the inline "Duration must be in 15-minute increments" error and keeps "Submit for review" disabled.
- Filling all required fields with duration 45 and clicking "Submit for review" succeeds, the session disappears from "To Submit", and (via Supabase dashboard) `status = 'awaiting_post_review'`, `post_session_submitted_at` is set, and all four fields are populated.
- As admin (Task 6), send that session back for revision with a reason.
- Back as the mentor, the session reappears under "To Submit" with a "Needs revision" badge, the soft-amber banner showing the admin's reason above the form, and the form pre-filled with the previous submission.
- Edit a field and resubmit — confirm it re-enters `awaiting_post_review`.
- Repeat the revise cycle two more times (via the admin side) on the same session; confirm the form's collapsed "Show N earlier revisions" list appears once there are 2+ prior reasons, defaults to collapsed, and expands to show them in reverse-chronological order.
- Once approved by admin, confirm the session now appears in "History" with `key_insights`/`student_actionables` rendered read-only and a "Completed" badge.

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/mentor/sessions/page.tsx
git commit -m "feat: migrate mentor sessions page to structured post-session form"
```

---

### Task 8: Simplify `useMentorBookings` — drop the direct-complete bypass

**Files:**
- Modify (full rewrite): `src/hooks/useMentorBookings.ts`

**Interfaces:**
- Produces: `useMentorBookings(): { data: MentorBooking[]; isLoading: boolean; ... }` (no more `markComplete`/`isMarkingComplete` — the direct-complete bypass is removed) where `MentorBooking.status` is now the real `session_status` enum value, not remapped — consumed by Task 9.

No automated test — this hook has no existing test coverage and is a straightforward query/shape change; verified manually in Task 9's step.

- [ ] **Step 1: Replace the entire file**

Replace the full contents of `src/hooks/useMentorBookings.ts`:

```ts
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'

export interface MentorBooking {
  id: string
  student_id: string
  start_time: string
  end_time: string
  duration_minutes: number
  status: 'requested' | 'scheduled' | 'awaiting_post_review' | 'revise' | 'completed' | 'rejected'
  meet_link: string | null
  profiles: { full_name: string; email?: string }
}

export function useMentorBookings() {
  const { supabase, profile } = useAuth()

  const query = useQuery<MentorBooking[]>({
    queryKey: ['mentor-bookings', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return []

      const { data: sessionData, error: sessionErr } = await supabase
        .from('sessions')
        .select(`
          id, student_id, requested_date, requested_start_time, start_time, end_time,
          duration_minutes, status, meet_link,
          student:profiles!bookings_student_id_fkey(full_name, email)
        `)
        .eq('mentor_id', profile.id)
        .order('requested_date', { ascending: true })

      if (sessionErr) {
        console.error('Error fetching mentor bookings:', sessionErr)
        throw sessionErr
      }

      return (sessionData || []).map((s: any) => {
        const startTime = s.start_time || (
          s.requested_date && s.requested_start_time
            ? new Date(`${s.requested_date}T${s.requested_start_time}Z`).toISOString()
            : new Date().toISOString()
        )
        const endTime = s.end_time || new Date(new Date(startTime).getTime() + (s.duration_minutes || 60) * 60000).toISOString()

        return {
          id: s.id,
          student_id: s.student_id,
          start_time: startTime,
          end_time: endTime,
          duration_minutes: s.duration_minutes,
          status: s.status,
          meet_link: s.meet_link,
          profiles: { full_name: s.student?.full_name || 'Student', email: s.student?.email || '' },
        } as MentorBooking
      })
    },
    enabled: !!profile?.id,
    // Refetch every 30 seconds
    refetchInterval: 30000,
  })

  return query
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: errors in `src/app/dashboard/mentor/page.tsx` referencing `markComplete`/`isMarkingComplete`/`session_notes` — expected at this point, resolved by Task 9.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useMentorBookings.ts
git commit -m "refactor: drop direct-complete bypass from useMentorBookings"
```

---

### Task 9: Update the mentor dashboard home "Mark as Completed" card

**Files:**
- Modify: `src/app/dashboard/mentor/page.tsx:26-49` (state/handlers), `61-67` (categorization), `255-308` (the card itself)

**Interfaces:**
- Consumes: `useMentorBookings` (Task 8, now without `markComplete`).

No automated test — client component with no test harness in this repo; verified manually in Step 5.

- [ ] **Step 1: Drop the direct-complete state and handler**

Replace `src/app/dashboard/mentor/page.tsx:26-49`:

```tsx
export default function MentorDashboard() {
  const { profile } = useAuth()
  const { data: bookings = [], isLoading: loading } = useMentorBookings()
  const [, setTick] = useState(0)

  // Tick to refresh session states
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30_000)
    return () => clearInterval(id)
  }, [])
```

- [ ] **Step 2: Include `revise` sessions in the "needs a report" bucket**

Replace `src/app/dashboard/mentor/page.tsx:61-67`:

```tsx
  // Categorize bookings
  const liveBookings = bookings.filter(b =>
    b.status === 'scheduled' && getSessionState(b.start_time, b.end_time) === 'live'
  )
  const readyBookings = bookings.filter(b =>
    b.status === 'scheduled' && getSessionState(b.start_time, b.end_time) === 'ready'
  )
  const upcomingBookings = bookings.filter(b =>
    b.status === 'scheduled' && getSessionState(b.start_time, b.end_time) === 'upcoming'
  ).slice(0, 5)
  const sessionsNeedingReportBookings = bookings.filter(b =>
    (b.status === 'scheduled' && getSessionState(b.start_time, b.end_time) === 'past') || b.status === 'revise'
  )

  const totalSessions = bookings.length
  const completedSessions = bookings.filter(b => b.status === 'completed').length
  const scheduledSessions = bookings.filter(b => b.status === 'scheduled').length
```

- [ ] **Step 3: Replace the "Mark as Completed" card with a link-out nudge card**

Replace `src/app/dashboard/mentor/page.tsx:255-308` (the `{/* Sessions Needing Review - Mark as Completed */}` block):

```tsx
        {/* Sessions Needing a Report */}
        {sessionsNeedingReportBookings.length > 0 && (
          <Card className="border-warning/30 bg-warning-bg/30">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-warning" />
                  <CardTitle className="text-base font-semibold text-foreground">Session Reports Needed</CardTitle>
                </div>
                <Badge variant="secondary" className="bg-warning-bg text-warning border-warning/30">
                  {sessionsNeedingReportBookings.length} to submit
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 mb-4">
                {sessionsNeedingReportBookings.slice(0, 3).map((booking) => (
                  <div key={booking.id} className="flex items-center justify-between gap-3 p-4 bg-card border border-warning/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-warning-bg text-warning flex items-center justify-center font-bold text-sm flex-shrink-0">
                        {booking.profiles.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{booking.profiles.full_name}</p>
                        <p className="text-xs text-[var(--fg-faint)] mt-0.5">
                          {formatDate(booking.start_time)} · {formatTime(booking.start_time)} – {formatTime(booking.end_time)}
                        </p>
                      </div>
                    </div>
                    {booking.status === 'revise' && (
                      <StatusBadge variant="revise" size="sm">
                        Needs revision
                      </StatusBadge>
                    )}
                  </div>
                ))}
              </div>

              <Link href="/dashboard/mentor/sessions?tab=pending" className="btn-secondary w-full justify-center">
                Fill in session reports
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </CardContent>
          </Card>
        )}
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors. (`Loader2` and `CheckCircle2` icon imports remain used elsewhere in the file — confirm no unused-import lint failures; `Loader2` is still used by the top-level loading guard.)

- [ ] **Step 5: Manual verification**

Run: `npm run dev`, sign in as a mentor with a past-due `scheduled` session and (separately, via Supabase dashboard or the admin flow from Task 6) one `revise` session. Confirm:
- "Session Reports Needed" card shows both, with a "Needs revision" badge only on the revise one.
- "Fill in session reports" navigates to `/dashboard/mentor/sessions`, landing on/near the "To Submit" tab.
- No "Mark Completed" button exists anywhere on this page anymore, and a mentor cannot set a session to `completed` without going through the admin's approval.

- [ ] **Step 6: Commit**

```bash
git add src/app/dashboard/mentor/page.tsx
git commit -m "feat: replace direct-complete quick action with session-report nudge card"
```

---

## Self-Review Notes

- **Spec coverage:** 4-field form (key insights, actionables, duration, optional admin note), client-side 15-minute validation, `awaiting_post_review` transition → Tasks 1, 2, 5, 7. Admin approve/revise, revision reason modal required-and-disabled-until-filled, `session_revisions` insert (not manual status set) → Tasks 3, 4, 6. Uncapped revise loop, mentor sees latest reason + pre-filled form + collapsed history for 2+ revisions → Tasks 5, 7. Post-Session Review queue as a section beside the existing Sessions queue sections (adapted from "segmented tab" language in the spec to this screen's actual filter-pill + stacked-card pattern, per the design skill's Hick's-Law/consistency guidance to reuse what's already on *this* screen) → Task 6. Status badge colors (`awaiting_post_review` → pale Lemon Yellow via existing `pending` variant, `revise` → Peach Beige/Dark Maroon via existing `revise` variant, `completed` → Cream Butter via existing `completed` variant) → Tasks 6, 7, reusing `status-badge.tsx` unmodified. Approve/Send-back-for-revision color distinctness from each other and from Reject → Tasks 4, 6. Removing the old single-textarea + Lock flow entirely for the mentor-facing surfaces → Task 7 (with the "Known pre-existing inconsistency" section explaining why this required migrating the whole page off `bookings`/`session_notes`, and why `SessionNotePanel` itself is not deleted — `student/sessions/page.tsx` still depends on it and is out of scope). Removing the mentor's ability to bypass review entirely → Tasks 8, 9.
- **Placeholder scan:** no TBD/"add error handling"/"similar to Task N" — every step has literal, complete code or a concrete manual-verification checklist.
- **Type consistency:** `PostSessionFormInput` defined in Task 2, matches the object literal passed by `PostSessionForm` in Task 5 field-for-field. `PostSessionForm`'s `initial`/`revisions` prop shapes (Task 5) match exactly what Task 7's page passes (`key_insights`/`student_actionables`/`actual_duration_minutes`/`admin_feedback_note` → camelCase mapping, `revisionsBySession[session.id]` → `{reason, createdAt}[]`). `sendSessionForRevision(sessionId, reason, adminId)` signature from Task 3 matches the call site in Task 6. `MentorBooking.status` union in Task 8 matches the values Task 9's filters and badge check against (`'scheduled'`, `'revise'`, `'completed'`).
