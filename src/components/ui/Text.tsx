import React from 'react';
import { Text as RNText, TextStyle, AccessibilityRole } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useAccessibility } from '../../hooks/useAccessibility';

// Modern Typography Variants - Professional Design System
type TextVariant =
  | 'displayLarge'
  | 'displayMedium'
  | 'displaySmall'
  | 'headlineLarge'
  | 'headlineMedium'
  | 'headlineSmall'
  | 'bodyLarge'
  | 'bodyMedium'
  | 'bodySmall'
  | 'labelLarge'
  | 'labelMedium'
  | 'labelSmall'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'h5'
  | 'h6'
  | 'caption'
  | 'body';

type TextWeight =
  | 'normal'
  | 'bold'
  | 'light'
  | 'medium'
  | 'semibold'
  | '100'
  | '200'
  | '300'
  | '400'
  | '500'
  | '600'
  | '700'
  | '800'
  | '900';
type TextColor =
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'inverse'
  | 'success'
  | 'warning'
  | 'error';

interface TextProps {
  children: React.ReactNode;
  variant?: TextVariant;
  weight?: TextWeight;
  color?: TextColor | string;
  align?: 'left' | 'center' | 'right';
  style?: TextStyle;
  numberOfLines?: number;
  onPress?: () => void;
  // Accessibility props
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: AccessibilityRole;
  accessibilityHeading?: boolean;
  testID?: string;
}

const Text: React.FC<TextProps> = ({
  children,
  variant = 'bodyMedium',
  weight = 'normal',
  color = 'primary',
  align = 'left',
  style,
  numberOfLines,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole,
  accessibilityHeading,
  testID,
}) => {
  const { colors, typography } = useTheme();
  const { isScreenReaderActive } = useAccessibility();

  const getTextStyles = (): TextStyle => {
    const baseStyles: TextStyle = {
      color: colors.text.primary,
      textAlign: align,
    };

    // Professional typography variants
    const variantStyles: Record<TextVariant, TextStyle> = {
      displayLarge: {
        ...typography.display.large,
      },
      displayMedium: {
        ...typography.display.medium,
      },
      displaySmall: {
        ...typography.display.small,
      },
      headlineLarge: {
        ...typography.headline.large,
      },
      headlineMedium: {
        ...typography.headline.medium,
      },
      headlineSmall: {
        ...typography.headline.small,
      },
      bodyLarge: {
        ...typography.body.large,
      },
      bodyMedium: {
        ...typography.body.medium,
      },
      bodySmall: {
        ...typography.body.small,
      },
      labelLarge: {
        ...typography.label.large,
      },
      labelMedium: {
        ...typography.label.medium,
      },
      labelSmall: {
        ...typography.label.small,
      },
      h1: {
        fontSize: 36,
        fontWeight: '600',
        lineHeight: 44,
      },
      h2: {
        fontSize: 32,
        fontWeight: '600',
        lineHeight: 40,
      },
      h3: {
        fontSize: 30,
        fontWeight: '600',
        lineHeight: 38,
      },
      h4: {
        fontSize: 24,
        fontWeight: '600',
        lineHeight: 32,
      },
      h5: {
        fontSize: 20,
        fontWeight: '600',
        lineHeight: 28,
      },
      h6: {
        fontSize: 16,
        fontWeight: '600',
        lineHeight: 24,
      },
      caption: {
        fontSize: 12,
        fontWeight: '400',
        lineHeight: 16,
      },
      body: {
        fontSize: 16,
        fontWeight: '400',
        lineHeight: 24,
      },
    };

    // Weight styles
    const weightStyles: Record<TextWeight, TextStyle> = {
      '100': { fontWeight: '100' },
      '200': { fontWeight: '200' },
      '300': { fontWeight: '300' },
      '400': { fontWeight: '400' },
      '500': { fontWeight: '500' },
      '600': { fontWeight: '600' },
      '700': { fontWeight: '700' },
      '800': { fontWeight: '800' },
      '900': { fontWeight: '900' },
      normal: { fontWeight: '400' },
      bold: { fontWeight: '700' },
      light: { fontWeight: '300' },
      medium: { fontWeight: '500' },
      semibold: { fontWeight: '600' },
    };

    // Professional color mapping
    const getColorStyle = (): TextStyle => {
      const colorMap: Record<TextColor, string> = {
        primary: colors.text.primary,
        secondary: colors.text.secondary,
        accent: colors.text.accent,
        inverse: colors.current.onSurface,
        success: colors.semantic.success,
        warning: colors.semantic.warning,
        error: colors.semantic.error,
      };

      return {
        color: colorMap[color as TextColor] || color,
      };
    };

    return {
      ...baseStyles,
      ...variantStyles[variant],
      ...weightStyles[weight],
      ...getColorStyle(),
    };
  };

  // Determine accessibility role based on variant
  const getAccessibilityRole = (): AccessibilityRole => {
    if (accessibilityRole) return accessibilityRole;

    if (
      variant.includes('display') ||
      variant.includes('headline') ||
      accessibilityHeading
    ) {
      return 'header';
    }

    if (onPress) {
      return 'button';
    }

    return 'text';
  };

  // Generate accessibility label if not provided
  const getAccessibilityLabel = (): string | undefined => {
    if (accessibilityLabel) return accessibilityLabel;

    if (typeof children === 'string') {
      return children;
    }

    return undefined;
  };

  return (
    <RNText
      style={[getTextStyles(), style]}
      numberOfLines={numberOfLines}
      onPress={onPress}
      accessible={true}
      accessibilityRole={getAccessibilityRole()}
      accessibilityLabel={getAccessibilityLabel()}
      accessibilityHint={accessibilityHint}
      testID={testID}
      // Professional font scaling
      allowFontScaling={true}
      maxFontSizeMultiplier={1.5}
    >
      {children}
    </RNText>
  );
};

export default Text;
