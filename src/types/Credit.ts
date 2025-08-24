// Credit System Types

export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number; // TL cinsinden
  priceUSD?: number; // USD cinsinden (RevenueCat için)
  popular?: boolean;
  bonusCredits?: number;
  description?: string;
  appleProductId?: string; // App Store için
  googleProductId?: string; // Google Play için
}

export interface UserCredits {
  userId: string;
  totalCredits: number;
  usedCredits: number;
  remainingCredits: number;
  dailyFreeCredits: number;
  dailyFreeUsed: number;
  lastDailyReset: Date;
  lifetimeCreditsEarned: number;
  lifetimeCreditsSpent: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreditTransaction {
  id: string;
  userId: string;
  transactionType: "earn" | "spend" | "purchase" | "bonus" | "daily_free";
  amount: number;
  description: string;
  relatedAction?: CreditAction;
  packageId?: string; // Satın alma işlemleri için
  receiptId?: string; // RevenueCat receipt ID
  createdAt: Date;
}

export type CreditAction =
  | "recipe_generation"
  | "advanced_recipe"
  | "meal_plan"
  | "nutrition_analysis"
  | "photo_recognition"
  | "export_recipe"
  | "premium_feature"
  | "favorite_view"
  | "recipe_qa"
  | "history_access"
  | "community_pool"
  | "advanced_analytics"
  | "offline_sync";

export interface CreditCosts {
  [key: string]: number;
}

export const CREDIT_COSTS: CreditCosts = {
  recipe_generation: 1, // AI tarif üretimi
  favorite_view: 1, // Favori tarif görüntüleme
  recipe_qa: 3, // Tarif Q&A (Soru-Cevap)
  history_access: 2, // Arama geçmişi erişimi (gelecekte)
  community_pool: 1, // Community pool erişimi
  advanced_analytics: 5, // Gelişmiş analytics dashboard
  offline_sync: 3, // Offline senkronizasyon
  nutrition_analysis: 2, // Besin analizi (gelecekte)
  photo_recognition: 4, // Fotoğraftan malzeme tanıma (gelecekte)
  export_recipe: 2, // PDF export (gelecekte)
  premium_feature: 3, // Diğer premium özellikler
};

export const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: "starter",
    name: "Starter Pack",
    credits: 10,
    price: 79.99,
    priceUSD: 4.99,
    description: "İlk deneyim için ideal",
    appleProductId: "com.yemekbulucu.credits_starter",
    googleProductId: "credits_starter",
  },
  {
    id: "popular",
    name: "Popular Pack",
    credits: 25,
    price: 149.99,
    priceUSD: 6.99,
    popular: true,
    bonusCredits: 5,
    description: "En çok tercih edilen paket",
    appleProductId: "com.yemekbulucu.credits_popular",
    googleProductId: "credits_popular",
  },
  {
    id: "premium",
    name: "Premium Pack",
    credits: 60,
    price: 249.99,
    priceUSD: 12.99,
    bonusCredits: 15,
    description: "Ağır kullanıcılar için",
    appleProductId: "com.yemekbulucu.credits_premium",
    googleProductId: "credits_premium",
  },
];

// Free tier: Sadece 1 lifetime AI kredisi
export const FREE_LIFETIME_CREDITS = 1;
export const FREE_DAILY_CREDITS = 0; // Artık günlük ücretsiz kredi yok
export const MAX_FREE_CREDITS_PER_DAY = 0;

// Free tier limitleri
export const FREE_TIER_LIMITS = {
  dailySearches: 5, // Günlük arama limiti
  dailyRecipeViews: 5, // Günlük tarif görüntüleme limiti
  maxFavorites: 0, // Favori yok
  hasSearchHistory: false, // Arama geçmişi yok
  hasCloudSync: false, // Cloud sync yok
  lifetimeAICredits: 1, // Lifetime sadece 1 AI kullanımı
};
