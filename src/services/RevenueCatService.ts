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

// Environment helpers
const isProduction = () => !__DEV__;
const debugLog = (message: string, data?: any) => {
  if (__DEV__) {
    console.log(message, data || '');
  }
};

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
  private static initializationPromise: Promise<void> | null = null;

  /**
   * RevenueCat SDK'sını başlat (singleton pattern)
   */
  static async initialize(): Promise<void> {
    // Eğer zaten initialize ediliyorsa bekle
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    // Eğer zaten initialize edildiyse return
    if (this.isInitialized) {
      debugLog('✅ RevenueCat already initialized');
      return;
    }

    // Initialize işlemini başlat
    this.initializationPromise = this.performInitialization();

    try {
      await this.initializationPromise;
    } finally {
      this.initializationPromise = null;
    }
  }

  private static async performInitialization(): Promise<void> {
    try {
      // Expo Go kontrolü
      const isExpoGo = Constants.appOwnership === 'expo';

      if (isExpoGo) {
        console.warn('📱 Expo Go detected - RevenueCat will use mock mode');
        this.isInitialized = true;
        this.currentCustomerInfo = null;
        return;
      }

      debugLog('🔧 Checking RevenueCat SDK status...');

      // SDK'nın configure edilip edilmediğini kontrol et - retry logic ile
      let retryCount = 0;
      const maxRetries = 5;
      const retryDelay = 1000;

      while (retryCount < maxRetries) {
        try {
          // Customer info'yu almayı dene
          const customerInfo = await Purchases.getCustomerInfo();
          debugLog('✅ RevenueCat SDK configured and ready');
          this.currentCustomerInfo = customerInfo;
          this.isInitialized = true;
          return;
        } catch (error: any) {
          // SDK henüz configure edilmemiş veya hazır değil
          if (
            error.message?.includes('configure') ||
            error.message?.includes('singleton') ||
            error.message?.includes('not configured')
          ) {
            retryCount++;

            if (retryCount < maxRetries) {
              debugLog(
                `⏳ Waiting for SDK configuration... (attempt ${retryCount}/${maxRetries})`
              );
              await new Promise(resolve => setTimeout(resolve, retryDelay));
              continue;
            }

            // Son deneme başarısız
            console.error(
              '❌ RevenueCat SDK could not be accessed after retries'
            );

            // Development'ta mock mode'a geç
            if (__DEV__) {
              debugLog('🔧 Development mode - using mock mode');
              this.isInitialized = true;
              this.currentCustomerInfo = null;
              return;
            }

            throw new Error(
              'RevenueCat SDK not ready. Please ensure Purchases.configure() is called in App.tsx'
            );
          }

          // Başka bir hata
          throw error;
        }
      }
    } catch (error) {
      console.error('❌ RevenueCat initialization failed:', error);

      // Development'ta mock mode'a geç
      if (__DEV__) {
        debugLog('🔧 Development mode - using mock mode');
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
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Expo Go mock
      if (Constants.appOwnership === 'expo') {
        debugLog('📱 Expo Go: Using mock customer info');
        return null;
      }

      const customerInfo = await Purchases.getCustomerInfo();
      this.currentCustomerInfo = customerInfo;

      debugLog('📊 Customer info refreshed:', {
        userId: customerInfo.originalAppUserId,
        activeSubscriptions: Object.keys(customerInfo.activeSubscriptions),
        activeEntitlements: Object.keys(customerInfo.entitlements.active),
      });

      return customerInfo;
    } catch (error) {
      console.error('❌ Failed to refresh customer info:', error);

      if (__DEV__) {
        return null;
      }

      throw error;
    }
  }

  /**
   * Mevcut premium durumunu kontrol et
   */
  static async getPremiumStatus(): Promise<PremiumStatus> {
    try {
      if (!this.currentCustomerInfo) {
        await this.refreshCustomerInfo();
      }

      if (!this.currentCustomerInfo) {
        return { isPremium: false, isActive: false };
      }

      // Entitlement kontrolü - "Premium Subscription" ile eşleşmeli
      const premiumEntitlement =
        this.currentCustomerInfo.entitlements.active[
          REVENUECAT_CONFIG.entitlements.premium
        ] ||
        this.currentCustomerInfo.entitlements.active['Premium Subscription'] ||
        this.currentCustomerInfo.entitlements.active['premium'];

      if (!premiumEntitlement) {
        debugLog(
          'No active premium entitlement found. Checking all entitlements:',
          Object.keys(this.currentCustomerInfo.entitlements.active)
        );
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

    return PREMIUM_FEATURES[feature] || false;
  }

  /**
   * Mevcut offerings'leri getir (retry logic ile)
   */
  static async getOfferings(): Promise<PurchasesOffering[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Expo Go mock
    if (Constants.appOwnership === 'expo') {
      debugLog('📱 Expo Go: Returning mock offerings');
      return this.getMockOfferings();
    }

    let retryCount = 0;
    const maxRetries = 3;
    const retryDelay = 1000;

    while (retryCount < maxRetries) {
      try {
        debugLog(
          `🔄 Fetching offerings (attempt ${retryCount + 1}/${maxRetries})...`
        );

        const offerings = await Purchases.getOfferings();

        if (!offerings) {
          throw new Error('Offerings object is null');
        }

        // Current offering kontrolü
        if (!offerings.current) {
          debugLog('⚠️ No current offering, checking for Default offering...');

          // "Default" offering'i ara (büyük harfle başlıyor)
          const defaultOffering =
            offerings.all['Default'] || offerings.all['default'];

          if (defaultOffering) {
            debugLog(
              `✅ Found Default offering: ${defaultOffering.identifier}`
            );
            return [defaultOffering];
          }

          const allOfferings = Object.values(offerings.all);

          if (allOfferings.length === 0) {
            if (retryCount < maxRetries - 1) {
              debugLog(`⏳ No offerings found, retrying in ${retryDelay}ms...`);
              await new Promise(resolve => setTimeout(resolve, retryDelay));
              retryCount++;
              continue;
            }

            throw new Error(
              'No offerings configured in RevenueCat dashboard. ' +
                'Please check your RevenueCat dashboard configuration.'
            );
          }

          // İlk offering'i kullan
          debugLog(
            `✅ Using first available offering: ${allOfferings[0].identifier}`
          );
          return [allOfferings[0]];
        }

        debugLog(`✅ Found current offering: ${offerings.current.identifier}`);
        return [offerings.current];
      } catch (error: any) {
        console.error(`❌ Attempt ${retryCount + 1} failed:`, error.message);

        if (retryCount < maxRetries - 1) {
          debugLog(`⏳ Retrying in ${retryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          retryCount++;
        } else {
          // Development'ta mock data dön
          if (__DEV__) {
            debugLog('🔧 Development: Returning mock offerings');
            return this.getMockOfferings();
          }

          throw error;
        }
      }
    }

    throw new Error('Failed to fetch offerings after all retries');
  }

  /**
   * Mock offerings for development/Expo Go
   */
  private static getMockOfferings(): PurchasesOffering[] {
    return [
      {
        identifier: 'Default',
        serverDescription: 'Default Offering',
        availablePackages: [
          {
            identifier: '$rc_monthly',
            packageType: 'MONTHLY',
            product: {
              identifier: 'com.yemekbulucu.subscription.basic.monthly',
              description: 'Premium Monthly Subscription',
              title: 'Premium Aylık',
              price: 39.99,
              priceString: '₺39,99',
              currencyCode: 'TRY',
              introPrice: null,
              discounts: null,
            },
            offeringIdentifier: 'Default',
          },
        ],
        lifetime: null,
        annual: null,
        sixMonth: null,
        threeMonth: null,
        twoMonth: null,
        monthly: null,
        weekly: null,
      } as any,
    ];
  }

  /**
   * Belirli paketi satın al
   */
  static async purchasePackage(
    purchasePackage: PurchasesPackage
  ): Promise<PurchaseResult> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Expo Go kontrolü
      if (Constants.appOwnership === 'expo') {
        debugLog('📱 Expo Go: Mock purchase');
        return {
          success: false,
          error: "Satın alma Expo Go'da çalışmaz. Lütfen build alın.",
        };
      }

      debugLog('🛒 Starting purchase:', {
        identifier: purchasePackage.identifier,
        productId: purchasePackage.product.identifier,
      });

      const { customerInfo } = await Purchases.purchasePackage(purchasePackage);

      this.currentCustomerInfo = customerInfo;

      debugLog('✅ Purchase successful');

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

      // Error code'lara göre mesaj
      let errorMessage = 'Satın alma işlemi başarısız oldu';

      if (error.code === '1' || error.message?.includes('cancelled')) {
        return {
          success: false,
          userCancelled: true,
          error: 'Satın alma iptal edildi',
        };
      } else if (error.code === '2') {
        errorMessage = 'Ürün bulunamadı';
      } else if (error.code === '3') {
        errorMessage = 'Ürün satın alınamıyor';
      } else if (error.code === '7') {
        errorMessage = 'Bu ürün zaten satın alınmış';
      } else if (error.code === '8') {
        errorMessage = 'Satın alma işlemi henüz tamamlanmadı';
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Satın almaları restore et
   */
  static async restorePurchases(): Promise<PurchaseResult> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Expo Go kontrolü
      if (Constants.appOwnership === 'expo') {
        debugLog('📱 Expo Go: Mock restore');
        return {
          success: false,
          error: "Restore Expo Go'da çalışmaz. Lütfen build alın.",
        };
      }

      debugLog('🔄 Restoring purchases...');

      const customerInfo = await Purchases.restorePurchases();
      this.currentCustomerInfo = customerInfo;

      debugLog('✅ Purchases restored:', {
        activeSubscriptions: Object.keys(customerInfo.activeSubscriptions),
      });

      return {
        success: true,
        customerInfo,
      };
    } catch (error: any) {
      console.error('❌ Restore failed:', error);
      return {
        success: false,
        error: error.message || 'Satın almaları geri yükleme başarısız oldu',
      };
    }
  }

  /**
   * Kullanıcıyı belirle (authentication'dan sonra)
   */
  static async identifyUser(userId: string): Promise<void> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

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
      if (!this.isInitialized) {
        await this.initialize();
      }

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
      isExpoGo: Constants.appOwnership === 'expo',
      customerId: this.currentCustomerInfo?.originalAppUserId,
      activeSubscriptions: this.currentCustomerInfo
        ? Object.keys(this.currentCustomerInfo.activeSubscriptions)
        : [],
      activeEntitlements: this.currentCustomerInfo
        ? Object.keys(this.currentCustomerInfo.entitlements.active)
        : [],
    };
  }
}
