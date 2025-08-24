// RevenueCat Configuration
// Bu dosyayı .gitignore'a ekleyin - API key'ler public olmmamalı

export const REVENUECAT_CONFIG = {
  // RevenueCat dashboard'tan alacağınız API key'leri buraya yazın
  API_KEYS: {
    ios:
      process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY ||
      "PUT_YOUR_IOS_API_KEY_HERE",
    // Android devre dışı - sadece iOS kullanıyoruz
    android: null,
  },

  // Product IDs - App Store Connect'te mevcut product'larınız
  PRODUCTS: {
    // Premium Subscriptions
    PREMIUM_MONTHLY: "com.yemekbulucu.subscription.basic.monthly",

    // Kredi paketleri - App Store'daki gerçek ID'ler
    CREDITS_STARTER: "com.yemekbulucu.credits_starter",
    CREDITS_POPULAR: "com.yemekbulucu.credits_popular",
    CREDITS_PREMIUM: "com.yemekbulucu.credits_premium",
  },

  // Entitlement IDs - RevenueCat dashboard'ta oluşturacağınız entitlement'lar
  ENTITLEMENTS: {
    PREMIUM: "premium", // Premium abonelik özellikleri
    CREDITS: "credits", // Kredi sistemi
  },

  // Development settings
  DEVELOPMENT: {
    // Test için geçici API key (tüm platformlar için)
    TEMP_API_KEY: "appl_development_test_key",

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

// Product category types
export type SubscriptionProductId =
  | typeof REVENUECAT_CONFIG.PRODUCTS.PREMIUM_MONTHLY;

export type CreditProductId =
  | typeof REVENUECAT_CONFIG.PRODUCTS.CREDITS_STARTER
  | typeof REVENUECAT_CONFIG.PRODUCTS.CREDITS_POPULAR
  | typeof REVENUECAT_CONFIG.PRODUCTS.CREDITS_PREMIUM;
