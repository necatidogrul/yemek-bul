import Purchases, { PurchasesPackage, CustomerInfo, PurchasesOffering } from 'react-native-purchases';

const REVENUECAT_API_KEY = 'your_revenuecat_api_key'; // Revenue Cat'ten alınacak

export class RevenueCatService {
  // RevenueCat'i başlat
  static async initialize(): Promise<void> {
    try {
      await Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
      
      // Platform'a göre API key set et
      await Purchases.configure({
        apiKey: REVENUECAT_API_KEY,
      });
      
      console.log('RevenueCat initialized successfully');
    } catch (error) {
      console.error('RevenueCat initialization error:', error);
    }
  }

  // Kullanıcı kimliği set et
  static async setUserId(userId: string): Promise<void> {
    try {
      await Purchases.logIn(userId);
    } catch (error) {
      console.error('RevenueCat login error:', error);
    }
  }

  // Mevcut subscription durumunu kontrol et
  static async checkSubscriptionStatus(): Promise<boolean> {
    try {
      const customerInfo: CustomerInfo = await Purchases.getCustomerInfo();
      
      // Premium entitlement'ı kontrol et
      const isPremium = customerInfo.entitlements.active['premium'] !== undefined;
      
      return isPremium;
    } catch (error) {
      console.error('Subscription status check error:', error);
      return false;
    }
  }

  // Mevcut paketleri al
  static async getOfferings(): Promise<PurchasesOffering[] | null> {
    try {
      const offerings = await Purchases.getOfferings();
      
      if (offerings.current !== null) {
        return [offerings.current];
      }
      
      return null;
    } catch (error) {
      console.error('Get offerings error:', error);
      return null;
    }
  }

  // Premium paketini satın al
  static async purchasePremium(): Promise<{success: boolean, customerInfo?: CustomerInfo}> {
    try {
      const offerings = await this.getOfferings();
      
      if (!offerings || offerings.length === 0) {
        return { success: false };
      }

      const premiumPackage = offerings[0].monthly;
      
      if (!premiumPackage) {
        return { success: false };
      }

      const { customerInfo } = await Purchases.purchasePackage(premiumPackage);
      
      // Satın alma başarılı mı kontrol et
      const isPremium = customerInfo.entitlements.active['premium'] !== undefined;
      
      return { 
        success: isPremium, 
        customerInfo 
      };
    } catch (error) {
      console.error('Purchase error:', error);
      return { success: false };
    }
  }

  // Satın alımları restore et
  static async restorePurchases(): Promise<{success: boolean, customerInfo?: CustomerInfo}> {
    try {
      const customerInfo = await Purchases.restorePurchases();
      
      const isPremium = customerInfo.entitlements.active['premium'] !== undefined;
      
      return { 
        success: isPremium, 
        customerInfo 
      };
    } catch (error) {
      console.error('Restore purchases error:', error);
      return { success: false };
    }
  }

  // Subscription bilgilerini al
  static async getSubscriptionInfo(): Promise<{
    isActive: boolean;
    expirationDate?: Date;
    willRenew?: boolean;
    productId?: string;
  }> {
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      const premiumEntitlement = customerInfo.entitlements.active['premium'];
      
      if (premiumEntitlement) {
        return {
          isActive: true,
          expirationDate: premiumEntitlement.expirationDate,
          willRenew: premiumEntitlement.willRenew,
          productId: premiumEntitlement.productIdentifier,
        };
      }
      
      return { isActive: false };
    } catch (error) {
      console.error('Get subscription info error:', error);
      return { isActive: false };
    }
  }

  // Kullanıcı çıkışı
  static async logout(): Promise<void> {
    try {
      await Purchases.logOut();
    } catch (error) {
      console.error('RevenueCat logout error:', error);
    }
  }
}

// Premium durumu için tip
export interface PremiumStatus {
  isPremium: boolean;
  expirationDate?: Date;
  willRenew?: boolean;
  productId?: string;
} 