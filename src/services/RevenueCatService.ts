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
import { Logger } from './LoggerService';
import {
  REVENUECAT_CONFIG,
  PREMIUM_FEATURES,
  PremiumFeature,
} from '../config/revenueCat';

// Environment helpers
const isProduction = () => !__DEV__;
const debugLog = (message: string, data?: any) => {
  if (__DEV__) {
    Logger.info(message, data || '');
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
        Logger.warn('📱 Expo Go detected - RevenueCat will use mock mode');
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
            Logger.error(
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
      Logger.error('❌ RevenueCat initialization failed:', error);

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
  static async refreshCustomerInfo(forceRefresh = false): Promise<CustomerInfo | null> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Expo Go mock
      if (Constants.appOwnership === 'expo') {
        debugLog('📱 Expo Go: Using mock customer info');
        return null;
      }

      debugLog(`🔄 Refreshing customer info (force: ${forceRefresh})`);
      
      // Force refresh için cache'i bypass et
      let customerInfo: CustomerInfo;
      if (forceRefresh) {
        // Cache'i bypass etmek için restore'dan sonra get yapalım
        try {
          // Sandbox'ta restore purchases çağırarak cache'i temizleyelim
          debugLog('🔄 Force refresh: Restoring purchases to clear cache');
          customerInfo = await Purchases.restorePurchases();
        } catch (restoreError) {
          debugLog('⚠️ Restore failed, falling back to getCustomerInfo');
          customerInfo = await Purchases.getCustomerInfo();
        }
      } else {
        customerInfo = await Purchases.getCustomerInfo();
      }
      
      this.currentCustomerInfo = customerInfo;

      debugLog('📊 Customer info refreshed:', {
        userId: customerInfo.originalAppUserId,
        activeSubscriptions: Object.keys(customerInfo.activeSubscriptions),
        activeEntitlements: Object.keys(customerInfo.entitlements.active),
        entitlementsDetail: Object.fromEntries(
          Object.entries(customerInfo.entitlements.active).map(([key, entitlement]) => [
            key, 
            {
              isActive: entitlement.isActive,
              willRenew: entitlement.willRenew,
              productId: entitlement.productIdentifier,
              expirationDate: entitlement.expirationDate
            }
          ])
        )
      });

      return customerInfo;
    } catch (error) {
      Logger.error('❌ Failed to refresh customer info:', error);

      if (__DEV__) {
        return null;
      }

      throw error;
    }
  }

  /**
   * Mevcut premium durumunu kontrol et
   */
  static async getPremiumStatus(forceRefresh = false): Promise<PremiumStatus> {
    try {
      if (!this.currentCustomerInfo || forceRefresh) {
        await this.refreshCustomerInfo(forceRefresh);
      }

      if (!this.currentCustomerInfo) {
        debugLog('❌ No customer info available for premium status check');
        return { isPremium: false, isActive: false };
      }

      // Tüm entitlement'ları kontrol et - geniş kapsam
      const allActiveEntitlements = this.currentCustomerInfo.entitlements.active;
      const entitlementKeys = Object.keys(allActiveEntitlements);
      
      debugLog('🔍 Checking premium entitlements:', {
        totalActive: entitlementKeys.length,
        keys: entitlementKeys,
        targetEntitlement: REVENUECAT_CONFIG.entitlements.premium
      });

      // Birden fazla entitlement formatını kontrol et
      const premiumEntitlement = 
        allActiveEntitlements[REVENUECAT_CONFIG.entitlements.premium] ||  // Ana konfigürasyon
        allActiveEntitlements['Premium Subscription'] ||  // Genel format
        allActiveEntitlements['premium'] ||  // Küçük harf
        allActiveEntitlements['Premium'] ||  // Büyük başharf
        // Eğer hiçbiri yoksa, ilk aktif entitlement'ı al (sandbox test için)
        (entitlementKeys.length > 0 ? allActiveEntitlements[entitlementKeys[0]] : null);

      if (!premiumEntitlement) {
        debugLog(
          '❌ No active premium entitlement found',
          {
            searchedKeys: [
              REVENUECAT_CONFIG.entitlements.premium,
              'Premium Subscription', 
              'premium', 
              'Premium'
            ],
            availableKeys: entitlementKeys,
            customerInfo: {
              userId: this.currentCustomerInfo.originalAppUserId,
              activeSubscriptions: Object.keys(this.currentCustomerInfo.activeSubscriptions)
            }
          }
        );
        return { isPremium: false, isActive: false };
      }

      const premiumStatus = {
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
      
      debugLog('✅ Premium status determined:', premiumStatus);
      return premiumStatus;
    } catch (error) {
      Logger.error('❌ Failed to get premium status:', error);
      return { isPremium: false, isActive: false };
    }
  }

  /**
   * Belirli bir premium özelliğe erişimi kontrol et
   */
  static async hasFeatureAccess(feature: PremiumFeature, forceRefresh = false): Promise<boolean> {
    const premiumStatus = await this.getPremiumStatus(forceRefresh);

    if (!premiumStatus.isPremium || !premiumStatus.isActive) {
      debugLog(`❌ Feature access denied for ${feature}: premium=${premiumStatus.isPremium}, active=${premiumStatus.isActive}`);
      return false;
    }

    const hasAccess = PREMIUM_FEATURES[feature] || false;
    debugLog(`🔑 Feature access for ${feature}: ${hasAccess}`);
    return hasAccess;
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

        // Tüm mevcut offering'leri döndür
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

        // WeeklyOffering'i öncelikle sırala
        const sortedOfferings = allOfferings.sort((a, b) => {
          if (a.identifier === 'WeeklyOffering') return -1;
          if (b.identifier === 'WeeklyOffering') return 1;
          if (a.identifier === 'Default') return -1;
          if (b.identifier === 'Default') return 1;
          return 0;
        });

        debugLog(`✅ Found ${sortedOfferings.length} offering(s):`, 
          sortedOfferings.map(o => o.identifier));
        return sortedOfferings;
      } catch (error: any) {
        Logger.error(`❌ Attempt ${retryCount + 1} failed:`, error.message);

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
      // Weekly Offering
      {
        identifier: 'WeeklyOffering',
        serverDescription: 'Weekly Premium Subscription',
        availablePackages: [
          {
            identifier: '$rc_weekly',
            packageType: 'WEEKLY',
            product: {
              identifier: 'com.yemekbulucu.subscription.weekly',
              description: 'Premium Weekly Subscription',
              title: 'Premium Haftalık',
              price: 29.99,
              priceString: '₺29,99',
              currencyCode: 'TRY',
              introPrice: null,
              discounts: null,
            },
            offeringIdentifier: 'WeeklyOffering',
          },
        ],
        lifetime: null,
        annual: null,
        sixMonth: null,
        threeMonth: null,
        twoMonth: null,
        monthly: null,
        weekly: {
          identifier: '$rc_weekly',
          packageType: 'WEEKLY',
          product: {
            identifier: 'com.yemekbulucu.subscription.weekly',
            description: 'Premium Weekly Subscription',
            title: 'Premium Haftalık',
            price: 29.99,
            priceString: '₺29,99',
            currencyCode: 'TRY',
            introPrice: null,
            discounts: null,
          },
          offeringIdentifier: 'WeeklyOffering',
        } as any,
      } as any,
      // Monthly Offering (Default)
      {
        identifier: 'Default',
        serverDescription: 'Monthly Premium Subscription',
        availablePackages: [
          {
            identifier: '$rc_monthly',
            packageType: 'MONTHLY',
            product: {
              identifier: 'com.yemekbulucu.subscription.monthly',
              description: 'Premium Monthly Subscription',
              title: 'Premium Aylık',
              price: 79.99,
              priceString: '₺79,99',
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
        monthly: {
          identifier: '$rc_monthly',
          packageType: 'MONTHLY',
          product: {
            identifier: 'com.yemekbulucu.subscription.monthly',
            description: 'Premium Monthly Subscription',
            title: 'Premium Aylık',
            price: 79.99,
            priceString: '₺79,99',
            currencyCode: 'TRY',
            introPrice: null,
            discounts: null,
          },
          offeringIdentifier: 'Default',
        } as any,
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
      Logger.error('❌ Purchase failed:', error);

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
      Logger.error('❌ Restore failed:', error);
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
      Logger.error('❌ Failed to identify user:', error);
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
      Logger.error('❌ Failed to logout user:', error);
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
