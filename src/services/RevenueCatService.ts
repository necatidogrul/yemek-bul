/**
 * RevenueCat Service
 *
 * Premium subscription ve in-app purchase yönetimi
 */

import Purchases, {
  CustomerInfo,
  PurchasesOffering,
  PurchasesPackage,
  LOG_LEVEL,
} from 'react-native-purchases';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import {
  REVENUECAT_CONFIG,
  PREMIUM_FEATURES,
  PremiumFeature,
} from '../config/revenueCat';
import { debugLog, isProduction } from '../config/environment';

export interface PremiumStatus {
  isPremium: boolean;
  isActive: boolean;
  expirationDate?: Date;
  originalPurchaseDate?: Date;
  productId?: string;
  willRenew?: boolean;
}

export interface PurchaseResult {
  success: boolean;
  customerInfo?: CustomerInfo;
  error?: string;
  userCancelled?: boolean;
}

export class RevenueCatService {
  private static isInitialized = false;
  private static currentCustomerInfo: CustomerInfo | null = null;

  /**
   * RevenueCat SDK'sını başlat
   */
  static async initialize(): Promise<void> {
    try {
      if (this.isInitialized) {
        debugLog('RevenueCat already initialized');
        return;
      }

      // Development ve Expo Go kontrolü - sadece Expo Go'da mock kullan
      if (
        __DEV__ &&
        (global as any).__DEV__ &&
        Constants.appOwnership === 'expo'
      ) {
        debugLog('🔧 Expo Go mode: Using mock RevenueCat services');
        this.isInitialized = true;
        this.currentCustomerInfo = null; // Mock data
        return;
      }

      // Debug logging sadece development'ta
      if (!isProduction()) {
        Purchases.setLogLevel(LOG_LEVEL.DEBUG);
      }

      // Platform-specific API key
      const apiKey =
        Platform.OS === 'ios'
          ? REVENUECAT_CONFIG.apiKeys.apple
          : REVENUECAT_CONFIG.apiKeys.google;

      if (!apiKey) {
        throw new Error(`RevenueCat API key not found for ${Platform.OS}`);
      }

      // SDK'yı yapılandır - RevenueCat dokümantasyonuna göre
      if (Platform.OS === 'ios') {
        await Purchases.configure({ apiKey });
      } else if (Platform.OS === 'android') {
        await Purchases.configure({ apiKey });
      }

      debugLog('✅ RevenueCat initialized successfully');
      this.isInitialized = true;

      // Mevcut customer info'yu al
      await this.refreshCustomerInfo();
    } catch (error) {
      console.error('❌ RevenueCat initialization failed:', error);
      // Development'ta hata olsa bile devam et
      if (__DEV__) {
        this.isInitialized = true;
        this.currentCustomerInfo = null;
        return;
      }
      throw error;
    }
  }

  /**
   * Kullanıcı bilgilerini güncelle
   */
  static async refreshCustomerInfo(): Promise<CustomerInfo | null> {
    try {
      // Development mock
      if (__DEV__ && (global as any).__DEV__) {
        debugLog('🔧 Development: Using mock customer info');
        return null;
      }

      const customerInfo = await Purchases.getCustomerInfo();
      this.currentCustomerInfo = customerInfo;
      debugLog('📊 Customer info refreshed:', {
        userId: customerInfo.originalAppUserId,
        activeSubscriptions: Object.keys(customerInfo.activeSubscriptions),
        premiumStatus: this.getPremiumStatus(),
      });
      return customerInfo;
    } catch (error) {
      console.error('❌ Failed to refresh customer info:', error);
      if (__DEV__) {
        return null; // Development'ta hata vermesin
      }
      throw error;
    }
  }

  /**
   * Mevcut premium durumunu kontrol et
   */
  static async getPremiumStatus(): Promise<PremiumStatus> {
    try {
      // Eğer customer info yoksa refresh et
      if (!this.currentCustomerInfo) {
        await this.refreshCustomerInfo();
      }

      if (!this.currentCustomerInfo) {
        return { isPremium: false, isActive: false };
      }

      const premiumEntitlement =
        this.currentCustomerInfo.entitlements.active[
          REVENUECAT_CONFIG.entitlements.premium
        ];

      if (!premiumEntitlement) {
        return { isPremium: false, isActive: false };
      }

      return {
        isPremium: true,
        isActive: premiumEntitlement.isActive,
        expirationDate: premiumEntitlement.expirationDate
          ? new Date(premiumEntitlement.expirationDate)
          : undefined,
        originalPurchaseDate: premiumEntitlement.originalPurchaseDate
          ? new Date(premiumEntitlement.originalPurchaseDate)
          : undefined,
        productId: premiumEntitlement.productIdentifier,
        willRenew: premiumEntitlement.willRenew,
      };
    } catch (error) {
      console.error('❌ Failed to get premium status:', error);
      return { isPremium: false, isActive: false };
    }
  }

