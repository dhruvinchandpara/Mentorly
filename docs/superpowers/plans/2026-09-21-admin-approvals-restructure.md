# Admin Approvals Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the admin "Sessions & Approvals" page into a new `/dashboard/admin/approvals` split-view (pre-session queue + post-session review queue) and a reworked, read-only, tag-searchable `/dashboard/admin/sessions` log.

**Architecture:** Extract the two actionable queue sections out of `sessions/page.tsx` into standalone, independently-fetching components rendered by a new Approvals page (desktop: side-by-side columns; mobile: segmented toggle between them). Sessions page keeps its existing data fetch untouched but drops all actions/modals and replaces free-text search with a tag-pill autocomplete search. Two new generic components (`ExpandableRow`, `TagSearchInput`) land in `src/components/ui/` for reuse.

**Tech Stack:** Next.js 16 App Router, React 19 client components, Supabase JS client (via `useAuth()`), Tailwind CSS 4, lucide-react icons, Vitest for pure-logic unit tests.

**Spec:** `docs/superpowers/specs/2026-09-21-admin-approvals-restructure-design.md`

## Global Constraints

- Design tokens (colors, radii, spacing) must match `docs/superpowers/specs/2026-09-21-admin-approvals-restructure-design.md` / `.claude/skills/mentorly-ui-ux` exactly — reuse the hex values already used in `sessions/page.tsx` rather than inventing new ones.
- Action color semantics: affirmative actions (Approve) use solid `#0F1919` fill; destructive (Reject) uses solid `#BA3B41`; never both on the same visual weight.
- Reject and revise actions remain gated behind a required-reason modal (`RejectReasonModal` / `RevisionReasonModal`, unchanged) — do not loosen this.
- Legacy `bookings`-view fallback code in `sessions/page.tsx` and `dashboard/admin/page.tsx` is explicitly **out of scope** — do not remove or "clean up" it in this plan.
- Test strategy for this plan: this repo's Vitest `unit` project only includes `src/**/*.test.ts` (plain TypeScript, node environment) — there is no jsdom/React-Testing-Library setup for `.tsx` component tests, and Storybook's `src/stories/` only contains the unused scaffold examples, not a real per-component testing pattern. So: **pure logic extracted into `.ts` modules gets real TDD (failing test → implementation → passing test)**; React components (including new ones) are verified **manually in the running dev server** per this project's CLAUDE.md guidance ("start the dev server and use the feature in a browser before reporting complete"). Do not invent a component-test harness this repo doesn't have.
- Path aliases: always import via `@/*`, never relative paths across top-level directories.

---

### Task 1: `useMediaQuery` hook

**Files:**
- Create: `src/hooks/useMediaQuery.ts`

**Interfaces:**
- Produces: `useMediaQuery(query: string): boolean` — a client-only hook other tasks (Task 8) call to detect the desktop/mobile breakpoint.

- [ ] **Step 1: Create the hook**

```ts
// src/hooks/useMediaQuery.ts
'use client';

import { useEffect, useState } from 'react';

/**
 * Starts false (matching SSR, where `window` doesn't exist) and updates
 * after mount to avoid a hydration mismatch. Callers that need a
 * desktop-first default should treat the first render as "mobile" and
 * expect it to settle within one effect tick.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mediaQueryList = window.matchMedia(query);
    setMatches(mediaQueryList.matches);

    const listener = (event: MediaQueryListEvent) => setMatches(event.matches);
    mediaQueryList.addEventListener('change', listener);
    return () => mediaQueryList.removeEventListener('change', listener);
  }, [query]);

  return matches;
}
```

- [ ] **Step 2: Manual verification**

Not unit-testable without a DOM environment this repo doesn't have configured (see Global Constraints). Verified in Task 8 once it's wired into the Approvals page — resize the browser window across 768px and confirm the layout switches.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useMediaQuery.ts
git commit -m "feat: add useMediaQuery hook for approvals split-view breakpoint"
```

---

### Task 2: Shared session-queue data layer

**Files:**
- Create: `src/app/dashboard/admin/approvals/lib/fetch-queue-sessions.ts`
- Test: `src/app/dashboard/admin/approvals/lib/fetch-queue-sessions.test.ts`

**Interfaces:**
- Produces:
  - `type SessionInfo` — `{ id, studentId, mentorId, studentName, mentorName, startTime, endTime, duration, actualDurationMinutes, status, rejectionReason, meetLink, preWorkReason, keyInsights, studentActionables, adminFeedbackNote, postSessionSubmittedAt }`
  - `type PriorSessionInfo` — `{ keyInsights, studentActionables, status, postSessionSubmittedAt } | null`
  - `mapSessionRow(row: any): SessionInfo`
  - `fetchSessionsByStatus(supabase, statuses: string[]): Promise<SessionInfo[]>`
  - `fetchSessionsWithPostSessionReport(supabase): Promise<SessionInfo[]>`
  - `pickPriorSession(candidates: SessionInfo[], studentId: string, mentorId: string, excludeSessionId: string): PriorSessionInfo`
- Consumes: nothing from earlier tasks.

This task ports the row-mapping and prior-session-lookup logic that already exists inline in `src/app/dashboard/admin/sessions/page.tsx` (lines 89–172 for the fetch/mapping, lines 442–460 for the prior-session pick) into pure, reusable, testable functions — without the legacy `bookings` fallback, since these are new query paths that only ever read from `sessions` (see Global Constraints).

- [ ] **Step 1: Write the failing tests**

```ts
// src/app/dashboard/admin/approvals/lib/fetch-queue-sessions.test.ts
import { describe, it, expect } from 'vitest'
import { mapSessionRow, pickPriorSession, type SessionInfo } from './fetch-queue-sessions'

