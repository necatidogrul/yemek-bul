// Design Tokens - Modern, Professional Design System with Dark Mode Support

// Base color palettes (theme-independent)
const basePalette = {
  // Brand Colors - Food-centric palette
  primary: {
    50: '#fff7ed',
    100: '#ffedd5',
    200: '#fed7aa',
    300: '#fdba74',
    400: '#fb923c',
    500: '#f97316', // Main brand color
    600: '#ea580c',
    700: '#c2410c',
    800: '#9a3412',
    900: '#7c2d12',
    950: '#431407',
  },

  // Secondary Colors - Natural & Warm
  secondary: {
    50: '#fefce8',
    100: '#fef9c3',
    200: '#fef08a',
    300: '#fde047',
    400: '#facc15',
    500: '#eab308',
    600: '#ca8a04',
    700: '#a16207',
    800: '#854d0e',
    900: '#713f12',
    950: '#422006',
  },

  // Success - Fresh Green
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
    950: '#052e16',
  },

  // Error - Warm Red
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
    950: '#450a0a',
  },

  // Warning - Warm Orange
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
    950: '#451a03',
  },

  // Destructive - Red for errors and destructive actions
  destructive: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
    950: '#450a0a',
  },

  // Info - Blue for informational content
  info: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
    950: '#172554',
  },

  // Neutral Colors - Modern Gray Scale
  neutral: {
    0: '#ffffff',
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
    950: '#030712',
  },
};

// Light theme colors
const lightTheme = {
  ...basePalette,

  // Semantic Colors - Light Mode
  background: {
    primary: basePalette.neutral[0], // white
    secondary: basePalette.neutral[50], // very light gray
    tertiary: basePalette.neutral[100], // light gray
    accent: basePalette.primary[50], // light orange
  },

  // Surface colors for cards, modals etc.
  surface: {
    primary: basePalette.neutral[0], // white
    secondary: basePalette.neutral[50], // very light gray
    elevated: basePalette.neutral[0], // white with shadow
    accent: basePalette.primary[50], // light orange
  },

  // Text colors
  text: {
    primary: basePalette.neutral[900], // dark gray
    secondary: basePalette.neutral[600], // medium gray
    tertiary: basePalette.neutral[400], // light gray
    accent: basePalette.primary[600], // orange
    inverse: basePalette.neutral[0], // white (for dark backgrounds)
  },

  // Border colors
  border: {
    light: basePalette.neutral[100], // very light gray
    medium: basePalette.neutral[200], // light gray
    strong: basePalette.neutral[300], // medium-light gray
  },
};

// Dark theme colors
const darkTheme = {
  ...basePalette,

  // Semantic Colors - Dark Mode
  background: {
    primary: basePalette.neutral[950], // very dark
    secondary: basePalette.neutral[900], // dark
    tertiary: basePalette.neutral[800], // medium dark
    accent: basePalette.primary[950], // dark orange
  },

  // Surface colors for cards, modals etc.
  surface: {
    primary: basePalette.neutral[900], // dark
    secondary: basePalette.neutral[800], // medium dark
    elevated: basePalette.neutral[800], // medium dark with shadow
    accent: basePalette.primary[900], // dark orange
  },

  // Text colors
  text: {
    primary: basePalette.neutral[50], // very light
    secondary: basePalette.neutral[300], // light gray
    tertiary: basePalette.neutral[500], // medium gray
    accent: basePalette.primary[400], // light orange
    inverse: basePalette.neutral[900], // dark (for light backgrounds)
  },

  // Border colors
  border: {
    light: basePalette.neutral[800], // medium dark
    medium: basePalette.neutral[700], // dark
    strong: basePalette.neutral[600], // medium dark
  },
};

// Theme-aware color function
export const getColors = (isDark: boolean = false) => {
  return isDark ? darkTheme : lightTheme;
};

// Default export for backwards compatibility (light theme)
export const colors = lightTheme;

// Typography Scale
export const typography = {
  fontFamily: {
    sans: 'System', // iOS: SF Pro, Android: Roboto
    mono: 'Menlo',
  },

  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
    '6xl': 60,
  },

  fontWeight: {
    thin: '100',
    extralight: '200',
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900',
  },

  lineHeight: {
    tight: 1.25,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2,
  },

  letterSpacing: {
    tighter: -0.05,
    tight: -0.025,
    normal: 0,
    wide: 0.025,
    wider: 0.05,
    widest: 0.1,
  },
};

// Spacing Scale (8pt grid system)
export const spacing = {
  0: 0,
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  2.5: 10,
  3: 12,
  3.5: 14,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  9: 36,
  10: 40,
  11: 44,
  12: 48,
  14: 56,
  16: 64,
  20: 80,
  24: 96,
  28: 112,
  32: 128,
  36: 144,
  40: 160,
  44: 176,
  48: 192,
  52: 208,
  56: 224,
  60: 240,
  64: 256,
  72: 288,
  80: 320,
  96: 384,
};

// Border Radius
export const borderRadius = {
  none: 0,
  sm: 4,
  base: 6,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  '3xl': 24,
  full: 9999,
};

// Shadows
export const shadows = {
  xs: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  base: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 12,
  },
  '2xl': {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 25 },
    shadowOpacity: 0.25,
    shadowRadius: 50,
    elevation: 16,
  },
};

// Animation Durations
export const animation = {
  duration: {
    fast: 150,
    normal: 200,
    slow: 300,
    slower: 500,
  },

  easing: {
    linear: 'linear',
    ease: 'ease',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
  },
};

// Breakpoints for responsive design
export const breakpoints = {
  sm: 480,
  md: 768,
  lg: 1024,
  xl: 1280,
};

// Component-specific tokens
export const components = {
  button: {
    height: {
      sm: 32,
      md: 40,
      lg: 48,
      xl: 56,
    },
    paddingX: {
      sm: 12,
      md: 16,
      lg: 20,
      xl: 24,
    },
  },

  input: {
    height: {
      sm: 36,
      md: 44,
      lg: 52,
    },
    paddingX: {
      sm: 12,
      md: 16,
      lg: 20,
    },
  },

  card: {
    padding: {
      sm: 12,
      md: 16,
      lg: 20,
      xl: 24,
    },
  },
};
