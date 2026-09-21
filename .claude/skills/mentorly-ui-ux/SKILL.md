---
name: mentorly-ui-ux
description: Design system and UX principles for the Mentorly mentorship platform (student/mentor/admin dashboards), now rebranded to Mesa School of Business's real institutional brand. Use this whenever drafting a build prompt, reviewing a UI change, or writing implementation instructions for any Mentorly screen — booking modals, admin review queues, dashboards, tables, forms, status displays. Captures the Mesa brand tokens as adapted for a dense operational dashboard (not the marketing-site treatment), plus a UX heuristics checklist for admin/review workflows. Always consult this before writing UI instructions for Mentorly, even for small additions to existing screens.
---

# Mentorly Design System & UX Principles
## (Mesa School of Business brand, adapted for dashboard use)

Mentorly now uses Mesa School of Business's real brand — sourced from their
UG program brand book, not a generic template. The tokens below are that
brand's actual palette/type/spacing, **adapted for a data-dense operations
dashboard** rather than applied as the marketing-site treatment it was
originally designed for. When in doubt, follow the adaptation rules here
over the raw brand book, since the brand book was written for
mesaschool.co's public site, not this app.

## 0. Critical: this is not the marketing site
The source design system includes marketing-site components (Hero,
CaseStudy, Pillars, StatBand, Admissions, ApplyModal, Footer, Nav). **None
of these belong in Mentorly.** Only the tokens (color, type, spacing, radii,
shadows) transfer — the components do not. If a future prompt or a coding
agent suggests using one of these components, that's a sign the rebrand has
drifted out of scope.

## 1. Design tokens (Mesa brand, real values)

**Color**
| Role | Value | Used for |
|---|---|---|
| Page background | `#FFFBF3` Ivory Whisper | Default canvas — warm off-white, not pure white |
| Card surface | `#FFFFFF` | Raised cards, modals — pure white reserved for elevation |
| Alt surface | `#FBF4D7` Cream Butter | Secondary sections, and the "positive" status tint (see below) |
| Primary text | `#0F1919` Deep Teal Black | Headings, body text, primary button fill |
| Muted text | `#4A5454` | Subtitles, secondary text |
| Faint text | `#7C8585` | Captions, timestamps |
| Accent / destructive | `#BA3B41` Crimson Brick | **Destructive actions only** in this app (see §3 — the brand uses this as its one universal accent, but a dashboard needs primary/destructive separated) |
| Accent hover | `#A8343A` | Hover state on crimson elements |
| Accent pressed | `#702327` Dark Maroon | Pressed state; also used in status-badge text (see §4) |
| Highlight | `#E5E55A` Lemon Yellow | "Attention/pending" status tint, focus rings |
| Soft fill | `#DFA396` Peach Beige | "Needs another pass" status tint |
| Border | `#E8E1D2` | Hairline dividers and card edges — warm, never gray-blue |

**Type**
- Body/UI font: **Manrope** (loaded from Google Fonts) — this is used for
  essentially everything in the dashboard: labels, table content, buttons,
  badges, form fields, nav items, card body text
