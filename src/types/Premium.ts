// Premium Subscription Types

export interface PremiumTier {
  id: string;
  name: string;
  monthlyPrice: number;
  yearlyPrice?: number;
  priceUSD: number;
  yearlyPriceUSD?: number;
  description: string;
  features: PremiumFeature[];
  limits: PremiumLimits;
  appleProductId: string;
  googleProductId: string;
  appleYearlyProductId?: string;
  googleYearlyProductId?: string;
  popular?: boolean;
  badge?: string;
}

export interface PremiumFeature {
  id: string;
  name: string;
  description: string;
  icon: string;
  included: boolean;
}

export interface PremiumLimits {
  dailySearches: number | "unlimited";
  dailyRecipeViews: number | "unlimited";
  maxFavorites: number | "unlimited";
  aiGenerationsPerMonth: number | "unlimited";
  dailyAiGenerations?: number; // Günlük AI limit
  dailyQAQuestions?: number; // Günlük Q&A limit
  dailyCommunityAccess?: number; // Günlük community pool limit
  monthlySearchHistory?: number; // Aylık arama geçmişi limit
  communityPoolAccess: boolean;
  hasSearchHistory: boolean;
  hasCloudSync: boolean;
  hasAdvancedAnalytics: boolean;
  hasOfflineSync: boolean;
  hasAdFree: boolean;
  hasPrioritySupport: boolean;
  hasEarlyAccess: boolean;
}

export interface UserPremiumStatus {
  userId: string;
  isActive: boolean;
  currentTier?: string;
  subscriptionType: "monthly" | "yearly" | "none";
  startDate?: Date;
  endDate?: Date;
  autoRenew: boolean;
  platform: "ios" | "android" | "web";
  originalTransactionId?: string;
  receiptData?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Premium subscription tiers - App Store'daki gerçek ürünle eşleşen
export const PREMIUM_TIERS: PremiumTier[] = [
  {
    id: "basic",
    name: "Basic Monthly",
    monthlyPrice: 79.99,
    priceUSD: 4.99,
    description: "Sınırsız AI tarif üretimi ve arama geçmişi",
    badge: "🚀",
    popular: true,
    features: [
      {
        id: "unlimited_ai",
        name: "Sınırsız AI Tarif",
        description: "Aylık 100 AI tarif üretebilirsin",
        icon: "sparkles",
        included: true,
      },
      {
        id: "search_history",
        name: "Arama Geçmişi",
        description: "Tüm aramalarını kaydet ve eriş",
        icon: "time",
        included: true,
      },
      {
        id: "favorites",
        name: "Favoriler",
        description: "Sınırsız favori tarif",
        icon: "heart",
        included: true,
      },
      {
        id: "ad_free",
        name: "Reklamsız Deneyim",
        description: "Hiç reklam görmeden kullan",
        icon: "remove-circle",
        included: true,
      },
    ],
    limits: {
      dailySearches: "unlimited",
      dailyRecipeViews: "unlimited",
      maxFavorites: "unlimited",
      aiGenerationsPerMonth: 100, // Aylık 100 AI isteği
      dailyAiGenerations: 5, // Günlük 5 AI isteği
      dailyQAQuestions: 10, // Günlük 10 Q&A
      dailyCommunityAccess: 20, // Günlük 20 community pool
      monthlySearchHistory: 1000, // Aylık 1000 arama geçmişi
      communityPoolAccess: true,
      hasSearchHistory: true,
      hasCloudSync: false,
      hasAdvancedAnalytics: false,
      hasOfflineSync: false,
      hasAdFree: true,
      hasPrioritySupport: false,
      hasEarlyAccess: false,
    },
    appleProductId: "com.yemekbulucu.subscription.basic.monthly",
    googleProductId: "basic_monthly",
  },
];

// Helper functions
export const getPremiumTierById = (tierId: string): PremiumTier | undefined => {
  return PREMIUM_TIERS.find((tier) => tier.id === tierId);
};

export const getFeatureByTierId = (
  tierId: string,
  featureId: string
): PremiumFeature | undefined => {
  const tier = getPremiumTierById(tierId);
  return tier?.features.find((feature) => feature.id === featureId);
};

export const hasFeature = (
  userTier: string | undefined,
  featureId: string
): boolean => {
  if (!userTier) return false;
  const feature = getFeatureByTierId(userTier, featureId);
  return feature?.included || false;
};

export const getMonthySavings = (tier: PremiumTier): number => {
  if (!tier.yearlyPrice || !tier.monthlyPrice) return 0;
  const yearlyMonthly = tier.yearlyPrice / 12;
  return Math.round(
    ((tier.monthlyPrice - yearlyMonthly) / tier.monthlyPrice) * 100
  );
};
