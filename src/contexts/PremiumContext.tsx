/**
 * Premium Context
 *
 * Premium subscription durumunu yönetir
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { AppState, AppStateStatus } from 'react-native';
import Constants from 'expo-constants';
import {
  RevenueCatService,
  PremiumStatus,
} from '../services/RevenueCatService';
import { PremiumFeature } from '../config/revenueCat';
import { PaywallModal } from '../components/premium/PaywallModal';
import { Logger } from '../services/LoggerService';

// Debug helper
const debugLog = (message: string, data?: any) => {
  if (__DEV__) {
    Logger.info(message, data || '');
  }
};

interface PremiumContextType {
  // Premium durumu
  premiumStatus: PremiumStatus;
  isLoading: boolean;

  // Premium özellikleri
  hasFeatureAccess: (feature: PremiumFeature) => Promise<boolean>;
  isPremium: boolean;

  // Paywall yönetimi
  showPaywall: (feature?: string, title?: string) => void;
  hidePaywall: () => void;
  isPaywallVisible: boolean;
  paywallContext?: {
    feature?: string;
    title?: string;
  };

  // Actions
  refreshPremiumStatus: (forceRefresh?: boolean) => Promise<void>;
  handlePurchaseSuccess: () => void;
}

const PremiumContext = createContext<PremiumContextType | undefined>(undefined);

interface PremiumProviderProps {
  children: React.ReactNode;
}

export const PremiumProvider: React.FC<PremiumProviderProps> = ({
  children,
}) => {
  const [premiumStatus, setPremiumStatus] = useState<PremiumStatus>({
    isPremium: false,
    isActive: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isPaywallVisible, setIsPaywallVisible] = useState(false);
  const [paywallContext, setPaywallContext] = useState<
    | {
        feature?: string;
        title?: string;
      }
    | undefined
  >();

  // Premium durumu yenileme fonksiyonu - en üstte tanımla
  const refreshPremiumStatus = useCallback(async (forceRefresh = false) => {
    try {
      debugLog('Refreshing premium status', { forceRefresh });
      
      // Customer info'yu refresh et - force refresh ile
      if (forceRefresh) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      await RevenueCatService.refreshCustomerInfo();

      // Premium durumunu al
      const status = await RevenueCatService.getPremiumStatus();
      
      // Mevcut durumla karşılaştır
      const hasChanged = premiumStatus.isPremium !== status.isPremium || 
                        premiumStatus.isActive !== status.isActive;
      
      setPremiumStatus(status);

      debugLog('Premium status updated:', { 
        previous: premiumStatus, 
        current: status, 
        hasChanged 
      });
      
      if (hasChanged) {
        debugLog('Premium status changed, triggering UI updates');
      }
    } catch (error) {
      Logger.error('Failed to refresh premium status:', error);

      // Hata durumunda premium'u false yap
      setPremiumStatus({
        isPremium: false,
        isActive: false,
      });
    }
  }, [premiumStatus]);

  // RevenueCat'i başlat ve premium durumunu kontrol et
  useEffect(() => {
    // Context mount olduktan sonra başlat
    const timer = setTimeout(() => {
      initializePremium();
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // App lifecycle yönetimi - background'dan döndüğünde premium durumunu kontrol et
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && !isLoading) {
        debugLog('App became active, refreshing premium status');
        refreshPremiumStatus();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [isLoading, refreshPremiumStatus]);

  const initializePremium = async () => {
    try {
      setIsLoading(true);

      // Expo Go kontrolü
      const isExpoGo = Constants.appOwnership === 'expo';

      if (isExpoGo) {
        debugLog('📱 Expo Go detected - Premium features will not work');
        setIsLoading(false);
        return;
      }

      // RevenueCat Service'i başlat (App.tsx'te configure edildikten sonra)
      debugLog('⏳ Initializing RevenueCat Service...');
      await RevenueCatService.initialize();
      debugLog('✅ RevenueCat Service initialized in PremiumContext');

      // Premium durumunu kontrol et
      await refreshPremiumStatus();
    } catch (error) {
      Logger.error('Premium initialization failed:', error);

      // Hata olsa bile uygulamanın çalışmasına devam et
      setPremiumStatus({
        isPremium: false,
        isActive: false,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const hasFeatureAccess = useCallback(
    async (feature: PremiumFeature): Promise<boolean> => {
      try {
        // Development override kontrolü
        const isDevelopmentPremiumOverride = __DEV__ && process.env.EXPO_PUBLIC_DEBUG_PREMIUM === 'true';
        
        if (isDevelopmentPremiumOverride) {
          debugLog('🔧 DEBUG: hasFeatureAccess overridden to TRUE for development');
          return true;
        }
        
        return await RevenueCatService.hasFeatureAccess(feature);
      } catch (error) {
        Logger.error('Failed to check feature access:', error);
        return false;
      }
    },
    []
  );

  const showPaywall = useCallback((feature?: string, title?: string) => {
    debugLog('Showing paywall:', { feature, title });
    setPaywallContext({ feature, title });
    setIsPaywallVisible(true);
  }, []);

  const hidePaywall = useCallback(() => {
    debugLog('Hiding paywall');
    setIsPaywallVisible(false);
    setPaywallContext(undefined);
  }, []);

  const handlePurchaseSuccess = useCallback(async () => {
    debugLog('Purchase successful, refreshing premium status');

    // RevenueCat'in cache'ini temizlemek için kısa bir bekleme
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Premium durumunu güncelle
    await refreshPremiumStatus();

    // Paywall'ı kapat
    hidePaywall();

    debugLog('Purchase success handled, premium status updated');
  }, [refreshPremiumStatus, hidePaywall]);

  // Development ortamında debug için premium durumunu override et
  const isDevelopmentPremiumOverride = __DEV__ && process.env.EXPO_PUBLIC_DEBUG_PREMIUM === 'true';
  const effectiveIsPremium = isDevelopmentPremiumOverride || (premiumStatus.isPremium && premiumStatus.isActive);

  if (isDevelopmentPremiumOverride) {
    debugLog('🔧 DEBUG: Premium status overridden to TRUE for development');
  }

  const value: PremiumContextType = {
    // Premium durumu
    premiumStatus,
    isLoading,

    // Premium özellikleri
    hasFeatureAccess,
    isPremium: effectiveIsPremium,

    // Paywall yönetimi
    showPaywall,
    hidePaywall,
    isPaywallVisible,
    paywallContext,

    // Actions
    refreshPremiumStatus: (forceRefresh?: boolean) => refreshPremiumStatus(forceRefresh || false),
    handlePurchaseSuccess,
  };

  return (
    <PremiumContext.Provider value={value}>
      {children}
      <PaywallModal
        isVisible={isPaywallVisible}
        onClose={hidePaywall}
        onPurchaseSuccess={handlePurchaseSuccess}
        title={paywallContext?.title}
        feature={paywallContext?.feature}
      />
    </PremiumContext.Provider>
  );
};

// Custom hook
export const usePremium = (): PremiumContextType => {
  const context = useContext(PremiumContext);

  if (context === undefined) {
    throw new Error('usePremium must be used within a PremiumProvider');
  }

  return context;
};
