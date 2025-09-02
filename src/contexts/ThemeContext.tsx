import React, { createContext, useContext, useEffect, useState } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Logger } from '../services/LoggerService';

export type ThemeMode = 'light' | 'dark' | 'system';

// Professional Design System - Enhanced Color Palette
export const colors = {
  // Primary Colors (Refined Food-Focused)
  primary: {
    50: '#fff7ed', // Lightest orange tint
    100: '#ffedd5', // Very light orange
    200: '#fed7aa', // Light orange
    300: '#fdba74', // Medium-light orange
    400: '#fb923c', // Medium orange
    500: '#f97316', // Primary orange (main brand color)
    600: '#ea580c', // Dark orange
    700: '#c2410c', // Darker orange
    800: '#9a3412', // Deep orange
    900: '#7c2d12', // Darkest orange
  },

  // Secondary Colors (Sophisticated Green)
  secondary: {
    50: '#f0fdf4', // Lightest green
    100: '#dcfce7', // Very light green
    200: '#bbf7d0', // Light green
    300: '#86efac', // Medium-light green
    400: '#4ade80', // Medium green
    500: '#22c55e', // Secondary green
    600: '#16a34a', // Primary green (refined)
    700: '#15803d', // Dark green
    800: '#166534', // Darker green
    900: '#14532d', // Darkest green
  },

  // Neutral Colors (Premium Grays)
  neutral: {
    0: '#ffffff', // Pure white
    50: '#fafaf9', // Warm off-white
    100: '#f5f5f4', // Light warm gray
    200: '#e7e5e4', // Light gray
    300: '#d6d3d1', // Medium-light gray
    400: '#a8a29e', // Medium gray
    500: '#78716c', // Medium-dark gray
    600: '#57534e', // Dark gray
    700: '#44403c', // Darker gray
    800: '#292524', // Very dark gray
    900: '#1c1917', // Near black
    950: '#0c0a09', // True black
  },

  // Accent Colors (Warm & Premium)
  accent: {
    warm: '#f5f5dc', // Warm beige
    gold: '#fbbf24', // Premium gold
    cream: '#fef3c7', // Soft cream
  },

  // Semantic Colors
  semantic: {
    success: '#22c55e', // Success green
    warning: '#f59e0b', // Warning amber
    error: '#ef4444', // Error red
    info: '#3b82f6', // Info blue
  },

  // Border Colors
  border: {
    primary: '#e7e5e4', // Primary border
    light: '#f5f5f4', // Light border
    medium: '#d6d3d1', // Medium border
  },

  // Surface Colors for Light Theme
  light: {
    background: '#ffffff',
    surface: '#fafaf9',
    surfaceVariant: '#f5f5f4',
    outline: '#e7e5e4',
    onBackground: '#1c1917',
    onSurface: '#292524',
    onSurfaceVariant: '#57534e',
    shadow: '#000000',
  },

  // Surface Colors for Dark Theme
  dark: {
    background: '#0c0a09',
    surface: '#1c1917',
    surfaceVariant: '#292524',
    outline: '#44403c',
    onBackground: '#fafaf9',
    onSurface: '#f5f5f4',
    onSurfaceVariant: '#a8a29e',
    shadow: '#000000',
  },
};

// Professional Typography System
export const typography = {
  // Display text for hero sections
  display: {
    large: {
      fontSize: 44,
      lineHeight: 52,
      fontWeight: '700' as const,
      letterSpacing: -0.5,
    },
    medium: {
      fontSize: 36,
      lineHeight: 44,
      fontWeight: '700' as const,
      letterSpacing: -0.3,
    },
    small: {
      fontSize: 28,
      lineHeight: 36,
      fontWeight: '600' as const,
      letterSpacing: -0.2,
    },
  },

  // Headlines for sections
  headline: {
    large: {
      fontSize: 24,
      lineHeight: 32,
      fontWeight: '600' as const,
      letterSpacing: 0,
    },
    medium: {
      fontSize: 20,
      lineHeight: 28,
      fontWeight: '600' as const,
      letterSpacing: 0,
    },
    small: {
      fontSize: 18,
      lineHeight: 26,
      fontWeight: '600' as const,
      letterSpacing: 0,
    },
  },

  // Body text
  body: {
    large: {
      fontSize: 16,
      lineHeight: 24,
      fontWeight: '400' as const,
      letterSpacing: 0.1,
    },
    medium: {
      fontSize: 14,
      lineHeight: 22,
      fontWeight: '400' as const,
      letterSpacing: 0.1,
    },
    small: {
      fontSize: 12,
      lineHeight: 18,
      fontWeight: '400' as const,
      letterSpacing: 0.2,
    },
  },

  // Labels and captions
  label: {
    large: {
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '500' as const,
      letterSpacing: 0.1,
    },
    medium: {
      fontSize: 12,
      lineHeight: 18,
      fontWeight: '500' as const,
      letterSpacing: 0.2,
    },
    small: {
      fontSize: 10,
      lineHeight: 16,
      fontWeight: '500' as const,
      letterSpacing: 0.3,
    },
  },
};

