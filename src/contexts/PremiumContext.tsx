import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { RevenueCatService, PremiumStatus } from '../services/RevenueCatService';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface PremiumContextType {
  isPremium: boolean;
  isLoading: boolean;
  subscriptionInfo: PremiumStatus | null;
  purchasePremium: () => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  refreshStatus: () => Promise<void>;
}

const PremiumContext = createContext<PremiumContextType | undefined>(undefined);

interface PremiumProviderProps {
  children: ReactNode;
}

export const PremiumProvider: React.FC<PremiumProviderProps> = ({ children }) => {
  const [isPremium, setIsPremium] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [subscriptionInfo, setSubscriptionInfo] = useState<PremiumStatus | null>(null);

  // Component mount'ta durumu kontrol et
  useEffect(() => {
    initializePremiumStatus();
  }, []);

  const initializePremiumStatus = async () => {
    try {
      setIsLoading(true);
      
      // RevenueCat'i başlat
      await RevenueCatService.initialize();
      
      // Cached durumu kontrol et
      const cachedStatus = await AsyncStorage.getItem('premium_status');
      if (cachedStatus) {
        const cached = JSON.parse(cachedStatus);
        setIsPremium(cached.isPremium);
      }
      
      // Güncel durumu kontrol et
      await refreshStatus();
    } catch (error) {
      console.error('Premium status initialization error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshStatus = async () => {
    try {
      const [status, info] = await Promise.all([
        RevenueCatService.checkSubscriptionStatus(),
        RevenueCatService.getSubscriptionInfo()
      ]);
      
      setIsPremium(status);
      setSubscriptionInfo(info);
      
      // Cache'le
      await AsyncStorage.setItem('premium_status', JSON.stringify({
        isPremium: status,
        lastChecked: new Date().toISOString()
      }));
    } catch (error) {
      console.error('Refresh premium status error:', error);
    }
  };

  const purchasePremium = async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      const result = await RevenueCatService.purchasePremium();
      
      if (result.success) {
        await refreshStatus();
        return true;
      }
      
      return false;
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
      }
      
      return false;
    } catch (error) {
      console.error('Restore purchases error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const value: PremiumContextType = {
    isPremium,
    isLoading,
    subscriptionInfo,
    purchasePremium,
    restorePurchases,
    refreshStatus
  };

  return (
    <PremiumContext.Provider value={value}>
      {children}
    </PremiumContext.Provider>
  );
};

// Hook
export const usePremium = (): PremiumContextType => {
  const context = useContext(PremiumContext);
  
  if (context === undefined) {
    throw new Error('usePremium must be used within a PremiumProvider');
  }
  
  return context;
}; 