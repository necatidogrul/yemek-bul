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
}) => {
  const getButtonStyles = (): ViewStyle => {
    const baseStyles: ViewStyle = {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: borderRadius.lg,
      ...shadows.sm,
    };

    // Size styles
    const sizeStyles: Record<ButtonSize, ViewStyle> = {
      sm: {
        height: 36,
        paddingHorizontal: spacing[3],
        minWidth: 64,
      },
      md: {
        height: 44,
        paddingHorizontal: spacing[4],
        minWidth: 80,
      },
      lg: {
        height: 52,
        paddingHorizontal: spacing[6],
        minWidth: 96,
      },
      xl: {
        height: 60,
        paddingHorizontal: spacing[8],
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

  const handlePress = () => {
    if (!disabled && !loading && onPress) {
      onPress();
    }
  };

  const iconSpacing = spacing[2];

  return (
    <TouchableOpacity
      style={[getButtonStyles(), style]}
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.8}
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