- Display font: **Newsreader** (substitute for the brand's "New York" serif)
  — reserved **only** for top-level page titles ("Dashboard," "Sessions,"
  "Payments"). Never use it on dense/functional UI — it hurts scannability
  in queues and tables, and the brand book itself specifies UI labels sit
  in Manrope Semibold/Bold, not the serif.
- No ALL-CAPS body text; eyebrows/labels may use tracked uppercase sparingly
  per brand voice, but not for anything read repeatedly (table headers stay
  sentence case).

**Shape & spacing**
- Card radius: 12–20px (brand's `--r-md`/`--r-lg`), a step larger than a
  typical SaaS default — apply consistently across all cards
- Buttons, badges, tags: full pill radius (999px) — this is a defining
  brand motif, use it everywhere a button or badge appears
- Spacing: 8px base grid (4/8/12/16/24/32/48px range for dashboard use —
  the brand's larger values like 96/128px are marketing-hero-scale, not
  for functional screens)
- Shadows: soft, warm-tinted (teal-black at low opacity, never pure black)
  — brand provides sm/md/lg steps, use `sm` for cards at rest, `md` on hover
  where relevant
- Borders: warm hairline (`#E8E1D2`), 1px, not gray

## 2. Component patterns already established — reuse, don't reinvent

**Sidebar nav**: fixed left sidebar, logo + app name top, nav items with icon
+ label, active item gets a Cream Butter tinted background + Deep Teal Black
text. Keep this for any new top-level tab.

**Segmented tab control**: used today for Sessions (Upcoming / Pending Review
/ History) and mentor dashboards. This is the correct pattern for any new
grouped view — e.g., an admin Sessions queue with Pre-session / Post-session
/ Scheduled / History should use this exact same underlined-tab style, not a
dropdown, not a sidebar sub-nav, not pills.

**Dashboard metric cards**: icon in a soft tinted circle (top-left) + large
number + muted label underneath, 3-5 across in a row. Use this for any new
KPI row.

**Queue/list item cards**: white card, person's name bold, context line
muted below it (date/time/details), primary action button(s) right-aligned.
This is the pattern in "Pending Session Approvals" and "Mark as Completed" —
reuse it for any new admin review item.

**Modals**: centered white card, clear title, close (×) top-right, form
fields stacked with labels above inputs, footer with Cancel (text/ghost) +
primary action (solid blue) right-aligned.

**Empty states**: centered muted icon, one calm sentence explaining the
state ("No upcoming sessions. Students can book you based on your
availability.") — informative, not alarming, tells the person what would
change this.

**Inline advisory banners**: soft yellow/amber background, icon + one
sentence, used today for "No previous session note found for this
mentor-student pairing." Reuse this exact treatment for any new inline
contextual warning or hint — don't introduce a new banner style.

## 3. Action color semantics — the brand doesn't define these, this app does

The Mesa brand book has exactly one accent color, built for a marketing
site where every CTA points the same direction ("Apply now"). A dashboard
needs primary and destructive actions to be visually distinct from each
other on the same screen. Use this mapping everywhere:

- **Primary/affirmative actions** (Approve, Save, Submit, Confirm) → solid
  Deep Teal Black fill, Ivory Whisper text. This is the app's true "go"
  color — not Crimson.
- **Destructive actions** (Reject, Delete, Revoke) → solid Crimson Brick
  fill, white text. Conveniently, red already reads as "danger" by
  convention, so this also matches how people will intuitively read it.
- **Never use the same color for both on one screen** — this was the exact
  gap that would've made Approve and Reject buttons indistinguishable.

## 4. Status badge colors (soft/tinted pills only, never solid)

| Status | Background | Text |
|---|---|---|
| Requested / Awaiting / Unapproved | pale Lemon Yellow tint | Deep Teal Black |
| Scheduled / Completed / Approved | Cream Butter | Deep Teal Black |
| Rejected | pale Crimson tint | Dark Maroon |
| Revise | Peach Beige | Dark Maroon |

## 5. UX heuristics checklist — apply to every admin/review screen

- **Hick's Law**: don't add a new top-level nav item if an existing tab or
  sub-tab can hold it. Prefer segmented sub-tabs over new sidebar entries.
- **Visibility of system status**: any count that matters (pending, awaiting
  review, active) should be visible as a badge/number without clicking in —
  matches the existing `(1)` counters on tab labels.
- **Recognition over recall**: if a decision needs context that already
  exists elsewhere in the system (e.g. a prior session's actionables), show
  it inline at decision time. Never make the person go find it themselves.
- **Error prevention over error messages**: gate irreversible or
  consequential actions (reject, revise) behind a required reason field —
  disable the submit button until it's filled, rather than accepting the
  action and showing a validation error after.
- **Consistency**: a new screen should look like it shipped in the same
  release as the rest of the app. If you're about to invent a new color,
  new card style, or new spacing value, stop and check this doc first.
- **Progressive disclosure**: default to collapsed/summary views (a request
  card, not a full-page form) with an expand-on-demand for full detail,
  matching the compact style already used in the Sessions queue.
- **Accessibility floor, non-negotiable**: visible keyboard focus ring on
  all interactive elements, sufficient text contrast, fully responsive down
  to mobile width, respects `prefers-reduced-motion`.

## 6. Writing & copy rules

Mesa's own brand voice guidance applies here too: direct "you," confident,
concrete over vague, sentence case, no emoji. In addition:

- Buttons say exactly what happens: "Approve session," "Send back for
  revision" — not "Submit" or "Confirm."
- A button's label and the resulting confirmation/toast use the same verb:
  "Approve session" → "Session approved."
- Errors are direct and non-apologetic, and say what to do next: "This
  session needs a rejection reason before it can be declined" — not "Oops,
  something went wrong!"
- Empty states are an invitation, not a dead end: say what would populate
  this view.

## 7. Before shipping any new screen — quick self-check

1. Does every color used trace back to the token table above — and if it's
   a status or action color, does it follow §3/§4 exactly?
2. Is the serif font touching anything other than a top-level page title?
   If yes, fix it.
3. Is there a segmented-tab or card pattern already in the app that this
   screen should be reusing instead of introducing something new?
4. Does every consequential action (reject/revise/approve) require
   confirmation or a reason where the spec calls for one?
5. Do all counts/badges update live, and does every list have a real empty
   state (not a blank white box)?
6. Keyboard-navigable and responsive at mobile width?
7. Nothing from `ui_kits/website/components/` snuck in?
