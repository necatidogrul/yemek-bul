import { useTranslation as useI18nTranslation } from "react-i18next";
import { AllTranslationKeys } from "../locales";

/**
 * Custom hook that wraps react-i18next's useTranslation with TypeScript support
 * Provides type-safe translation keys and common localization utilities
 */
export const useTranslation = () => {
  const { t, i18n } = useI18nTranslation();

  // Type-safe translation function
  const translate = (
    key: AllTranslationKeys | string,
    options?: any
  ): string => {
    return t(key, options) as string;
  };

  // Shorthand for common use cases
  const tt = translate;

  // Language management
  const changeLanguage = async (language: string) => {
    try {
      await i18n.changeLanguage(language);
      return true;
    } catch (error) {
      console.error("Failed to change language:", error);
      return false;
    }
  };

  const currentLanguage = i18n.language;
  const isEnglish = currentLanguage === "en";
  const isTurkish = currentLanguage === "tr";

  // Direction support (for future RTL languages)
  const isRTL = false; // Add RTL languages here when needed
  const direction = isRTL ? "rtl" : "ltr";

  // Common translation helpers
  const getAppName = (): string => translate("app.name");
  const getLoadingText = (): string => translate("app.loading");
  const getErrorText = (): string => translate("app.error");

  // Navigation labels
  const getNavigationLabel = (screen: string): string => {
    return translate(`navigation.${screen}` as AllTranslationKeys);
  };

  const formatRecipesFound = (count: number): string => {
    return translate("success.recipesFound", { count });
  };

  const formatSearchWithCount = (count: number): string => {
    return translate("home.searchWithCount", { count });
  };

  // Pluralization helper
  const plural = (key: string, count: number, options?: any): string => {
    return t(key, { count, ...options }) as string;
  };

  // Category and option translations
  const getCategoryName = (categoryId: string): string => {
    return translate(`categories.${categoryId}` as AllTranslationKeys);
  };

  const getDifficultyName = (difficultyId: string): string => {
    return translate(`difficulty.${difficultyId}` as AllTranslationKeys);
  };

  const getDietaryName = (dietaryId: string): string => {
    return translate(`dietary.${dietaryId}` as AllTranslationKeys);
  };

  // Accessibility helpers
  const getAccessibilityLabel = (element: string): string => {
    return translate(`accessibility.${element}` as AllTranslationKeys);
  };

  // Error message helpers
  const getErrorMessage = (errorType: string): string => {
    return translate(`errors.${errorType}` as AllTranslationKeys);
  };

  const getSuccessMessage = (successType: string): string => {
    return translate(`success.${successType}` as AllTranslationKeys);
  };

  return {
    // Core translation functions
    t: translate,
    tt,
    translate,
    plural,

    // Language management
    changeLanguage,
    currentLanguage,
    isEnglish,
    isTurkish,
    isRTL,
    direction,

    // Common helpers
    getAppName,
    getLoadingText,
    getErrorText,
    getNavigationLabel,

    // Formatters
    formatRecipesFound,
    formatSearchWithCount,

    // Category helpers
    getCategoryName,
    getDifficultyName,
    getDietaryName,

    // Accessibility
    getAccessibilityLabel,

    // Messages
    getErrorMessage,
    getSuccessMessage,

    // Original i18n instance for advanced use
    i18n,
  };
};

export default useTranslation;
