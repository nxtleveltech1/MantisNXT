// Modern Design System Foundation
// Production-ready design tokens and utilities

export const designTokens = {
  // Color System - Semantic and Brand Colors
  colors: {
    // Primary Brand Colors
    primary: {
      50: 'oklch(96.27% 0.0217 238.66)',
      100: 'oklch(92.66% 0.0429 240.01)',
      200: 'oklch(86.40% 0.0827 241.45)',
      300: 'oklch(77.80% 0.1340 243.83)',
      400: 'oklch(68.30% 0.1766 246.06)',
      500: 'oklch(61.42% 0.2090 248.32)', // Main brand color
      600: 'oklch(55.68% 0.2000 251.37)',
      700: 'oklch(47.20% 0.1609 254.13)',
      800: 'oklch(39.18% 0.1252 256.72)',
      900: 'oklch(33.35% 0.1006 258.71)',
      950: 'oklch(23.84% 0.0647 260.54)'
    },

    // Status Colors - Optimized for clarity and accessibility
    success: {
      50: 'oklch(95.50% 0.0240 142.10)',
      100: 'oklch(89.60% 0.0518 145.20)',
      500: 'oklch(64.80% 0.1510 145.50)', // Primary success
      600: 'oklch(57.30% 0.1370 145.70)',
      700: 'oklch(48.20% 0.1140 145.90)',
      900: 'oklch(27.10% 0.0650 148.70)'
    },

    warning: {
      50: 'oklch(96.80% 0.0240 85.20)',
      100: 'oklch(93.00% 0.0520 90.40)',
      500: 'oklch(75.80% 0.1310 86.30)', // Primary warning
      600: 'oklch(69.20% 0.1200 82.70)',
      700: 'oklch(57.70% 0.1070 78.90)',
      900: 'oklch(35.60% 0.0650 75.60)'
    },

    error: {
      50: 'oklch(96.10% 0.0240 17.40)',
      100: 'oklch(92.70% 0.0470 17.90)',
      500: 'oklch(63.20% 0.1570 20.10)', // Primary error
      600: 'oklch(57.40% 0.1420 19.80)',
      700: 'oklch(48.30% 0.1170 19.40)',
      900: 'oklch(30.90% 0.0720 18.60)'
    },

    // Neutral Colors - Optimized for modern interfaces
    neutral: {
      0: 'oklch(100% 0 0)', // Pure white
      50: 'oklch(98.30% 0.0020 106.40)',
      100: 'oklch(96.10% 0.0040 106.40)',
      200: 'oklch(92.40% 0.0080 106.40)',
      300: 'oklch(87.40% 0.0120 106.40)',
      400: 'oklch(70.20% 0.0150 106.40)',
      500: 'oklch(55.70% 0.0140 106.40)',
      600: 'oklch(45.60% 0.0120 106.40)',
      700: 'oklch(38.20% 0.0100 106.40)',
      800: 'oklch(27.80% 0.0080 106.40)',
      900: 'oklch(19.70% 0.0060 106.40)',
      950: 'oklch(13.80% 0.0040 106.40)',
      1000: 'oklch(0% 0 0)' // Pure black
    }
  },

  // Typography Scale - Optimized for readability
  typography: {
    fontFamilies: {
      sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      mono: ['JetBrains Mono', 'Fira Code', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace']
    },

    sizes: {
      xs: 'clamp(0.75rem, 0.7rem + 0.2vw, 0.8rem)',      // 12-13px
      sm: 'clamp(0.875rem, 0.8rem + 0.3vw, 0.925rem)',   // 14-15px
      base: 'clamp(1rem, 0.95rem + 0.3vw, 1.05rem)',      // 16-17px
      lg: 'clamp(1.125rem, 1.05rem + 0.4vw, 1.2rem)',     // 18-19px
      xl: 'clamp(1.25rem, 1.15rem + 0.5vw, 1.35rem)',     // 20-22px
      '2xl': 'clamp(1.5rem, 1.35rem + 0.7vw, 1.65rem)',   // 24-26px
      '3xl': 'clamp(1.875rem, 1.65rem + 1vw, 2.1rem)',    // 30-34px
      '4xl': 'clamp(2.25rem, 1.95rem + 1.5vw, 2.7rem)',   // 36-43px
      '5xl': 'clamp(3rem, 2.5rem + 2.5vw, 4rem)'          // 48-64px
    },

    weights: {
      light: '300',
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      extrabold: '800'
    },

    lineHeights: {
      tight: '1.25',
      normal: '1.5',
      relaxed: '1.625',
      loose: '2'
    }
  },

  // Spacing System - 8px base grid with fibonacci progression
  spacing: {
    0: '0rem',
    px: '1px',
    0.5: '0.125rem',   // 2px
    1: '0.25rem',      // 4px
    1.5: '0.375rem',   // 6px
    2: '0.5rem',       // 8px
    3: '0.75rem',      // 12px
    4: '1rem',         // 16px
    5: '1.25rem',      // 20px
    6: '1.5rem',       // 24px
    8: '2rem',         // 32px
    10: '2.5rem',      // 40px
    12: '3rem',        // 48px
    16: '4rem',        // 64px
    20: '5rem',        // 80px
    24: '6rem',        // 96px
    32: '8rem',        // 128px
    40: '10rem',       // 160px
    48: '12rem',       // 192px
    56: '14rem',       // 224px
    64: '16rem'        // 256px
  },

  // Border Radius - Modern rounded corners
  borderRadius: {
    none: '0',
    sm: '0.25rem',     // 4px
    base: '0.5rem',    // 8px
    md: '0.75rem',     // 12px
    lg: '1rem',        // 16px
    xl: '1.5rem',      // 24px
    '2xl': '2rem',     // 32px
    full: '9999px'
  },

  // Shadows - Subtle depth system
  shadows: {
    xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    sm: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    base: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    md: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    lg: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    xl: '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)'
  },

  // Animation System - Smooth micro-interactions
  animations: {
    durations: {
      instant: '0ms',
      fast: '150ms',
      normal: '300ms',
      slow: '500ms',
      slower: '750ms'
    },

    easings: {
      linear: 'linear',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
      bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)'
    }
  }
} as const

