import React from 'react';
import { RefreshControl, RefreshControlProps } from 'react-native';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { useAccessibility } from '../../hooks/useAccessibility';

interface PullToRefreshProps extends Omit<RefreshControlProps, 'colors' | 'tintColor'> {
  /** Custom renk override'ı */
  customColor?: string;
  /** Accessibility etiketi */
  accessibilityLabel?: string;
  /** Progress renkleri (Android için) */
  progressBackgroundColor?: string;
  /** iOS tint rengi override'ı */
  tintColor?: string;
}

/**
 * Tema uyumlu Pull-to-Refresh bileşeni
 * iOS ve Android için platform-specific styling ile
 */
export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  customColor,
  accessibilityLabel = 'Sayfayı yenilemek için aşağı çekin',
  progressBackgroundColor,
  tintColor,
  title,
  titleColor,
  ...props
}) => {
  const { colors, isDark } = useThemedStyles();
  const { shouldReduceMotion } = useAccessibility();

  // Platform-specific renkler
  const refreshColors = customColor ? [customColor] : [colors.primary[500]];
  const refreshTintColor = tintColor || customColor || colors.primary[500];
  const backgroundProgressColor = progressBackgroundColor || colors.background.primary;
  const refreshTitleColor = titleColor || colors.text.secondary;

  return (
    <RefreshControl
      {...props}
      // iOS özellikleri
      tintColor={refreshTintColor}
      title={title}
      titleColor={refreshTitleColor}
      
      // Android özellikleri
      colors={refreshColors}
      progressBackgroundColor={backgroundProgressColor}
      
      // Accessibility özellikleri
      accessibilityLabel={accessibilityLabel}
      accessible={true}
      
      // Animasyon ayarları
      progressViewOffset={shouldReduceMotion() ? 0 : undefined}
    />
  );
};

export default PullToRefresh;