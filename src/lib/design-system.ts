/**
 * Mentorly Design System
 * Design tokens for the student-mentor marketplace, built on Mesa School
 * of Business's brand identity (warm ivory/crimson palette, serif + sans
 * type pairing). Source: the "Mesa Design System UG" claude.ai/design
 * project, reconciled with `src/app/globals.css` (the CSS-first Tailwind 4
 * theme actually consumed at runtime).
 */

export const designTokens = {
  colors: {
    // Primary - Crimson Brick (the Mesa brand accent)
    primary: {
      50: '#FBEEEE',
      100: '#F5DCDD',
      200: '#E9B4B6',
      300: '#DC8B8F',
      400: '#CB5F64',
      500: '#BA3B41', // Mesa crimson-brick
      600: '#A8343A', // hover
      700: '#8E2C31',
      800: '#702327', // Mesa dark-maroon (pressed)
      900: '#521A1D',
      950: '#341114',
    },

    // Success - muted warm-compatible green (not in the Mesa brand book,
    // extended here since the brand has no product-UI semantic states)
    success: {
      50: '#EAF1EA',
      100: '#D3E3D5',
      200: '#A8C7AC',
      300: '#7CAB82',
      400: '#628F69',
      500: '#4F7A5C',
      600: '#3E6249',
      700: '#2F4B38',
      800: '#213427',
      900: '#131E17',
    },

    // Warning - deepened Lemon Yellow (for text/icon contrast on light bg)
    warning: {
      50: '#FBF7D9',
      100: '#F5EDA8',
      200: '#EDE270',
      300: '#E5E55A', // Mesa lemon-yellow
      400: '#C9C948',
      500: '#8A6D1F',
      600: '#705818',
      700: '#564312',
      800: '#3C2F0C',
      900: '#221A07',
    },

    // Danger/destructive - Dark Maroon (kept distinct from primary crimson
    // so destructive actions read differently from primary CTAs)
    danger: {
      50: '#F5E6DE',
      100: '#E5C4B5',
      200: '#D29E88',
      300: '#BC786290',
      400: '#8F3F3F',
      500: '#702327', // Mesa dark-maroon
      600: '#5C1C1F',
      700: '#481618',
      800: '#341011',
      900: '#20090A',
    },

    // Neutral - Deep Teal Black ink over warm Ivory/Cream surfaces
    neutral: {
      50: '#FFFBF3',  // ivory-whisper (canvas)
      100: '#FBF4D7', // cream-butter (warm surface)
      200: '#E8E1D2', // line (hairline)
      300: '#D7CFBC', // line-strong
      400: '#A9B3B0', // fg-on-dark-muted
      500: '#7C8585', // fg-faint
      600: '#4A5454', // fg-muted
      700: '#2A3636', // line-on-dark
      800: '#162222', // surface-dark
      900: '#0F1919', // deep-teal-black (ink / dark canvas)
      950: '#0A1212',
    },

    // Accent - Peach Beige (soft warm tone / muted accent)
    accent: {
      50: '#FBF3F0',
      100: '#F5E6DE',
      200: '#EACCBF',
      300: '#DFA396', // Mesa peach-beige
      400: '#CB8171',
      500: '#B4655A',
      600: '#8F5049',
      700: '#6A3B38',
      800: '#452726',
      900: '#211313',
    },
  },

  // Typography Scale - Mesa's serif/sans pairing
  typography: {
    fontFamily: {
      // Display serif - headings, hero copy ("New York", substituted with Newsreader)
      display: 'var(--font-newsreader, Georgia, "Times New Roman", serif)',
      // Body sans - UI copy, labels (Manrope)
      sans: 'var(--font-manrope, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif)',
      mono: 'ui-monospace, "SF Mono", Consolas, monospace',
    },

    fontSize: {
      xs: ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.025em' }],        // 12px
      sm: ['0.875rem', { lineHeight: '1.25rem', letterSpacing: '0.01em' }],     // 14px
      base: ['1rem', { lineHeight: '1.5rem', letterSpacing: '0' }],             // 16px
      lg: ['1.125rem', { lineHeight: '1.75rem', letterSpacing: '-0.01em' }],    // 18px
      xl: ['1.25rem', { lineHeight: '1.75rem', letterSpacing: '-0.01em' }],     // 20px
      '2xl': ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.02em' }],      // 24px
      '3xl': ['1.875rem', { lineHeight: '2.25rem', letterSpacing: '-0.02em' }], // 30px
      '4xl': ['2.25rem', { lineHeight: '2.5rem', letterSpacing: '-0.03em' }],   // 36px
      '5xl': ['3rem', { lineHeight: '1', letterSpacing: '-0.03em' }],           // 48px
      '6xl': ['3.75rem', { lineHeight: '1', letterSpacing: '-0.04em' }],        // 60px
    },

    fontWeight: {
      thin: '200',
      light: '300',
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      extrabold: '800',
    },
  },

  // Spacing System - Mesa's 8px base grid
  spacing: {
    0: '0',
    px: '1px',
    1: '0.25rem',  // 4px
    2: '0.5rem',   // 8px
    3: '0.75rem',  // 12px
    4: '1rem',     // 16px
    5: '1.5rem',   // 24px
    6: '2rem',     // 32px
    7: '3rem',     // 48px
    8: '4rem',     // 64px
    9: '6rem',     // 96px
    10: '8rem',    // 128px
  },

  // Border Radius - Mesa's friendly-but-restrained scale
  borderRadius: {
    none: '0',
    sm: '6px',
    md: '12px',
    lg: '20px',
    xl: '32px',
    full: '999px', // pills - buttons, tags, chips
  },

  // Shadows - warm-tinted, soft (teal-black at low opacity, never hard black)
  shadows: {
    sm: '0 1px 2px rgba(15,25,25,.06), 0 1px 3px rgba(15,25,25,.05)',
    md: '0 4px 12px rgba(15,25,25,.08), 0 2px 4px rgba(15,25,25,.05)',
    lg: '0 16px 40px rgba(15,25,25,.12), 0 4px 10px rgba(15,25,25,.06)',
    accent: '0 10px 30px rgba(186,59,65,.28)', // crimson glow, for primary CTAs
  },

  // Animation Timings - restrained, premium motion (no bouncy/springy motion)
  animation: {
    duration: {
      fast: '140ms',
      base: '240ms',
      slow: '420ms',
    },

    easing: {
      default: 'cubic-bezier(.22,.61,.36,1)', // Mesa's default ease-out
      soft: 'cubic-bezier(.4,0,.2,1)',
    },
  },
} as const;

