import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import Constants from 'expo-constants';
import { UserPreferencesService } from './src/services/UserPreferencesService';
import { RevenueCatService } from './src/services/RevenueCatService';
import { isProduction } from './src/config/environment';

// Initialize i18n
import './src/locales';

// Contexts
import { ThemeProvider } from './src/contexts/ThemeContext';
import { ToastProvider } from './src/contexts/ToastContext';
import { PremiumProvider } from './src/contexts/PremiumContext';
import { HapticProvider } from './src/hooks/useHaptics';
import { LanguageProvider } from './src/contexts/LanguageContext';

// UI Components
import { ToastContainer } from './src/components/ui/ToastContainer';
import { ThemedStatusBar } from './src/components/theme/ThemedStatusBar';
import { GlobalErrorHandler } from './src/components/error/GlobalErrorHandler';
import { ErrorBoundary } from './src/components/error/ErrorBoundary';

// Screens
import OnboardingScreen from './src/screens/OnboardingScreen';

// Import themed navigators
import { MainTabNavigator } from './src/components/navigation/ThemedNavigators';

// Re-export navigation types for backward compatibility
export type {
  HomeStackParamList,
  FavoritesStackParamList,
  HistoryStackParamList,
  TabParamList,
} from './src/components/navigation/ThemedNavigators';

// For backward compatibility
export type RootStackParamList =
  import('./src/components/navigation/ThemedNavigators').HomeStackParamList;

