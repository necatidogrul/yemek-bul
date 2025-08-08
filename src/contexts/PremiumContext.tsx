import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { RevenueCatService, SubscriptionInfo, OfferingInfo } from '../services/RevenueCatService';
import { Logger } from '../services/LoggerService';

interface PremiumContextType {
  isPremium: boolean;
  isLoading: boolean;
  subscriptionInfo: SubscriptionInfo | null;
  availableOfferings: OfferingInfo[];
  purchasePremium: (packageId?: string) => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  refreshStatus: () => Promise<void>;
  isInFreeTrial: boolean;
  getSubscriptionManagementURL: () => string;
}

const PremiumContext = createContext<PremiumContextType | undefined>(undefined);

interface PremiumProviderProps {
  children: ReactNode;
}

export const PremiumProvider: React.FC<PremiumProviderProps> = ({ children }) => {
  const [isPremium, setIsPremium] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo | null>(null);
  const [availableOfferings, setAvailableOfferings] = useState<OfferingInfo[]>([]);
  const [isInFreeTrial, setIsInFreeTrial] = useState<boolean>(false);

  useEffect(() => {
    initializePremiumStatus();
  }, []);

  const initializePremiumStatus = async () => {
    try {
      setIsLoading(true);
      
      // RevenueCat should already be initialized in App.tsx
      if (!RevenueCatService.isReady()) {
        console.warn('RevenueCat not ready during PremiumContext initialization');
        return;
      }
      
      // Load available offerings
      await loadOfferings();
      
      // Get current subscription status
      await refreshStatus();
    } catch (error) {
      console.error('Premium status initialization error:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const loadOfferings = async () => {
    try {
      const offerings = await RevenueCatService.getOfferings();
      setAvailableOfferings(offerings);
      console.log(`✅ Loaded ${offerings.length} offerings`);
    } catch (error) {
      console.error('Load offerings error:', error);
      setAvailableOfferings([]);
    }
  };

  const refreshStatus = async () => {
    try {
      const info = await RevenueCatService.getSubscriptionInfo();
      setSubscriptionInfo(info);
      setIsPremium(info.isPremium);

      // Check if user is in free trial
      if (info.isPremium) {
        const trialStatus = await RevenueCatService.isInFreeTrial();
        setIsInFreeTrial(trialStatus);
      } else {
        setIsInFreeTrial(false);
      }

      console.log(`🔄 Premium status refreshed: ${info.isPremium ? 'Premium' : 'Free'}`);
      if (info.isPremium && info.expirationDate && info.expirationDate instanceof Date) {
        console.log(`📅 Expires: ${info.expirationDate.toLocaleDateString()}`);
      }
    } catch (error) {
      console.error('Refresh status error:', error);
    }
  };

  const purchasePremium = async (packageId?: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      const result = await RevenueCatService.purchasePremium(packageId);
      
      if (result.success) {
        await refreshStatus();
        return true;
      } else {
        console.error('Purchase failed:', result.error);
        return false;
      }
    } catch (error) {
      console.error('Purchase premium error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const restorePurchases = async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      const result = await RevenueCatService.restorePurchases();
      
      if (result.success) {
        await refreshStatus();
        return true;
      } else {
        console.error('Restore failed:', result.error);
        return false;
      }
    } catch (error) {
      console.error('Restore purchases error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const getSubscriptionManagementURL = (): string => {
    return RevenueCatService.getSubscriptionManagementURL();
  };

  const value: PremiumContextType = {
    isPremium,
    isLoading,
    subscriptionInfo,
    availableOfferings,
    purchasePremium,
    restorePurchases,
    refreshStatus,
    isInFreeTrial,
    getSubscriptionManagementURL,
  };

  return (
    <PremiumContext.Provider value={value}>
      {children}
    </PremiumContext.Provider>
  );
};

export const usePremium = (): PremiumContextType => {
  const context = useContext(PremiumContext);
  if (!context) {
    throw new Error('usePremium must be used within a PremiumProvider');
  }
  return context;
};

export default PremiumContext;