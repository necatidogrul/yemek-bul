import { supabase } from "./supabase";
import { Recipe, RecipeSearchResult, SearchRequest } from "../types/Recipe";

export class RecipeService {
  // Kullanıcının girdiği malzemelere göre tarif arama
  static async searchRecipesByIngredients(
    request: SearchRequest
  ): Promise<RecipeSearchResult> {
    try {
      const { ingredients, maxMissingIngredients = 10 } = request;

      // Tüm tarifleri al
      const { data: recipes, error } = await supabase
        .from("recipes")
        .select("*");

      if (error) {
        throw error;
      }

      if (!recipes) {
        return { exactMatches: [], nearMatches: [] };
      }

      const exactMatches: Recipe[] = [];
      const nearMatches: Recipe[] = [];

      // Tüm tarif analizlerini tut
      const recipeAnalysis: Array<{
        recipe: Recipe;
        matchingCount: number;
        missingCount: number;
        matchRatio: number;
        priority: number;
      }> = [];

      recipes.forEach((recipe) => {
        const recipeIngredients = recipe.ingredients.map((ing) =>
          ing.toLowerCase().trim()
        );
        const userIngredients = ingredients.map((ing) =>
          ing.toLowerCase().trim()
        );

        // Kullanıcının sahip olduğu malzemeler (daha esnek eşleştirme)
        const matchingIngredients = recipeIngredients.filter((ing) =>
          userIngredients.some(
            (userIng) =>
              ing.includes(userIng) ||
              userIng.includes(ing) ||
              this.areSimilarIngredients(ing, userIng)
          )
        );

        // Eksik malzemeler
        const missingIngredients = recipeIngredients.filter(
          (ing) =>
            !userIngredients.some(
              (userIng) =>
                ing.includes(userIng) ||
                userIng.includes(ing) ||
                this.areSimilarIngredients(ing, userIng)
            )
        );

        const matchingCount = matchingIngredients.length;
        const missingCount = missingIngredients.length;
        const matchRatio = matchingCount / recipeIngredients.length;

        // Öncelik hesapla (daha çok eşleşen daha yüksek öncelik)
        let priority = matchingCount * 10; // Temel puan
        priority += matchRatio * 5; // Oran bonusu
        priority -= missingCount * 0.5; // Eksik malzeme cezası

        // Temel malzemeler (tuz, zeytinyağı, vs.) varsa bonus
        if (matchingIngredients.some((ing) => this.isBasicIngredient(ing))) {
          priority += 2;
        }

        const mappedRecipe: Recipe = {
          id: recipe.id,
          name: recipe.name,
          description: recipe.description || undefined,
          ingredients: recipe.ingredients,
          instructions: recipe.instructions,
          preparationTime: recipe.preparation_time || undefined,
          servings: recipe.servings || undefined,
          difficulty: recipe.difficulty as any,
          category: recipe.category as any,
          imageUrl: recipe.image_url || undefined,
          missingIngredients: missingIngredients,
        };

        // En az 1 malzeme eşleşmeli
        if (matchingCount > 0) {
          recipeAnalysis.push({
            recipe: mappedRecipe,
            matchingCount,
            missingCount,
            matchRatio,
            priority,
          });
        }
      });

      // Önceliğe göre sırala
      recipeAnalysis.sort((a, b) => b.priority - a.priority);

      // Tam eşleşme ve yakın eşleşmeleri ayır
      recipeAnalysis.forEach(
        ({ recipe, missingCount, matchingCount, matchRatio }) => {
          if (missingCount === 0) {
            exactMatches.push(recipe);
          } else if (
            matchingCount >= 1 && // En az 1 malzeme eşleşmeli
            (matchRatio >= 0.3 || // %30 eşleşme VEYA
              matchingCount >= 2 || // En az 2 malzeme eşleşmeli VEYA
              missingCount <= 3) // En fazla 3 malzeme eksik
          ) {
            nearMatches.push(recipe);
          }
        }
      );

      return {
        exactMatches: exactMatches.slice(0, 15),
        nearMatches: nearMatches.slice(0, 25),
      };
    } catch (error) {
      console.error("Recipe search error:", error);
      throw error;
    }
  }

