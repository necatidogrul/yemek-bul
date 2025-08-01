import Purchases, { 
  PurchasesPackage, 
  CustomerInfo, 
  PurchasesOffering,
  PURCHASES_ERROR_CODE,
  PurchasesError 
} from 'react-native-purchases';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { REVENUECAT_CONFIG } from '../config/revenuecat.config';
import { MockRevenueCatService } from './MockRevenueCatService';

// Import configuration
const {
  API_KEYS: REVENUECAT_API_KEYS,
  PRODUCTS: PRODUCT_IDS,
  ENTITLEMENTS: ENTITLEMENT_IDS,
  DEVELOPMENT,
} = REVENUECAT_CONFIG;

// Storage keys
const STORAGE_KEYS = {
  PREMIUM_STATUS: 'premium_status',
  LAST_CHECK: 'premium_last_check',
  USER_ID: 'revenuecat_user_id',
} as const;

export interface SubscriptionInfo {
  isPremium: boolean;
  isActive: boolean;
  willRenew: boolean;
  originalPurchaseDate?: Date;
  expirationDate?: Date;
  productIdentifier?: string;
  isSandbox: boolean;
}

export interface OfferingInfo {
  identifier: string;
  serverDescription: string;
  packages: PurchasePackageInfo[];
}

export interface PurchasePackageInfo {
  identifier: string;
  packageType: string;
  product: {
    identifier: string;
    description: string;
    title: string;
    price: number;
    priceString: string;
    currencyCode: string;
  };
}

export class RevenueCatService {
  private static isInitialized = false;
  private static currentUserId: string | null = null;
  private static isMockMode = DEVELOPMENT.MOCK_MODE;

  // Mock mode helper methods
  static enableMockMode(): void {
    this.isMockMode = true;
    console.log('🧪 Mock mode enabled');
  }

  static disableMockMode(): void {
    this.isMockMode = false;
    console.log('✅ Mock mode disabled');
  }

  static isMockModeEnabled(): boolean {
    return this.isMockMode;
  }

