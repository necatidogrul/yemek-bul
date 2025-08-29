import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserPreferencesService } from './src/services/UserPreferencesService';
import { RevenueCatService } from './src/services/RevenueCatService';

// Initialize i18n
import './src/locales';

// Contexts
import { ThemeProvider } from './src/contexts/ThemeContext';
import { ToastProvider } from './src/contexts/ToastContext';
import { TourProvider } from './src/contexts/TourContext';
import { PremiumProvider } from './src/contexts/PremiumContext';
import { HapticProvider } from './src/hooks/useHaptics';
import { LanguageProvider } from './src/contexts/LanguageContext';

// UI Components
import TourOverlay from './src/components/ui/TourOverlay';
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

  useEffect(() => {
    initializeApp();
  }, []);

  // Timeout helper to avoid indefinite hangs (e.g., 3rd-party SDK init)
  const withTimeout = async <T,>(
    promise: Promise<T>,
    ms: number,
    onTimeout?: () => void
  ): Promise<T | null> => {
    let timeoutId: NodeJS.Timeout;
    const timeoutPromise = new Promise<null>(resolve => {
      timeoutId = setTimeout(() => {
        if (onTimeout) onTimeout();
        resolve(null);
      }, ms);
    });

    const result = await Promise.race([promise as any, timeoutPromise]);
    clearTimeout(timeoutId!);
    return result as T | null;
  };

  const initializeApp = async () => {
    try {
      // 1) Initialize RevenueCat first (critical for premium features)
      console.log('🚀 Initializing RevenueCat...');
      const revenueCatResult = await withTimeout(
        RevenueCatService.initialize(),
        10000, // 10 second timeout for production
        () => {
          console.warn('⚠️ RevenueCat initialization timed out, continuing...');
          return null;
        }
      );

      if (revenueCatResult === null) {
        console.warn('⚠️ RevenueCat initialization failed or timed out');
      } else {
        console.log('✅ RevenueCat initialized successfully');
      }

      // 2) Check onboarding status
      await checkOnboardingStatus();
    } catch (error) {
      console.error('App initialization error:', error);

      // Onboarding status is already checked; nothing else to block UI
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
      if (__DEV__) {
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
                    <TourProvider>
                      <NavigationContainer>
                        <MainTabNavigator />
                      </NavigationContainer>
                      <TourOverlay />
                    </TourProvider>
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
