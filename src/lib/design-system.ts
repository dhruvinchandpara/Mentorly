/**
 * Mentorly Design System
 * Professional, trustworthy design tokens for student-mentor marketplace
 *
 * Design Philosophy:
 * - Students (18-25): Modern, approachable, aspirational
 * - Mentors (30-50): Professional, efficient, trustworthy
 * - Balance: Clean, confident, accessible to both personas
 */

export const designTokens = {
  // Enhanced Color Palette - Professional Blue with vibrant accents
  colors: {
    // Primary - Trustworthy Blue (professional, reliable)
    primary: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6', // Main brand color
      600: '#2563eb', // Primary action color
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
      950: '#172554',
    },

    // Success - Emerald (achievements, completed actions)
    success: {
      50: '#ecfdf5',
      100: '#d1fae5',
      200: '#a7f3d0',
      300: '#6ee7b7',
      400: '#34d399',
      500: '#10b981',
      600: '#059669', // Success actions
      700: '#047857',
      800: '#065f46',
      900: '#064e3b',
    },

    // Warning - Amber (pending actions, attention needed)
    warning: {
      50: '#fffbeb',
      100: '#fef3c7',
      200: '#fde68a',
      300: '#fcd34d',
      400: '#fbbf24',
      500: '#f59e0b',
      600: '#d97706', // Warning state
      700: '#b45309',
      800: '#92400e',
      900: '#78350f',
    },

    // Error/Urgent - Red (live sessions, critical actions)
    danger: {
      50: '#fef2f2',
      100: '#fee2e2',
      200: '#fecaca',
      300: '#fca5a5',
      400: '#f87171',
      500: '#ef4444',
      600: '#dc2626', // Error/urgent state
      700: '#b91c1c',
      800: '#991b1b',
      900: '#7f1d1d',
    },

    // Neutral - Slate (backgrounds, text)
    neutral: {
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a',
      950: '#020617',
    },

    // Accent - Purple (premium features, highlights)
    accent: {
      50: '#faf5ff',
      100: '#f3e8ff',
      200: '#e9d5ff',
      300: '#d8b4fe',
      400: '#c084fc',
      500: '#a855f7',
      600: '#9333ea', // Accent color
      700: '#7e22ce',
      800: '#6b21a8',
      900: '#581c87',
    },
  },

  // Typography Scale - Modern, readable hierarchy
  typography: {
    fontFamily: {
      sans: 'var(--font-geist-sans, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif)',
      mono: 'var(--font-geist-mono, ui-monospace, "SF Mono", Consolas, monospace)',
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
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      extrabold: '800',
    },
  },

  // Spacing System - 4px base unit
  spacing: {
    0: '0',
    px: '1px',
    0.5: '0.125rem',  // 2px
    1: '0.25rem',     // 4px
    2: '0.5rem',      // 8px
    3: '0.75rem',     // 12px
    4: '1rem',        // 16px
    5: '1.25rem',     // 20px
    6: '1.5rem',      // 24px
    7: '1.75rem',     // 28px
    8: '2rem',        // 32px
    10: '2.5rem',     // 40px
    12: '3rem',       // 48px
    16: '4rem',       // 64px
    20: '5rem',       // 80px
  },

  // Border Radius - Smooth, modern corners
  borderRadius: {
    none: '0',
    sm: '0.25rem',    // 4px
    md: '0.5rem',     // 8px
    lg: '0.75rem',    // 12px
    xl: '1rem',       // 16px
    '2xl': '1.25rem', // 20px
    '3xl': '1.5rem',  // 24px
    full: '9999px',
  },

  // Shadows - Subtle depth system
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',

    // Colored shadows for emphasis
    primary: '0 4px 14px 0 rgb(37 99 235 / 0.15)',
    success: '0 4px 14px 0 rgb(5 150 105 / 0.15)',
    warning: '0 4px 14px 0 rgb(217 119 6 / 0.15)',
    danger: '0 4px 14px 0 rgb(220 38 38 / 0.15)',
  },

  // Animation Timings - Smooth, natural motion
  animation: {
    duration: {
      fast: '150ms',
      base: '200ms',
      slow: '300ms',
      slower: '500ms',
    },

    easing: {
      default: 'cubic-bezier(0.4, 0, 0.2, 1)',
      in: 'cubic-bezier(0.4, 0, 1, 1)',
      out: 'cubic-bezier(0, 0, 0.2, 1)',
      inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
      spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    },
  },
} as const;

// Component-specific design patterns
export const componentPatterns = {
  // Button variants
  button: {
    sizes: {
      sm: 'h-8 px-3 text-xs rounded-lg',
      md: 'h-10 px-4 text-sm rounded-xl',
      lg: 'h-12 px-6 text-base rounded-xl',
      xl: 'h-14 px-8 text-lg rounded-2xl',
    },

    variants: {
      primary: 'bg-primary-600 hover:bg-primary-700 text-white shadow-sm shadow-primary-600/20 transition-all',
      secondary: 'bg-neutral-100 hover:bg-neutral-200 text-neutral-900 border border-neutral-200 transition-all',
      success: 'bg-success-600 hover:bg-success-700 text-white shadow-sm shadow-success-600/20 transition-all',
      danger: 'bg-danger-600 hover:bg-danger-700 text-white shadow-sm shadow-danger-600/20 transition-all',
      ghost: 'hover:bg-neutral-100 text-neutral-700 transition-all',
      outline: 'border-2 border-primary-600 text-primary-600 hover:bg-primary-50 transition-all',
    },
  },

  // Card variants
  card: {
    base: 'bg-white rounded-2xl border border-neutral-200 shadow-sm transition-all',
    hover: 'hover:shadow-md hover:-translate-y-0.5 transition-all duration-200',
    interactive: 'cursor-pointer hover:shadow-lg hover:border-primary-300 hover:-translate-y-1 transition-all duration-200',
  },

  // Badge/Status variants
  badge: {
    active: 'bg-success-100 text-success-700 border border-success-200',
    pending: 'bg-warning-100 text-warning-700 border border-warning-200',
    inactive: 'bg-neutral-100 text-neutral-600 border border-neutral-200',
    live: 'bg-danger-100 text-danger-700 border border-danger-200 animate-pulse',
  },

  // Input variants
  input: {
    base: 'bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all',
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
