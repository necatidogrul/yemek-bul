import React from 'react';
import { View, ViewStyle } from 'react-native';
import { spacing, borderRadius, shadows } from '../../theme/design-tokens';
import { useThemedStyles } from '../../hooks/useThemedStyles';

type CardVariant = 'default' | 'elevated' | 'outlined' | 'filled';
type CardSize = 'sm' | 'md' | 'lg' | 'xl';

interface CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  size?: CardSize;
  style?: ViewStyle | ViewStyle[];
}

const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  size = 'md',
  style,
}) => {
  const { colors } = useThemedStyles();

  const getCardStyles = (): ViewStyle => {
    const baseStyles: ViewStyle = {
      borderRadius: borderRadius.xl,
      backgroundColor: colors.surface.primary,
    };

    // Size styles
    const sizeStyles: Record<CardSize, ViewStyle> = {
      sm: {
        padding: spacing[3],
      },
      md: {
        padding: spacing[4],
      },
      lg: {
        padding: spacing[6],
      },
      xl: {
        padding: spacing[8],
      },
    };

    // Variant styles
    const variantStyles: Record<CardVariant, ViewStyle> = {
      default: {
        ...shadows.sm,
      },
      elevated: {
        ...shadows.lg,
        backgroundColor: colors.surface.elevated,
      },
      outlined: {
        borderWidth: 1,
        borderColor: colors.border.medium,
        shadowOpacity: 0,
        elevation: 0,
      },
      filled: {
        backgroundColor: colors.background.secondary,
        shadowOpacity: 0,
        elevation: 0,
      },
    };

    return {
      ...baseStyles,
      ...sizeStyles[size],
      ...variantStyles[variant],
    };
  };

  return <View style={[getCardStyles(), style]}>{children}</View>;
};

export default Card;