// Enhanced Spacing System (4px base grid)
export const spacing = {
  // Micro spacing
  micro: 2,
  tiny: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,

  // Component-specific spacing
  component: {
    card: {
      padding: 20,
      margin: 16,
      gap: 12,
    },
    button: {
      paddingX: 24,
      paddingY: 12,
      minHeight: 44,
    },
    input: {
      paddingX: 16,
      paddingY: 14,
      minHeight: 48,
    },
    section: {
      paddingY: 32,
      paddingX: 20,
      gap: 16,
    },
    list: {
      gap: 12,
      padding: 16,
    },
  },
};

// Modern Shadow System
export const shadows = {
  sm: {
    shadowColor: colors.neutral[900],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: colors.neutral[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: colors.neutral[900],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
};

// Modern Shadow System
export const elevation = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  low: {
    shadowColor: colors.neutral[900],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  medium: {
    shadowColor: colors.neutral[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  high: {
    shadowColor: colors.neutral[900],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  premium: {
    shadowColor: colors.neutral[900],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 12,
  },
};

// Refined Border Radius
export const borderRadius = {
  none: 0,
  small: 8,
  medium: 12,
  large: 16,
  card: 20,
  button: 12,
  input: 10,
  full: 9999,
};

// Animation Timings
export const animation = {
  timing: {
    fast: 150,
    normal: 200,
    slow: 300,
  },
  easing: {
    default: 'ease-out',
    spring: 'spring',
  },
};

// Theme Helper Functions
export const getThemeColors = (isDark: boolean) => ({
  ...colors,
  current: isDark ? colors.dark : colors.light,
  background: isDark ? colors.dark.background : colors.light.background,
  surface: isDark ? colors.dark.surface : colors.light.surface,
  text: {
    primary: isDark ? colors.dark.onBackground : colors.light.onBackground,
    secondary: isDark
      ? colors.dark.onSurfaceVariant
      : colors.light.onSurfaceVariant,
    accent: colors.primary[500],
  },
  border: colors.border,
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
  },
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
  },
  info: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
  },
});

interface ThemeContextType {
  themeMode: ThemeMode;
  actualTheme: 'light' | 'dark';
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  isDark: boolean;
  colors: ReturnType<typeof getThemeColors>;
  typography: typeof typography;
  spacing: typeof spacing;
  elevation: typeof elevation;
  shadows: typeof shadows;
  borderRadius: typeof borderRadius;
  animation: typeof animation;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'app_theme_mode';

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [systemTheme, setSystemTheme] = useState<ColorSchemeName>(
    Appearance.getColorScheme()
  );

  // Calculate actual theme based on mode and system preference
  const actualTheme: 'light' | 'dark' =
    themeMode === 'system'
      ? systemTheme === 'dark'
        ? 'dark'
        : 'light'
      : themeMode;

  const isDark = actualTheme === 'dark';

  // Load saved theme preference on app start
  useEffect(() => {
    loadThemePreference();
  }, []);

  // Listen to system theme changes
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemTheme(colorScheme);
    });

    return () => subscription?.remove();
  }, []);

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
        setThemeModeState(savedTheme as ThemeMode);
      }
    } catch (error) {
      Logger.info('Failed to load theme preference:', error);
    }
  };

  const setThemeMode = async (mode: ThemeMode) => {
    try {
      setThemeModeState(mode);
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch (error) {
      Logger.info('Failed to save theme preference:', error);
    }
  };

  const value: ThemeContextType = {
    themeMode,
    actualTheme,
    setThemeMode,
    isDark,
    colors: getThemeColors(isDark),
    typography,
    spacing,
    elevation,
    shadows,
    borderRadius,
    animation,
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
