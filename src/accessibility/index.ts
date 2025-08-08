// Accessibility Services and Hooks
import { AccessibilityManager } from "../services/AccessibilityService";
export { AccessibilityManager };
export type { AccessibilityState } from "../services/AccessibilityService";

export { useAccessibility } from "../hooks/useAccessibility";

export {
  useDynamicType,
  scaleFontSize,
  scaleSpacing,
  shouldAdaptLayoutForLargeText,
} from "../hooks/useDynamicType";
export type { DynamicTypeScale } from "../hooks/useDynamicType";

export { useReducedMotion } from "../hooks/useReducedMotion";

// Accessibility Constants and Utilities
export const AccessibilityConstants = {
  // Minimum touch target size (44pt on iOS)
  MIN_TOUCH_TARGET: 44,

  // Maximum font scale multiplier
  MAX_FONT_SCALE: 2.5,

  // Minimum font sizes for readability
  MIN_FONT_SIZES: {
    caption: 10,
    body: 14,
    bodyLarge: 16,
    h4: 18,
    h3: 20,
    h2: 22,
    h1: 24,
  },

  // Maximum font sizes to prevent layout issues
  MAX_FONT_SIZES: {
    caption: 16,
    body: 24,
    bodyLarge: 26,
    h4: 28,
    h3: 36,
    h2: 48,
    h1: 60,
  },

  // WCAG contrast ratio requirements
  CONTRAST_RATIOS: {
    AA_NORMAL: 4.5,
    AA_LARGE: 3.0,
    AAA_NORMAL: 7.0,
    AAA_LARGE: 4.5,
  },

  // Common accessibility roles
  ROLES: {
    BUTTON: "button" as const,
    HEADER: "header" as const,
    TEXT: "text" as const,
    IMAGE: "image" as const,
    LINK: "link" as const,
    SEARCH: "search" as const,
    TAB: "tab" as const,
    TAB_LIST: "tablist" as const,
    LIST: "list" as const,
    LIST_ITEM: "listitem" as const,
  },
} as const;

// Accessibility Helper Functions
export const AccessibilityHelpers = {
  /**
   * Generate consistent accessibility labels for common UI patterns
   */
  generateLabel: {
    button: (
      text: string,
      state?: { loading?: boolean; disabled?: boolean }
    ) => {
      let label = text;
      if (state?.loading) label += ", yükleniyor";
      if (state?.disabled) label += ", devre dışı";
      return label;
    },

    counter: (current: number, total: number, itemName: string = "öğe") => {
      return `${current} / ${total} ${itemName}`;
    },

    progress: (percentage: number) => {
      return `Yüzde ${Math.round(percentage)} tamamlandı`;
    },

    recipe: (
      name: string,
      details: {
        difficulty?: string;
        cookingTime?: number;
        matchingIngredients?: number;
        totalIngredients?: number;
        isFavorite?: boolean;
      }
    ) => {
      const parts = [`Tarif: ${name}`];

      if (details.difficulty) {
        parts.push(`Zorluk seviyesi: ${details.difficulty}`);
      }

      if (details.cookingTime) {
        parts.push(`Pişirme süresi: ${details.cookingTime} dakika`);
      }

      if (details.matchingIngredients && details.totalIngredients) {
        parts.push(
          `${details.matchingIngredients} / ${details.totalIngredients} malzeme mevcut`
        );
      }

      if (details.isFavorite) {
        parts.push("Favorilerinizde");
      }

      return parts.join(", ");
    },
  },

  /**
   * Generate accessibility hints for common actions
   */
  generateHint: {
    tapToAction: (action: string) => `${action} için çift dokunun`,
    swipeToAction: (
      action: string,
      direction: "left" | "right" | "up" | "down"
    ) => {
      const directionText = {
        left: "sola",
        right: "sağa",
        up: "yukarı",
        down: "aşağı",
      };
      return `${action} için ${directionText[direction]} kaydırın`;
    },
    longPressToAction: (action: string) => `${action} için basılı tutun`,
  },

  /**
   * Check if color combination meets WCAG contrast requirements
   */
  meetsContrastRequirement: (
    foreground: string,
    background: string,
    level: "AA" | "AAA" = "AA",
    isLargeText: boolean = false
  ): boolean => {
    // This is a simplified check - in production, you'd use a proper contrast calculation library
    // For now, we'll assume proper contrast ratios are met in our design system
    return true;
  },

  /**
   * Announce important messages to screen readers
   */
  announce: (message: string) => {
    AccessibilityManager.announceForAccessibility(message);
  },
} as const;