  /**
   * Initialize RevenueCat SDK
   */
  static async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      return true;
    }

    // Use mock service if in mock mode
    if (this.isMockMode) {
      const result = await MockRevenueCatService.initialize();
      this.isInitialized = result;
      return result;
    }

    try {
      // Set log level based on environment
      await Purchases.setLogLevel(
        DEVELOPMENT.ENABLE_DEBUG_LOGS ? Purchases.LOG_LEVEL.DEBUG : Purchases.LOG_LEVEL.ERROR
      );
      
      // Configure RevenueCat with platform-specific API key
      let apiKey = Platform.OS === 'ios' 
        ? REVENUECAT_API_KEYS.ios 
        : REVENUECAT_API_KEYS.android;
      
      // Development için temporary key kullan (gerçek key'ler yoksa)
      if (apiKey.includes('PUT_YOUR_') && DEVELOPMENT.TEMP_API_KEY && !DEVELOPMENT.TEMP_API_KEY.includes('PUT_YOUR_')) {
        apiKey = DEVELOPMENT.TEMP_API_KEY;
        console.log('⚠️ Using temporary RevenueCat API key for development');
      }
      
      if (apiKey.includes('PUT_YOUR_')) {
        if (__DEV__) {
          console.warn('RevenueCat API key not configured. Enabling mock mode. Check REVENUECAT_SETUP.md for instructions.');
          this.isMockMode = true;
          return this.initialize(); // Re-initialize in mock mode
        } else {
          throw new Error('RevenueCat API key not configured. Please add your API key.');
        }
      }
        
      await Purchases.configure({ apiKey });
      
      this.isInitialized = true;
      console.log('✅ RevenueCat initialized successfully');
      
      return true;
    } catch (error) {
      console.error('❌ RevenueCat initialization error:', error);
      if (__DEV__) {
        console.warn('Falling back to mock mode for development');
        this.isMockMode = true;
        return this.initialize(); // Re-initialize in mock mode
      }
      return false;
    }
  }

  /**
   * Set user ID for RevenueCat
   */
  static async identifyUser(userId: string): Promise<boolean> {
    if (this.isMockMode) {
      return MockRevenueCatService.identifyUser(userId);
    }

    try {
      if (this.currentUserId === userId) {
        return true; // Already identified
      }

      const { customerInfo } = await Purchases.logIn(userId);
      this.currentUserId = userId;
      
      await AsyncStorage.setItem(STORAGE_KEYS.USER_ID, userId);
      
      console.log(`✅ User identified: ${userId}`);
      console.log(`Premium status: ${customerInfo.entitlements.active[ENTITLEMENT_IDS.PREMIUM] !== undefined}`);
      
      return true;
    } catch (error) {
      console.error('❌ User identification error:', error);
      return false;
    }
  }

  /**
   * Anonymous login (for users who don't want to register)
   */
  static async loginAnonymously(): Promise<boolean> {
    if (this.isMockMode) {
      return MockRevenueCatService.loginAnonymously();
    }

    try {
      const existingUserId = await AsyncStorage.getItem(STORAGE_KEYS.USER_ID);
      
      if (existingUserId) {
        return await this.identifyUser(existingUserId);
      }
      
      // Generate anonymous user ID
      const anonymousId = `anonymous_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      return await this.identifyUser(anonymousId);
    } catch (error) {
      console.error('❌ Anonymous login error:', error);
      return false;
    }
  }

  /**
   * Get detailed subscription information
   */
  static async getSubscriptionInfo(): Promise<SubscriptionInfo> {
    if (this.isMockMode) {
      return MockRevenueCatService.getSubscriptionInfo();
    }

    try {
      const customerInfo: CustomerInfo = await Purchases.getCustomerInfo();
      const premiumEntitlement = customerInfo.entitlements.active[ENTITLEMENT_IDS.PREMIUM];
      
      if (premiumEntitlement) {
        const subscriptionInfo: SubscriptionInfo = {
          isPremium: true,
          isActive: true,
          willRenew: premiumEntitlement.willRenew,
          originalPurchaseDate: premiumEntitlement.originalPurchaseDate ? new Date(premiumEntitlement.originalPurchaseDate) : undefined,
          expirationDate: premiumEntitlement.expirationDate ? new Date(premiumEntitlement.expirationDate) : undefined,
          productIdentifier: premiumEntitlement.productIdentifier,
          isSandbox: premiumEntitlement.isSandbox,
        };
        
        // Cache premium status
        await AsyncStorage.setItem(STORAGE_KEYS.PREMIUM_STATUS, JSON.stringify(subscriptionInfo));
        await AsyncStorage.setItem(STORAGE_KEYS.LAST_CHECK, Date.now().toString());
        
        return subscriptionInfo;
      }
      
      const freeInfo: SubscriptionInfo = {
        isPremium: false,
        isActive: false,
        willRenew: false,
        isSandbox: false,
      };
      
      // Cache free status
      await AsyncStorage.setItem(STORAGE_KEYS.PREMIUM_STATUS, JSON.stringify(freeInfo));
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_CHECK, Date.now().toString());
      
      return freeInfo;
    } catch (error) {
      console.error('❌ Subscription status check error:', error);
      
      // Return cached status if available
      try {
        const cached = await AsyncStorage.getItem(STORAGE_KEYS.PREMIUM_STATUS);
        if (cached) {
          try {
            return JSON.parse(cached);
          } catch (parseError) {
            console.warn('Invalid premium status cache, clearing:', parseError);
            await AsyncStorage.removeItem(STORAGE_KEYS.PREMIUM_STATUS);
          }
        }
      } catch (cacheError) {
        console.error('Cache read error:', cacheError);
      }
      
      return {
        isPremium: false,
        isActive: false,
        willRenew: false,
        isSandbox: false,
      };
    }
  }

  /**
   * Quick premium status check (uses cache if recent)
   */
  static async isPremiumUser(): Promise<boolean> {
    if (this.isMockMode) {
      return MockRevenueCatService.isPremiumUser();
    }

    try {
      const lastCheck = await AsyncStorage.getItem(STORAGE_KEYS.LAST_CHECK);
      const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
      
      // Use cache if check was recent (within 5 minutes)
      if (lastCheck && parseInt(lastCheck) > fiveMinutesAgo) {
        const cached = await AsyncStorage.getItem(STORAGE_KEYS.PREMIUM_STATUS);
        if (cached) {
          try {
            const info: SubscriptionInfo = JSON.parse(cached);
            return info.isPremium;
          } catch (parseError) {
            console.warn('Invalid cached subscription info:', parseError);
          }
        }
      }
      
      // Fresh check
      const info = await this.getSubscriptionInfo();
      return info.isPremium;
    } catch (error) {
      console.error('❌ Premium check error:', error);
      return false;
    }
  }

  /**
   * Get available subscription offerings
   */
  static async getOfferings(): Promise<OfferingInfo[]> {
    if (this.isMockMode) {
      return MockRevenueCatService.getOfferings();
    }

    try {
      const offerings = await Purchases.getOfferings();
      const result: OfferingInfo[] = [];
      
      if (offerings.current) {
        const packages: PurchasePackageInfo[] = [];
        
        // Process available packages
        Object.values(offerings.current.availablePackages).forEach((pkg: PurchasesPackage) => {
          packages.push({
            identifier: pkg.identifier,
            packageType: pkg.packageType,
            product: {
              identifier: pkg.product.identifier,
              description: pkg.product.description,
              title: pkg.product.title,
              price: pkg.product.price,
              priceString: pkg.product.priceString,
              currencyCode: pkg.product.currencyCode,
            },
          });
        });
        
        result.push({
          identifier: offerings.current.identifier,
          serverDescription: offerings.current.serverDescription,
          packages,
        });
      }
      
      return result;
    } catch (error) {
      console.error('❌ Get offerings error:', error);
      return [];
    }
  }

  /**
   * Purchase premium subscription
   */
  static async purchasePremium(packageIdentifier?: string): Promise<{
    success: boolean;
    customerInfo?: CustomerInfo;
    error?: string;
  }> {
    if (this.isMockMode) {
      return MockRevenueCatService.purchasePremium(packageIdentifier);
    }

    try {
      const offerings = await Purchases.getOfferings();
      
      if (!offerings.current || offerings.current.availablePackages.length === 0) {
        return { 
          success: false, 
          error: 'Hiçbir abonelik paketi bulunamadı' 
        };
      }

      // Find the package to purchase
      let packageToPurchase: PurchasesPackage | null = null;
      
      if (packageIdentifier) {
        // Find specific package
        packageToPurchase = offerings.current.availablePackages.find(
          pkg => pkg.identifier === packageIdentifier
        ) || null;
      } else {
        // Default to monthly package
        packageToPurchase = offerings.current.monthly || 
                           offerings.current.availablePackages[0] || 
                           null;
      }
      
      if (!packageToPurchase) {
        return { 
          success: false, 
          error: 'Abonelik paketi bulunamadı' 
        };
      }

      console.log(`🛒 Purchasing package: ${packageToPurchase.identifier}`);
      const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
      
      // Check if purchase was successful
      const isPremium = customerInfo.entitlements.active[ENTITLEMENT_IDS.PREMIUM] !== undefined;
      
      if (isPremium) {
        console.log('✅ Purchase successful! User is now premium.');
        
        // Update cached status
        await this.getSubscriptionInfo();
      } else {
        console.log('❌ Purchase completed but premium not activated.');
      }
      
      return { 
        success: isPremium, 
        customerInfo 
      };
    } catch (error: any) {
      console.error('❌ Purchase error:', error);
      
      // Handle specific error cases
      if (error.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
        return { 
          success: false, 
          error: 'Satın alma iptal edildi' 
        };
      } else if (error.code === PURCHASES_ERROR_CODE.PURCHASE_IN_PROGRESS_ERROR) {
        return { 
          success: false, 
          error: 'Ödeme beklemede. Lütfen daha sonra tekrar kontrol edin.' 
        };
      } else if (error.code === PURCHASES_ERROR_CODE.STORE_PROBLEM_ERROR) {
        return { 
          success: false, 
          error: 'App Store ile bağlantı sorunu. Lütfen daha sonra tekrar deneyin.' 
        };
      }
      
      return { 
        success: false, 
        error: 'Satın alma sırasında bir hata oluştu' 
      };
    }
  }

  /**
   * Restore previous purchases
   */
  static async restorePurchases(): Promise<{
    success: boolean;
    customerInfo?: CustomerInfo;
    error?: string;
  }> {
    if (this.isMockMode) {
      return MockRevenueCatService.restorePurchases();
    }

    try {
      console.log('🔄 Restoring purchases...');
      const customerInfo = await Purchases.restorePurchases();
      
      const isPremium = customerInfo.entitlements.active[ENTITLEMENT_IDS.PREMIUM] !== undefined;
      
      if (isPremium) {
        console.log('✅ Purchases restored! User is premium.');
        // Update cached status
        await this.getSubscriptionInfo();
      } else {
        console.log('ℹ️ No active premium purchases found.');
      }
      
      return { 
        success: isPremium, 
        customerInfo 
      };
    } catch (error: any) {
      console.error('❌ Restore purchases error:', error);
      return { 
        success: false, 
        error: 'Satın alımlar geri yüklenirken bir hata oluştu' 
      };
    }
  }

  /**
   * Get subscription management URL for iOS
   */
  static getSubscriptionManagementURL(): string {
    return 'https://apps.apple.com/account/subscriptions';
  }

  /**
   * Check if user is in free trial
   */
  static async isInFreeTrial(): Promise<boolean> {
    if (this.isMockMode) {
      return MockRevenueCatService.isInFreeTrial();
    }

    try {
      const info = await this.getSubscriptionInfo();
      if (!info.isPremium) return false;
      
      const customerInfo = await Purchases.getCustomerInfo();
      const premiumEntitlement = customerInfo.entitlements.active[ENTITLEMENT_IDS.PREMIUM];
      
      return premiumEntitlement?.periodType === 'trial' || false;
    } catch (error) {
      console.error('❌ Trial check error:', error);
      return false;
    }
  }

  /**
   * Log out current user and clear cache
   */
  static async logout(): Promise<void> {
    if (this.isMockMode) {
      return MockRevenueCatService.logout();
    }

    try {
      await Purchases.logOut();
      this.currentUserId = null;
      
      // Clear cached data
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.PREMIUM_STATUS,
        STORAGE_KEYS.LAST_CHECK,
        STORAGE_KEYS.USER_ID,
      ]);
      
      console.log('✅ User logged out successfully');
    } catch (error) {
      console.error('❌ Logout error:', error);
    }
  }

  /**
   * Get current user ID
   */
  static getCurrentUserId(): string | null {
    if (this.isMockMode) {
      return MockRevenueCatService.getCurrentUserId();
    }
    return this.currentUserId;
  }

  /**
   * Check if RevenueCat is properly initialized
   */
  static isReady(): boolean {
    if (this.isMockMode) {
      return MockRevenueCatService.isReady();
    }
    return this.isInitialized;
  }

  /**
   * Force refresh customer info (useful after external purchase)
   */
  static async refreshCustomerInfo(): Promise<void> {
    if (this.isMockMode) {
      return MockRevenueCatService.refreshCustomerInfo();
    }

    try {
      await Purchases.getCustomerInfo();
      await this.getSubscriptionInfo(); // This will update the cache
      console.log('✅ Customer info refreshed');
    } catch (error) {
      console.error('❌ Refresh customer info error:', error);
    }
  }
}