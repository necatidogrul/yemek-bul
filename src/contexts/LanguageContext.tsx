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

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const LANGUAGE_STORAGE_KEY = 'app_language';

const AVAILABLE_LANGUAGES = [
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
  { code: 'en', name: 'English', nativeName: 'English' },
];

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState<string>('tr');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initializeLanguage();
  }, []);

  const initializeLanguage = async () => {
    try {
      // Check if user has saved a language preference
      const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
      
      if (savedLanguage && AVAILABLE_LANGUAGES.some(lang => lang.code === savedLanguage)) {
        await changeLanguage(savedLanguage);
        setCurrentLanguage(savedLanguage);
      } else {
        // Use device locale as default
        const deviceLocale = Localization.getLocales()[0]?.languageCode || 'tr';
        const supportedDeviceLanguage = AVAILABLE_LANGUAGES.find(lang => lang.code === deviceLocale);
        const defaultLanguage = supportedDeviceLanguage ? deviceLocale : 'tr';
        
        await changeLanguage(defaultLanguage);
        setCurrentLanguage(defaultLanguage);
        await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, defaultLanguage);
      }
    } catch (error) {
      console.error('Failed to initialize language:', error);
      // Fallback to Turkish
      await changeLanguage('tr');
      setCurrentLanguage('tr');
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