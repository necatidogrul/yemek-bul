import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { changeLanguage, getCurrentLanguage } from '../locales';
import * as Localization from 'expo-localization';

interface LanguageContextType {
  currentLanguage: string;
  changeLanguage: (language: string) => Promise<void>;
  availableLanguages: { code: string; name: string; nativeName: string }[];
  isLoading: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined
);

const LANGUAGE_STORAGE_KEY = 'app_language';

const AVAILABLE_LANGUAGES = [
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
  { code: 'en', name: 'English', nativeName: 'English' },
];

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [currentLanguage, setCurrentLanguage] = useState<string>('tr');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initializeLanguage();
  }, []);

  const initializeLanguage = async () => {
    try {
      // Check if user has saved a language preference
      const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);

      if (
        savedLanguage &&
        AVAILABLE_LANGUAGES.some(lang => lang.code === savedLanguage)
      ) {
        await changeLanguage(savedLanguage);
        setCurrentLanguage(savedLanguage);
      } else {
        // Use device locale with country-based detection
        const locales = Localization.getLocales();
        let defaultLanguage = 'en'; // Default to English for international users

        if (locales && locales.length > 0) {
          const deviceLocale = locales[0];
          const languageCode = deviceLocale.languageCode || 'en';
          const countryCode = deviceLocale.regionCode || null;

          console.log('Language Context - Device locale:', {
            languageCode,
            countryCode,
          });

          // Turkey-specific detection
          if (countryCode === 'TR' || languageCode === 'tr') {
            defaultLanguage = 'tr';
            console.log(
              'Language Context - Setting Turkish based on country/language'
            );
          } else if (
            AVAILABLE_LANGUAGES.some(lang => lang.code === languageCode)
          ) {
            defaultLanguage = languageCode;
            console.log(
              `Language Context - Using device language: ${languageCode}`
            );
          } else {
            console.log('Language Context - Using English fallback');
          }
        }

        await changeLanguage(defaultLanguage);
        setCurrentLanguage(defaultLanguage);
        await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, defaultLanguage);
      }
    } catch (error) {
      console.error('Failed to initialize language:', error);
      // Fallback to English for better international compatibility
      await changeLanguage('en');
      setCurrentLanguage('en');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLanguageChange = async (language: string) => {
    try {
      setIsLoading(true);
      await changeLanguage(language);
      setCurrentLanguage(language);
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    } catch (error) {
      console.error('Failed to change language:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const value: LanguageContextType = {
    currentLanguage,
    changeLanguage: handleLanguageChange,
    availableLanguages: AVAILABLE_LANGUAGES,
    isLoading,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export default LanguageContext;
