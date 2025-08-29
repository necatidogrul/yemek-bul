/**
 * Usage Limit Service
 * 
 * Free kullanıcılar için günlük istek limiti yönetimi
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { debugLog } from '../config/environment';

export interface DailyUsage {
  date: string; // YYYY-MM-DD format
  requestsUsed: number;
  maxRequests: number;
}

export class UsageLimitService {
  private static readonly STORAGE_KEY = 'daily_usage';
  private static readonly FREE_DAILY_LIMIT = 2;
  
  /**
   * Bugünün tarihini YYYY-MM-DD formatında al
   */
  private static getTodayDateString(): string {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }

  /**
   * Günlük kullanım bilgisini al
   */
  static async getDailyUsage(): Promise<DailyUsage> {
    try {
      const todayDate = this.getTodayDateString();
      const storedUsage = await AsyncStorage.getItem(this.STORAGE_KEY);
      
      if (storedUsage) {
        const usage: DailyUsage = JSON.parse(storedUsage);
        
        // Eğer tarih bugün değilse, yeni gün başlat
        if (usage.date !== todayDate) {
          const newUsage: DailyUsage = {
            date: todayDate,
            requestsUsed: 0,
            maxRequests: this.FREE_DAILY_LIMIT,
          };
          await this.saveDailyUsage(newUsage);
          return newUsage;
        }
        
        return usage;
      }
      
      // İlk kez kullanım
      const newUsage: DailyUsage = {
        date: todayDate,
        requestsUsed: 0,
        maxRequests: this.FREE_DAILY_LIMIT,
      };
      
      await this.saveDailyUsage(newUsage);
      return newUsage;
      
    } catch (error) {
      console.error('Error getting daily usage:', error);
      
      // Hata durumunda varsayılan döndür
      return {
        date: this.getTodayDateString(),
        requestsUsed: 0,
        maxRequests: this.FREE_DAILY_LIMIT,
      };
    }
  }

  /**
   * Günlük kullanımı kaydet
   */
  private static async saveDailyUsage(usage: DailyUsage): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(usage));
      debugLog('💾 Daily usage saved:', usage);
    } catch (error) {
      console.error('Error saving daily usage:', error);
    }
  }

  /**
   * Kullanıcının daha fazla istek yapıp yapamayacağını kontrol et
   */
  static async canMakeRequest(): Promise<boolean> {
    const usage = await this.getDailyUsage();
    return usage.requestsUsed < usage.maxRequests;
  }

  /**
   * Bir istek kullan (request sayısını artır)
   */
  static async useRequest(): Promise<DailyUsage> {
    const usage = await this.getDailyUsage();
    
    if (usage.requestsUsed < usage.maxRequests) {
      usage.requestsUsed++;
      await this.saveDailyUsage(usage);
    }
    
    return usage;
  }

  /**
   * Kalan istek sayısını al
   */
  static async getRemainingRequests(): Promise<number> {
    const usage = await this.getDailyUsage();
    return Math.max(0, usage.maxRequests - usage.requestsUsed);
  }

  /**
   * Limit durumunu kontrol et
   */
  static async checkLimitStatus(): Promise<{
    canMakeRequest: boolean;
    remainingRequests: number;
    isLimitReached: boolean;
    resetsAt: Date;
  }> {
    const usage = await this.getDailyUsage();
    const canMakeRequest = usage.requestsUsed < usage.maxRequests;
    const remainingRequests = Math.max(0, usage.maxRequests - usage.requestsUsed);
    const isLimitReached = usage.requestsUsed >= usage.maxRequests;
    
    // Yarın saat 00:00'da reset olur
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    return {
      canMakeRequest,
      remainingRequests,
      isLimitReached,
      resetsAt: tomorrow,
    };
  }

  /**
   * Debug: Kullanımı sıfırla (test için)
   */
  static async resetDailyUsage(): Promise<void> {
    try {
      const newUsage: DailyUsage = {
        date: this.getTodayDateString(),
        requestsUsed: 0,
        maxRequests: this.FREE_DAILY_LIMIT,
      };
      await this.saveDailyUsage(newUsage);
      debugLog('🔄 Daily usage reset');
    } catch (error) {
      console.error('Error resetting daily usage:', error);
    }
  }

  /**
   * Premium kullanıcı için limitsiz erişim
   */
  static async setUnlimitedAccess(): Promise<void> {
    const usage = await this.getDailyUsage();
    usage.maxRequests = 999; // Unlimited
    await this.saveDailyUsage(usage);
    debugLog('⭐ Unlimited access granted');
  }
}