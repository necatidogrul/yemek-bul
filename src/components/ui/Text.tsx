import React from "react";
import { Text as RNText, TextStyle, AccessibilityRole } from "react-native";
import { typography } from "../../theme/design-tokens";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { useDynamicType, scaleFontSize } from "../../hooks/useDynamicType";
import { useAccessibility } from "../../hooks/useAccessibility";

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

type TextWeight =
  | "normal"
  | "bold"
  | "light"
  | "medium"
  | "semibold"
  | "100"
  | "200"
  | "300"
  | "400"
  | "500"
  | "600"
  | "700"
  | "800"
  | "900";
type TextColor =
  | "primary"
  | "secondary"
  | "tertiary"
  | "accent"
  | "inverse"
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
  // Accessibility props
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: AccessibilityRole;
  accessibilityHeading?: boolean;
  testID?: string;
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
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole,
  accessibilityHeading,
  testID,
}) => {
  const { colors } = useThemedStyles();
  const { scale, isAccessibilitySize } = useDynamicType();
  const { isScreenReaderActive } = useAccessibility();

  const getTextStyles = (): TextStyle => {
    const baseStyles: TextStyle = {
      fontFamily: typography.fontFamily.sans,
      color: colors.text.primary,
      textAlign: align,
    };

    // Variant styles with dynamic type scaling
    const variantStyles: Record<TextVariant, TextStyle> = {
      h1: {
        fontSize: scaleFontSize(typography.fontSize["4xl"], scale, 24, 60),
        lineHeight: scaleFontSize(
          typography.fontSize["4xl"] * typography.lineHeight.tight,
          scale,
          28,
          72
        ),
        fontWeight: "700",
      },
      h2: {
        fontSize: scaleFontSize(typography.fontSize["3xl"], scale, 22, 48),
        lineHeight: scaleFontSize(
          typography.fontSize["3xl"] * typography.lineHeight.tight,
          scale,
          26,
          56
        ),
        fontWeight: "700",
      },
      h3: {
        fontSize: scaleFontSize(typography.fontSize["2xl"], scale, 20, 36),
        lineHeight: scaleFontSize(
          typography.fontSize["2xl"] * typography.lineHeight.snug,
          scale,
          24,
          42
        ),
        fontWeight: "600",
      },
      h4: {
        fontSize: scaleFontSize(typography.fontSize.xl, scale, 18, 28),
        lineHeight: scaleFontSize(
          typography.fontSize.xl * typography.lineHeight.snug,
          scale,
          22,
          34
        ),
        fontWeight: "600",
      },
      body: {
        fontSize: scaleFontSize(typography.fontSize.base, scale, 14, 24),
        lineHeight: scaleFontSize(
          typography.fontSize.base * typography.lineHeight.normal,
          scale,
          18,
          32
        ),
      },
      bodyLarge: {
        fontSize: scaleFontSize(typography.fontSize.lg, scale, 16, 26),
        lineHeight: scaleFontSize(
          typography.fontSize.lg * typography.lineHeight.normal,
          scale,
          20,
          34
        ),
      },
      bodySmall: {
        fontSize: scaleFontSize(typography.fontSize.sm, scale, 12, 20),
        lineHeight: scaleFontSize(
          typography.fontSize.sm * typography.lineHeight.normal,
          scale,
          16,
          26
        ),
      },
      caption: {
        fontSize: scaleFontSize(typography.fontSize.xs, scale, 10, 16),
        lineHeight: scaleFontSize(
          typography.fontSize.xs * typography.lineHeight.normal,
          scale,
          14,
          22
        ),
        color: colors.text.secondary,
      },
      overline: {
        fontSize: scaleFontSize(typography.fontSize.xs, scale, 10, 16),
        lineHeight: scaleFontSize(
          typography.fontSize.xs * typography.lineHeight.normal,
          scale,
          14,
          22
        ),
        fontWeight: "600",
        textTransform: "uppercase",
        letterSpacing: typography.letterSpacing.wider,
        color: colors.text.secondary,
      },
    };

    // Weight styles
    const weightStyles: Record<TextWeight, TextStyle> = {
      "100": { fontWeight: "100" },
      "200": { fontWeight: "200" },
      "300": { fontWeight: "300" },
      "400": { fontWeight: "400" },
      "500": { fontWeight: "500" },
      "600": { fontWeight: "600" },
      "700": { fontWeight: "700" },
      "800": { fontWeight: "800" },
      "900": { fontWeight: "900" },
      normal: { fontWeight: "400" },
      bold: { fontWeight: "700" },
      light: { fontWeight: "300" },
      medium: { fontWeight: "500" },
      semibold: { fontWeight: "600" },
    };

    // Color styles
    const getColorStyle = (): TextStyle => {
      const colorMap: Record<TextColor, string> = {
        primary: colors.text.primary,
        secondary: colors.text.secondary,
        tertiary: colors.text.tertiary,
        accent: colors.text.accent,
        inverse: colors.text.inverse,
        destructive: colors.destructive[500],
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

  // Determine accessibility role based on variant
  const getAccessibilityRole = (): AccessibilityRole => {
    if (accessibilityRole) return accessibilityRole;

    if (variant.startsWith("h") || accessibilityHeading) {
      return "header";
    }

    if (onPress) {
      return "button";
    }

    return "text";
  };

  // Generate accessibility label if not provided
  const getAccessibilityLabel = (): string | undefined => {
    if (accessibilityLabel) return accessibilityLabel;

    if (typeof children === "string") {
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
      // Adjust for screen reader
      adjustsFontSizeToFit={!isScreenReaderActive && isAccessibilitySize}
      allowFontScaling={true}
      maxFontSizeMultiplier={2.5}
    >
      {children}
    </RNText>
  );
};

export default Text;
