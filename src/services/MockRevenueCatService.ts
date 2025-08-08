// Mock RevenueCat Service for development/testing without real RevenueCat setup
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SubscriptionInfo, OfferingInfo, PurchasePackageInfo } from './RevenueCatService';
import { Logger } from '../services/LoggerService';

const MOCK_STORAGE_KEY = 'mock_premium_status';

// Mock offerings data
const MOCK_OFFERINGS: OfferingInfo[] = [
  {
    identifier: 'default',
    serverDescription: 'Premium Subscription',
    packages: [
      {
        identifier: 'monthly',
        packageType: 'MONTHLY',
        product: {
          identifier: 'com.yemekbulucu.premium_monthly',
          description: 'Premium Monthly Subscription',
          title: 'Premium Abonelik (Aylık)',
          price: 29.99,
          priceString: '₺29,99',
          currencyCode: 'TRY',
        },
      },
      {
        identifier: 'yearly',
        packageType: 'ANNUAL',
        product: {
          identifier: 'com.yemekbulucu.premium_yearly',
          description: 'Premium Yearly Subscription',
          title: 'Premium Abonelik (Yıllık)',
          price: 299.99,
          priceString: '₺299,99',
          currencyCode: 'TRY',
        },
      },
    ],
  },
];

export class MockRevenueCatService {
  private static isInitialized = false;
  private static currentUserId: string | null = null;

  static async initialize(): Promise<boolean> {
    console.log('🧪 Mock RevenueCat Service initialized');
    this.isInitialized = true;
    return true;
  }

  static async identifyUser(userId: string): Promise<boolean> {
    this.currentUserId = userId;
    await AsyncStorage.setItem('mock_user_id', userId);
    console.log(`🧪 Mock user identified successfully`);
    return true;
  }

  static async loginAnonymously(): Promise<boolean> {
    const anonymousId = `mock_anonymous_${Date.now()}`;
    return this.identifyUser(anonymousId);
  }

  static async getSubscriptionInfo(): Promise<SubscriptionInfo> {
    try {
      const stored = await AsyncStorage.getItem(MOCK_STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          // Convert date strings back to Date objects
          return {
            ...parsed,
            originalPurchaseDate: parsed.originalPurchaseDate ? new Date(parsed.originalPurchaseDate) : undefined,
            expirationDate: parsed.expirationDate ? new Date(parsed.expirationDate) : undefined,
          };
        } catch (parseError) {
          console.warn('Invalid mock subscription data, clearing:', parseError);
          await AsyncStorage.removeItem(MOCK_STORAGE_KEY);
        }
      }
    } catch (error) {
      console.error('Mock storage error:', error);
    }

    // Default free user
    return {
      isPremium: false,
      isActive: false,
      willRenew: false,
      isSandbox: true, // Mock is always sandbox
    };
  }

  static async isPremiumUser(): Promise<boolean> {
    const info = await this.getSubscriptionInfo();
    return info.isPremium;
  }

  static async getOfferings(): Promise<OfferingInfo[]> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    return MOCK_OFFERINGS;
  }

  static async purchasePremium(packageIdentifier?: string): Promise<{
    success: boolean;
    customerInfo?: any;
    error?: string;
  }> {
    console.log(`🧪 Mock purchase attempt: ${packageIdentifier || 'default'}`);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Simulate successful purchase
    const subscriptionInfo: SubscriptionInfo = {
      isPremium: true,
      isActive: true,
      willRenew: true,
      originalPurchaseDate: new Date(),
      expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      productIdentifier: packageIdentifier || 'com.yemekbulucu.premium_monthly',
      isSandbox: true,
    };

    await AsyncStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(subscriptionInfo));
    
    console.log('🧪 Mock purchase successful!');
    return { success: true };
  }

  static async restorePurchases(): Promise<{
    success: boolean;
    customerInfo?: any;
    error?: string;
  }> {
    console.log('🧪 Mock restore purchases');
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));

    // Check if user had previous "purchases" in mock storage
    const info = await this.getSubscriptionInfo();
    
    if (info.isPremium) {
      console.log('🧪 Mock restore successful - found premium');
      return { success: true };
    } else {
      console.log('🧪 Mock restore - no premium found');
      return { success: false, error: 'No previous purchases found' };
    }
  }

  static getSubscriptionManagementURL(): string {
    return 'https://apps.apple.com/account/subscriptions';
  }

  static async isInFreeTrial(): Promise<boolean> {
    const info = await this.getSubscriptionInfo();
    if (!info.isPremium) return false;
    
    // Mock: if purchased less than 7 days ago, consider it trial
    if (info.originalPurchaseDate && info.originalPurchaseDate instanceof Date) {
      const daysSincePurchase = (Date.now() - info.originalPurchaseDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysSincePurchase <= 7;
    }
    
    return false;
  }

  static async logout(): Promise<void> {
    this.currentUserId = null;
    await AsyncStorage.multiRemove([MOCK_STORAGE_KEY, 'mock_user_id']);
    console.log('🧪 Mock user logged out successfully');
  }

  static getCurrentUserId(): string | null {
    return this.currentUserId;
  }

  static isReady(): boolean {
    return this.isInitialized;
  }

  static async refreshCustomerInfo(): Promise<void> {
    console.log('🧪 Mock refresh customer info');
    // Nothing to do in mock mode
  }

  // Mock-specific methods
  static async setMockPremiumStatus(isPremium: boolean): Promise<void> {
    const subscriptionInfo: SubscriptionInfo = {
      isPremium,
      isActive: isPremium,
      willRenew: isPremium,
      originalPurchaseDate: isPremium ? new Date() : undefined,
      expirationDate: isPremium ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : undefined,
      productIdentifier: 'com.yemekbulucu.premium_monthly',
      isSandbox: true,
    };

    await AsyncStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(subscriptionInfo));
    console.log(`🧪 Mock premium status set to: ${isPremium}`);
  }

  static async resetMockData(): Promise<void> {
    await AsyncStorage.multiRemove([MOCK_STORAGE_KEY, 'mock_user_id']);
    console.log('🧪 Mock data reset');
  }

  static async purchaseCredits(packageId: string): Promise<{
    success: boolean;
    credits?: number;
    error?: string;
  }> {
    console.log(`🧪 Mock credit purchase completed`);
    // Simulate successful credit purchase
    return {
      success: true,
      credits: 100
    };
  }

  static async getCurrentPremiumTier(): Promise<string | null> {
    const info = await this.getSubscriptionInfo();
    return info.isPremium ? 'premium' : null;
  }

  static async hasFeature(featureId: string): Promise<boolean> {
    const info = await this.getSubscriptionInfo();
    return info.isPremium;
  }
}