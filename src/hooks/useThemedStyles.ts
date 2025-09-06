import { useMemo } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { getColors, getShadows, typography } from '../theme/design-tokens';

/**
 * Hook that provides theme-aware colors, shadows, and typography
 * Usage: const { colors, shadows, typography, isDark } = useThemedStyles();
 */
export const useThemedStyles = () => {
  const { isDark } = useTheme();

  const colors = useMemo(() => {
    return getColors(isDark);
  }, [isDark]);

  const shadows = useMemo(() => {
    return getShadows(isDark);
  }, [isDark]);

  // Apply dark mode typography adjustments
  const themedTypography = useMemo(() => {
    if (!isDark) return typography;
    
    return {
      ...typography,
      // Apply dark mode specific font weight adjustments
      fontWeight: {
        ...typography.fontWeight,
        body: typography.darkModeAdjustments.bodyWeight,
        heading: typography.darkModeAdjustments.headingWeight,
      },
    };
  }, [isDark]);

  return {
    colors,
    shadows,
    typography: themedTypography,
    isDark,
  };
};
