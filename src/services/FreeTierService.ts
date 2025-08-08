import AsyncStorage from '@react-native-async-storage/async-storage';
import { FREE_TIER_LIMITS, FREE_LIFETIME_CREDITS } from '../types/Credit';
import { Logger } from '../services/LoggerService';

export interface FreeTierUsage {
  userId: string;
  dailySearches: number;
  dailyRecipeViews: number;
  lifetimeAIUsed: number;
  lastDailyReset: Date;
  createdAt: Date;
  updatedAt: Date;
}

const STORAGE_KEYS = {
  FREE_TIER_USAGE: 'free_tier_usage',
  LIFETIME_AI_USED: 'lifetime_ai_used',
  DAILY_SEARCHES: 'daily_searches',
  DAILY_RECIPE_VIEWS: 'daily_recipe_views',
  LAST_DAILY_RESET: 'last_daily_reset'
} as const;

export class FreeTierService {
  /**
   * Get current free tier usage
   */
  static async getFreeTierUsage(userId: string): Promise<FreeTierUsage> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.FREE_TIER_USAGE);
      
      if (stored) {
        const usage = JSON.parse(stored);
        const resetUsage = await this.resetDailyUsageIfNeeded(usage);
        return this.mapStoredToUsage(resetUsage);
      }

      // First time user
      return await this.createNewFreeTierUsage(userId);
    } catch (error) {
      console.error('Error getting free tier usage:', error);
      return await this.createNewFreeTierUsage(userId);
    }
  }

  /**
   * Create new free tier usage record
   */
  private static async createNewFreeTierUsage(userId: string): Promise<FreeTierUsage> {
    const now = new Date();
    const usage: FreeTierUsage = {
      userId,
      dailySearches: 0,
      dailyRecipeViews: 0,
      lifetimeAIUsed: 0,
      lastDailyReset: now,
      createdAt: now,
      updatedAt: now
    };

    await this.saveFreeTierUsage(usage);
    return usage;
  }

  /**
   * Save free tier usage to storage
   */
  private static async saveFreeTierUsage(usage: FreeTierUsage): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.FREE_TIER_USAGE, JSON.stringify({
        userId: usage.userId,
        dailySearches: usage.dailySearches,
        dailyRecipeViews: usage.dailyRecipeViews,
        lifetimeAIUsed: usage.lifetimeAIUsed,
        lastDailyReset: usage.lastDailyReset.toISOString(),
        createdAt: usage.createdAt.toISOString(),
        updatedAt: usage.updatedAt.toISOString()
      }));
    } catch (error) {
      console.error('Error saving free tier usage:', error);
      throw error;
    }
  }

  /**
   * Reset daily usage if needed (new day)
   */
  private static async resetDailyUsageIfNeeded(stored: any): Promise<any> {
    const lastReset = new Date(stored.lastDailyReset);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const resetDate = new Date(lastReset.getFullYear(), lastReset.getMonth(), lastReset.getDate());

    // If last reset was not today, reset daily counters
    if (today.getTime() !== resetDate.getTime()) {
      const resetUsage = {
        ...stored,
        dailySearches: 0,
        dailyRecipeViews: 0,
        lastDailyReset: now.toISOString(),
        updatedAt: now.toISOString()
      };

      await AsyncStorage.setItem(STORAGE_KEYS.FREE_TIER_USAGE, JSON.stringify(resetUsage));
      return resetUsage;
    }

    return stored;
  }

  /**
   * Check if user can perform a search
   */
  static async canPerformSearch(userId: string): Promise<{
    canSearch: boolean;
    remaining: number;
    limit: number;
  }> {
    const usage = await this.getFreeTierUsage(userId);
    const limit = FREE_TIER_LIMITS.dailySearches;
    const remaining = Math.max(0, limit - usage.dailySearches);

    return {
      canSearch: usage.dailySearches < limit,
      remaining,
      limit
    };
  }

  /**
   * Check if user can view a recipe
   */
  static async canViewRecipe(userId: string): Promise<{
    canView: boolean;
    remaining: number;
    limit: number;
  }> {
    const usage = await this.getFreeTierUsage(userId);
    const limit = FREE_TIER_LIMITS.dailyRecipeViews;
    const remaining = Math.max(0, limit - usage.dailyRecipeViews);

    return {
      canView: usage.dailyRecipeViews < limit,
      remaining,
      limit
    };
  }

  /**
   * Check if user can use AI (lifetime limit)
   */
  static async canUseAI(userId: string): Promise<{
    canUse: boolean;
    remaining: number;
    limit: number;
    used: number;
  }> {
    const usage = await this.getFreeTierUsage(userId);
    const limit = FREE_TIER_LIMITS.lifetimeAICredits;
    const remaining = Math.max(0, limit - usage.lifetimeAIUsed);

    return {
      canUse: usage.lifetimeAIUsed < limit,
      remaining,
      limit,
      used: usage.lifetimeAIUsed
    };
  }

  /**
   * Record a search usage
   */
  static async recordSearchUsage(userId: string): Promise<void> {
    const usage = await this.getFreeTierUsage(userId);
    
    if (usage.dailySearches >= FREE_TIER_LIMITS.dailySearches) {
      throw new Error('Daily search limit exceeded');
    }

    usage.dailySearches += 1;
    usage.updatedAt = new Date();
    await this.saveFreeTierUsage(usage);

    console.log(`📊 Search recorded: ${usage.dailySearches}/${FREE_TIER_LIMITS.dailySearches}`);
  }

  /**
   * Record a recipe view usage
   */
  static async recordRecipeViewUsage(userId: string): Promise<void> {
    const usage = await this.getFreeTierUsage(userId);
    
    if (usage.dailyRecipeViews >= FREE_TIER_LIMITS.dailyRecipeViews) {
      throw new Error('Daily recipe view limit exceeded');
    }

    usage.dailyRecipeViews += 1;
    usage.updatedAt = new Date();
    await this.saveFreeTierUsage(usage);

    console.log(`👁️ Recipe view recorded: ${usage.dailyRecipeViews}/${FREE_TIER_LIMITS.dailyRecipeViews}`);
  }

  /**
   * Record AI usage (lifetime)
   */
  static async recordAIUsage(userId: string): Promise<void> {
    const usage = await this.getFreeTierUsage(userId);
    
    if (usage.lifetimeAIUsed >= FREE_TIER_LIMITS.lifetimeAICredits) {
      throw new Error('Lifetime AI limit exceeded');
    }

    usage.lifetimeAIUsed += 1;
    usage.updatedAt = new Date();
    await this.saveFreeTierUsage(usage);

    console.log(`🤖 AI usage recorded: ${usage.lifetimeAIUsed}/${FREE_TIER_LIMITS.lifetimeAICredits} (LIFETIME)`);
  }

  /**
   * Check if user can access favorites (always false for free tier)
   */
  static async canAccessFavorites(userId: string): Promise<{
    canAccess: boolean;
    maxAllowed: number;
  }> {
    return {
      canAccess: false,
      maxAllowed: FREE_TIER_LIMITS.maxFavorites
    };
  }

  /**
   * Check if user can access search history (always false for free tier)
   */
  static async canAccessSearchHistory(userId: string): Promise<{
    canAccess: boolean;
  }> {
    return {
      canAccess: FREE_TIER_LIMITS.hasSearchHistory
    };
  }

  /**
   * Get usage summary for display
   */
  static async getUsageSummary(userId: string): Promise<{
    searches: { used: number; limit: number; remaining: number };
    recipeViews: { used: number; limit: number; remaining: number };
    aiUsage: { used: number; limit: number; remaining: number };
    resetTime: Date;
  }> {
    const usage = await this.getFreeTierUsage(userId);
    
    return {
      searches: {
        used: usage.dailySearches,
        limit: FREE_TIER_LIMITS.dailySearches,
        remaining: Math.max(0, FREE_TIER_LIMITS.dailySearches - usage.dailySearches)
      },
      recipeViews: {
        used: usage.dailyRecipeViews,
        limit: FREE_TIER_LIMITS.dailyRecipeViews,
        remaining: Math.max(0, FREE_TIER_LIMITS.dailyRecipeViews - usage.dailyRecipeViews)
      },
      aiUsage: {
        used: usage.lifetimeAIUsed,
        limit: FREE_TIER_LIMITS.lifetimeAICredits,
        remaining: Math.max(0, FREE_TIER_LIMITS.lifetimeAICredits - usage.lifetimeAIUsed)
      },
      resetTime: this.getNextDailyReset()
    };
  }

  /**
   * Get next daily reset time (midnight)
   */
  private static getNextDailyReset(): Date {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
  }

  /**
   * Reset all usage (for testing)
   */
  static async resetAllUsage(userId: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.FREE_TIER_USAGE);
      console.log('🔄 Free tier usage reset');
    } catch (error) {
      console.error('Error resetting free tier usage:', error);
      throw error;
    }
  }

  /**
   * Map stored data to FreeTierUsage interface
   */
  private static mapStoredToUsage(stored: any): FreeTierUsage {
    return {
      userId: stored.userId,
      dailySearches: stored.dailySearches || 0,
      dailyRecipeViews: stored.dailyRecipeViews || 0,
      lifetimeAIUsed: stored.lifetimeAIUsed || 0,
      lastDailyReset: new Date(stored.lastDailyReset),
      createdAt: new Date(stored.createdAt),
      updatedAt: new Date(stored.updatedAt)
    };
  }
}