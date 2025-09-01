export interface AIRequestHistory {
  id: string;
  ingredients: string[];
  preferences?: {
    difficulty?: string;
    servings?: number;
    cookingTime?: number;
    cuisine?: string;
    dietary?: string[];
    excludeIngredients?: string[];
  };
  results: {
    count: number;
    recipes: {
      id: string;
      name: string;
      difficulty?: string;
      cookingTime?: number;
      servings?: number;
      ingredients?: string[]; // Premium için detaylı bilgi
      instructions?: string[]; // Premium için detaylı bilgi
      imageUrl?: string; // Premium için görsel bilgi
    }[];
  };
  timestamp: number;
  success: boolean;
  error?: string;
  // Premium özellikler
  requestDetails?: {
    tokenUsed?: number;
    responseTime?: number;
    model?: string;
    requestType?: 'ai' | 'search' | 'history';
  };
  userContext?: {
    userId?: string;
    isPremium?: boolean;
    sessionId?: string;
  };
}

export interface HistoryStats {
  totalRequests: number;
  successfulRequests: number;
  totalRecipesGenerated: number;
  mostUsedIngredients: Array<{
    ingredient: string;
    count: number;
  }>;
  averageIngredientsPerRequest: number;
  lastRequestDate?: number;
  // Premium istatistikler
  totalTokensUsed?: number;
  averageResponseTime?: number;
  favoriteTimeOfDay?: Array<{
    hour: number;
    count: number;
  }>;
  mostSuccessfulCuisines?: Array<{
    cuisine: string;
    successRate: number;
    count: number;
  }>;
  weeklyActivity?: Array<{
    day: number;
    count: number;
  }>;
  monthlyTrends?: Array<{
    month: string;
    requests: number;
    success: number;
  }>;
}

export interface HistoryFilter {
  dateRange?: 'today' | 'week' | 'month' | 'all';
  success?: boolean;
  ingredient?: string;
}
