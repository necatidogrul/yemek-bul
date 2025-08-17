import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import { tr } from './tr';
import { en } from './en';

// Define translation resources
const resources = {
  tr: { translation: tr },
  en: { translation: en },
};

// Get device locale
const getDeviceLocale = (): string => {
  const locale = Localization.getLocales()[0]?.languageCode || 'tr';
  // Default to Turkish if not supported, otherwise use device language
  return ['tr', 'en'].includes(locale) ? locale : 'tr';
};

// Initialize i18n
i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getDeviceLocale(),
    fallbackLng: 'tr', // Default to Turkish
    
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    
    // Cache options
    debug: __DEV__,
    
    // Namespace options
    defaultNS: 'translation',
    ns: ['translation'],
    
    // React options
    react: {
      useSuspense: false,
    },
    
    // Detection options
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

export default i18n;

// Export helper functions
export const changeLanguage = (language: string) => {
  return i18n.changeLanguage(language);
};

export const getCurrentLanguage = () => {
  return i18n.language;
};

export const getSupportedLanguages = () => {
  return Object.keys(resources);
};

// Export translation type for TypeScript
export type TranslationKey = keyof typeof tr;
export type NestedTranslationKey<T> = T extends object 
  ? { [K in keyof T]: T[K] extends object 
      ? `${K & string}.${NestedTranslationKey<T[K]> & string}` 
      : K & string 
    }[keyof T]
  : never;

export type AllTranslationKeys = NestedTranslationKey<typeof tr>;