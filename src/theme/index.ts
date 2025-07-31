// Re-export design tokens for backward compatibility
export * from "./design-tokens";

// Export the main theme object
import {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  animation,
  breakpoints,
  components,
} from "./design-tokens";

export const theme = {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  animation,
  breakpoints,
  components,
};

export type Theme = typeof theme;
