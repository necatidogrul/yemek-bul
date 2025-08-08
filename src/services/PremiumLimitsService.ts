import AsyncStorage from '@react-native-async-storage/async-storage';
import { PREMIUM_TIERS } from '../types/Premium';
import { Logger } from '../services/LoggerService';

export interface PremiumUsage {
  userId: string;
  // Daily limits
  dailyAiUsed: number;
  dailyQAUsed: number;
  dailyCommunityUsed: number;
  lastDailyReset: Date;
  
  // Monthly limits
  monthlyFavoritesUsed: number;
  monthlySearchHistoryUsed: number;
  lastMonthlyReset: Date;
  
  // Tracking
  createdAt: Date;
  updatedAt: Date;
}

const STORAGE_KEYS = {
  PREMIUM_USAGE: 'premium_usage',
} as const;

export class PremiumLimitsService {
  /**
   * Get current premium usage for user
   */
  static async getPremiumUsage(userId: string): Promise<PremiumUsage> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.PREMIUM_USAGE + '_' + userId);
      
      if (stored) {
        const usage = JSON.parse(stored);
        const resetUsage = await this.resetUsageIfNeeded(usage);
        return this.mapStoredToUsage(resetUsage);
      }

      // First time user
      return await this.createNewPremiumUsage(userId);
    } catch (error) {
      console.error('Error getting premium usage:', error);
      return await this.createNewPremiumUsage(userId);
    }
  }

  /**
   * Create new premium usage record
   */
  private static async createNewPremiumUsage(userId: string): Promise<PremiumUsage> {
    const now = new Date();
    const usage: PremiumUsage = {
      userId,
      dailyAiUsed: 0,
      dailyQAUsed: 0,
      dailyCommunityUsed: 0,
      lastDailyReset: now,
      monthlyFavoritesUsed: 0,
      monthlySearchHistoryUsed: 0,
      lastMonthlyReset: now,
      createdAt: now,
      updatedAt: now
    };

    await this.savePremiumUsage(usage);
    return usage;
  }

  /**
   * Save premium usage to storage
   */
  private static async savePremiumUsage(usage: PremiumUsage): Promise<void> {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.PREMIUM_USAGE + '_' + usage.userId, 
        JSON.stringify({
          userId: usage.userId,
          dailyAiUsed: usage.dailyAiUsed,
          dailyQAUsed: usage.dailyQAUsed,
          dailyCommunityUsed: usage.dailyCommunityUsed,
          lastDailyReset: usage.lastDailyReset.toISOString(),
          monthlyFavoritesUsed: usage.monthlyFavoritesUsed,
          monthlySearchHistoryUsed: usage.monthlySearchHistoryUsed,
          lastMonthlyReset: usage.lastMonthlyReset.toISOString(),
          createdAt: usage.createdAt.toISOString(),
          updatedAt: usage.updatedAt.toISOString()
        })
      );
    } catch (error) {
      console.error('Error saving premium usage:', error);
      throw error;
    }
  }

  /**
   * Reset usage counters if needed (daily/monthly)
   */
  private static async resetUsageIfNeeded(stored: any): Promise<any> {
    const now = new Date();
    let needsSave = false;
    const resetUsage = { ...stored };

    // Check daily reset
    const lastDailyReset = new Date(stored.lastDailyReset);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const resetDate = new Date(lastDailyReset.getFullYear(), lastDailyReset.getMonth(), lastDailyReset.getDate());

    if (today.getTime() !== resetDate.getTime()) {
      resetUsage.dailyAiUsed = 0;
      resetUsage.dailyQAUsed = 0;
      resetUsage.dailyCommunityUsed = 0;
      resetUsage.lastDailyReset = now.toISOString();
      needsSave = true;
    }

    // Check monthly reset
    const lastMonthlyReset = new Date(stored.lastMonthlyReset);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const resetMonth = new Date(lastMonthlyReset.getFullYear(), lastMonthlyReset.getMonth(), 1);

    if (thisMonth.getTime() !== resetMonth.getTime()) {
      resetUsage.monthlyFavoritesUsed = 0;
      resetUsage.monthlySearchHistoryUsed = 0;
      resetUsage.lastMonthlyReset = now.toISOString();
      needsSave = true;
    }

    if (needsSave) {
      resetUsage.updatedAt = now.toISOString();
      await AsyncStorage.setItem(
        STORAGE_KEYS.PREMIUM_USAGE + '_' + stored.userId,
        JSON.stringify(resetUsage)
      );
    }

    return resetUsage;
  }

  /**
   * Check if user can use daily AI generation
   */
  static async canUseAI(userId: string): Promise<{
    canUse: boolean;
    used: number;
    limit: number;
    remaining: number;
  }> {
    const usage = await this.getPremiumUsage(userId);
    const premiumTier = PREMIUM_TIERS[0]; // Only one tier now
    const limit = premiumTier.limits.dailyAiGenerations || 20;
    const remaining = Math.max(0, limit - usage.dailyAiUsed);

    return {
      canUse: usage.dailyAiUsed < limit,
      used: usage.dailyAiUsed,
      limit,
      remaining
    };
  }

  /**
   * Check if user can use Q&A
   */
  static async canUseQA(userId: string): Promise<{
    canUse: boolean;
    used: number;
    limit: number;
    remaining: number;
  }> {
    const usage = await this.getPremiumUsage(userId);
    const premiumTier = PREMIUM_TIERS[0];
    const limit = premiumTier.limits.dailyQAQuestions || 30;
    const remaining = Math.max(0, limit - usage.dailyQAUsed);

    return {
      canUse: usage.dailyQAUsed < limit,
      used: usage.dailyQAUsed,
      limit,
      remaining
    };
  }

  /**
   * Check if user can access community pool
   */
  static async canUseCommunityPool(userId: string): Promise<{
    canUse: boolean;
    used: number;
    limit: number;
    remaining: number;
  }> {
    const usage = await this.getPremiumUsage(userId);
    const premiumTier = PREMIUM_TIERS[0];
    const limit = premiumTier.limits.dailyCommunityAccess || 50;
    const remaining = Math.max(0, limit - usage.dailyCommunityUsed);

    return {
      canUse: usage.dailyCommunityUsed < limit,
      used: usage.dailyCommunityUsed,
      limit,
      remaining
    };
  }

  /**
   * Check if user can add to favorites (monthly limit)
   */
  static async canAddFavorite(userId: string): Promise<{
    canAdd: boolean;
    used: number;
    limit: number;
    remaining: number;
  }> {
    const usage = await this.getPremiumUsage(userId);
    const premiumTier = PREMIUM_TIERS[0];
    const limit = premiumTier.limits.maxFavorites as number || 100;
    const remaining = Math.max(0, limit - usage.monthlyFavoritesUsed);

    return {
      canAdd: usage.monthlyFavoritesUsed < limit,
      used: usage.monthlyFavoritesUsed,
      limit,
      remaining
    };
  }

  /**
   * Record AI usage
   */
  static async recordAIUsage(userId: string): Promise<void> {
    const usage = await this.getPremiumUsage(userId);
    const check = await this.canUseAI(userId);
    
    if (!check.canUse) {
      throw new Error('Daily AI limit exceeded');
    }

    usage.dailyAiUsed += 1;
    usage.updatedAt = new Date();
    await this.savePremiumUsage(usage);

    console.log(`🤖 Premium AI used: ${usage.dailyAiUsed}/${check.limit}`);
  }

  /**
   * Record Q&A usage
   */
  static async recordQAUsage(userId: string): Promise<void> {
    const usage = await this.getPremiumUsage(userId);
    const check = await this.canUseQA(userId);
    
    if (!check.canUse) {
      throw new Error('Daily Q&A limit exceeded');
    }

    usage.dailyQAUsed += 1;
    usage.updatedAt = new Date();
    await this.savePremiumUsage(usage);

    console.log(`❓ Premium Q&A used: ${usage.dailyQAUsed}/${check.limit}`);
  }

  /**
   * Record community pool usage
   */
  static async recordCommunityUsage(userId: string): Promise<void> {
    const usage = await this.getPremiumUsage(userId);
    const check = await this.canUseCommunityPool(userId);
    
    if (!check.canUse) {
      throw new Error('Daily community pool limit exceeded');
    }

    usage.dailyCommunityUsed += 1;
    usage.updatedAt = new Date();
    await this.savePremiumUsage(usage);

    console.log(`👥 Premium community used: ${usage.dailyCommunityUsed}/${check.limit}`);
  }

  /**
   * Record favorite addition
   */
  static async recordFavoriteUsage(userId: string): Promise<void> {
    const usage = await this.getPremiumUsage(userId);
    const check = await this.canAddFavorite(userId);
    
    if (!check.canAdd) {
      throw new Error('Monthly favorites limit exceeded');
    }

    usage.monthlyFavoritesUsed += 1;
    usage.updatedAt = new Date();
    await this.savePremiumUsage(usage);

    console.log(`❤️ Premium favorite used: ${usage.monthlyFavoritesUsed}/${check.limit}`);
  }

  /**
   * Get usage summary for display
   */
  static async getUsageSummary(userId: string): Promise<{
    ai: { used: number; limit: number; remaining: number };
    qa: { used: number; limit: number; remaining: number };
    community: { used: number; limit: number; remaining: number };
    favorites: { used: number; limit: number; remaining: number };
    nextDailyReset: Date;
    nextMonthlyReset: Date;
  }> {
    const [aiCheck, qaCheck, communityCheck, favoriteCheck] = await Promise.all([
      this.canUseAI(userId),
      this.canUseQA(userId),
      this.canUseCommunityPool(userId),
      this.canAddFavorite(userId)
    ]);

    return {
      ai: { used: aiCheck.used, limit: aiCheck.limit, remaining: aiCheck.remaining },
      qa: { used: qaCheck.used, limit: qaCheck.limit, remaining: qaCheck.remaining },
      community: { used: communityCheck.used, limit: communityCheck.limit, remaining: communityCheck.remaining },
      favorites: { used: favoriteCheck.used, limit: favoriteCheck.limit, remaining: favoriteCheck.remaining },
      nextDailyReset: this.getNextDailyReset(),
      nextMonthlyReset: this.getNextMonthlyReset()
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
   * Get next monthly reset time (1st of next month)
   */
  private static getNextMonthlyReset(): Date {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    nextMonth.setHours(0, 0, 0, 0);
    return nextMonth;
  }

  /**
   * Reset all usage (for testing)
   */
  static async resetAllUsage(userId: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.PREMIUM_USAGE + '_' + userId);
      console.log('🔄 Premium usage reset');
    } catch (error) {
      console.error('Error resetting premium usage:', error);
      throw error;
    }
  }

  /**
   * Map stored data to PremiumUsage interface
   */
  private static mapStoredToUsage(stored: any): PremiumUsage {
    return {
      userId: stored.userId,
      dailyAiUsed: stored.dailyAiUsed || 0,
      dailyQAUsed: stored.dailyQAUsed || 0,
      dailyCommunityUsed: stored.dailyCommunityUsed || 0,
      lastDailyReset: new Date(stored.lastDailyReset),
      monthlyFavoritesUsed: stored.monthlyFavoritesUsed || 0,
      monthlySearchHistoryUsed: stored.monthlySearchHistoryUsed || 0,
      lastMonthlyReset: new Date(stored.lastMonthlyReset),
      createdAt: new Date(stored.createdAt),
      updatedAt: new Date(stored.updatedAt)
    };
  }
}