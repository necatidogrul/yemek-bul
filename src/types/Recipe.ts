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
  servings?: number;
  difficulty?: "kolay" | "orta" | "zor";
  category?: "çorba" | "ana_yemek" | "salata" | "tatlı" | "aperatif";
  imageUrl?: string;
  missingIngredients?: string[];
}

export interface RecipeSearchResult {
  exactMatches: Recipe[];
  nearMatches: Recipe[];
}

export interface SearchRequest {
  ingredients: string[];
  maxMissingIngredients?: number;
}
