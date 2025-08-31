/**
 * RevenueCat Configuration
 *
 * RevenueCat API keys ve product identifierları
 */

export const REVENUECAT_CONFIG = {
  // RevenueCat API Keys
  apiKeys: {
    apple:
      process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY ||
      'appl_aAFWiEGXPfzbOgzBYpVMbfvojQD', // RevenueCat iOS API Key
    google: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY || '', // RevenueCat Android API Key
  },

  // Apple Store Connect Product IDs
  // Bundle ID: com.yemekbulucuai.app
  productIds: {
    // Subscription - App Store Connect'te tanımlı
    monthlySubscription: 'com.yemekbulucu.subscription.basic.monthly',
  },

  // RevenueCat Offering & Package IDs
  offerings: {
    defaultOffering: 'Default', // Büyük harfle başlıyor (RevenueCat'te aynen böyle)
    packages: {
      monthly: '$rc_monthly',
    },
  },

  // Entitlements (Premium feature access)
  entitlements: {
    premium: 'Premium Subscription', // RevenueCat'teki identifier ile aynı olmalı
  },
};

// Premium özellikleri
export const PREMIUM_FEATURES = {
  unlimitedRecipes: true,
  advancedFilters: true,
  exportRecipes: true,
  prioritySupport: true,
  noAds: true,
  offlineMode: true,
  customMealPlans: true,
  nutritionTracking: true,
} as const;

export type PremiumFeature = keyof typeof PREMIUM_FEATURES;

// Debug mode helper
export const isDebugMode = __DEV__ && !process.env.EXPO_PUBLIC_PRODUCTION;
