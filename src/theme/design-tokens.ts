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

// Dark theme colors - Optimized for better readability and modern aesthetics
const darkTheme = {
  ...basePalette,

  // Semantic Colors - Dark Mode (Enhanced contrast and warmer tones)
  background: {
    primary: '#0a0a0b', // Rich black with subtle warmth (not pure black for eye comfort)
    secondary: '#131316', // Slightly lighter for hierarchy
    tertiary: '#1c1c21', // Card backgrounds with depth
    accent: '#2a1810', // Very dark orange-brown for accent areas
  },

  // Surface colors for cards, modals etc.
  surface: {
    primary: '#16161a', // Elevated surfaces (cards, modals)
    secondary: '#1e1e23', // Secondary surfaces with subtle difference
    elevated: '#232329', // Highest elevation for dropdowns, tooltips
    accent: '#2d1f17', // Warm accent surface for special elements
  },

  // Text colors - Optimized for WCAG AAA contrast ratios
  text: {
    primary: '#fafafa', // High contrast white (not pure white to reduce eye strain)
    secondary: '#b8b8c0', // Readable secondary text with good contrast
    tertiary: '#7a7a85', // Subtle text for less important info
    accent: '#ff8c42', // Vibrant orange for interactive elements (better than #fb923c)
    inverse: '#0a0a0b', // Dark text for light backgrounds
  },

  // Border colors - Subtle but visible
  border: {
    light: '#2a2a30', // Subtle borders for minimal separation
    medium: '#35353d', // Standard borders with good visibility
    strong: '#45454f', // Strong borders for emphasis
  },

  // Additional dark mode specific colors
  overlay: {
    backdrop: 'rgba(0, 0, 0, 0.7)', // Modal backdrop
    shadow: 'rgba(0, 0, 0, 0.4)', // Shadow color
  },

  // Status colors optimized for dark backgrounds
  status: {
    success: '#4ade80', // Bright green for better visibility
    warning: '#fbbf24', // Warm yellow
    error: '#f87171', // Softer red
    info: '#60a5fa', // Bright blue
  },

  // Interactive states
  interaction: {
    hover: 'rgba(255, 255, 255, 0.05)',
    pressed: 'rgba(255, 255, 255, 0.1)',
    focus: '#ff8c42',
    disabled: 'rgba(255, 255, 255, 0.3)',
  },

  // Keep original palette colors for specific use cases
  primary: basePalette.primary,
  secondary: basePalette.secondary,
  success: basePalette.success,
  error: basePalette.error,
  warning: basePalette.warning,
  destructive: basePalette.destructive,
  info: basePalette.info,
  neutral: basePalette.neutral,
};

// Theme-aware color function
export const getColors = (isDark: boolean = false) => {
  return isDark ? darkTheme : lightTheme;
};

// Default export for backwards compatibility (light theme)
export const colors = lightTheme;

// Typography Scale - Optimized for readability in both themes
export const typography = {
  fontFamily: {
    sans: 'System', // iOS: SF Pro, Android: Roboto
    mono: 'Menlo',
  },

  // Font sizes with better hierarchy
  fontSize: {
    xs: 11, // Smaller for better proportion
    sm: 13, // Slightly smaller for compact info
    base: 15, // Optimal base size for mobile reading
    lg: 17, // Clear step up for emphasis
    xl: 20, // Headings
    '2xl': 24, // Major headings
    '3xl': 28, // Display text (reduced from 30)
    '4xl': 34, // Hero text (reduced from 36)
    '5xl': 42, // Large display (reduced from 48)
    '6xl': 52, // Extra large display (reduced from 60)
  },

  // Font weights optimized for dark mode visibility
  fontWeight: {
    thin: '100',
    extralight: '200',
    light: '300',
    normal: '400',
    medium: '500', // Better for dark mode body text
    semibold: '600', // Good for headings in dark mode
    bold: '700', // Strong emphasis
    extrabold: '800',
    black: '900',
  },

  // Line heights for better readability
  lineHeight: {
    tight: 1.2, // For headings
    snug: 1.35, // For compact text
    normal: 1.55, // Increased for better readability
    relaxed: 1.7, // For body text
    loose: 1.9, // For easy reading
  },

  // Letter spacing adjusted for dark mode
  letterSpacing: {
    tighter: -0.04, // For large headings
    tight: -0.02, // For medium headings
    normal: 0, // Default
    wide: 0.03, // Better readability in dark mode
    wider: 0.05, // For caps or emphasis
    widest: 0.08, // Maximum spacing
  },

  // Theme-specific adjustments (new)
  darkModeAdjustments: {
    // Increase font weight slightly in dark mode for better readability
    bodyWeight: '500', // Instead of 400
    headingWeight: '600', // Instead of 500/600
    // Slightly increase letter spacing in dark mode
    bodySpacing: 0.02, // Additional spacing for body text
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

// Shadows - Theme-aware shadow system
export const getShadows = (isDark: boolean = false) => {
  const shadowColor = isDark ? '#000' : '#000';
  const opacityMultiplier = isDark ? 1.5 : 1; // Stronger shadows in dark mode for depth

  return {
    xs: {
      shadowColor,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05 * opacityMultiplier,
      shadowRadius: 2,
      elevation: 1,
    },
    sm: {
      shadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08 * opacityMultiplier,
      shadowRadius: 3,
      elevation: 2,
    },
    base: {
      shadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1 * opacityMultiplier,
      shadowRadius: 4,
      elevation: 3,
    },
    md: {
      shadowColor,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12 * opacityMultiplier,
      shadowRadius: 6,
      elevation: 4,
    },
    lg: {
      shadowColor,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15 * opacityMultiplier,
      shadowRadius: 12,
      elevation: 8,
    },
    xl: {
      shadowColor,
      shadowOffset: { width: 0, height: 16 },
      shadowOpacity: 0.2 * opacityMultiplier,
      shadowRadius: 24,
      elevation: 12,
    },
    '2xl': {
      shadowColor,
      shadowOffset: { width: 0, height: 24 },
      shadowOpacity: 0.25 * opacityMultiplier,
      shadowRadius: 40,
      elevation: 16,
    },
    // Dark mode specific glow effect for interactive elements
    glow: isDark
      ? {
          shadowColor: '#ff8c42',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.3,
          shadowRadius: 12,
          elevation: 0,
        }
      : {},
  };
};

// Default shadows for backwards compatibility
export const shadows = getShadows(false);

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