  // Benzer malzemeleri kontrol et
  private static areSimilarIngredients(ing1: string, ing2: string): boolean {
    const synonyms = [
      ["domates", "domates salçası"],
      ["soğan", "taze soğan"],
      ["biber", "sivri biber", "yeşil biber", "kırmızı biber"],
      ["peynir", "beyaz peynir", "kaşar peyniri"],
      ["yağ", "zeytinyağı", "ayçiçek yağı"],
      ["un", "galeta unu"],
    ];

    return synonyms.some(
      (group) => group.includes(ing1) && group.includes(ing2)
    );
  }

  // Temel malzemeleri kontrol et
  private static isBasicIngredient(ingredient: string): boolean {
    const basicIngredients = ["tuz", "karabiber", "zeytinyağı", "su", "şeker"];
    return basicIngredients.includes(ingredient);
  }

  // Tarif detayını al
  static async getRecipeById(id: string): Promise<Recipe | null> {
    try {
      const { data, error } = await supabase
        .from("recipes")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        throw error;
      }

      if (!data) {
        return null;
      }

      return {
        id: data.id,
        name: data.name,
        description: data.description || undefined,
        ingredients: data.ingredients,
        instructions: data.instructions,
        preparationTime: data.preparation_time || undefined,
        servings: data.servings || undefined,
        difficulty: data.difficulty as any,
        category: data.category as any,
        imageUrl: data.image_url || undefined,
      };
    } catch (error) {
      console.error("Get recipe error:", error);
      throw error;
    }
  }

  // Tüm mevcut malzemeleri al (önerilerde kullanmak için)
  static async getAllIngredients(): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from("ingredients")
        .select("name")
        .order("name");

      if (error) {
        throw error;
      }

      return data?.map((item) => item.name) || [];
    } catch (error) {
      console.error("Get ingredients error:", error);
      return [];
    }
  }

  // Eksik malzeme önerilerini al
  static async getSuggestedIngredients(userIngredients: string[]): Promise<
    {
      ingredient: string;
      recipes: string[];
      priority: number;
    }[]
  > {
    try {
      const searchResult = await this.searchRecipesByIngredients({
        ingredients: userIngredients,
      });

      const allRecipes = [
        ...searchResult.exactMatches,
        ...searchResult.nearMatches,
      ];
      const suggestionMap = new Map<
        string,
        { recipes: Set<string>; priority: number }
      >();

      allRecipes.forEach((recipe) => {
        recipe.missingIngredients?.forEach((ingredient) => {
          if (!userIngredients.includes(ingredient.toLowerCase())) {
            const current = suggestionMap.get(ingredient) || {
              recipes: new Set(),
              priority: 0,
            };

            current.recipes.add(recipe.name);
            current.priority += 1;

            // Temel malzemeler daha az öncelikli
            if (this.isBasicIngredient(ingredient)) {
              current.priority += 0.5;
            } else {
              current.priority += 2;
            }

            suggestionMap.set(ingredient, current);
          }
        });
      });

      return Array.from(suggestionMap.entries())
        .map(([ingredient, data]) => ({
          ingredient,
          recipes: Array.from(data.recipes),
          priority: data.priority,
        }))
        .sort((a, b) => b.priority - a.priority)
        .slice(0, 10); // En önemli 10 öneri
    } catch (error) {
      console.error("Get suggestions error:", error);
      return [];
    }
  }

  // Kategoriye göre öneriler
  static async getRecipesByCategory(category: string): Promise<Recipe[]> {
    try {
      const { data: recipes, error } = await supabase
        .from("recipes")
        .select("*")
        .eq("category", category)
        .limit(10);

      if (error) {
        throw error;
      }

      return (
        recipes?.map((recipe) => ({
          id: recipe.id,
          name: recipe.name,
          description: recipe.description || undefined,
          ingredients: recipe.ingredients,
          instructions: recipe.instructions,
          preparationTime: recipe.preparation_time || undefined,
          servings: recipe.servings || undefined,
          difficulty: recipe.difficulty as any,
          category: recipe.category as any,
          imageUrl: recipe.image_url || undefined,
        })) || []
      );
    } catch (error) {
      console.error("Get recipes by category error:", error);
      return [];
    }
  }

  // Tüm tarifleri al (sayfalama ile)
  static async getAllRecipes(
    page: number = 1,
    limit: number = 20
  ): Promise<{
    recipes: Recipe[];
    totalCount: number;
    hasMore: boolean;
  }> {
    try {
      const offset = (page - 1) * limit;

      // Toplam sayıyı al
      const { count } = await supabase
        .from("recipes")
        .select("*", { count: "exact", head: true });

      // Tarifleri al
      const { data: recipes, error } = await supabase
        .from("recipes")
        .select("*")
        .order("name")
        .range(offset, offset + limit - 1);

      if (error) {
        throw error;
      }

      const mappedRecipes =
        recipes?.map((recipe) => ({
          id: recipe.id,
          name: recipe.name,
          description: recipe.description || undefined,
          ingredients: recipe.ingredients,
          instructions: recipe.instructions,
          preparationTime: recipe.preparation_time || undefined,
          servings: recipe.servings || undefined,
          difficulty: recipe.difficulty as any,
          category: recipe.category as any,
          imageUrl: recipe.image_url || undefined,
        })) || [];

      return {
        recipes: mappedRecipes,
        totalCount: count || 0,
        hasMore: (count || 0) > offset + limit,
      };
    } catch (error) {
      console.error("Get all recipes error:", error);
      return {
        recipes: [],
        totalCount: 0,
        hasMore: false,
      };
    }
  }

  // Tarif adına göre arama
  static async searchRecipesByName(
    searchTerm: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    recipes: Recipe[];
    totalCount: number;
    hasMore: boolean;
  }> {
    try {
      const offset = (page - 1) * limit;
      const searchPattern = `%${searchTerm.toLowerCase()}%`;

      // Toplam sayıyı al
      const { count } = await supabase
        .from("recipes")
        .select("*", { count: "exact", head: true })
        .ilike("name", searchPattern);

      // Tarifleri al
      const { data: recipes, error } = await supabase
        .from("recipes")
        .select("*")
        .ilike("name", searchPattern)
        .order("name")
        .range(offset, offset + limit - 1);

      if (error) {
        throw error;
      }

      const mappedRecipes =
        recipes?.map((recipe) => ({
          id: recipe.id,
          name: recipe.name,
          description: recipe.description || undefined,
          ingredients: recipe.ingredients,
          instructions: recipe.instructions,
          preparationTime: recipe.preparation_time || undefined,
          servings: recipe.servings || undefined,
          difficulty: recipe.difficulty as any,
          category: recipe.category as any,
          imageUrl: recipe.image_url || undefined,
        })) || [];

      return {
        recipes: mappedRecipes,
        totalCount: count || 0,
        hasMore: (count || 0) > offset + limit,
      };
    } catch (error) {
      console.error("Search recipes by name error:", error);
      return {
        recipes: [],
        totalCount: 0,
        hasMore: false,
      };
    }
  }

  // Kategori filtreleme ile tarifleri al
  static async getRecipesByFilter(
    category?: string,
    difficulty?: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    recipes: Recipe[];
    totalCount: number;
    hasMore: boolean;
  }> {
    try {
      const offset = (page - 1) * limit;
      let query = supabase.from("recipes").select("*");

      // Filtreleri uygula
      if (category && category !== "all") {
        query = query.eq("category", category);
      }
      if (difficulty && difficulty !== "all") {
        query = query.eq("difficulty", difficulty);
      }

      // Toplam sayıyı al
      const { count } = await query.select("*", { count: "exact", head: true });

      // Tarifleri al
      const { data: recipes, error } = await query
        .order("name")
        .range(offset, offset + limit - 1);

      if (error) {
        throw error;
      }

      const mappedRecipes =
        recipes?.map((recipe) => ({
          id: recipe.id,
          name: recipe.name,
          description: recipe.description || undefined,
          ingredients: recipe.ingredients,
          instructions: recipe.instructions,
          preparationTime: recipe.preparation_time || undefined,
          servings: recipe.servings || undefined,
          difficulty: recipe.difficulty as any,
          category: recipe.category as any,
          imageUrl: recipe.image_url || undefined,
        })) || [];

      return {
        recipes: mappedRecipes,
        totalCount: count || 0,
        hasMore: (count || 0) > offset + limit,
      };
    } catch (error) {
      console.error("Get recipes by filter error:", error);
      return {
        recipes: [],
        totalCount: 0,
        hasMore: false,
      };
    }
  }
}