// Component-specific design patterns
export const componentPatterns = {
  // Button variants - pill radius per Mesa's CTA style
  button: {
    sizes: {
      sm: 'h-8 px-4 text-xs rounded-full',
      md: 'h-10 px-5 text-sm rounded-full',
      lg: 'h-12 px-6 text-base rounded-full',
      xl: 'h-14 px-8 text-lg rounded-full',
    },

    variants: {
      primary: 'bg-primary-500 hover:bg-primary-600 text-white shadow-[0_10px_30px_rgba(186,59,65,.28)] transition-all',
      secondary: 'bg-neutral-100 hover:bg-neutral-200 text-neutral-900 border border-neutral-300 transition-all',
      success: 'bg-success-500 hover:bg-success-600 text-white shadow-sm transition-all',
      danger: 'bg-danger-500 hover:bg-danger-600 text-white shadow-sm transition-all',
      ghost: 'hover:bg-neutral-100 text-neutral-700 transition-all',
      outline: 'border-2 border-primary-500 text-primary-500 hover:bg-primary-50 transition-all',
    },
  },

  // Card variants
  card: {
    base: 'bg-white rounded-xl border border-neutral-200 shadow-sm transition-all',
    hover: 'hover:shadow-md hover:-translate-y-0.5 transition-all duration-200',
    interactive: 'cursor-pointer hover:shadow-lg hover:border-primary-300 hover:-translate-y-1 transition-all duration-200',
  },

  // Badge/Status variants
  badge: {
    active: 'bg-success-50 text-success-700 border border-success-200',
    pending: 'bg-warning-50 text-warning-700 border border-warning-200',
    inactive: 'bg-neutral-100 text-neutral-600 border border-neutral-200',
    live: 'bg-danger-50 text-danger-700 border border-danger-200 animate-pulse',
  },

  // Input variants
  input: {
    base: 'bg-white border border-neutral-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all',
    error: 'border-danger-500 focus:ring-danger-500/20 focus:border-danger-500',
  },
} as const;

// Breakpoints for responsive design
export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

// Z-index layers
export const zIndex = {
  base: 0,
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
} as const;

export type DesignTokens = typeof designTokens;
export type ComponentPatterns = typeof componentPatterns;
