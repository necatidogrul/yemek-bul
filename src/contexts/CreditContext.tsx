import React, { createContext, useContext, useState, useEffect } from "react";
import { Alert } from "react-native";
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import {
  UserCredits,
  CreditAction,
  CREDIT_COSTS,
  FREE_LIFETIME_CREDITS,
} from "../types/Credit";
import { getInitialCredits, debugLog, ENV } from "../config/environment";
import { CreditService } from "../services/creditService";
import { Logger } from "../services/LoggerService";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface CreditContextType {
  userCredits: UserCredits | null;
  loading: boolean;
  refreshCredits: () => Promise<void>;
  canAfford: (action: CreditAction) => boolean;
  deductCredits: (
    action: CreditAction,
    description?: string
  ) => Promise<boolean>;
  addCredits: (amount: number, description: string) => Promise<void>;
}

const CreditContext = createContext<CreditContextType | undefined>(undefined);

export const useCreditContext = () => {
  const context = useContext(CreditContext);
  if (!context) {
    throw new Error("useCreditContext must be used within a CreditProvider");
  }
  return context;
};

interface CreditProviderProps {
  children: React.ReactNode;
}

export const CreditProvider: React.FC<CreditProviderProps> = ({ children }) => {
  const [userCredits, setUserCredits] = useState<UserCredits | null>(null);
  const [loading, setLoading] = useState(true);

  Logger.info("🎯 CreditProvider component rendered");

  // Simple immediate initialization - no external dependencies
  useEffect(() => {
    Logger.info("🚀 Simple credit initialization started");

    const initializeCreditsSimply = async () => {
      try {
        // Environment-based credits
        const initialCredits = getInitialCredits();
        debugLog(`🎯 Environment: ${ENV}, giving ${initialCredits} credits`);

        // Generate user ID
        let userId = await AsyncStorage.getItem("user_id");
        if (!userId) {
          if (__DEV__) {
            // Development mode - use simple temp ID
            userId = `temp_${Date.now()}_${Math.random()
              .toString(36)
              .substring(2, 11)}`;
          } else {
            // Production mode - use proper UUID
            userId = uuidv4();
          }
          await AsyncStorage.setItem("user_id", userId!);
          Logger.info(`🆕 Generated new user ID: ${userId}`);
        } else {
          Logger.info(`👤 Found existing user ID: ${userId}`);
        }

        // Try to load existing credits from storage
        let credits: UserCredits;
        const storedCredits = await AsyncStorage.getItem(`user_credits_${userId}`);
        
        if (storedCredits && ENV === 'development') {
          // Load from storage in dev mode
          credits = JSON.parse(storedCredits);
          credits.lastDailyReset = new Date(credits.lastDailyReset);
          credits.createdAt = new Date(credits.createdAt);
          credits.updatedAt = new Date(credits.updatedAt);
          Logger.info(`💾 Loaded credits from storage: ${credits.remainingCredits} remaining`);
        } else {
          // Create new credits
          credits = {
            userId: userId!,
            totalCredits: initialCredits,
            usedCredits: 0,
            remainingCredits: initialCredits,
            dailyFreeCredits: 0,
            dailyFreeUsed: 0,
            lastDailyReset: new Date(),
            lifetimeCreditsEarned: initialCredits,
            lifetimeCreditsSpent: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          
          // Save to storage in dev mode
          if (ENV === 'development') {
            await AsyncStorage.setItem(`user_credits_${userId}`, JSON.stringify(credits));
          }
          Logger.info(`🆕 Created new credits: ${credits.remainingCredits} remaining`);
        }

        setUserCredits(credits);
        setLoading(false);
        Logger.info("✅ Credits set successfully:", credits);
      } catch (error) {
        Logger.error(
          "💥 Failed to initialize credits:",
          error as Error
        );
        setLoading(false);
      }
    };

    initializeCreditsSimply();
  }, []);

  // Normal fonksiyonlar - useCallback kullanmıyoruz
  const refreshCredits = async () => {
    const userId = userCredits?.userId;
    if (!userId) return;

    if (ENV === 'development') {
      // Development mode: no need to refresh from service
      debugLog("🔄 DEV MODE: Skipping credit refresh from service");
      return;
    }

    try {
      const updatedCredits = await CreditService.getUserCredits(userId);
      if (updatedCredits) {
        setUserCredits(updatedCredits);
      }
    } catch (error) {
      Logger.error("Failed to refresh credits:", error as Error);
    }
  };

  const canAfford = (action: CreditAction): boolean => {
    if (!userCredits) return false;
    const cost = CREDIT_COSTS[action] || 0;
    return userCredits.remainingCredits >= cost;
  };

  const deductCredits = async (
    action: CreditAction,
    description?: string
  ): Promise<boolean> => {
    const currentCredits = userCredits;
    if (!currentCredits) {
      Logger.warn("CreditContext", "No user credits available for deduction");
      return false;
    }

    const cost = CREDIT_COSTS[action] || 0;
    if (cost === 0) {
      Logger.info(
        `Action ${action} is free, no credit deduction needed`
      );
      return true;
    }

    if (currentCredits.remainingCredits < cost) {
      Logger.warn(
        "CreditContext",
        `Insufficient credits for action: ${action}. Required: ${cost}, Available: ${currentCredits.remainingCredits}`
      );
      Alert.alert("Yetersiz Kredi", "Daha fazla kredi satın alın.");
      return false;
    }

    try {
      let success = false;

      if (ENV === 'development') {
        // Development mode: just update local state
        success = true;
        debugLog(`🔧 DEV MODE: Deducting ${cost} credits for ${action}`);
      } else {
        // Production mode: use CreditService
        success = await CreditService.deductCredits(
          currentCredits.userId,
          action,
          cost,
          description || `${action} action`
        );
      }

      if (success) {
        setUserCredits((prevCredits) => {
          if (!prevCredits) return null;
          const newCredits = {
            ...prevCredits,
            usedCredits: prevCredits.usedCredits + cost,
            remainingCredits: prevCredits.remainingCredits - cost,
            lifetimeCreditsSpent: prevCredits.lifetimeCreditsSpent + cost,
            updatedAt: new Date(),
          };
          // Credit update logged securely
          
          // Save to AsyncStorage in dev mode
          if (ENV === 'development') {
            AsyncStorage.setItem(`user_credits_${newCredits.userId}`, JSON.stringify(newCredits))
              .catch(error => Logger.error('Failed to save credits to storage:', error));
          }
          
          return newCredits;
        });

        Logger.info(
          `Successfully deducted ${cost} credits for ${action}`
        );
        console.log(`✅ ${cost} kredi kullanıldı`);

        // Only refresh from service in production
        if (ENV !== 'development') {
          setTimeout(() => refreshCredits(), 1000);
        }
      } else {
        Alert.alert("Hata", "Kredi düşme işlemi başarısız oldu");
      }

      return success;
    } catch (error) {
      Logger.error("Failed to deduct credits:", error as Error);
      Alert.alert("Hata", "Kredi işlemi sırasında hata oluştu");
      return false;
    }
  };

  const addCredits = async (amount: number, description: string) => {
    const userId = userCredits?.userId;
    if (!userId) return;

    try {
      if (ENV === 'development') {
        // Development mode: just update local state
        debugLog(`🔧 DEV MODE: Adding ${amount} credits`);
      } else {
        // Production mode: use CreditService
        await CreditService.addCredits(userId, amount, description);
      }

      setUserCredits((prevCredits) => {
        if (!prevCredits) return null;
        const newCredits = {
          ...prevCredits,
          totalCredits: prevCredits.totalCredits + amount,
          remainingCredits: prevCredits.remainingCredits + amount,
          lifetimeCreditsEarned: prevCredits.lifetimeCreditsEarned + amount,
          updatedAt: new Date(),
        };
        // Credit addition logged securely
        
        // Save to AsyncStorage in dev mode
        if (ENV === 'development') {
          AsyncStorage.setItem(`user_credits_${newCredits.userId}`, JSON.stringify(newCredits))
            .catch(error => Logger.error('Failed to save credits to storage:', error));
        }
        
        return newCredits;
      });

      Logger.info(
        `Successfully added ${amount} credits: ${description}`
      );
      console.log(`✅ ${amount} kredi eklendi!`);

      // RefreshCredits'i 1 saniye sonra çağır
      setTimeout(() => refreshCredits(), 1000);
    } catch (error) {
      Logger.error("Failed to add credits:", error as Error);
      Alert.alert("Hata", "Kredi ekleme işlemi başarısız oldu");
    }
  };

  const value: CreditContextType = {
    userCredits,
    loading,
    refreshCredits,
    canAfford,
    deductCredits,
    addCredits,
  };

  return (
    <CreditContext.Provider value={value}>{children}</CreditContext.Provider>
  );
};
