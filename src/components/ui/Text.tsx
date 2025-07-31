import React from "react";
import { Text as RNText, TextStyle } from "react-native";
import { colors, typography } from "../../theme/design-tokens";

type TextVariant =
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "body"
  | "bodyLarge"
  | "bodySmall"
  | "caption"
  | "overline";

type TextWeight = "light" | "normal" | "medium" | "semibold" | "bold";
type TextColor =
  | "primary"
  | "secondary"
  | "muted"
  | "accent"
  | "destructive"
  | "success"
  | "warning";

interface TextProps {
  children: React.ReactNode;
  variant?: TextVariant;
  weight?: TextWeight;
  color?: TextColor | string;
  align?: "left" | "center" | "right";
  style?: TextStyle;
  numberOfLines?: number;
  onPress?: () => void;
}

const Text: React.FC<TextProps> = ({
  children,
  variant = "body",
  weight = "normal",
  color = "primary",
  align = "left",
  style,
  numberOfLines,
  onPress,
}) => {
  const getTextStyles = (): TextStyle => {
    const baseStyles: TextStyle = {
      fontFamily: typography.fontFamily.sans,
      color: colors.neutral[900],
      textAlign: align,
    };

    // Variant styles
    const variantStyles: Record<TextVariant, TextStyle> = {
      h1: {
        fontSize: typography.fontSize["4xl"],
        lineHeight: typography.fontSize["4xl"] * typography.lineHeight.tight,
        fontWeight: typography.fontWeight.bold,
      },
      h2: {
        fontSize: typography.fontSize["3xl"],
        lineHeight: typography.fontSize["3xl"] * typography.lineHeight.tight,
        fontWeight: typography.fontWeight.bold,
      },
      h3: {
        fontSize: typography.fontSize["2xl"],
        lineHeight: typography.fontSize["2xl"] * typography.lineHeight.snug,
        fontWeight: typography.fontWeight.semibold,
      },
      h4: {
        fontSize: typography.fontSize.xl,
        lineHeight: typography.fontSize.xl * typography.lineHeight.snug,
        fontWeight: typography.fontWeight.semibold,
      },
      body: {
        fontSize: typography.fontSize.base,
        lineHeight: typography.fontSize.base * typography.lineHeight.normal,
      },
      bodyLarge: {
        fontSize: typography.fontSize.lg,
        lineHeight: typography.fontSize.lg * typography.lineHeight.normal,
      },
      bodySmall: {
        fontSize: typography.fontSize.sm,
        lineHeight: typography.fontSize.sm * typography.lineHeight.normal,
      },
      caption: {
        fontSize: typography.fontSize.xs,
        lineHeight: typography.fontSize.xs * typography.lineHeight.normal,
        color: colors.neutral[500],
      },
      overline: {
        fontSize: typography.fontSize.xs,
        lineHeight: typography.fontSize.xs * typography.lineHeight.normal,
        fontWeight: typography.fontWeight.semibold,
        textTransform: "uppercase",
        letterSpacing: typography.letterSpacing.wider,
        color: colors.neutral[500],
      },
    };

    // Weight styles
    const weightStyles: Record<TextWeight, TextStyle> = {
      light: { fontWeight: typography.fontWeight.light },
      normal: { fontWeight: typography.fontWeight.normal },
      medium: { fontWeight: typography.fontWeight.medium },
      semibold: { fontWeight: typography.fontWeight.semibold },
      bold: { fontWeight: typography.fontWeight.bold },
    };

    // Color styles
    const getColorStyle = (): TextStyle => {
      const colorMap: Record<TextColor, string> = {
        primary: colors.neutral[900],
        secondary: colors.neutral[700],
        muted: colors.neutral[500],
        accent: colors.primary[500],
        destructive: colors.error[500],
        success: colors.success[500],
        warning: colors.warning[500],
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

  return (
    <RNText
      style={[getTextStyles(), style]}
      numberOfLines={numberOfLines}
      onPress={onPress}
    >
      {children}
    </RNText>
  );
};

export default Text;
