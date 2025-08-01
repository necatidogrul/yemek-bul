import { useMemo } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { getColors } from '../theme/design-tokens';

/**
 * Hook that provides theme-aware colors and styles
 * Usage: const { colors, isDark } = useThemedStyles();
 */
export const useThemedStyles = () => {
  const { isDark } = useTheme();
  
  const colors = useMemo(() => {
    return getColors(isDark);
  }, [isDark]);
  
  return {
    colors,
    isDark,
  };
};