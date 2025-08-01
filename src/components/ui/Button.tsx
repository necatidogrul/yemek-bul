import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
  View,
} from "react-native";
import {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
} from "../../theme/design-tokens";
import { useHaptics } from "../../hooks/useHaptics";
import { useAccessibility } from "../../hooks/useAccessibility";
import { useDynamicType, scaleSpacing } from "../../hooks/useDynamicType";

// Button Variants
type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "destructive";
type ButtonSize = "sm" | "md" | "lg" | "xl";

interface ButtonProps {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  onPress?: () => void;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
  hapticFeedback?: boolean; // Enable/disable haptic feedback
  nativeID?: string;
  // Accessibility props
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityState?: { disabled?: boolean; selected?: boolean };
  testID?: string;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  fullWidth = false,
  onPress,
  leftIcon,
  rightIcon,
  style,
  textStyle,
  hapticFeedback = true,
  nativeID,
  accessibilityLabel,
  accessibilityHint,
  accessibilityState,
  testID,
}) => {
  const haptics = useHaptics();
  const { generateHint, shouldReduceMotion } = useAccessibility();
  const { scale, isAccessibilitySize } = useDynamicType();
  const getButtonStyles = (): ViewStyle => {
    const baseStyles: ViewStyle = {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: borderRadius.lg,
      ...shadows.sm,
    };

    // Size styles with accessibility considerations
    const sizeStyles: Record<ButtonSize, ViewStyle> = {
      sm: {
        height: Math.max(36, isAccessibilitySize ? 44 : 36), // Minimum 44pt for accessibility
        paddingHorizontal: scaleSpacing(spacing[3], scale),
        minWidth: 64,
      },
      md: {
        height: Math.max(44, scaleSpacing(44, scale)), // Always maintain minimum touch target
        paddingHorizontal: scaleSpacing(spacing[4], scale),
        minWidth: 80,
      },
      lg: {
        height: Math.max(44, scaleSpacing(52, scale)),
        paddingHorizontal: scaleSpacing(spacing[6], scale),
        minWidth: 96,
      },
      xl: {
        height: Math.max(44, scaleSpacing(60, scale)),
        paddingHorizontal: scaleSpacing(spacing[8], scale),
        minWidth: 112,
      },
    };

    // Variant styles
    const variantStyles: Record<ButtonVariant, ViewStyle> = {
      primary: {
        backgroundColor: colors.primary[500],
        borderWidth: 0,
      },
      secondary: {
        backgroundColor: colors.secondary[500],
        borderWidth: 0,
      },
      outline: {
        backgroundColor: "transparent",
        borderWidth: 1.5,
        borderColor: colors.primary[500],
        shadowOpacity: 0,
        elevation: 0,
      },
      ghost: {
        backgroundColor: "transparent",
        borderWidth: 0,
        shadowOpacity: 0,
        elevation: 0,
      },
      destructive: {
        backgroundColor: colors.error[500],
        borderWidth: 0,
      },
    };

    // Disabled styles
    const disabledStyles: ViewStyle = {
      opacity: 0.5,
      shadowOpacity: 0,
      elevation: 0,
    };

    // Full width
    const fullWidthStyles: ViewStyle = fullWidth ? { width: "100%" } : {};

    return {
      ...baseStyles,
      ...sizeStyles[size],
      ...variantStyles[variant],
      ...(disabled && disabledStyles),
      ...fullWidthStyles,
    };
  };

  const getTextStyles = (): TextStyle => {
    const baseTextStyles: TextStyle = {
      fontFamily: typography.fontFamily.sans,
      fontWeight: typography.fontWeight.semibold,
      textAlign: "center",
    };

    // Size text styles
    const sizeTextStyles: Record<ButtonSize, TextStyle> = {
      sm: {
        fontSize: typography.fontSize.sm,
        lineHeight: typography.fontSize.sm * typography.lineHeight.tight,
      },
      md: {
        fontSize: typography.fontSize.base,
        lineHeight: typography.fontSize.base * typography.lineHeight.tight,
      },
      lg: {
        fontSize: typography.fontSize.lg,
        lineHeight: typography.fontSize.lg * typography.lineHeight.tight,
      },
      xl: {
        fontSize: typography.fontSize.xl,
        lineHeight: typography.fontSize.xl * typography.lineHeight.tight,
      },
    };

    // Variant text styles
    const variantTextStyles: Record<ButtonVariant, TextStyle> = {
      primary: {
        color: colors.neutral[0],
      },
      secondary: {
        color: colors.neutral[900],
      },
      outline: {
        color: colors.primary[500],
      },
      ghost: {
        color: colors.primary[500],
      },
      destructive: {
        color: colors.neutral[0],
      },
    };

    return {
      ...baseTextStyles,
      ...sizeTextStyles[size],
      ...variantTextStyles[variant],
    };
  };

  const getIconSize = () => {
    const iconSizes = {
      sm: 16,
      md: 18,
      lg: 20,
      xl: 22,
    };
    return iconSizes[size];
  };

  const handlePress = async () => {
    if (!disabled && !loading && onPress) {
      // Trigger haptic feedback before the action
      if (hapticFeedback) {
        await haptics.buttonPress();
      }
      onPress();
    }
  };

  const iconSpacing = spacing[2];

  // Generate accessibility props
  const getAccessibilityLabel = (): string => {
    if (accessibilityLabel) return accessibilityLabel;
    if (typeof children === 'string') return children;
    return 'Button';
  };

  const getAccessibilityHint = (): string | undefined => {
    if (accessibilityHint) return accessibilityHint;
    if (disabled) return 'Button is disabled';
    if (loading) return 'Button is loading';
    return generateHint('button_press');
  };

  const getAccessibilityState = () => {
    return {
      disabled: disabled || loading,
      busy: loading,
      ...accessibilityState,
    };
  };

  return (
    <TouchableOpacity
      style={[getButtonStyles(), style]}
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={shouldReduceMotion() ? 1 : 0.8}
      nativeID={nativeID}
      // Accessibility props
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={getAccessibilityLabel()}
      accessibilityHint={getAccessibilityHint()}
      accessibilityState={getAccessibilityState()}
      testID={testID}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={
            variant === "outline" || variant === "ghost"
              ? colors.primary[500]
              : colors.neutral[0]
          }
        />
      ) : (
        <>
          {leftIcon && (
            <View style={{ marginRight: iconSpacing }}>{leftIcon}</View>
          )}

          <Text style={[getTextStyles(), textStyle]}>{children}</Text>

          {rightIcon && (
            <View style={{ marginLeft: iconSpacing }}>{rightIcon}</View>
          )}
        </>
      )}
    </TouchableOpacity>
  );
};

export default Button;