export default function App(): React.ReactElement {
  const [isOnboardingCompleted, setIsOnboardingCompleted] = useState<
    boolean | null
  >(null);
  const [revenueCatInitialized, setRevenueCatInitialized] = useState(false);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeRevenueCat = async (): Promise<boolean> => {
    try {
      console.log('🚀 Starting RevenueCat initialization...');

      // Expo Go kontrolü
      const isExpoGo = Constants.appOwnership === 'expo';

      if (isExpoGo) {
        console.log('📱 Running in Expo Go - RevenueCat will not work');
        console.log(
          '💡 To test RevenueCat, use: eas build --profile development'
        );
        return false;
      }

      // API Key'leri al - öncelik sırası:
      // 1. Environment variables (.env)
      // 2. Expo config extra
      // 3. Hardcoded (sadece development için)
      let apiKey = '';

      if (Platform.OS === 'ios') {
        apiKey =
          process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY ||
          Constants.expoConfig?.extra?.revenueCatIosKey ||
          'appl_aAFWiEGXPfzbOgzBYpVMbfvojQD';
      } else {
        apiKey =
          process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY ||
          Constants.expoConfig?.extra?.revenueCatAndroidKey ||
          '';
      }

      if (!apiKey) {
        throw new Error(`No RevenueCat API key found for ${Platform.OS}`);
      }

      console.log(`🔑 Using API key: ${apiKey.substring(0, 15)}...`);

      // Debug mode ve sandbox ayarları
      if (__DEV__ || !isProduction()) {
        Purchases.setLogLevel(LOG_LEVEL.DEBUG);
        console.log('🔧 Debug logging enabled for RevenueCat');
      } else {
        Purchases.setLogLevel(LOG_LEVEL.ERROR);
      }

      // Configure RevenueCat - Önemli: Bu sadece bir kez çağrılmalı!
      console.log('⚙️ Configuring RevenueCat...');

      // TestFlight ve Sandbox builds için özel yapılandırma
      const configuration = {
        apiKey: apiKey,
        appUserID: null, // RevenueCat otomatik ID oluştursun
        observerMode: false, // False = RevenueCat satın almaları yönetsin
        useAmazon: false,
      };

      await Purchases.configure(configuration);

      console.log('✅ RevenueCat configured successfully');

      // Customer info'yu test et
      try {
        const customerInfo = await Purchases.getCustomerInfo();
        console.log('👤 Customer info retrieved:', {
          userId: customerInfo.originalAppUserId,
          entitlements: Object.keys(customerInfo.entitlements.all),
          activeEntitlements: Object.keys(customerInfo.entitlements.active),
        });
      } catch (infoError) {
        console.warn('⚠️ Could not get initial customer info:', infoError);
      }

      // Offerings'leri kontrol et
      try {
        const offerings = await Purchases.getOfferings();
        console.log('📦 Initial offerings check:', {
          hasCurrent: !!offerings.current,
          currentId: offerings.current?.identifier,
          allCount: Object.keys(offerings.all).length,
        });

        if (!offerings.current && Object.keys(offerings.all).length === 0) {
          console.warn('⚠️ No offerings configured in RevenueCat dashboard');
          console.log('📋 Please check: https://app.revenuecat.com/');
        }
      } catch (offeringsError) {
        console.warn('⚠️ Could not fetch initial offerings:', offeringsError);
      }

      return true;
    } catch (error: any) {
      console.error('❌ RevenueCat initialization failed:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        userInfo: error.userInfo,
      });

      // Development'ta hata olsa bile devam et
      if (__DEV__) {
        console.log('🔧 Development mode: Continuing without RevenueCat');
        return false;
      }

      // Production'da hata fırlat
      throw error;
    }
  };

  const initializeApp = async () => {
    try {
      // 1) RevenueCat'i initialize et
      const rcInitialized = await initializeRevenueCat();
      setRevenueCatInitialized(rcInitialized);

      // 2) RevenueCat Service'i initialize et (sadece başarılı olursa)
      if (rcInitialized) {
        // Service initialization için biraz bekle
        await new Promise(resolve => setTimeout(resolve, 500));

        try {
          await RevenueCatService.initialize();
          console.log('✅ RevenueCat service layer initialized');

          // Service hazır olduğunu doğrula
          const debugInfo = RevenueCatService.getDebugInfo();
          console.log('📊 RevenueCat Debug Info:', debugInfo);
        } catch (serviceError) {
          console.error('⚠️ RevenueCat service init failed:', serviceError);
          // Service hatası kritik değil, devam et
        }
      }

      // 3) Check onboarding status
      await checkOnboardingStatus();
    } catch (error) {
      console.error('App initialization error:', error);
      // Hata olsa bile onboarding kontrolüne devam et
      await checkOnboardingStatus();
    }
  };

  const checkOnboardingStatus = async () => {
    try {
      const preferences = await UserPreferencesService.getUserPreferences();
      console.log('🔍 Onboarding status check:', {
        onboardingCompleted: preferences.onboardingCompleted,
        fullPreferences: preferences,
      });

      // DEVELOPMENT ONLY: Force onboarding to show for testing
      if (__DEV__ && false) {
        // false yaparak onboarding'i atlayabilirsiniz
        // Reset onboarding for development
        await AsyncStorage.removeItem('onboarding_completed');
        await AsyncStorage.removeItem('user_preferences');
        console.log('🔄 Reset onboarding for testing');
        setIsOnboardingCompleted(false);
        return;
      }

      setIsOnboardingCompleted(preferences.onboardingCompleted);
    } catch (error) {
      console.error('Onboarding check error:', error);
      setIsOnboardingCompleted(false);
    }
  };

  const handleOnboardingComplete = async () => {
    console.log('🎉 Onboarding completed, updating state');
    setIsOnboardingCompleted(true);

    // Double-check that it was actually saved
    try {
      const preferences = await UserPreferencesService.getUserPreferences();
      console.log(
        '✅ Verified onboarding status after completion:',
        preferences.onboardingCompleted
      );
    } catch (error) {
      console.error('Error verifying onboarding completion:', error);
    }
  };

  // Loading durumu
  if (isOnboardingCompleted === null) {
    return <></>;
  }

  // Onboarding göster
  if (!isOnboardingCompleted) {
    return (
      <SafeAreaProvider>
        <ErrorBoundary>
          <LanguageProvider>
            <ThemeProvider>
              <HapticProvider>
                <ToastProvider>
                  <PremiumProvider>
                    <GlobalErrorHandler>
                      <OnboardingScreen onComplete={handleOnboardingComplete} />
                      <ToastContainer />
                      <ThemedStatusBar />
                    </GlobalErrorHandler>
                  </PremiumProvider>
                </ToastProvider>
              </HapticProvider>
            </ThemeProvider>
          </LanguageProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <LanguageProvider>
          <ThemeProvider>
            <HapticProvider>
              <ToastProvider>
                <PremiumProvider>
                  <GlobalErrorHandler>
                    <NavigationContainer>
                      <MainTabNavigator />
                    </NavigationContainer>
                    <ToastContainer />
                    <ThemedStatusBar />
                  </GlobalErrorHandler>
                </PremiumProvider>
              </ToastProvider>
            </HapticProvider>
          </ThemeProvider>
        </LanguageProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
