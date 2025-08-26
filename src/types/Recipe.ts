export interface Ingredient {
  id: string;
  name: string;
  category?: string;
}

export interface Recipe {
  id: string;
  name: string;
  description?: string;
  ingredients: string[];
  instructions: string[];
  preparationTime?: number; // dakika cinsinden
  cookingTime?: number; // dakika cinsinden
  servings?: number;
  difficulty?: "kolay" | "orta" | "zor";
  category?: "çorba" | "ana_yemek" | "salata" | "tatlı" | "aperatif" | "kahvaltı";
  imageUrl?: string;
  imageSearchTerm?: string; // Unsplash API için İngilizce arama kelimesi
  missingIngredients?: string[];
  matchingIngredients?: number;
  totalIngredients?: number;
  isFavorite?: boolean;
  source?: 'ai' | 'database' | 'mock'; // Tarif kaynağı
  aiGenerated?: boolean; // AI tarafından üretildi mi
  tips?: string; // Ek ipuçları
  tokensUsed?: number; // AI için kullanılan token sayısı
  popularityScore?: number; // Topluluk havuzunda popülerlik skoru
  ingredientCombination?: string[]; // Arama için kullanılan malzeme kombinasyonu
  originalIngredients?: string[]; // AI'a verilen orijinal malzemeler
  createdByUserId?: string; // Hangi kullanıcının AI'ı bu tarifi üretti
  createdAt?: string; // Oluşturulma tarihi
}

export interface RecipeSearchResult {
  exactMatches: Recipe[];
  nearMatches: Recipe[];
}

export interface SearchRequest {
  ingredients: string[];
  maxMissingIngredients?: number;
}

export interface SearchHistoryEntry {
  id: string;
  userId: string;
  searchIngredients: string[];
  searchQuery?: string;
  resultType: 'community_pool' | 'ai_cache' | 'ai_generation' | 'mock';
  resultsFound: number;
  exactMatches: number;
  nearMatches: number;
  usedAI: boolean;
  creditsSpent: number;
  responseTimeMs?: number;
  searchTimestamp: string;
  userAgent?: string;
  ipAddress?: string;
  sessionId?: string;
}

export interface UserSearchStats {
  userId: string;
  totalSearches: number;
  aiSearches: number;
  communitySearches: number;
  failedSearches: number;
  totalCreditsSpent: number;
  avgResponseTime: number;
  lastSearchDate: string;
  firstSearchDate: string;
}

export interface SearchAnalytics {
  searchDate: string;
  totalSearches: number;
  uniqueUsers: number;
  aiSearches: number;
  communityPoolHits: number;
  cacheHits: number;
  fallbackSearches: number;
  avgResultsFound: number;
  avgResponseTime: number;
  totalCreditsSpent: number;
}

export interface PopularSearchIngredient {
  ingredient: string;
  searchCount: number;
  uniqueUsers: number;
  avgResultsFound: number;
  latestSearch: string;
}
