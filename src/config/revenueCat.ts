/**
 * RevenueCat Configuration
 *
 * RevenueCat API keys ve product identifierları
 */

export const REVENUECAT_CONFIG = {
  // RevenueCat API Keys
  apiKeys: {
    apple: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS || '', // RevenueCat iOS API Key
    google: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID || '', // RevenueCat Android API Key
  },

  // Apple Store Connect Product IDs
  productIds: {
    // Subscription
    monthlySubscription: 'com.yemekbulucu.subscription.basic.monthly',

    // Consumable Credits (ihtiyaç varsa)
    starterCredits: 'com.yemekbulucu.credits_starter',
    popularCredits: 'com.yemekbulucu.credits_popular',
    premiumCredits: 'com.yemekbulucu.credits_premium',
  },

  // RevenueCat Offering & Package IDs
  offerings: {
    defaultOffering: 'Default',
    packages: {
      monthly: '$rc_monthly',
    },
  },

  // Entitlements (Premium feature access)
  entitlements: {
    premium: 'Premium', // Premium entitlement identifier
  },
};

// Premium özellikleri
export const PREMIUM_FEATURES = {
  unlimitedRecipes: true,
  advancedFilters: true,
  exportRecipes: true,
  prioritySupport: true,
  noAds: true,
} as const;

export type PremiumFeature = keyof typeof PREMIUM_FEATURES;
