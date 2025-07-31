import React, { useState } from "react";
import {
  TextInput,
  View,
  Text,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
  TextInputProps,
} from "react-native";
import {
  colors,
  typography,
  spacing,
  borderRadius,
} from "../../theme/design-tokens";

type InputVariant = "default" | "filled" | "outlined";
type InputSize = "sm" | "md" | "lg";

interface InputProps extends Omit<TextInputProps, "style"> {
  label?: string;
  placeholder?: string;
  value?: string;
  onChangeText?: (text: string) => void;
  variant?: InputVariant;
  size?: InputSize;
  disabled?: boolean;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
  style?: ViewStyle;
  inputStyle?: TextStyle;
}

const Input: React.FC<InputProps> = ({
  label,
  placeholder,
  value,
  onChangeText,
  variant = "outlined",
  size = "md",
  disabled = false,
  error,
  leftIcon,
  rightIcon,
  onRightIconPress,
  style,
  inputStyle,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const getContainerStyles = (): ViewStyle => {
    const baseStyles: ViewStyle = {
      flexDirection: "row",
      alignItems: "center",
      borderRadius: borderRadius.lg,
    };

    // Size styles
    const sizeStyles: Record<InputSize, ViewStyle> = {
      sm: {
        height: 40,
        paddingHorizontal: spacing[3],
      },
      md: {
        height: 48,
        paddingHorizontal: spacing[4],
      },
      lg: {
        height: 56,
        paddingHorizontal: spacing[5],
      },
    };

    // Variant styles
    const variantStyles: Record<InputVariant, ViewStyle> = {
      default: {
        backgroundColor: colors.surface.primary,
        borderWidth: 1,
        borderColor: colors.border.medium,
      },
      filled: {
        backgroundColor: colors.background.secondary,
        borderWidth: 0,
      },
      outlined: {
        backgroundColor: colors.surface.primary,
        borderWidth: 1.5,
        borderColor: colors.border.medium,
      },
    };

    // Focus styles
    const focusStyles: ViewStyle = isFocused
      ? {
          borderColor: colors.primary[500],
          backgroundColor: colors.surface.primary,
        }
      : {};

    // Error styles
    const errorStyles: ViewStyle = error
      ? {
          borderColor: colors.error[500],
        }
      : {};

    // Disabled styles
    const disabledStyles: ViewStyle = disabled
      ? {
          backgroundColor: colors.neutral[100],
          borderColor: colors.border.light,
          opacity: 0.6,
        }
      : {};

    return {
      ...baseStyles,
      ...sizeStyles[size],
      ...variantStyles[variant],
      ...focusStyles,
      ...errorStyles,
      ...disabledStyles,
    };
  };

  const getInputStyles = (): TextStyle => {
    const baseTextStyles: TextStyle = {
      flex: 1,
      fontFamily: typography.fontFamily.sans,
      fontSize: typography.fontSize.base,
      color: colors.neutral[900],
      paddingVertical: 0, // Remove default padding
    };

    // Size text styles
    const sizeTextStyles: Record<InputSize, TextStyle> = {
      sm: {
        fontSize: typography.fontSize.sm,
      },
      md: {
        fontSize: typography.fontSize.base,
      },
      lg: {
        fontSize: typography.fontSize.lg,
      },
    };

    const disabledTextStyles: TextStyle = disabled
      ? {
          color: colors.neutral[400],
        }
      : {};

    return {
      ...baseTextStyles,
      ...sizeTextStyles[size],
      ...disabledTextStyles,
    };
  };

  const getLabelStyles = (): TextStyle => ({
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.neutral[700],
    marginBottom: spacing[1.5],
  });

  const getErrorStyles = (): TextStyle => ({
    fontSize: typography.fontSize.sm,
    color: colors.error[500],
    marginTop: spacing[1],
  });

  const iconSpacing = spacing[2];

  return (
    <View style={style}>
      {label && <Text style={getLabelStyles()}>{label}</Text>}

      <View style={getContainerStyles()}>
        {leftIcon && (
          <View style={{ marginRight: iconSpacing }}>{leftIcon}</View>
        )}

        <TextInput
          style={[getInputStyles(), inputStyle]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.neutral[400]}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          editable={!disabled}
          {...props}
        />

        {rightIcon && (
          <TouchableOpacity
            style={{ marginLeft: iconSpacing }}
            onPress={onRightIconPress}
            disabled={!onRightIconPress}
          >
            {rightIcon}
          </TouchableOpacity>
        )}
      </View>

      {error && <Text style={getErrorStyles()}>{error}</Text>}
    </View>
  );
};

export default Input;
