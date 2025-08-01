// RevenueCat Configuration
// Bu dosyayı .gitignore'a ekleyin - API key'ler public olmmamalı

export const REVENUECAT_CONFIG = {
  // RevenueCat dashboard'tan alacağınız API key'leri buraya yazın
  API_KEYS: {
    ios: process.env.REVENUECAT_IOS_API_KEY || 'appl_PUT_YOUR_IOS_KEY_HERE',
    android: process.env.REVENUECAT_ANDROID_API_KEY || 'goog_PUT_YOUR_ANDROID_KEY_HERE',
  },
  
  // Product IDs - App Store Connect'te oluşturacağınız product'lar
  PRODUCTS: {
    PREMIUM_MONTHLY: 'com.yemekbulucu.premium_monthly',
    PREMIUM_YEARLY: 'com.yemekbulucu.premium_yearly', // Optional
  },
  
  // Entitlement IDs - RevenueCat dashboard'ta oluşturacağınız entitlement'lar  
  ENTITLEMENTS: {
    PREMIUM: 'premium',
  },
  
  // Development settings
  DEVELOPMENT: {
    // Test için geçici API key (tüm platformlar için)
    TEMP_API_KEY: 'PUT_YOUR_TEMP_KEY_HERE_FOR_TESTING',
    
    // Debug logs
    ENABLE_DEBUG_LOGS: __DEV__,
    
    // Mock mode (RevenueCat olmadan test için)
    // Development'ta API key yoksa otomatik mock mode'a geçer
    MOCK_MODE: __DEV__, // Development'ta mock mode enable
  },
} as const;

// Type definitions
export type ProductId = keyof typeof REVENUECAT_CONFIG.PRODUCTS;
export type EntitlementId = keyof typeof REVENUECAT_CONFIG.ENTITLEMENTS;