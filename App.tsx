import React, { useState, useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { UserPreferencesService } from "./src/services/UserPreferencesService";
import { RevenueCatService } from "./src/services/RevenueCatService";

// Contexts
import { ThemeProvider } from "./src/contexts/ThemeContext";
import { ToastProvider } from "./src/contexts/ToastContext";
import { PremiumProvider } from "./src/contexts/PremiumContext";
import { TourProvider } from "./src/contexts/TourContext";
import { HapticProvider } from "./src/hooks/useHaptics";

// UI Components
import TourOverlay from "./src/components/ui/TourOverlay";
import { ToastContainer } from "./src/components/ui/ToastContainer";
import { ThemedStatusBar } from "./src/components/theme/ThemedStatusBar";
import { GlobalErrorHandler } from "./src/components/error/GlobalErrorHandler";
import { ErrorBoundary } from "./src/components/error/ErrorBoundary";

// Screens
import OnboardingScreen from "./src/screens/OnboardingScreen";

// Import themed navigators  
import { MainTabNavigator } from "./src/components/navigation/ThemedNavigators";

// Re-export navigation types for backward compatibility
export type { 
  HomeStackParamList, 
  FavoritesStackParamList, 
  AllRecipesStackParamList, 
  TabParamList 
} from "./src/components/navigation/ThemedNavigators";

// For backward compatibility
export type RootStackParamList = import("./src/components/navigation/ThemedNavigators").HomeStackParamList;

export default function App(): React.ReactElement {
  const [isOnboardingCompleted, setIsOnboardingCompleted] = useState<boolean | null>(null);
  const [isRevenueCatReady, setIsRevenueCatReady] = useState(false);

  useEffect(() => {
    initializeApp();
  }, []);
  
  const initializeApp = async () => {
    try {
      // Initialize RevenueCat first
      const revenueCatInitialized = await RevenueCatService.initialize();
      if (revenueCatInitialized) {
        // Login anonymously for users who haven't registered
        await RevenueCatService.loginAnonymously();
        setIsRevenueCatReady(true);
      }
      
      // Then check onboarding status
      await checkOnboardingStatus();
    } catch (error) {
      console.error('App initialization error:', error);
      // Continue with app even if RevenueCat fails
      setIsRevenueCatReady(false);
      await checkOnboardingStatus();
    }
  };

  const checkOnboardingStatus = async () => {
    try {
      const preferences = await UserPreferencesService.getUserPreferences();
      setIsOnboardingCompleted(preferences.onboardingCompleted);
    } catch (error) {
      console.error("Onboarding check error:", error);
      setIsOnboardingCompleted(false);
    }
  };

  const handleOnboardingComplete = () => {
    setIsOnboardingCompleted(true);
  };

  // Loading durumu
  if (isOnboardingCompleted === null) {
    return <></>;
  }
  
  // Show loading if RevenueCat is not ready yet
  if (!isRevenueCatReady) {
    // You can show a loading screen here if needed
    // For now, continue with the app
  }

  // Onboarding göster
  if (!isOnboardingCompleted) {
    return (
      <SafeAreaProvider>
        <ErrorBoundary>
          <GlobalErrorHandler>
            <ThemeProvider>
              <HapticProvider>
                <ToastProvider>
                  <OnboardingScreen onComplete={handleOnboardingComplete} />
                  <ToastContainer />
                  <ThemedStatusBar />
                </ToastProvider>
              </HapticProvider>
            </ThemeProvider>
          </GlobalErrorHandler>
        </ErrorBoundary>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <GlobalErrorHandler>
          <ThemeProvider>
            <HapticProvider>
              <ToastProvider>
                <PremiumProvider>
                  <TourProvider>
                    <NavigationContainer>
                      <MainTabNavigator />
                    </NavigationContainer>
                    <TourOverlay />
                  </TourProvider>
                </PremiumProvider>
                <ToastContainer />
                <ThemedStatusBar />
              </ToastProvider>
            </HapticProvider>
          </ThemeProvider>
        </GlobalErrorHandler>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
