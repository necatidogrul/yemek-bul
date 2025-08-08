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
  dailySearches: number | 'unlimited';
  dailyRecipeViews: number | 'unlimited';
  maxFavorites: number | 'unlimited';
  aiGenerationsPerMonth: number | 'unlimited';
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
  subscriptionType: 'monthly' | 'yearly' | 'none';
  startDate?: Date;
  endDate?: Date;
  autoRenew: boolean;
  platform: 'ios' | 'android' | 'web';
  originalTransactionId?: string;
  receiptData?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Premium subscription tiers
export const PREMIUM_TIERS: PremiumTier[] = [
  {
    id: 'premium',
    name: 'Premium',
    monthlyPrice: 69.99,
    yearlyPrice: 699.99, // 2 ay ücretsiz
    priceUSD: 6.99,
    yearlyPriceUSD: 69.99,
    description: 'Premium kullanım deneyimi',
    badge: '🚀',
    popular: true,
    features: [
      {
        id: 'daily_ai_limit',
        name: 'Günlük 20 AI Tarif',
        description: 'Her gün 20 AI tarif üretebilirsin',
        icon: 'sparkles',
        included: true
      },
      {
        id: 'monthly_favorites',
        name: 'Aylık 100 Favori',
        description: 'Ayda 100 tarifi favorilere ekleyebilirsin',
        icon: 'heart',
        included: true
      },
      {
        id: 'search_history',
        name: 'Aylık 500 Arama Geçmişi',
        description: 'Son 500 aramana erişebilirsin',
        icon: 'time',
        included: true
      },
      {
        id: 'recipe_qa',
        name: 'Günlük 30 Q&A',
        description: 'Her gün 30 soru sorabilirsin',
        icon: 'help-circle',
        included: true
      },
      {
        id: 'community_pool',
        name: 'Community Pool',
        description: 'Günlük 50 topluluk tarifi',
        icon: 'people',
        included: true
      }
    ],
    limits: {
      dailySearches: 'unlimited',
      dailyRecipeViews: 'unlimited',
      maxFavorites: 100, // Aylık limit
      aiGenerationsPerMonth: 600, // 20 x 30 gün
      dailyAiGenerations: 20, // Günlük limit
      dailyQAQuestions: 30, // Günlük Q&A limiti
      dailyCommunityAccess: 50, // Günlük community pool
      monthlySearchHistory: 500, // Aylık arama geçmişi
      communityPoolAccess: true,
      hasSearchHistory: true,
      hasCloudSync: false,
      hasAdvancedAnalytics: false,
      hasOfflineSync: false,
      hasAdFree: false,
      hasPrioritySupport: false,
      hasEarlyAccess: false
    },
    appleProductId: 'com.yemekbulucu.premium.monthly',
    googleProductId: 'premium_monthly',
    appleYearlyProductId: 'com.yemekbulucu.premium.yearly',
    googleYearlyProductId: 'premium_yearly'
  }
];

// Helper functions
export const getPremiumTierById = (tierId: string): PremiumTier | undefined => {
  return PREMIUM_TIERS.find(tier => tier.id === tierId);
};

export const getFeatureByTierId = (tierId: string, featureId: string): PremiumFeature | undefined => {
  const tier = getPremiumTierById(tierId);
  return tier?.features.find(feature => feature.id === featureId);
};

export const hasFeature = (userTier: string | undefined, featureId: string): boolean => {
  if (!userTier) return false;
  const feature = getFeatureByTierId(userTier, featureId);
  return feature?.included || false;
};

export const getMonthySavings = (tier: PremiumTier): number => {
  if (!tier.yearlyPrice || !tier.monthlyPrice) return 0;
  const yearlyMonthly = tier.yearlyPrice / 12;
  return Math.round(((tier.monthlyPrice - yearlyMonthly) / tier.monthlyPrice) * 100);
};