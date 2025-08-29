export interface AIRequestHistory {
  id: string;
  ingredients: string[];
  preferences?: {
    difficulty?: string;
    servings?: number;
    cookingTime?: number;
    cuisine?: string;
  };
  results: {
    count: number;
    recipes: {
      id: string;
      name: string;
      difficulty?: string;
      cookingTime?: number;
    }[];
  };
  timestamp: number;
  success: boolean;
  error?: string;
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
}

export interface HistoryFilter {
  dateRange?: 'today' | 'week' | 'month' | 'all';
  success?: boolean;
  ingredient?: string;
}
