import React from "react";
import {
  TouchableOpacity,
  Text,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../contexts/ThemeContext";
import { useHaptics } from "../../hooks/useHaptics";
import { useAccessibility } from "../../hooks/useAccessibility";

// Modern Button Variants - Simplified for Professional Design
type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "destructive";

type ButtonSize = "sm" | "md" | "lg";

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
  const { colors, typography, spacing, elevation, borderRadius, animation } =
    useTheme();
  const haptics = useHaptics();
  const { generateHint, shouldReduceMotion } = useAccessibility();
  const getButtonStyles = (): ViewStyle => {
    const baseStyles: ViewStyle = {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: borderRadius.button,
      overflow: "hidden",
      minHeight: spacing.component.button.minHeight,
    };

    // Professional size styles with consistent spacing
    const sizeStyles: Record<ButtonSize, ViewStyle> = {
      sm: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        minWidth: 80,
      },
      md: {
        paddingHorizontal: spacing.component.button.paddingX,
        paddingVertical: spacing.component.button.paddingY,
        minWidth: 120,
      },
      lg: {
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        minHeight: 56,
        minWidth: 160,
      },
    };

    // Modern variant styles - Clean & Professional
    const variantStyles: Record<ButtonVariant, ViewStyle> = {
      primary: {
        backgroundColor: colors.primary[500],
        ...elevation.medium,
      },
      secondary: {
        backgroundColor: colors.secondary[500],
        ...elevation.low,
      },
      outline: {
        backgroundColor: colors.surface,
        borderWidth: 1.5,
        borderColor: colors.border.medium,
        ...elevation.low,
      },
      ghost: {
        backgroundColor: "transparent",
        ...elevation.none,
      },
      destructive: {
        backgroundColor: colors.semantic.error,
        ...elevation.medium,
      },
    };

    // Enhanced disabled styles
    const disabledStyles: ViewStyle = {
      opacity: 0.6,
      ...elevation.none,
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
      textAlign: "center",
      fontWeight: "600",
    };

    // Modern typography sizing
    const sizeTextStyles: Record<ButtonSize, TextStyle> = {
      sm: {
        ...typography.label.medium,
      },
      md: {
        ...typography.label.large,
      },
      lg: {
        ...typography.headline.small,
      },
    };

    // Professional text colors
    const variantTextStyles: Record<ButtonVariant, TextStyle> = {
      primary: {
        color: colors.neutral[0],
      },
      secondary: {
        color: colors.neutral[0],
      },
      outline: {
        color: colors.text.primary,
      },
      ghost: {
        color: colors.text.accent,
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
      lg: 22,
    };
    return iconSizes[size];
  };

  // Removed gradient system for cleaner, more professional look

  const handlePress = async () => {
    if (!disabled && !loading && onPress) {
      // Trigger haptic feedback before the action
      if (hapticFeedback) {
        await haptics.buttonPress();
      }
      onPress();
    }
  };

  const iconSpacing = spacing.xs;

  // Generate accessibility props
  const getAccessibilityLabel = (): string => {
    if (accessibilityLabel) return accessibilityLabel;
    if (typeof children === "string") return children;
    return "Button";
  };

  const getAccessibilityHint = (): string | undefined => {
    if (accessibilityHint) return accessibilityHint;
    if (disabled) return "Button is disabled";
    if (loading) return "Button is loading";
    return generateHint("button_press");
  };

  const getAccessibilityState = () => {
    return {
      disabled: disabled || loading,
      busy: loading,
      ...accessibilityState,
    };
  };

  const buttonContent = (
    <>
      {loading ? (
        <ActivityIndicator
          size="small"
          color={
            variant === "outline" || variant === "ghost"
              ? colors.text.primary
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
    </>
  );

  // Clean button without gradients for professional look

  return (
    <TouchableOpacity
      style={[getButtonStyles(), style]}
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={shouldReduceMotion() ? 1 : 0.85}
      // Accessibility props
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={getAccessibilityLabel()}
      accessibilityHint={getAccessibilityHint()}
      accessibilityState={getAccessibilityState()}
      testID={testID}
    >
      {buttonContent}
    </TouchableOpacity>
  );
};

export default Button;
