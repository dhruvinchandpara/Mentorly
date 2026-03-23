# Mentorly Design System Documentation

**Version:** 1.0
**Last Updated:** March 18, 2026

---

## Table of Contents
1. [Design Philosophy](#design-philosophy)
2. [Color Palette](#color-palette)
3. [Typography](#typography)
4. [Components](#components)
5. [Animations](#animations)
6. [Usage Guidelines](#usage-guidelines)

---

## Design Philosophy

### User Personas

**Students (18-25 years)**
- Modern, tech-savvy, aspirational
- Value: Clear information, easy booking, affordable pricing
- Design needs: Clean, approachable, energetic

**Mentors (30-50 years)**
- Professional, experienced, time-conscious
- Value: Efficiency, clear earnings tracking, simple scheduling
- Design needs: Professional, trustworthy, straightforward

**Design Balance**
- **Professionalism**: Establishes trust and credibility
- **Approachability**: Makes the platform welcoming for students
- **Clarity**: Information is easy to find and understand
- **Energy**: Subtle animations create engagement without distraction

---

## Color Palette

### Primary - Trustworthy Blue
Professional, reliable, and approachable. Used for primary actions and brand elements.

```
blue-50:  #eff6ff  (Backgrounds)
blue-100: #dbeafe  (Light backgrounds)
blue-500: #3b82f6  (Brand color)
blue-600: #2563eb  (Primary buttons, links) ✨ Main
blue-700: #1d4ed8  (Hover states)
```

**Usage:**
- Primary buttons and CTAs
- Links and interactive elements
- Brand logo and headers
- Status: "Upcoming" sessions

### Success - Emerald Green
Achievements, completed actions, positive feedback.

```
emerald-50:  #ecfdf5
emerald-100: #d1fae5
emerald-600: #059669  ✨ Main
emerald-700: #047857
```

**Usage:**
- "Completed" status badges
- Success messages
- Earnings/revenue indicators
- Positive trends

### Warning - Amber
Attention needed, pending actions.

```
amber-50:  #fffbeb
amber-100: #fef3c7
amber-600: #d97706  ✨ Main
amber-700: #b45309
```

**Usage:**
- "Pending" status badges
- Needs review indicators
- Important notifications

### Danger/Urgent - Red
Critical actions, live sessions, errors.

```
red-50:  #fef2f2
red-100: #fee2e2
red-600: #dc2626  ✨ Main
red-700: #b91c1c
```

**Usage:**
- "Live Now" status
- Error messages
- Delete/cancel actions
- Urgent notifications

### Neutral - Slate
Backgrounds, text, borders.

```
slate-50:  #f8fafc  (Page background)
slate-100: #f1f5f9  (Card background)
slate-200: #e2e8f0  (Borders)
slate-600: #475569  (Secondary text)
slate-900: #0f172a  (Primary text)
```

### Accent - Purple
Premium features, special highlights.

```
purple-500: #a855f7
purple-600: #9333ea  ✨ Main
```

**Usage:**
- Gradient text highlights
- Premium badges
- Special promotions

---

## Typography

### Font Families
```css
Primary: Geist Sans (or system fallback)
Monospace: Geist Mono
```

### Scale

| Name  | Size | Line Height | Letter Spacing | Usage |
|-------|------|-------------|----------------|-------|
| xs    | 12px | 16px | 0.025em | Captions, small labels |
| sm    | 14px | 20px | 0.01em  | Body text (secondary) |
| base  | 16px | 24px | 0       | Body text (primary) |
| lg    | 18px | 28px | -0.01em | Large body, subheadings |
| xl    | 20px | 28px | -0.01em | Card titles |
| 2xl   | 24px | 32px | -0.02em | Section headings |
| 3xl   | 30px | 36px | -0.02em | Page titles |
| 4xl   | 36px | 40px | -0.03em | Hero subheadings |
| 5xl   | 48px | 48px | -0.03em | Hero headings |
| 6xl   | 60px | 60px | -0.04em | Landing page hero |

### Font Weights
```
Normal:    400  (Body text)
Medium:    500  (Subtle emphasis)
Semibold:  600  (Buttons, labels)
Bold:      700  (Headings)
Extrabold: 800  (Hero text)
```

### Hierarchy Examples

**Page Title**
```tsx
<h1 className="text-3xl font-bold tracking-tight text-slate-900">
  Welcome, John
</h1>
```

**Section Heading**
```tsx
<h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
  <Icon className="w-5 h-5 text-blue-500" />
  My Bookings
</h2>
```

**Body Text**
```tsx
<p className="text-sm text-slate-600">
  Your session is scheduled for tomorrow at 2:00 PM
</p>
```

---

## Components

### 1. Buttons

#### Variants

**Primary** - Main actions
```tsx
<button className="px-6 py-3 gradient-primary text-white rounded-xl font-semibold shadow-lg shadow-blue-500/20 hover:shadow-xl hover:-translate-y-0.5 transition-all">
  Get Started
</button>
```

**Secondary** - Alternative actions
```tsx
<button className="px-6 py-3 bg-white border-2 border-slate-200 text-slate-900 rounded-xl font-semibold hover:border-blue-300 hover:shadow-lg transition-all">
  Learn More
</button>
```

**Success** - Positive actions (e.g., "Mark Complete")
```tsx
<button className="px-4 py-2 gradient-success text-white rounded-xl font-semibold shadow-sm shadow-emerald-500/20 hover:shadow-lg transition-all">
  <CheckCircle2 className="w-4 h-4" />
  Mark as Completed
</button>
```

**Ghost** - Subtle actions
```tsx
<button className="px-4 py-2 hover:bg-slate-100 text-slate-700 rounded-lg font-medium transition-all">
  Cancel
</button>
```

#### Sizes
- **sm**: `h-8 px-3 text-xs rounded-lg`
- **md**: `h-10 px-4 text-sm rounded-xl` (default)
- **lg**: `h-12 px-6 text-base rounded-xl`
- **xl**: `h-14 px-8 text-lg rounded-2xl`

### 2. Status Badges

**Usage:** Display session status, mentor status, etc.

```tsx
import { StatusBadge } from '@/components/ui/status-badge';

// Active mentor
<StatusBadge variant="active">Active</StatusBadge>

// Pending approval
<StatusBadge variant="pending">Pending Approval</StatusBadge>

// Live session (with pulse animation)
<StatusBadge variant="live" pulse>Live Now</StatusBadge>

// Completed session
<StatusBadge variant="completed">Completed</StatusBadge>

// Upcoming session
<StatusBadge variant="upcoming">
  <Clock className="w-3.5 h-3.5" />
  Upcoming
</StatusBadge>
```

**Available Variants:**
- `active` - Green (for active mentors)
- `pending` - Amber (needs attention)
- `inactive` - Gray (inactive state)
- `live` - Red with pulse (ongoing session)
- `completed` - Green (finished)
- `cancelled` - Gray
- `upcoming` - Blue

### 3. Stat Cards

**Usage:** Display metrics on dashboards

```tsx
import { StatCard, StatGrid } from '@/components/ui/stat-card';
import { Calendar, TrendingUp } from 'lucide-react';

<StatGrid>
  <StatCard
    title="Upcoming Sessions"
    value="5"
    subtitle="This week"
    icon={Calendar}
    variant="default"
  />

  <StatCard
    title="Total Earned"
    value="₹12,500"
    subtitle="Last 30 days"
    icon={TrendingUp}
    variant="success"
    trend={{ value: 15, label: "vs last month" }}
  />
</StatGrid>
```

**Variants:**
- `default` - White card with colored icon
- `success` - Green gradient (for earnings)
- `warning` - Amber gradient
- `danger` - Red gradient
- `info` - Blue gradient

### 4. Cards

**Base Card**
```tsx
<div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
  {/* Content */}
</div>
```

**Interactive Card** (with hover effect)
```tsx
<HoverCard>
  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg transition-shadow p-6">
    {/* Content */}
  </div>
</HoverCard>
```

**Glass Card** (semi-transparent)
```tsx
<div className="glass rounded-2xl p-6">
  {/* Content */}
</div>
```

### 5. Inputs

**Text Input**
```tsx
<input
  type="text"
  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus-ring transition-all"
  placeholder="Enter your email"
/>
```

**Textarea**
```tsx
<textarea
  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus-ring resize-none"
  rows={4}
  placeholder="Tell us about yourself"
/>
```

---

## Animations

### Page Load Animations

**Fade Up** (default for sections)
```tsx
import { AnimatedSection } from '@/components/ui/animated-section';

<AnimatedSection animation="fadeUp" delay={0.1}>
  <h2>Animated Heading</h2>
</AnimatedSection>
```

**Stagger Children** (for lists/grids)
```tsx
import { StaggerContainer, StaggerItem } from '@/components/ui/animated-section';

<StaggerContainer staggerDelay={0.1}>
  <StaggerItem>Item 1</StaggerItem>
  <StaggerItem>Item 2</StaggerItem>
  <StaggerItem>Item 3</StaggerItem>
</StaggerContainer>
```

### Hover Animations

**Lift on Hover**
```tsx
<HoverCard>
  <div className="...">Content</div>
</HoverCard>
```

**Scale on Hover**
```tsx
<ScaleOnHover>
  <button>Hover Me</button>
</ScaleOnHover>
```

### Custom Animations

**Pulse Glow** (for live indicators)
```css
.animate-pulse-glow
```

**Shimmer** (for loading states)
```css
.animate-shimmer
```

**Gradient Shift** (for backgrounds)
```css
.animate-gradient
```

---

## Usage Guidelines

### Spacing System
Based on 4px increments:
```
0.5 = 2px
1   = 4px
2   = 8px
3   = 12px
4   = 16px  ✨ Default gap
6   = 24px  ✨ Section spacing
8   = 32px
12  = 48px
```

### Border Radius
```
sm   = 4px   (small elements)
md   = 8px   (inputs)
lg   = 12px  (badges)
xl   = 16px  (buttons, cards)
2xl  = 20px  (large cards)
3xl  = 24px  (feature cards)
full = 9999px (pills)
```

### Shadows

**Elevation System:**
```css
/* Resting state */
shadow-sm

/* Hover state */
shadow-md

/* Elevated cards */
shadow-lg

/* Modals, dropdowns */
shadow-xl

/* Hero elements */
shadow-2xl

/* Colored shadows (for emphasis) */
shadow-blue-500/20   /* Light */
shadow-blue-500/30   /* Medium */
shadow-blue-500/40   /* Strong */
```

### Responsive Design

**Breakpoints:**
```
sm:  640px   (Mobile landscape)
md:  768px   (Tablet)
lg:  1024px  (Desktop)
xl:  1280px  (Large desktop)
2xl: 1536px  (Extra large)
```

**Mobile-First Approach:**
```tsx
<div className="
  flex flex-col       /* Mobile: Stack vertically */
  sm:flex-row         /* Tablet+: Horizontal */
  gap-4 sm:gap-6      /* Responsive spacing */
">
```

### Accessibility

**Color Contrast:**
- All text meets WCAG AA standards (4.5:1 ratio)
- Interactive elements clearly distinguishable

**Focus States:**
```tsx
className="focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
```

**Keyboard Navigation:**
- All interactive elements focusable
- Logical tab order
- Escape key closes modals

**Screen Readers:**
- Meaningful alt text for icons
- ARIA labels for buttons
- Semantic HTML structure

---

## Design Patterns

### Dashboard Layout
```tsx
<div className="min-h-screen bg-slate-50 p-8">
  <div className="max-w-5xl mx-auto space-y-8">
    {/* Header Card */}
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
      <h1>Welcome, {user.name}</h1>
    </div>

    {/* Stats Grid */}
    <StatGrid>
      <StatCard {...} />
      <StatCard {...} />
      <StatCard {...} />
    </StatGrid>

    {/* Content Sections */}
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
      {/* Section content */}
    </div>
  </div>
</div>
```

### Empty States
```tsx
<div className="p-10 text-center">
  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
    <Icon className="w-8 h-8 text-slate-400" />
  </div>
  <p className="text-slate-600">
    No bookings yet. Once students book you, they'll appear here.
  </p>
</div>
```

### Loading States
```tsx
import { LoadingBadge } from '@/components/ui/status-badge';

<LoadingBadge>Loading sessions...</LoadingBadge>
```

---

## Examples

### Landing Page Hero
```tsx
<section className="py-32 bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
  <AnimatedSection>
    <h1 className="text-7xl font-extrabold">
      Master your craft with{' '}
      <span className="text-gradient">expert mentors</span>
    </h1>
  </AnimatedSection>

  <AnimatedSection delay={0.1}>
    <p className="text-xl text-slate-600">
      Connect with industry leaders and accelerate your growth
    </p>
  </AnimatedSection>

  <AnimatedSection delay={0.2}>
    <button className="gradient-primary text-white px-10 py-5 rounded-2xl shadow-xl">
      Get Started Today
    </button>
  </AnimatedSection>
</section>
```

### Session Card
```tsx
<div className="px-6 py-5 flex items-center justify-between bg-white border-b border-slate-100">
  <div className="flex items-center gap-4">
    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
      {initials}
    </div>
    <div>
      <p className="font-semibold text-slate-900">{studentName}</p>
      <p className="text-sm text-slate-600 flex items-center gap-2">
        <Calendar className="w-3.5 h-3.5" />
        {date}
      </p>
    </div>
  </div>

  <div className="flex items-center gap-3">
    <StatusBadge variant="live" pulse>Live Now</StatusBadge>
    <button className="gradient-success text-white px-4 py-2 rounded-xl">
      Join Call
    </button>
  </div>
</div>
```

---

## Migration Guide

### Updating Existing Components

**Before:**
```tsx
<div className="bg-blue-600 text-white px-4 py-2 rounded-lg">
  Button
</div>
```

**After:**
```tsx
<button className="gradient-primary text-white px-4 py-2 rounded-xl shadow-lg shadow-blue-500/20 hover:shadow-xl transition-all">
  Button
</button>
```

### Adding Animations

**Before:**
```tsx
<section>
  <h2>My Heading</h2>
</section>
```

**After:**
```tsx
<AnimatedSection animation="fadeUp">
  <h2>My Heading</h2>
</AnimatedSection>
```

---

## Resources

### Design Tokens
- `src/lib/design-system.ts` - Complete token definitions

### Components
- `src/components/ui/status-badge.tsx` - Status indicators
- `src/components/ui/stat-card.tsx` - Dashboard metrics
- `src/components/ui/animated-section.tsx` - Animation wrappers

### Utilities
- `src/app/globals.css` - Custom CSS utilities
- `src/lib/utils.ts` - Helper functions (cn utility)

### Documentation
- Shadcn UI: https://ui.shadcn.com/
- Framer Motion: https://www.framer.com/motion/
- Tailwind CSS: https://tailwindcss.com/

---

**Questions or feedback?** Contact the design team or open an issue in the repository.
