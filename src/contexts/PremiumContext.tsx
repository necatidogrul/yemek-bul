/**
 * Premium Context
 * 
 * Premium subscription durumunu yönetir
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { RevenueCatService, PremiumStatus } from '../services/RevenueCatService';
import { PremiumFeature } from '../config/revenueCat';
import { debugLog } from '../config/environment';
import { PaywallModal } from '../components/premium/PaywallModal';

interface PremiumContextType {
  // Premium durumu
  premiumStatus: PremiumStatus;
  isLoading: boolean;
  
  // Premium özellikleri
  hasFeatureAccess: (feature: PremiumFeature) => boolean;
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

export const PremiumProvider: React.FC<PremiumProviderProps> = ({ children }) => {
  const [premiumStatus, setPremiumStatus] = useState<PremiumStatus>({ 
    isPremium: false, 
    isActive: false 
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isPaywallVisible, setIsPaywallVisible] = useState(false);
  const [paywallContext, setPaywallContext] = useState<{
    feature?: string;
    title?: string;
  } | undefined>();

  // RevenueCat'i başlat ve premium durumunu kontrol et
  useEffect(() => {
    initializePremium();
  }, []);

  const initializePremium = async () => {
    try {
      setIsLoading(true);
      
      // RevenueCat'i başlat
      await RevenueCatService.initialize();
      
      // Premium durumunu kontrol et
      await refreshPremiumStatus();
      
    } catch (error) {
      console.error('Premium initialization failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshPremiumStatus = useCallback(async () => {
    try {
      await RevenueCatService.refreshCustomerInfo();
      const status = RevenueCatService.getPremiumStatus();
      setPremiumStatus(status);
      
      debugLog('Premium status updated:', status);
    } catch (error) {
      console.error('Failed to refresh premium status:', error);
    }
  }, []);

  const hasFeatureAccess = useCallback((feature: PremiumFeature): boolean => {
    return RevenueCatService.hasFeatureAccess(feature);
  }, [premiumStatus]);

  const showPaywall = useCallback((feature?: string, title?: string) => {
    setPaywallContext({ feature, title });
    setIsPaywallVisible(true);
  }, []);

  const hidePaywall = useCallback(() => {
    setIsPaywallVisible(false);
    setPaywallContext(undefined);
  }, []);

  const handlePurchaseSuccess = useCallback(() => {
    // Premium durumunu güncelle
    refreshPremiumStatus();
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