  /**
   * Belirli bir premium özelliğe erişimi kontrol et
   */
  static async hasFeatureAccess(feature: PremiumFeature): Promise<boolean> {
    const premiumStatus = await this.getPremiumStatus();

    if (!premiumStatus.isPremium || !premiumStatus.isActive) {
      return false;
    }

    return PREMIUM_FEATURES[feature];
  }

  /**
   * Mevcut offerings'leri getir
   */
  static async getOfferings(): Promise<PurchasesOffering[]> {
    try {
      // SDK'nın initialize edildiğinden emin ol
      if (!this.isInitialized) {
        await this.initialize();
      }

      const offerings = await Purchases.getOfferings();

      if (!offerings.current) {
        console.warn(
          '⚠️ No current offering available, checking all offerings...'
        );

        // Tüm offerings'leri kontrol et
        const allOfferings = Object.values(offerings.all);
        if (allOfferings.length === 0) {
          throw new Error('No offerings available in RevenueCat dashboard');
        }

        // İlk available offering'i kullan
        const firstOffering = allOfferings[0];
        debugLog('📦 Using first available offering:', {
          offeringId: firstOffering.identifier,
          packagesCount: firstOffering.availablePackages.length,
        });

        return [firstOffering];
      }

      debugLog('📦 Available offerings:', {
        currentOffering: offerings.current.identifier,
        packagesCount: offerings.current.availablePackages.length,
        allOfferings: Object.keys(offerings.all),
      });

      return [offerings.current];
    } catch (error) {
      console.error('❌ Failed to get offerings:', error);

      // Daha detaylı hata bilgisi
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
        });
      }

      throw error;
    }
  }

  /**
   * Belirli paketi satın al
   */
  static async purchasePackage(
    purchasePackage: PurchasesPackage
  ): Promise<PurchaseResult> {
    try {
      debugLog('🛒 Starting purchase:', {
        identifier: purchasePackage.identifier,
        productId: purchasePackage.product.identifier,
      });

      const { customerInfo } = await Purchases.purchasePackage(purchasePackage);

      // Customer info'yu güncelle
      this.currentCustomerInfo = customerInfo;

      debugLog('✅ Purchase successful:', {
        productId: purchasePackage.product.identifier,
        premiumStatus: this.getPremiumStatus(),
      });

      return {
        success: true,
        customerInfo,
      };
    } catch (error: any) {
      console.error('❌ Purchase failed:', error);

      // Kullanıcı iptal etti
      if (error.userCancelled) {
        debugLog('ℹ️ User cancelled purchase');
        return {
          success: false,
          userCancelled: true,
          error: 'Satın alma iptal edildi',
        };
      }

      return {
        success: false,
        error: error.message || 'Satın alma işlemi başarısız oldu',
      };
    }
  }

  /**
   * Satın almaları restore et
   */
  static async restorePurchases(): Promise<PurchaseResult> {
    try {
      debugLog('🔄 Restoring purchases...');

      const customerInfo = await Purchases.restorePurchases();
      this.currentCustomerInfo = customerInfo;

      debugLog('✅ Purchases restored:', {
        activeSubscriptions: Object.keys(customerInfo.activeSubscriptions),
        premiumStatus: this.getPremiumStatus(),
      });

      return {
        success: true,
        customerInfo,
      };
    } catch (error: any) {
      console.error('❌ Restore failed:', error);
      return {
        success: false,
        error: error.message || 'Satın almaları restore etme başarısız oldu',
      };
    }
  }

  /**
   * Kullanıcıyı belirle (authentication'dan sonra)
   */
  static async identifyUser(userId: string): Promise<void> {
    try {
      await Purchases.logIn(userId);
      await this.refreshCustomerInfo();
      debugLog('👤 User identified:', userId);
    } catch (error) {
      console.error('❌ Failed to identify user:', error);
      throw error;
    }
  }

  /**
   * Kullanıcı çıkışı
   */
  static async logoutUser(): Promise<void> {
    try {
      await Purchases.logOut();
      this.currentCustomerInfo = null;
      debugLog('👋 User logged out');
    } catch (error) {
      console.error('❌ Failed to logout user:', error);
      throw error;
    }
  }

  /**
   * Debug bilgileri
   */
  static getDebugInfo(): object {
    return {
      isInitialized: this.isInitialized,
      customerId: this.currentCustomerInfo?.originalAppUserId,
      premiumStatus: this.getPremiumStatus(),
      activeSubscriptions: this.currentCustomerInfo
        ? Object.keys(this.currentCustomerInfo.activeSubscriptions)
        : [],
      allEntitlements: this.currentCustomerInfo
        ? Object.keys(this.currentCustomerInfo.entitlements.all)
        : [],
    };
  }
}
