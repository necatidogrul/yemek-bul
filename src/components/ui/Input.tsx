import React, { useState } from 'react';
import {
  TextInput,
  View,
  Text,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
  TextInputProps,
  Animated,
} from 'react-native';
import {
  typography,
  spacing,
  borderRadius,
  shadows,
} from '../../theme/design-tokens';
import { useThemedStyles } from '../../hooks/useThemedStyles';

type InputVariant = 'default' | 'filled' | 'outline' | 'modern';
type InputSize = 'sm' | 'md' | 'lg' | 'xl';

interface InputProps extends Omit<TextInputProps, 'style'> {
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
  variant = 'outline',
  size = 'md',
  disabled = false,
  error,
  leftIcon,
  rightIcon,
  onRightIconPress,
  style,
  inputStyle,
  ...props
}) => {
  const { colors } = useThemedStyles();
  const [isFocused, setIsFocused] = useState(false);
  const [animatedValue] = useState(new Animated.Value(0));

  const getContainerStyles = (): ViewStyle => {
    const baseStyles: ViewStyle = {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: variant === 'modern' ? borderRadius.xl : borderRadius.lg,
      position: 'relative',
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
      xl: {
        height: 64,
        paddingHorizontal: spacing[6],
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
        backgroundColor: colors.neutral[100],
        borderWidth: 0,
      },
      outline: {
        backgroundColor: colors.surface.primary,
        borderWidth: 2,
        borderColor: colors.border.medium,
      },
      modern: {
        backgroundColor: colors.surface.primary,
        borderWidth: 2,
        borderColor: colors.neutral[200],
        ...shadows.sm,
      },
    };

    // Focus styles
    const focusStyles: ViewStyle = isFocused
      ? {
          borderColor: colors.primary[500],
          backgroundColor: colors.surface.primary,
          ...(variant === 'modern' ? shadows.md : {}),
        }
      : {};

    // Error styles
    const errorStyles: ViewStyle = error
      ? {
          borderColor: colors.error[500],
          backgroundColor:
            variant === 'modern' ? colors.error[50] : colors.surface.primary,
        }
      : {};

    // Disabled styles
    const disabledStyles: ViewStyle = disabled
      ? {
          backgroundColor: colors.neutral[100],
          borderColor: colors.neutral[200],
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
      color: colors.text.primary,
      paddingVertical: 0,
      fontWeight: variant === 'modern' ? ('500' as const) : ('400' as const),
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
      xl: {
        fontSize: typography.fontSize.xl,
      },
    };

    const disabledTextStyles: TextStyle = disabled
      ? {
          color: colors.text.tertiary,
        }
      : {};

    return {
      ...baseTextStyles,
      ...sizeTextStyles[size],
      ...disabledTextStyles,
    };
  };

  const getLabelStyles = (): TextStyle => ({
    fontSize:
      variant === 'modern' ? typography.fontSize.base : typography.fontSize.sm,
    fontWeight: '600' as const,
    color: error
      ? colors.error[600]
      : isFocused
        ? colors.primary[600]
        : colors.text.secondary,
    marginBottom: spacing[2],
  });

  const getErrorStyles = (): TextStyle => ({
    fontSize: typography.fontSize.sm,
    fontWeight: '500' as const,
    color: colors.error[600],
    marginTop: spacing[1.5],
  });

  const iconSpacing = spacing[2];

  const handleFocus = () => {
    setIsFocused(true);
    Animated.timing(animatedValue, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const handleBlur = () => {
    setIsFocused(false);
    Animated.timing(animatedValue, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const animatedBorderColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.border.medium, colors.primary[500]],
  });

  const getPlaceholderColor = () => {
    if (error) return colors.error[400];
    if (disabled) return colors.text.tertiary;
    return colors.text.tertiary;
  };

  return (
    <View style={style}>
      {label && <Text style={getLabelStyles()}>{label}</Text>}

      <View style={getContainerStyles()}>
        {/* Modern variant focus border animation */}
        {variant === 'modern' && (
          <Animated.View
            style={{
              position: 'absolute',
              top: -2,
              left: -2,
              right: -2,
              bottom: -2,
              borderRadius: borderRadius.xl + 2,
              borderWidth: 2,
              borderColor: error ? colors.error[500] : animatedBorderColor,
              opacity: isFocused ? 1 : 0,
            }}
          />
        )}

        {leftIcon && (
          <View
            style={{
              marginRight: iconSpacing,
              opacity: disabled ? 0.5 : 1,
            }}
          >
            {leftIcon}
          </View>
        )}

        <TextInput
          style={[getInputStyles(), inputStyle]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={getPlaceholderColor()}
          onFocus={handleFocus}
          onBlur={handleBlur}
          editable={!disabled}
          selectionColor={colors.primary[500]}
          {...props}
        />

        {rightIcon && (
          <TouchableOpacity
            style={{
              marginLeft: iconSpacing,
              opacity: disabled ? 0.5 : 1,
            }}
            onPress={onRightIconPress}
            disabled={!onRightIconPress || disabled}
            activeOpacity={0.7}
          >
            {rightIcon}
          </TouchableOpacity>
        )}
      </View>

      {error && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: spacing[1.5],
          }}
        >
          <Text style={getErrorStyles()}>{error}</Text>
        </View>
      )}
    </View>
  );
};

export default Input;
