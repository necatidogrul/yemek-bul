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
import Constants from 'expo-constants';
import {
  RevenueCatService,
  PremiumStatus,
} from '../services/RevenueCatService';
import { PremiumFeature } from '../config/revenueCat';
import { PaywallModal } from '../components/premium/PaywallModal';

// Debug helper
const debugLog = (message: string, data?: any) => {
  if (__DEV__) {
    console.log(message, data || '');
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
  refreshPremiumStatus: () => Promise<void>;
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

  // RevenueCat'i başlat ve premium durumunu kontrol et
  useEffect(() => {
    // Context mount olduktan sonra başlat
    const timer = setTimeout(() => {
      initializePremium();
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

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
      console.error('Premium initialization failed:', error);

      // Hata olsa bile uygulamanın çalışmasına devam et
      setPremiumStatus({
        isPremium: false,
        isActive: false,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const refreshPremiumStatus = useCallback(async () => {
    try {
      // Customer info'yu refresh et
      await RevenueCatService.refreshCustomerInfo();

      // Premium durumunu al
      const status = await RevenueCatService.getPremiumStatus();
      setPremiumStatus(status);

      debugLog('Premium status updated:', status);
    } catch (error) {
      console.error('Failed to refresh premium status:', error);

      // Hata durumunda premium'u false yap
      setPremiumStatus({
        isPremium: false,
        isActive: false,
      });
    }
  }, []);

  const hasFeatureAccess = useCallback(
    async (feature: PremiumFeature): Promise<boolean> => {
      try {
        return await RevenueCatService.hasFeatureAccess(feature);
      } catch (error) {
        console.error('Failed to check feature access:', error);
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

    // Premium durumunu güncelle
    await refreshPremiumStatus();

    // Paywall'ı kapat
    hidePaywall();
  }, [refreshPremiumStatus, hidePaywall]);

  const value: PremiumContextType = {
    // Premium durumu
    premiumStatus,
    isLoading,

    // Premium özellikleri
    hasFeatureAccess,
    isPremium: premiumStatus.isPremium && premiumStatus.isActive,

    // Paywall yönetimi
    showPaywall,
    hidePaywall,
    isPaywallVisible,
    paywallContext,

    // Actions
    refreshPremiumStatus,
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