// Component Variants - Consistent styling patterns
export const componentVariants = {
  button: {
    sizes: {
      xs: 'h-6 px-2 text-xs',
      sm: 'h-8 px-3 text-sm',
      base: 'h-10 px-4 text-base',
      lg: 'h-12 px-6 text-lg',
      xl: 'h-14 px-8 text-xl'
    },

    variants: {
      primary: 'bg-primary-500 hover:bg-primary-600 text-white shadow-md hover:shadow-lg',
      secondary: 'bg-neutral-100 hover:bg-neutral-200 text-neutral-900 border border-neutral-300',
      outline: 'border border-primary-300 text-primary-600 hover:bg-primary-50',
      ghost: 'hover:bg-neutral-100 text-neutral-700',
      success: 'bg-success-500 hover:bg-success-600 text-white',
      warning: 'bg-warning-500 hover:bg-warning-600 text-white',
      error: 'bg-error-500 hover:bg-error-600 text-white'
    }
  },

  card: {
    variants: {
      elevated: 'bg-white border border-neutral-200 shadow-md rounded-lg',
      flat: 'bg-neutral-50 border border-neutral-200 rounded-lg',
      ghost: 'bg-transparent',
      premium: 'bg-gradient-to-br from-white to-neutral-50 border-2 border-primary-200 shadow-xl rounded-xl'
    },

    padding: {
      none: 'p-0',
      sm: 'p-4',
      base: 'p-6',
      lg: 'p-8',
      xl: 'p-12'
    }
  },

  badge: {
    sizes: {
      xs: 'text-xs px-2 py-0.5',
      sm: 'text-sm px-2.5 py-1',
      base: 'text-sm px-3 py-1.5',
      lg: 'text-base px-4 py-2'
    },

    variants: {
      neutral: 'bg-neutral-100 text-neutral-700 border border-neutral-300',
      primary: 'bg-primary-100 text-primary-700 border border-primary-300',
      success: 'bg-success-100 text-success-700 border border-success-300',
      warning: 'bg-warning-100 text-warning-700 border border-warning-300',
      error: 'bg-error-100 text-error-700 border border-error-300'
    }
  }
} as const

// Accessibility Utilities
export const a11y = {
  // WCAG AAA color contrast ratios
  contrastRatios: {
    minimum: 4.5,  // WCAG AA
    enhanced: 7.0  // WCAG AAA
  },

  // Screen reader utilities
  srOnly: 'sr-only absolute w-px h-px p-0 -m-px overflow-hidden clip-[rect(0,0,0,0)] whitespace-nowrap border-0',

  // Focus indicators
  focusRing: 'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-white',
  focusVisible: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',

  // Minimum interactive target size (44x44px)
  minTouchTarget: 'min-h-[44px] min-w-[44px]'
} as const

// Responsive Design System
export const breakpoints = {
  xs: '475px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px'
} as const

// Theme Configuration
export const theme = {
  light: {
    background: designTokens.colors.neutral[0],
    foreground: designTokens.colors.neutral[900],
    muted: designTokens.colors.neutral[100],
    mutedForeground: designTokens.colors.neutral[500],
    border: designTokens.colors.neutral[200],
    input: designTokens.colors.neutral[200],
    ring: designTokens.colors.primary[500]
  },

  dark: {
    background: designTokens.colors.neutral[950],
    foreground: designTokens.colors.neutral[50],
    muted: designTokens.colors.neutral[800],
    mutedForeground: designTokens.colors.neutral[400],
    border: designTokens.colors.neutral[800],
    input: designTokens.colors.neutral[800],
    ring: designTokens.colors.primary[400]
  }
} as const