describe('mapSessionRow', () => {
  it('maps a full row into SessionInfo', () => {
    const row = {
      id: 's1',
      student_id: 'stu1',
      mentor_id: 'men1',
      start_time: '2026-09-22T10:00:00.000Z',
      end_time: '2026-09-22T10:30:00.000Z',
      duration_minutes: 30,
      actual_duration_minutes: 28,
      status: 'pending',
      rejection_reason: null,
      meet_link: null,
      pre_work_reason: 'Discuss resume',
      key_insights: null,
      student_actionables: null,
      admin_feedback_note: null,
      post_session_submitted_at: null,
      student_profiles: { full_name: 'Alex Student' },
      mentor_profiles: { full_name: 'Mo Mentor' },
    }

    const result = mapSessionRow(row)

    expect(result).toEqual<SessionInfo>({
      id: 's1',
      studentId: 'stu1',
      mentorId: 'men1',
      studentName: 'Alex Student',
      mentorName: 'Mo Mentor',
      startTime: '2026-09-22T10:00:00.000Z',
      endTime: '2026-09-22T10:30:00.000Z',
      duration: 30,
      actualDurationMinutes: 28,
      status: 'pending',
      rejectionReason: null,
      meetLink: null,
      preWorkReason: 'Discuss resume',
      keyInsights: null,
      studentActionables: null,
      adminFeedbackNote: null,
      postSessionSubmittedAt: null,
    })
  })

  it('derives startTime from requested_date/requested_start_time when start_time is null', () => {
    const row = {
      id: 's2',
      student_id: 'stu1',
      mentor_id: 'men1',
      start_time: null,
      requested_date: '2026-09-22',
      requested_start_time: '14:00:00',
      end_time: '2026-09-22T14:30:00.000Z',
      duration_minutes: 30,
      status: 'pending',
      student_profiles: { full_name: 'Alex Student' },
      mentor_profiles: { full_name: 'Mo Mentor' },
    }

    const result = mapSessionRow(row)

    expect(result.startTime).toBe('2026-09-22T14:00:00.000Z')
  })

  it('falls back to "Unknown" when a profile join is missing', () => {
    const row = {
      id: 's3',
      student_id: 'stu1',
      mentor_id: 'men1',
      start_time: '2026-09-22T10:00:00.000Z',
      end_time: '2026-09-22T10:30:00.000Z',
      duration_minutes: 30,
      status: 'pending',
      student_profiles: null,
      mentor_profiles: null,
    }

    const result = mapSessionRow(row)

    expect(result.studentName).toBe('Unknown')
    expect(result.mentorName).toBe('Unknown')
  })
})

