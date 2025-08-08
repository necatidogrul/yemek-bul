import AsyncStorage from '@react-native-async-storage/async-storage';
import { Logger } from '../services/LoggerService';

export interface UsageLimit {
  dailyRecipeViews: number;
  dailySearches: number;
  lastResetDate: string;
  totalUsageToday: number;
}

export interface UsageConfig {
  FREE_DAILY_RECIPE_LIMIT: number;
  FREE_DAILY_SEARCH_LIMIT: number;
  PREMIUM_DAILY_RECIPE_LIMIT: number;
  PREMIUM_DAILY_SEARCH_LIMIT: number;
}

const USAGE_CONFIG: UsageConfig = {
  FREE_DAILY_RECIPE_LIMIT: 10,
  FREE_DAILY_SEARCH_LIMIT: 15,
  PREMIUM_DAILY_RECIPE_LIMIT: -1, // Unlimited
  PREMIUM_DAILY_SEARCH_LIMIT: -1, // Unlimited
};

const STORAGE_KEYS = {
  USAGE_LIMIT: 'usage_limit_data',
} as const;

export class UsageLimitService {
  /**
   * Get current usage data
   */
  static async getCurrentUsage(): Promise<UsageLimit> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.USAGE_LIMIT);
      const today = new Date().toDateString();
      
      if (stored) {
        try {
          const usage: UsageLimit = JSON.parse(stored);
          
          // Reset if it's a new day
          if (usage.lastResetDate !== today) {
            return this.resetDailyUsage();
          }
          
          return usage;
        } catch (error) {
          console.warn('Invalid usage data stored, resetting:', error);
          return this.resetDailyUsage();
        }
      }
      
      // Initialize for first time
      return this.resetDailyUsage();
    } catch (error) {
      console.error('Error getting usage data:', error);
      return this.resetDailyUsage();
    }
  }

  /**
   * Reset daily usage counters
   */
  static async resetDailyUsage(): Promise<UsageLimit> {
    const today = new Date().toDateString();
    const initialUsage: UsageLimit = {
      dailyRecipeViews: 0,
      dailySearches: 0,
      lastResetDate: today,
      totalUsageToday: 0,
    };
    
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USAGE_LIMIT, JSON.stringify(initialUsage));
      return initialUsage;
    } catch (error) {
      console.error('Error resetting usage data:', error);
      return initialUsage;
    }
  }

  /**
   * Increment recipe view count
   */
  static async incrementRecipeView(): Promise<UsageLimit> {
    try {
      const currentUsage = await this.getCurrentUsage();
      const updatedUsage: UsageLimit = {
        ...currentUsage,
        dailyRecipeViews: currentUsage.dailyRecipeViews + 1,
        totalUsageToday: currentUsage.totalUsageToday + 1,
      };
      
      await AsyncStorage.setItem(STORAGE_KEYS.USAGE_LIMIT, JSON.stringify(updatedUsage));
      return updatedUsage;
    } catch (error) {
      console.error('Error incrementing recipe view:', error);
      return await this.getCurrentUsage();
    }
  }

  /**
   * Increment search count
   */
  static async incrementSearch(): Promise<UsageLimit> {
    try {
      const currentUsage = await this.getCurrentUsage();
      const updatedUsage: UsageLimit = {
        ...currentUsage,
        dailySearches: currentUsage.dailySearches + 1,
        totalUsageToday: currentUsage.totalUsageToday + 1,
      };
      
      await AsyncStorage.setItem(STORAGE_KEYS.USAGE_LIMIT, JSON.stringify(updatedUsage));
      return updatedUsage;
    } catch (error) {
      console.error('Error incrementing search:', error);
      return await this.getCurrentUsage();
    }
  }

  /**
   * Check if user can view more recipes (free users)
   */
  static async canViewRecipe(isPremium: boolean = false): Promise<{
    canView: boolean;
    remainingViews: number;
    limitReached: boolean;
  }> {
    if (isPremium) {
      return {
        canView: true,
        remainingViews: -1, // Unlimited
        limitReached: false,
      };
    }

    const usage = await this.getCurrentUsage();
    const limit = USAGE_CONFIG.FREE_DAILY_RECIPE_LIMIT;
    const remainingViews = Math.max(0, limit - usage.dailyRecipeViews);
    const canView = usage.dailyRecipeViews < limit;

    return {
      canView,
      remainingViews,
      limitReached: !canView,
    };
  }

  /**
   * Check if user can perform more searches (free users)
   */
  static async canPerformSearch(isPremium: boolean = false): Promise<{
    canSearch: boolean;
    remainingSearches: number;
    limitReached: boolean;
  }> {
    if (isPremium) {
      return {
        canSearch: true,
        remainingSearches: -1, // Unlimited
        limitReached: false,
      };
    }

    const usage = await this.getCurrentUsage();
    const limit = USAGE_CONFIG.FREE_DAILY_SEARCH_LIMIT;
    const remainingSearches = Math.max(0, limit - usage.dailySearches);
    const canSearch = usage.dailySearches < limit;

    return {
      canSearch,
      remainingSearches,
      limitReached: !canSearch,
    };
  }

  /**
   * Get usage statistics for display
   */
  static async getUsageStats(isPremium: boolean = false): Promise<{
    recipeViewsUsed: number;
    recipeViewsLimit: number;
    searchesUsed: number;
    searchesLimit: number;
    isUnlimited: boolean;
  }> {
    const usage = await this.getCurrentUsage();
    
    return {
      recipeViewsUsed: usage.dailyRecipeViews,
      recipeViewsLimit: isPremium ? -1 : USAGE_CONFIG.FREE_DAILY_RECIPE_LIMIT,
      searchesUsed: usage.dailySearches,
      searchesLimit: isPremium ? -1 : USAGE_CONFIG.FREE_DAILY_SEARCH_LIMIT,
      isUnlimited: isPremium,
    };
  }

  /**
   * Get time until next reset (for display)
   */
  static getTimeUntilReset(): string {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const msUntilReset = tomorrow.getTime() - now.getTime();
    const hoursUntilReset = Math.floor(msUntilReset / (1000 * 60 * 60));
    const minutesUntilReset = Math.floor((msUntilReset % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hoursUntilReset}sa ${minutesUntilReset}dk`;
  }

  /**
   * Check if user should see premium suggestion
   */
  static async shouldShowPremiumSuggestion(): Promise<boolean> {
    const usage = await this.getCurrentUsage();
    
    // Show after 7 recipe views or 10 searches
    return (
      usage.dailyRecipeViews >= 7 || 
      usage.dailySearches >= 10 ||
      usage.totalUsageToday >= 15
    );
  }

  /**
   * Reset all usage data (for testing)
   */
  static async resetAllUsage(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.USAGE_LIMIT);
    } catch (error) {
      console.error('Error resetting all usage:', error);
    }
  }
}

export default UsageLimitService;