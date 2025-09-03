/**
 * Usage Limit Service
 *
 * Free kullanıcılar için günlük istek limiti yönetimi
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { debugLog, isDevelopment } from '../config/environment';
import { Logger } from '../services/LoggerService';

export interface DailyUsage {
  date: string; // YYYY-MM-DD format
  requestsUsed: number;
  maxRequests: number;
}

export interface WeeklyUsage {
  week: string; // YYYY-WXX format (e.g., 2024-W01)
  requestsUsed: number;
  maxRequests: number;
}

export interface MonthlyUsage {
  month: string; // YYYY-MM format
  requestsUsed: number;
  maxRequests: number;
}

export type SubscriptionType = 'free' | 'weekly' | 'monthly';

// Helper function - backward compatibility
export const getSubscriptionType = (isPremium: boolean): SubscriptionType => {
  return isPremium ? 'monthly' : 'free';
};

export class UsageLimitService {
  private static readonly DAILY_STORAGE_KEY = 'daily_usage';
  private static readonly WEEKLY_STORAGE_KEY = 'weekly_usage';
  private static readonly MONTHLY_STORAGE_KEY = 'monthly_usage';
  private static readonly FREE_DAILY_LIMIT = isDevelopment() ? 100 : 1; // Development'ta 100, production'da 1
  private static readonly PREMIUM_WEEKLY_LIMIT = isDevelopment() ? 200 : 20; // Premium haftalık limit (3 tarif/gün × 7)
  private static readonly PREMIUM_DAILY_LIMIT = isDevelopment() ? 100 : 10; // Premium günlük limit
  private static readonly PREMIUM_MONTHLY_LIMIT = isDevelopment() ? 1000 : 150; // Premium aylık limit

  /**
   * Bugünün tarihini YYYY-MM-DD formatında al
   */
  private static getTodayDateString(): string {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }

  /**
   * Bu haftanın tarihini YYYY-WXX formatında al
   */
  private static getThisWeekString(): string {
    const today = new Date();
    const startOfYear = new Date(today.getFullYear(), 0, 1);
    const dayOfYear = Math.floor((today.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
    const weekNumber = Math.ceil((dayOfYear + startOfYear.getDay() + 1) / 7);
    return `${today.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;
  }

  /**
   * Bu ayın tarihini YYYY-MM formatında al
   */
  private static getThisMonthString(): string {
    const today = new Date();
    return today.toISOString().substring(0, 7); // YYYY-MM
  }

  /**
   * Günlük kullanım bilgisini al
   */
  static async getDailyUsage(isPremium: boolean = false): Promise<DailyUsage> {
    try {
      const todayDate = this.getTodayDateString();
      const storedUsage = await AsyncStorage.getItem(this.DAILY_STORAGE_KEY);
      const dailyLimit = isPremium ? this.PREMIUM_DAILY_LIMIT : this.FREE_DAILY_LIMIT;

      // Development ortamında debug
      if (isDevelopment()) {
        debugLog(
          '📊 Getting daily usage, current limit:',
          dailyLimit,
          isPremium ? '(Premium)' : '(Free)'
        );
      }

      if (storedUsage) {
        const usage: DailyUsage = JSON.parse(storedUsage);

        // Eğer tarih bugün değilse, yeni gün başlat
        if (usage.date !== todayDate) {
          const newUsage: DailyUsage = {
            date: todayDate,
            requestsUsed: 0,
            maxRequests: dailyLimit,
          };
          await this.saveDailyUsage(newUsage);
          return newUsage;
        }

        // Mevcut usage'ın maxRequests'ini güncelle (premium durumu değiştiğinde)
        if (usage.maxRequests !== dailyLimit) {
          usage.maxRequests = dailyLimit;
          await this.saveDailyUsage(usage);
          debugLog('🔄 Updated daily maxRequests to:', dailyLimit);
        }

        return usage;
      }

      // İlk kez kullanım
      const newUsage: DailyUsage = {
        date: todayDate,
        requestsUsed: 0,
        maxRequests: dailyLimit,
      };

      await this.saveDailyUsage(newUsage);
      return newUsage;
    } catch (error) {
      console.error('Error getting daily usage:', error);

      // Hata durumunda varsayılan döndür
      const dailyLimit = isPremium ? this.PREMIUM_DAILY_LIMIT : this.FREE_DAILY_LIMIT;
      return {
        date: this.getTodayDateString(),
        requestsUsed: 0,
        maxRequests: dailyLimit,
      };
    }
  }

  /**
   * Haftalık kullanım bilgisini al
   */
  static async getWeeklyUsage(isPremium: boolean = false): Promise<WeeklyUsage> {
    try {
      const thisWeek = this.getThisWeekString();
      const storedUsage = await AsyncStorage.getItem(this.WEEKLY_STORAGE_KEY);
      const weeklyLimit = isPremium ? this.PREMIUM_WEEKLY_LIMIT : 999; // Free kullanıcılar için haftalık limit yok

      if (storedUsage) {
        const usage: WeeklyUsage = JSON.parse(storedUsage);

        // Eğer hafta bu hafta değilse, yeni hafta başlat
        if (usage.week !== thisWeek) {
          const newUsage: WeeklyUsage = {
            week: thisWeek,
            requestsUsed: 0,
            maxRequests: weeklyLimit,
          };
          await this.saveWeeklyUsage(newUsage);
          return newUsage;
        }

        // Premium durumu değiştiyse limit güncelle
        if (isPremium && usage.maxRequests !== weeklyLimit) {
          usage.maxRequests = weeklyLimit;
          await this.saveWeeklyUsage(usage);
          debugLog('🔄 Updated weekly maxRequests to:', weeklyLimit);
        }

        return usage;
      }

      // İlk kez kullanım
      const newUsage: WeeklyUsage = {
        week: thisWeek,
        requestsUsed: 0,
        maxRequests: weeklyLimit,
      };

      await this.saveWeeklyUsage(newUsage);
      return newUsage;
    } catch (error) {
      console.error('Error getting weekly usage:', error);
      const weeklyLimit = isPremium ? this.PREMIUM_WEEKLY_LIMIT : 999;
      return {
        week: this.getThisWeekString(),
        requestsUsed: 0,
        maxRequests: weeklyLimit,
      };
    }
  }

  /**
   * Aylık kullanım bilgisini al
   */
  static async getMonthlyUsage(isPremium: boolean = false): Promise<MonthlyUsage> {
    try {
      const thisMonth = this.getThisMonthString();
      const storedUsage = await AsyncStorage.getItem(this.MONTHLY_STORAGE_KEY);
      const monthlyLimit = isPremium ? this.PREMIUM_MONTHLY_LIMIT : 999; // Free kullanıcılar için aylık limit yok

      if (storedUsage) {
        const usage: MonthlyUsage = JSON.parse(storedUsage);

        // Eğer ay bu ay değilse, yeni ay başlat
        if (usage.month !== thisMonth) {
          const newUsage: MonthlyUsage = {
            month: thisMonth,
            requestsUsed: 0,
            maxRequests: monthlyLimit,
          };
          await this.saveMonthlyUsage(newUsage);
          return newUsage;
        }

        // Premium durumu değiştiyse limit güncelle
        if (isPremium && usage.maxRequests !== monthlyLimit) {
          usage.maxRequests = monthlyLimit;
          await this.saveMonthlyUsage(usage);
          debugLog('🔄 Updated monthly maxRequests to:', monthlyLimit);
        }

        return usage;
      }

      // İlk kez kullanım
      const newUsage: MonthlyUsage = {
        month: thisMonth,
        requestsUsed: 0,
        maxRequests: monthlyLimit,
      };

      await this.saveMonthlyUsage(newUsage);
      return newUsage;
    } catch (error) {
      console.error('Error getting monthly usage:', error);
      const monthlyLimit = isPremium ? this.PREMIUM_MONTHLY_LIMIT : 999;
      return {
        month: this.getThisMonthString(),
        requestsUsed: 0,
        maxRequests: monthlyLimit,
      };
    }
  }

  /**
   * Günlük kullanımı kaydet
   */
  private static async saveDailyUsage(usage: DailyUsage): Promise<void> {
    try {
      await AsyncStorage.setItem(this.DAILY_STORAGE_KEY, JSON.stringify(usage));
      debugLog('💾 Daily usage saved:', usage);
    } catch (error) {
      console.error('Error saving daily usage:', error);
    }
  }

  /**
   * Haftalık kullanımı kaydet
   */
  private static async saveWeeklyUsage(usage: WeeklyUsage): Promise<void> {
    try {
      await AsyncStorage.setItem(this.WEEKLY_STORAGE_KEY, JSON.stringify(usage));
      debugLog('💾 Weekly usage saved:', usage);
    } catch (error) {
      console.error('Error saving weekly usage:', error);
    }
  }

  /**
   * Aylık kullanımı kaydet
   */
  private static async saveMonthlyUsage(usage: MonthlyUsage): Promise<void> {
    try {
      await AsyncStorage.setItem(this.MONTHLY_STORAGE_KEY, JSON.stringify(usage));
      debugLog('💾 Monthly usage saved:', usage);
    } catch (error) {
      console.error('Error saving monthly usage:', error);
    }
  }

  /**
   * Kullanıcının daha fazla istek yapıp yapamayacağını kontrol et
   * @param subscriptionType - Subscription tipi veya isPremium boolean (backward compatibility)
   * @param requestType - İstek tipi ('recipe' | 'question')
   */
  static async canMakeRequest(
    subscriptionType: SubscriptionType | boolean = 'free',
    requestType: 'recipe' | 'question' = 'recipe'
  ): Promise<boolean> {
    // Backward compatibility - boolean -> SubscriptionType
    const actualSubscriptionType = typeof subscriptionType === 'boolean' 
      ? getSubscriptionType(subscriptionType)
      : subscriptionType;
    const isPremium = actualSubscriptionType !== 'free';
    const dailyUsage = await this.getDailyUsage(isPremium);
    
    // AI soru-cevap için 2 adet, tarif üretimi için 1 adet gerekli
    const requiredAmount = requestType === 'question' ? 2 : 1;
    const canMakeDaily = (dailyUsage.requestsUsed + requiredAmount) <= dailyUsage.maxRequests;
    
    if (actualSubscriptionType === 'free') {
      return canMakeDaily; // Free kullanıcılar için sadece günlük limit
    }
    
    if (actualSubscriptionType === 'weekly') {
      // Haftalık subscription için günlük ve haftalık kontrol
      const weeklyUsage = await this.getWeeklyUsage(true);
      const canMakeWeekly = (weeklyUsage.requestsUsed + requiredAmount) <= weeklyUsage.maxRequests;
      return canMakeDaily && canMakeWeekly;
    }
    
    if (actualSubscriptionType === 'monthly') {
      // Aylık subscription için günlük ve aylık kontrol
      const monthlyUsage = await this.getMonthlyUsage(true);
      const canMakeMonthly = (monthlyUsage.requestsUsed + requiredAmount) <= monthlyUsage.maxRequests;
      return canMakeDaily && canMakeMonthly;
    }
    
    return false;
  }

  /**
   * Bir istek kullan (request sayısını artır)
   * @param subscriptionType - Subscription tipi veya isPremium boolean (backward compatibility)
   * @param requestType - İstek tipi ('recipe' | 'question')
   */
  static async useRequest(
    subscriptionType: SubscriptionType | boolean = 'free',
    requestType: 'recipe' | 'question' = 'recipe'
  ): Promise<{daily: DailyUsage, weekly?: WeeklyUsage, monthly?: MonthlyUsage}> {
    // Backward compatibility - boolean -> SubscriptionType
    const actualSubscriptionType = typeof subscriptionType === 'boolean' 
      ? getSubscriptionType(subscriptionType)
      : subscriptionType;
    const isPremium = actualSubscriptionType !== 'free';
    const dailyUsage = await this.getDailyUsage(isPremium);
    let weeklyUsage: WeeklyUsage | undefined;
    let monthlyUsage: MonthlyUsage | undefined;
    
    // AI soru-cevap için 2 adet kullan, tarif üretimi için 1 adet
    const usageAmount = requestType === 'question' ? 2 : 1;

    // Günlük kullanımı artır
    if (dailyUsage.requestsUsed + usageAmount <= dailyUsage.maxRequests) {
      dailyUsage.requestsUsed += usageAmount;
      await this.saveDailyUsage(dailyUsage);
    } else {
      // Limit aşılacaksa, maksimum değere set et
      dailyUsage.requestsUsed = dailyUsage.maxRequests;
      await this.saveDailyUsage(dailyUsage);
    }

    // Haftalık subscription için haftalık kullanımı artır
    if (actualSubscriptionType === 'weekly') {
      weeklyUsage = await this.getWeeklyUsage(true);
      if (weeklyUsage.requestsUsed + usageAmount <= weeklyUsage.maxRequests) {
        weeklyUsage.requestsUsed += usageAmount;
        await this.saveWeeklyUsage(weeklyUsage);
      } else {
        // Limit aşılacaksa, maksimum değere set et
        weeklyUsage.requestsUsed = weeklyUsage.maxRequests;
        await this.saveWeeklyUsage(weeklyUsage);
      }
    }

    // Aylık subscription için aylık kullanımı artır
    if (actualSubscriptionType === 'monthly') {
      monthlyUsage = await this.getMonthlyUsage(true);
      if (monthlyUsage.requestsUsed + usageAmount <= monthlyUsage.maxRequests) {
        monthlyUsage.requestsUsed += usageAmount;
        await this.saveMonthlyUsage(monthlyUsage);
      } else {
        // Limit aşılacaksa, maksimum değere set et
        monthlyUsage.requestsUsed = monthlyUsage.maxRequests;
        await this.saveMonthlyUsage(monthlyUsage);
      }
    }

    debugLog(`📊 Used ${usageAmount} request(s) for ${requestType}`, {
      daily: `${dailyUsage.requestsUsed}/${dailyUsage.maxRequests}`,
      weekly: weeklyUsage ? `${weeklyUsage.requestsUsed}/${weeklyUsage.maxRequests}` : 'N/A',
      monthly: monthlyUsage ? `${monthlyUsage.requestsUsed}/${monthlyUsage.maxRequests}` : 'N/A'
    });

    return { daily: dailyUsage, weekly: weeklyUsage, monthly: monthlyUsage };
  }

  /**
   * Kalan istek sayısını al
   */
  static async getRemainingRequests(isPremium: boolean = false): Promise<{daily: number, monthly?: number}> {
    const dailyUsage = await this.getDailyUsage(isPremium);
    const remainingDaily = Math.max(0, dailyUsage.maxRequests - dailyUsage.requestsUsed);
    
    if (!isPremium) {
      return { daily: remainingDaily };
    }
    
    const monthlyUsage = await this.getMonthlyUsage(isPremium);
    const remainingMonthly = Math.max(0, monthlyUsage.maxRequests - monthlyUsage.requestsUsed);
    
    return { daily: remainingDaily, monthly: remainingMonthly };
  }

  /**
   * Limit durumunu kontrol et
   */
  static async checkLimitStatus(isPremium: boolean = false): Promise<{
    canMakeRequest: boolean;
    remainingDaily: number;
    remainingMonthly?: number;
    isDailyLimitReached: boolean;
    isMonthlyLimitReached?: boolean;
    dailyResetsAt: Date;
    monthlyResetsAt?: Date;
  }> {
    const dailyUsage = await this.getDailyUsage(isPremium);
    const remainingDaily = Math.max(0, dailyUsage.maxRequests - dailyUsage.requestsUsed);
    const isDailyLimitReached = dailyUsage.requestsUsed >= dailyUsage.maxRequests;

    // Yarın saat 00:00'da reset olur
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    let remainingMonthly: number | undefined;
    let isMonthlyLimitReached: boolean | undefined;
    let monthlyResetsAt: Date | undefined;

    if (isPremium) {
      const monthlyUsage = await this.getMonthlyUsage(isPremium);
      remainingMonthly = Math.max(0, monthlyUsage.maxRequests - monthlyUsage.requestsUsed);
      isMonthlyLimitReached = monthlyUsage.requestsUsed >= monthlyUsage.maxRequests;
      
      // Ay sonunda reset olur
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1, 1);
      nextMonth.setHours(0, 0, 0, 0);
      monthlyResetsAt = nextMonth;
    }

    const canMakeRequest = isPremium 
      ? !isDailyLimitReached && !isMonthlyLimitReached
      : !isDailyLimitReached;

    return {
      canMakeRequest,
      remainingDaily,
      remainingMonthly,
      isDailyLimitReached,
      isMonthlyLimitReached,
      dailyResetsAt: tomorrow,
      monthlyResetsAt,
    };
  }

  /**
   * Debug: Kullanımı sıfırla (test için)
   */
  static async resetUsage(isPremium: boolean = false): Promise<void> {
    try {
      const dailyLimit = isPremium ? this.PREMIUM_DAILY_LIMIT : this.FREE_DAILY_LIMIT;
      const monthlyLimit = isPremium ? this.PREMIUM_MONTHLY_LIMIT : 999;
      
      const newDailyUsage: DailyUsage = {
        date: this.getTodayDateString(),
        requestsUsed: 0,
        maxRequests: dailyLimit,
      };
      await this.saveDailyUsage(newDailyUsage);
      
      if (isPremium) {
        const newMonthlyUsage: MonthlyUsage = {
          month: this.getThisMonthString(),
          requestsUsed: 0,
          maxRequests: monthlyLimit,
        };
        await this.saveMonthlyUsage(newMonthlyUsage);
        debugLog('🔄 Daily and monthly usage reset');
      } else {
        debugLog('🔄 Daily usage reset');
      }
    } catch (error) {
      console.error('Error resetting usage:', error);
    }
  }

  /**
   * Premium kullanıcı limitlerini aktif et
   */
  static async setPremiumLimits(): Promise<void> {
    const dailyUsage = await this.getDailyUsage(true);
    const monthlyUsage = await this.getMonthlyUsage(true);
    debugLog('⭐ Premium limits activated:', {
      daily: `${dailyUsage.requestsUsed}/${dailyUsage.maxRequests}`,
      monthly: `${monthlyUsage.requestsUsed}/${monthlyUsage.maxRequests}`
    });
  }
}