describe('pickPriorSession', () => {
  const base: SessionInfo = {
    id: '',
    studentId: 'stu1',
    mentorId: 'men1',
    studentName: 'Alex Student',
    mentorName: 'Mo Mentor',
    startTime: '2026-01-01T00:00:00.000Z',
    endTime: '2026-01-01T00:30:00.000Z',
    duration: 30,
    actualDurationMinutes: null,
    status: 'completed',
    rejectionReason: null,
    meetLink: null,
    preWorkReason: '',
    keyInsights: null,
    studentActionables: null,
    adminFeedbackNote: null,
    postSessionSubmittedAt: null,
  }

  it('returns null when no candidate matches the student/mentor pair', () => {
    const candidates = [{ ...base, id: 'other', studentId: 'stu2' }]
    expect(pickPriorSession(candidates, 'stu1', 'men1', 'current')).toBeNull()
  })

  it('excludes the current session and candidates without a submitted report', () => {
    const candidates = [
      { ...base, id: 'current', postSessionSubmittedAt: '2026-01-05T00:00:00.000Z' },
      { ...base, id: 'no-report', postSessionSubmittedAt: null },
    ]
    expect(pickPriorSession(candidates, 'stu1', 'men1', 'current')).toBeNull()
  })

  it('picks the candidate with the most recent postSessionSubmittedAt', () => {
    const candidates = [
      {
        ...base,
        id: 'older',
        postSessionSubmittedAt: '2026-01-01T00:00:00.000Z',
        keyInsights: 'older insight',
      },
      {
        ...base,
        id: 'newer',
        postSessionSubmittedAt: '2026-01-10T00:00:00.000Z',
        keyInsights: 'newer insight',
        studentActionables: 'follow up on X',
        status: 'completed',
      },
    ]

    const result = pickPriorSession(candidates, 'stu1', 'men1', 'current')

    expect(result).toEqual({
      keyInsights: 'newer insight',
      studentActionables: 'follow up on X',
      status: 'completed',
      postSessionSubmittedAt: '2026-01-10T00:00:00.000Z',
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/app/dashboard/admin/approvals/lib/fetch-queue-sessions.test.ts`
Expected: FAIL — `fetch-queue-sessions.ts` does not exist yet.

- [ ] **Step 3: Write the implementation**

```ts
// src/app/dashboard/admin/approvals/lib/fetch-queue-sessions.ts
export type SessionInfo = {
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
  rejectionReason: string | null;
  meetLink: string | null;
  preWorkReason: string;
  keyInsights: string | null;
  studentActionables: string | null;
  adminFeedbackNote: string | null;
  postSessionSubmittedAt: string | null;
};

export type PriorSessionInfo = {
  keyInsights: string | null;
  studentActionables: string | null;
  status: string;
  postSessionSubmittedAt: string;
} | null;

const SESSION_SELECT = `
  id, student_id, mentor_id,
  requested_date, requested_start_time, start_time, end_time,
  duration_minutes, actual_duration_minutes, status, rejection_reason, meet_link,
  pre_work_reason, student_actionables, key_insights, admin_feedback_note, post_session_submitted_at,
  student_profiles:profiles!bookings_student_id_fkey(full_name),
  mentor_profiles:profiles!sessions_mentor_id_fkey(full_name)
`;

export function mapSessionRow(row: any): SessionInfo {
  const startTime =
    row.start_time ||
    (row.requested_date
      ? new Date(
          row.requested_date + 'T' + (row.requested_start_time || '00:00:00') + 'Z'
        ).toISOString()
      : new Date().toISOString());

  const studentName =
    row.student_profiles &&
    typeof row.student_profiles === 'object' &&
    'full_name' in row.student_profiles
      ? String(row.student_profiles.full_name || 'Unknown')
      : 'Unknown';

  const mentorName =
    row.mentor_profiles &&
    typeof row.mentor_profiles === 'object' &&
    'full_name' in row.mentor_profiles
      ? String(row.mentor_profiles.full_name || 'Unknown')
      : 'Unknown';

  return {
    id: row.id || '',
    studentId: row.student_id || '',
    mentorId: row.mentor_id || '',
    studentName,
    mentorName,
    startTime,
    endTime: row.end_time || new Date().toISOString(),
    duration: typeof row.duration_minutes === 'number' ? row.duration_minutes : 60,
    actualDurationMinutes:
      typeof row.actual_duration_minutes === 'number' ? row.actual_duration_minutes : null,
    status: row.status || 'scheduled',
    rejectionReason: row.rejection_reason || null,
    meetLink: row.meet_link || null,
    preWorkReason: row.pre_work_reason || '',
    keyInsights: row.key_insights || null,
    studentActionables: row.student_actionables || null,
    adminFeedbackNote: row.admin_feedback_note || null,
    postSessionSubmittedAt: row.post_session_submitted_at || null,
  };
}

export async function fetchSessionsByStatus(
  supabase: any,
  statuses: string[]
): Promise<SessionInfo[]> {
  const { data, error } = await supabase
    .from('sessions')
    .select(SESSION_SELECT)
    .in('status', statuses)
    .order('requested_date', { ascending: false });

  if (error || !data) return [];
  return data.map(mapSessionRow);
}

export async function fetchSessionsWithPostSessionReport(supabase: any): Promise<SessionInfo[]> {
  const { data, error } = await supabase
    .from('sessions')
    .select(SESSION_SELECT)
    .not('post_session_submitted_at', 'is', null)
    .order('post_session_submitted_at', { ascending: false });

  if (error || !data) return [];
  return data.map(mapSessionRow);
}

export function pickPriorSession(
  candidates: SessionInfo[],
  studentId: string,
  mentorId: string,
  excludeSessionId: string
): PriorSessionInfo {
  const match = candidates
    .filter(
      (s) =>
        s.studentId === studentId &&
        s.mentorId === mentorId &&
        s.id !== excludeSessionId &&
        !!s.postSessionSubmittedAt
    )
    .sort(
      (a, b) =>
        new Date(b.postSessionSubmittedAt as string).getTime() -
        new Date(a.postSessionSubmittedAt as string).getTime()
    )[0];

  if (!match) return null;

  return {
    keyInsights: match.keyInsights,
    studentActionables: match.studentActionables,
    status: match.status,
    postSessionSubmittedAt: match.postSessionSubmittedAt as string,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/app/dashboard/admin/approvals/lib/fetch-queue-sessions.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/admin/approvals/lib/fetch-queue-sessions.ts src/app/dashboard/admin/approvals/lib/fetch-queue-sessions.test.ts
git commit -m "feat: extract session-queue data mapping into testable helpers"
```

---

### Task 3: `ExpandableRow` shared component

**Files:**
- Create: `src/components/ui/expandable-row.tsx`

**Interfaces:**
- Produces: `ExpandableRow({ summary, children, defaultExpanded?, className? })` — used by Tasks 6 and 7.

- [ ] **Step 1: Create the component**

```tsx
// src/components/ui/expandable-row.tsx
'use client';

import { useState, type ReactNode, type KeyboardEvent } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

type ExpandableRowProps = {
  summary: ReactNode;
  children: ReactNode;
  defaultExpanded?: boolean;
  className?: string;
};

export function ExpandableRow({
  summary,
  children,
  defaultExpanded = false,
  className,
}: ExpandableRowProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const toggle = () => setExpanded((e) => !e);

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggle();
    }
  };

  return (
    <div
      className={cn(
        'bg-white border border-border/60 rounded-[16px] shadow-sm hover:shadow-md transition-all',
        className
      )}
    >
      <div
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onClick={toggle}
        onKeyDown={handleKeyDown}
        className="flex items-center justify-between gap-3 p-4 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5E55A] rounded-[16px]"
      >
        <div className="flex-1 min-w-0">{summary}</div>
        <ChevronDown
          className={cn(
            'w-4 h-4 text-[#7C8585] flex-shrink-0 transition-transform',
            expanded && 'rotate-180'
          )}
        />
      </div>
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-border/60 pt-3">{children}</div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Manual verification**

No automated test (see Global Constraints); verified in Tasks 6–7 once real queue data is expandable — confirm click-to-expand, chevron rotation, and keyboard activation (Tab to the row, press Enter/Space) work in the browser.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/expandable-row.tsx
git commit -m "feat: add ExpandableRow shared component for progressive disclosure"
```

---

### Task 4: `TagSearchInput` shared component

**Files:**
- Create: `src/components/ui/tag-search-logic.ts`
- Test: `src/components/ui/tag-search-logic.test.ts`
- Create: `src/components/ui/tag-search-input.tsx`

**Interfaces:**
- Produces:
  - `getNameSuggestions(names: string[], query: string, excluding: string[]): string[]`
  - `sessionMatchesTags(studentName: string, mentorName: string, tags: string[]): boolean`
  - `TagSearchInput({ names, selected, onChange, placeholder?, className? })` — used by Task 9.
- Consumes: nothing from earlier tasks.

- [ ] **Step 1: Write the failing tests**

```ts
// src/components/ui/tag-search-logic.test.ts
import { describe, it, expect } from 'vitest'
import { getNameSuggestions, sessionMatchesTags } from './tag-search-logic'

describe('getNameSuggestions', () => {
  const names = ['Alex Student', 'Alexandra Mentor', 'Mo Mentor', 'Alex Student']

  it('returns nothing for an empty query', () => {
    expect(getNameSuggestions(names, '', [])).toEqual([])
  })

  it('matches case-insensitively on substring', () => {
    expect(getNameSuggestions(names, 'alex', [])).toEqual(['Alex Student', 'Alexandra Mentor'])
  })

  it('deduplicates names', () => {
    expect(getNameSuggestions(names, 'Alex Student', [])).toEqual(['Alex Student'])
  })

  it('excludes already-selected names', () => {
    expect(getNameSuggestions(names, 'alex', ['Alex Student'])).toEqual(['Alexandra Mentor'])
  })

  it('caps suggestions at 8', () => {
    const many = Array.from({ length: 12 }, (_, i) => `Match ${i}`)
    expect(getNameSuggestions(many, 'Match', [])).toHaveLength(8)
  })
})

describe('sessionMatchesTags', () => {
  it('matches everything when no tags are selected', () => {
    expect(sessionMatchesTags('Alex Student', 'Mo Mentor', [])).toBe(true)
  })

  it('matches when the student name is selected', () => {
    expect(sessionMatchesTags('Alex Student', 'Mo Mentor', ['Alex Student'])).toBe(true)
  })

  it('matches when the mentor name is selected (OR semantics)', () => {
    expect(sessionMatchesTags('Alex Student', 'Mo Mentor', ['Someone Else', 'Mo Mentor'])).toBe(true)
  })

  it('does not match when neither name is selected', () => {
    expect(sessionMatchesTags('Alex Student', 'Mo Mentor', ['Someone Else'])).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/ui/tag-search-logic.test.ts`
Expected: FAIL — `tag-search-logic.ts` does not exist yet.

- [ ] **Step 3: Write the implementation**

```ts
// src/components/ui/tag-search-logic.ts
export function getNameSuggestions(
  names: string[],
  query: string,
  excluding: string[]
): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const excludeSet = new Set(excluding);
  const unique = Array.from(new Set(names)).filter((n) => !excludeSet.has(n));

  return unique.filter((n) => n.toLowerCase().includes(q)).slice(0, 8);
}

export function sessionMatchesTags(
  studentName: string,
  mentorName: string,
  tags: string[]
): boolean {
  if (tags.length === 0) return true;
  return tags.includes(studentName) || tags.includes(mentorName);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/ui/tag-search-logic.test.ts`
Expected: PASS (9 tests)

- [ ] **Step 5: Build the input component**

```tsx
// src/components/ui/tag-search-input.tsx
'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getNameSuggestions } from './tag-search-logic';

type TagSearchInputProps = {
  names: string[];
  selected: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  className?: string;
};

export function TagSearchInput({
  names,
  selected,
  onChange,
  placeholder,
  className,
}: TagSearchInputProps) {
  const [query, setQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const suggestions = getNameSuggestions(names, query, selected);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addTag = (name: string) => {
    onChange([...selected, name]);
    setQuery('');
    setOpen(false);
  };

  const removeTag = (name: string) => {
    onChange(selected.filter((t) => t !== name));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((i) => Math.min(i + 1, Math.max(suggestions.length - 1, 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (suggestions[highlightedIndex]) addTag(suggestions[highlightedIndex]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    } else if (e.key === 'Backspace' && query === '' && selected.length > 0) {
      removeTag(selected[selected.length - 1]);
    }
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className="flex flex-wrap items-center gap-2 min-h-12 px-3 py-2 bg-white border border-border/60 rounded-[14px] focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary">
        {selected.map((name) => (
          <span
            key={name}
            className="inline-flex items-center gap-1 pl-3 pr-1.5 py-1 rounded-full bg-[#FBF4D7] text-[#0F1919] text-xs font-semibold"
          >
            {name}
            <button
              type="button"
              onClick={() => removeTag(name)}
              aria-label={`Remove ${name}`}
              className="p-0.5 rounded-full hover:bg-[#0F1919]/10"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={selected.length === 0 ? placeholder || 'Search by student or mentor name...' : ''}
          className="flex-1 min-w-[120px] outline-none text-sm text-foreground placeholder:text-[var(--fg-faint)] bg-transparent"
        />
      </div>

      {open && suggestions.length > 0 && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-border/60 rounded-[14px] shadow-md overflow-hidden">
          {suggestions.map((name, i) => (
            <button
              key={name}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => addTag(name)}
              className={cn(
                'w-full text-left px-4 py-2 text-sm text-foreground',
                i === highlightedIndex ? 'bg-[#FBF4D7]' : 'hover:bg-muted'
              )}
            >
              {name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Manual verification**

Verified fully in Task 9 once wired to real session data — confirm typing filters suggestions, clicking/Enter adds a pill, the × removes a pill, Backspace on an empty input removes the last pill, and Escape closes the dropdown.

- [ ] **Step 7: Commit**

```bash
git add src/components/ui/tag-search-logic.ts src/components/ui/tag-search-logic.test.ts src/components/ui/tag-search-input.tsx
git commit -m "feat: add TagSearchInput component with tested filter/match logic"
```

---

### Task 5: Add "Approvals" nav item with pending-count badge

**Files:**
- Modify: `src/app/dashboard/admin/layout.tsx:1-58` (imports + `navItems`), `:60-68` (add count effect), `:132-150` (render badge)

**Interfaces:**
- Consumes: nothing from other tasks (independent).
- Produces: the `/dashboard/admin/approvals` route link that Task 8's page will serve.

- [ ] **Step 1: Add `supabase` to the destructured auth hook**

In `src/app/dashboard/admin/layout.tsx`, change:

```ts
const { user, profile, loading, signOut } = useAuth();
```

to:

```ts
const { user, profile, loading, signOut, supabase } = useAuth();
```

- [ ] **Step 2: Add the nav item**

In the `navItems` array, insert between `Home` and `Sessions`:

```ts
  {
    label: 'Approvals',
    href: '/dashboard/admin/approvals',
    icon: ClipboardCheck,
  },
```

(`ClipboardCheck` is already imported at the top of the file — it was added in an uncommitted edit ahead of this work.)

- [ ] **Step 3: Add pending-count state and fetch**

Add below the existing `collapsed` state declaration:

```ts
  const [approvalsCount, setApprovalsCount] = useState(0);

  useEffect(() => {
    if (!profile || profile.role !== 'admin') return;
    let cancelled = false;

    const fetchApprovalsCount = async () => {
      const [{ count: pendingCount }, { count: reviewCount }] = await Promise.all([
        supabase
          .from('sessions')
          .select('*', { count: 'exact', head: true })
          .in('status', ['pending', 'requested']),
        supabase
          .from('sessions')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'awaiting_post_review'),
      ]);
      if (!cancelled) {
        setApprovalsCount((pendingCount || 0) + (reviewCount || 0));
      }
    };

    fetchApprovalsCount();
    return () => {
      cancelled = true;
    };
  }, [profile, supabase]);
```

- [ ] **Step 4: Render the badge in the nav item**

Replace the nav item render block:

```tsx
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                  isActive
                    ? 'bg-[#F5E6DE] text-[#702327] font-medium'
                    : 'text-muted-foreground hover:bg-secondary'
                }`}
              >
                <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-[#702327]' : 'text-[var(--fg-faint)]'}`} />
                {!collapsed && <span className="text-sm">{item.label}</span>}
              </Link>
```

with:

```tsx
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                  isActive
                    ? 'bg-[#F5E6DE] text-[#702327] font-medium'
                    : 'text-muted-foreground hover:bg-secondary'
                }`}
              >
                <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-[#702327]' : 'text-[var(--fg-faint)]'}`} />
                {!collapsed && (
                  <span className="text-sm flex items-center flex-1 gap-2">
                    {item.label}
                    {item.href === '/dashboard/admin/approvals' && approvalsCount > 0 && (
                      <span className="ml-auto inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-[#FBF7D9] text-[#0F1919] text-[10px] font-semibold border border-[#0F1919]/10">
                        {approvalsCount}
                      </span>
                    )}
                  </span>
                )}
              </Link>
```

- [ ] **Step 5: Manual verification**

Start the dev server (`npm run dev`), sign in as an admin, and confirm: the "Approvals" nav item appears between Home and Sessions with the `ClipboardCheck` icon, it links to `/dashboard/admin/approvals` (a 404 is expected until Task 8 lands — that's fine for this step), and the badge count reflects `pending`/`requested`/`awaiting_post_review` session counts (cross-check against the numbers already shown on the Sessions page filter pills before Task 9 removes them).

- [ ] **Step 6: Commit**

```bash
git add src/app/dashboard/admin/layout.tsx
git commit -m "feat: add Approvals nav item with pending-count badge"
```

---

### Task 6: `PreSessionQueue` component

**Files:**
- Create: `src/app/dashboard/admin/approvals/components/pre-session-queue.tsx`

**Interfaces:**
- Consumes: `fetchSessionsByStatus`, `fetchSessionsWithPostSessionReport`, `pickPriorSession`, `SessionInfo` from `@/app/dashboard/admin/approvals/lib/fetch-queue-sessions` (Task 2); `ExpandableRow` from `@/components/ui/expandable-row` (Task 3); `RejectReasonModal` from `@/components/ui/reject-reason-modal` (existing); `approveBooking`, `rejectBooking` from `@/app/dashboard/admin/actions` (existing).
- Produces: `PreSessionQueue()` — a self-contained component with no required props, used by Task 8.

This ports the "Pending Session Approvals" section (`sessions/page.tsx` lines 416–561) behind `ExpandableRow`, scoped to its own data fetch.

- [ ] **Step 1: Create the component**

```tsx
// src/app/dashboard/admin/approvals/components/pre-session-queue.tsx
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { approveBooking, rejectBooking } from '@/app/dashboard/admin/actions';
import { Clock, Check, X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { StatusBadge } from '@/components/ui/status-badge';
import { ExpandableRow } from '@/components/ui/expandable-row';
import { RejectReasonModal } from '@/components/ui/reject-reason-modal';
import {
  fetchSessionsByStatus,
  fetchSessionsWithPostSessionReport,
  pickPriorSession,
  type SessionInfo,
} from '@/app/dashboard/admin/approvals/lib/fetch-queue-sessions';

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

const formatTime = (d: string) =>
  new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

export function PreSessionQueue() {
  const { supabase } = useAuth();
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [reportHistory, setReportHistory] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );
  const [rejectModalSessionId, setRejectModalSessionId] = useState<string | null>(null);
  const [rejectSubmitting, setRejectSubmitting] = useState(false);
  const [rejectError, setRejectError] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const [pending, history] = await Promise.all([
      fetchSessionsByStatus(supabase, ['pending', 'requested']),
      fetchSessionsWithPostSessionReport(supabase),
    ]);
    setSessions(pending);
    setReportHistory(history);
    setLoading(false);
  };

  const handleApprove = async (sessionId: string) => {
    setActionLoading((prev) => ({ ...prev, [sessionId]: true }));
    setFeedback(null);
    try {
      const res = await approveBooking(sessionId);
      if (res.success) {
        setFeedback({ type: 'success', message: 'Session approved and Google Meet link generated!' });
        await load();
      } else {
        setFeedback({ type: 'error', message: res.error || 'Failed to approve session.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'An error occurred during approval.' });
    } finally {
      setActionLoading((prev) => ({ ...prev, [sessionId]: false }));
    }
  };

  const openRejectModal = (sessionId: string) => {
    setRejectError(null);
    setRejectModalSessionId(sessionId);
  };

  const closeRejectModal = () => {
    if (rejectSubmitting) return;
    setRejectModalSessionId(null);
  };

  const handleConfirmReject = async (reason: string) => {
    const sessionId = rejectModalSessionId;
    if (!sessionId) return;

    setRejectSubmitting(true);
    setFeedback(null);
    setRejectError(null);
    try {
      const res = await rejectBooking(sessionId, reason);
      if (res.success) {
        setFeedback({ type: 'success', message: 'Session request rejected' });
        setRejectModalSessionId(null);
        await load();
      } else {
        setRejectError(res.error || 'Failed to reject session.');
      }
    } catch (err: any) {
      setRejectError(err.message || 'An error occurred during rejection.');
    } finally {
      setRejectSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-base font-semibold text-foreground">Pre-session · {sessions.length}</h2>

      {feedback && (
        <div
          className={`p-3 rounded-xl flex items-center gap-2 text-sm ${
            feedback.type === 'success'
              ? 'bg-success-bg text-success border border-success'
              : 'bg-[#F5E6DE] text-destructive border border-destructive'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
          )}
          <p className="font-medium">{feedback.message}</p>
        </div>
      )}

      {sessions.length === 0 ? (
        <div className="py-12 text-center">
          <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
            <Clock className="w-6 h-6 text-[var(--fg-faint)]" />
          </div>
          <p className="text-sm text-muted-foreground">No sessions waiting on pre-session approval.</p>
        </div>
      ) : (
        sessions.map((session) => {
          const isLoading = actionLoading[session.id] || false;
          const priorSession = pickPriorSession(
            reportHistory,
            session.studentId,
            session.mentorId,
            session.id
          );

          return (
            <ExpandableRow
              key={session.id}
              summary={
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-[12px] bg-warning-bg text-warning flex items-center justify-center flex-shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {session.studentName}{' '}
                      <span className="font-normal text-muted-foreground">→</span> {session.mentorName}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDate(session.startTime)} · {formatTime(session.startTime)}
                    </p>
                  </div>
                </div>
              }
            >
              <div className="flex items-center gap-2 justify-end">
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
                      {priorSession.studentActionables || (
                        <span className="text-muted-foreground">Not recorded</span>
                      )}
                    </p>
                  </div>
                </div>
              )}
            </ExpandableRow>
          );
        })
      )}

      <RejectReasonModal
        open={rejectModalSessionId !== null}
        onOpenChange={(open) => {
          if (!open) closeRejectModal();
        }}
        onConfirm={handleConfirmReject}
        submitting={rejectSubmitting}
        error={rejectError}
      />
    </div>
  );
}
```

- [ ] **Step 2: Manual verification**

Requires Task 8's page to render it (a bare component has nowhere to mount yet) — deferred to Task 8's verification step, where approve/reject/expand are all exercised together.

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/admin/approvals/components/pre-session-queue.tsx
git commit -m "feat: add PreSessionQueue component for the Approvals page"
```

---

### Task 7: `PostSessionQueue` component

**Files:**
- Create: `src/app/dashboard/admin/approvals/components/post-session-queue.tsx`

**Interfaces:**
- Consumes: `fetchSessionsByStatus`, `SessionInfo` from `@/app/dashboard/admin/approvals/lib/fetch-queue-sessions` (Task 2); `ExpandableRow` (Task 3); `RevisionReasonModal` (existing); `approvePostSession`, `sendSessionForRevision` from `@/app/dashboard/admin/actions` (existing).
- Produces: `PostSessionQueue()` — used by Task 8.

This ports the "Post-Session Review" section (`sessions/page.tsx` lines 563–660) behind `ExpandableRow`.

- [ ] **Step 1: Create the component**

```tsx
// src/app/dashboard/admin/approvals/components/post-session-queue.tsx
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { approvePostSession, sendSessionForRevision } from '@/app/dashboard/admin/actions';
import { BookOpen, Check, RotateCcw, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { ExpandableRow } from '@/components/ui/expandable-row';
import { RevisionReasonModal } from '@/components/ui/revision-reason-modal';
import {
  fetchSessionsByStatus,
  type SessionInfo,
} from '@/app/dashboard/admin/approvals/lib/fetch-queue-sessions';

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

export function PostSessionQueue() {
  const { supabase, profile } = useAuth();
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );
  const [reviseModalSessionId, setReviseModalSessionId] = useState<string | null>(null);
  const [reviseSubmitting, setReviseSubmitting] = useState(false);
  const [reviseError, setReviseError] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const data = await fetchSessionsByStatus(supabase, ['awaiting_post_review']);
    setSessions(data);
    setLoading(false);
  };

  const handleApprovePostSession = async (sessionId: string) => {
    setActionLoading((prev) => ({ ...prev, [sessionId]: true }));
    setFeedback(null);
    try {
      const res = await approvePostSession(sessionId);
      if (res.success) {
        setFeedback({ type: 'success', message: 'Session approved and marked completed.' });
        await load();
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
        await load();
      } else {
        setReviseError(res.error || 'Failed to send session for revision.');
      }
    } catch (err: any) {
      setReviseError(err.message || 'An error occurred while sending for revision.');
    } finally {
      setReviseSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-base font-semibold text-foreground">Post-session · {sessions.length}</h2>

      {feedback && (
        <div
          className={`p-3 rounded-xl flex items-center gap-2 text-sm ${
            feedback.type === 'success'
              ? 'bg-success-bg text-success border border-success'
              : 'bg-[#F5E6DE] text-destructive border border-destructive'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
          )}
          <p className="font-medium">{feedback.message}</p>
        </div>
      )}

      {sessions.length === 0 ? (
        <div className="py-12 text-center">
          <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
            <BookOpen className="w-6 h-6 text-[var(--fg-faint)]" />
          </div>
          <p className="text-sm text-muted-foreground">No session reports waiting on review.</p>
        </div>
      ) : (
        sessions.map((session) => {
          const isLoading = actionLoading[session.id] || false;
          return (
            <ExpandableRow
              key={session.id}
              summary={
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-[12px] bg-[#FBF7D9] text-[#0F1919] flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {session.mentorName}{' '}
                      <span className="font-normal text-muted-foreground">→</span> {session.studentName}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDate(session.startTime)}
                      {session.actualDurationMinutes != null
                        ? ` · ${session.actualDurationMinutes} min`
                        : ''}
                    </p>
                  </div>
                </div>
              }
            >
              <div className="flex items-center gap-2 justify-end">
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

              <div className="space-y-2">
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
            </ExpandableRow>
          );
        })
      )}

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

- [ ] **Step 2: Manual verification**

Deferred to Task 8, alongside `PreSessionQueue`.

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/admin/approvals/components/post-session-queue.tsx
git commit -m "feat: add PostSessionQueue component for the Approvals page"
```

---

### Task 8: Approvals page (split-view + mobile toggle)

**Files:**
- Create: `src/app/dashboard/admin/approvals/page.tsx`

**Interfaces:**
- Consumes: `useMediaQuery` (Task 1), `PreSessionQueue` (Task 6), `PostSessionQueue` (Task 7).
- Produces: the `/dashboard/admin/approvals` route.

- [ ] **Step 1: Create the page**

```tsx
// src/app/dashboard/admin/approvals/page.tsx
'use client';

import { useState } from 'react';
import { ClipboardCheck } from 'lucide-react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { PreSessionQueue } from './components/pre-session-queue';
import { PostSessionQueue } from './components/post-session-queue';

export default function ApprovalsPage() {
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const [activeTab, setActiveTab] = useState<'pre' | 'post'>('pre');

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-[20px] border border-border/60 shadow-sm p-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center">
            <ClipboardCheck className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-[28px] font-bold text-foreground">Approvals</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Review and act on pre-session requests and submitted session reports
            </p>
          </div>
        </div>
      </div>

      {!isDesktop && (
        <div className="inline-flex p-1 bg-[#FBF4D7] rounded-full">
          <button
            onClick={() => setActiveTab('pre')}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              activeTab === 'pre' ? 'bg-[#0F1919] text-[#FFFBF3]' : 'text-[#4A5454]'
            }`}
          >
            Pre-session
          </button>
          <button
            onClick={() => setActiveTab('post')}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              activeTab === 'post' ? 'bg-[#0F1919] text-[#FFFBF3]' : 'text-[#4A5454]'
            }`}
          >
            Post-session
          </button>
        </div>
      )}

      {isDesktop ? (
        <div className="grid grid-cols-2 gap-6 items-start">
          <div className="max-h-[calc(100vh-260px)] overflow-y-auto pr-1">
            <PreSessionQueue />
          </div>
          <div className="max-h-[calc(100vh-260px)] overflow-y-auto pr-1">
            <PostSessionQueue />
          </div>
        </div>
      ) : activeTab === 'pre' ? (
        <PreSessionQueue />
      ) : (
        <PostSessionQueue />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Manual verification in the browser**

Run `npm run dev`, sign in as admin, navigate to Approvals (nav item from Task 5 now resolves):
- **Desktop width (≥768px):** both columns render side by side, each independently scrollable if long.
- **Narrow the window below 768px:** the split-view is replaced by the Pre-session/Post-session segmented toggle; only the active queue's component is mounted (open React DevTools or Network tab and confirm the inactive queue's Supabase call isn't firing while it's not the active tab).
- **Pre-session queue:** expand a row, confirm prior-session context (if any) shows, Approve creates a Meet link and removes the row, Reject requires a reason and removes the row on submit.
- **Post-session queue:** expand a row, confirm key insights/actionables render, Approve marks it completed, "Send back for revision" requires a reason.
- **Nav badge:** confirm the Approvals badge count decreases as items are approved/rejected/revised.

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/admin/approvals/page.tsx
git commit -m "feat: add Approvals page with desktop split-view and mobile toggle"
```

---

### Task 9: Rework Sessions page to a flat, read-only, tag-searchable log

**Files:**
- Modify: `src/app/dashboard/admin/sessions/page.tsx` (full rewrite of the render logic; the `fetchSessions` data-fetch body at lines 89–172 is kept byte-for-byte, per Global Constraints)

**Interfaces:**
- Consumes: `TagSearchInput` (Task 4), `sessionMatchesTags` (Task 4).
- Produces: nothing consumed by later tasks (terminal task).

- [ ] **Step 1: Replace the file**

```tsx
// src/app/dashboard/admin/sessions/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Clock, Loader2, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TagSearchInput } from '@/components/ui/tag-search-input';
import { sessionMatchesTags } from '@/components/ui/tag-search-logic';

const ITEMS_PER_PAGE = 10;

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

export default function AdminSessions() {
  const { supabase, loading: authLoading } = useAuth();
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (!authLoading) fetchSessions();
  }, [authLoading]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedTags]);

  const fetchSessions = async () => {
    try {
      // Try new sessions table first, fall back to legacy bookings view
      let sessionsList: any[] | null = null
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

      if (!sessErr && sessData) {
        sessionsList = sessData.map((s: any) => ({
          ...s,
          start_time: s.start_time || (s.requested_date ? new Date(s.requested_date + 'T' + (s.requested_start_time || '00:00:00') + 'Z').toISOString() : null),
          mentor_profiles: s.mentor_profiles ? { profiles: s.mentor_profiles } : null,
        }))
      } else {
        const { data: legacyData } = await supabase
          .from('bookings')
          .select(`
            id, student_id, mentor_id, start_time, end_time, duration_minutes,
            status, rejection_reason, meet_link,
            student_profiles:profiles!bookings_student_id_fkey(full_name),
            mentor_profiles:mentors(profiles(full_name))
          `)
          .order('start_time', { ascending: false })
        sessionsList = legacyData
      }

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
          })
        );
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const now = new Date();

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

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

  const formatTime = (d: string) =>
    new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  const allNames = Array.from(
    new Set(sessions.flatMap((s) => [s.studentName, s.mentorName]))
  ).sort();

  const filteredSessions = sessions.filter((session) =>
    sessionMatchesTags(session.studentName, session.mentorName, selectedTags)
  );

  const getCurrentPageData = (data: SessionInfo[]) => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return data.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  };

  const totalPages = Math.max(1, Math.ceil(filteredSessions.length / ITEMS_PER_PAGE));
  const paginatedSessions = getCurrentPageData(filteredSessions);

  const renderStatus = (session: SessionInfo) => {
    const state = getSessionState(session);
    switch (state) {
      case 'pending':
        return (
          <StatusBadge variant="pending" size="sm">
            Pending approval
          </StatusBadge>
        );
      case 'awaiting_post_review':
        return (
          <StatusBadge variant="pending" size="sm">
            Awaiting review
          </StatusBadge>
        );
      case 'live':
        return (
          <StatusBadge variant="live" size="sm" pulse>
            Live now
          </StatusBadge>
        );
      case 'upcoming':
        return (
          <StatusBadge variant="upcoming" size="sm">
            Scheduled
          </StatusBadge>
        );
      case 'completed':
        return (
          <StatusBadge variant="completed" size="sm">
            Completed
          </StatusBadge>
        );
      case 'rejected':
        return (
          <StatusBadge variant="rejected" size="sm">
            Rejected
          </StatusBadge>
        );
      case 'revise':
        return (
          <StatusBadge variant="revise" size="sm">
            Needs revision
          </StatusBadge>
        );
      default:
        return (
          <StatusBadge variant="info" size="sm">
            {state}
          </StatusBadge>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-[20px] border border-border/60 shadow-sm p-6">
        <div className="flex items-center gap-4 mb-2">
          <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center">
            <Calendar className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-[28px] font-bold text-foreground">Sessions</h1>
            <p className="text-muted-foreground text-sm mt-1">
              A read-only log of every session. Approve or review sessions from Approvals.
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <TagSearchInput
        names={allNames}
        selected={selectedTags}
        onChange={setSelectedTags}
        placeholder="Search by student or mentor name..."
      />

      {/* Sessions table */}
      <Card className="border-border/60 shadow-sm rounded-[20px]">
        <CardHeader className="pb-4 border-b border-border/80">
          <CardTitle className="text-lg font-semibold text-foreground">
            All Sessions{' '}
            <span className="text-muted-foreground font-normal">({filteredSessions.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredSessions.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-[var(--fg-faint)]" />
              </div>
              <p className="text-muted-foreground">No sessions found</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="bg-background hover:bg-background border-b border-border/80">
                    <TableHead className="text-muted-foreground font-semibold text-sm">
                      Student / Mentor
                    </TableHead>
                    <TableHead className="text-muted-foreground font-semibold text-sm">
                      Date & Time
                    </TableHead>
                    <TableHead className="text-muted-foreground font-semibold text-sm">
                      Duration
                    </TableHead>
                    <TableHead className="text-muted-foreground font-semibold text-sm text-right">
                      Status
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedSessions.map((session) => (
                    <TableRow
                      key={session.id}
                      className="hover:bg-background border-b border-border/60 last:border-0"
                    >
                      <TableCell>
                        <p className="text-sm font-semibold text-foreground">{session.studentName}</p>
                        <p className="text-xs text-[var(--fg-faint)] mt-0.5">with {session.mentorName}</p>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-[var(--fg-faint)]" />
                          <div>
                            <div className="font-medium">{formatDate(session.startTime)}</div>
                            <div className="text-xs text-[var(--fg-faint)] mt-0.5">
                              {formatTime(session.startTime)} – {formatTime(session.endTime)}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted text-muted-foreground rounded-[10px] text-xs font-medium">
                          <Clock className="w-3 h-3" />
                          {session.duration} min
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{renderStatus(session)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between p-6 border-t border-border/80">
                  <p className="text-sm text-muted-foreground">
                    Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
                    {Math.min(currentPage * ITEMS_PER_PAGE, filteredSessions.length)} of{' '}
                    {filteredSessions.length} sessions
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-muted-foreground bg-white border border-border/60 rounded-[14px] hover:bg-background disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`w-10 h-10 text-sm font-medium rounded-[14px] transition-colors ${
                            currentPage === page
                              ? 'bg-[#0F1919] text-[#FFFBF3]'
                              : 'text-muted-foreground'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-muted-foreground bg-white border border-border/60 rounded-[14px] hover:bg-background disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
    </div>
  );
}
```

- [ ] **Step 2: Manual verification in the browser**

With `npm run dev` running and signed in as admin, go to Sessions and confirm:
- All sessions (every status) appear in one flat, paginated table — no sub-tabs, no status filter pills, no approve/reject/revise buttons anywhere on this page.
- Typing a partial name shows an autocomplete dropdown; selecting one adds a removable pill and filters the table to sessions involving that person.
- Adding a second, different-person tag broadens the results (OR match) rather than narrowing to zero.
- Removing all tags (via × or Backspace) restores the full list.
- A session that was just approved/rejected/reviewed on the Approvals page (Task 8) shows its updated status here after a refresh.

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/admin/sessions/page.tsx
git commit -m "refactor: rework Sessions page into a flat read-only tag-searchable log"
```

---

## Self-Review Notes

- **Spec coverage:** nav item + badge (Task 5) ✓; split-view + mobile toggle (Task 8) ✓; expandable rows (Tasks 3, 6, 7) ✓; flat read-only Sessions + tag search (Task 9) ✓; `sessions`-table-only queries in all new code (Tasks 2, 6, 7 — no `bookings` fallback) ✓; legacy fallback left untouched (Task 9 keeps it verbatim) ✓.
- **Placeholder scan:** none — every step ships real, complete code.
- **Type consistency:** `SessionInfo` is defined once in Task 2 and imported (not redefined) by Tasks 6 and 7; Task 9 keeps its own local `SessionInfo` copy since it intentionally does not depend on Task 2's `sessions`-only fetch (it still needs the legacy-fallback-compatible shape) — this is a deliberate duplication, not a drift risk, since the two fetch paths are genuinely different (Task 9 keeps the `bookings` fallback, Task 2's helpers don't).
