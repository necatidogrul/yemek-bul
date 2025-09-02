import { supabase } from './supabase';
import {
  Recipe,
  RecipeSearchResult,
  SearchRequest,
  SearchHistoryEntry,
  UserSearchStats,
  SearchAnalytics,
  PopularSearchIngredient,
} from '../types/Recipe';
import { OpenAIService, RecipeGenerationRequest } from './openaiService';
import { MobileStorageService } from './localStorageService';
import { UsageLimitService } from './UsageLimitService';
import { RevenueCatService } from './RevenueCatService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Logger } from '../services/LoggerService';

// Mock recipes for offline mode
const MOCK_RECIPES: Recipe[] = [
  {
    id: '1',
    name: 'Tavuk Sote',
    description: 'Lezzetli tavuk sote tarifi',
    ingredients: ['tavuk göğsü', 'soğan', 'biber', 'zeytinyağı', 'tuz'],
    instructions: [
      'Tavuk göğsünü küp küp doğrayın',
      'Soğanı yemeklik doğrayın',
      'Zeytinyağında tavukları soteleyin',
      'Soğan ve biberi ekleyin',
      'Tuz ekleyip pişirin',
    ],
    preparationTime: 15,
    cookingTime: 20,
    servings: 4,
    difficulty: 'kolay',
    category: 'ana_yemek',
    imageUrl: 'https://example.com/tavuk-sote.jpg',
    source: 'mock',
    aiGenerated: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'Mercimek Çorbası',
    description: 'Geleneksel mercimek çorbası',
    ingredients: ['kırmızı mercimek', 'soğan', 'havuç', 'tuz', 'karabiber'],
    instructions: [
      'Mercimeği yıkayın',
      'Soğan ve havucu doğrayın',
      'Tüm malzemeleri tencereye koyun',
      'Su ekleyip pişirin',
      'Blenderdan geçirin',
    ],
    preparationTime: 10,
    cookingTime: 30,
    servings: 6,
    difficulty: 'kolay',
    category: 'çorba',
    imageUrl: 'https://example.com/mercimek-corbasi.jpg',
    source: 'mock',
    aiGenerated: false,
    createdAt: new Date().toISOString(),
  },
];

// Premium Limits Service (simplified version)
class PremiumLimitsService {
  static async canUseCommunityPool(userId: string): Promise<boolean> {
    const premiumStatus = await RevenueCatService.getPremiumStatus();
    return premiumStatus.isPremium && premiumStatus.isActive;
  }

  static async recordCommunityUsage(userId: string): Promise<void> {
    // Premium kullanıcılar için kullanım kaydı
    Logger.info('Community usage recorded for premium user:', userId);
  }

  static async canUseAI(userId: string): Promise<boolean> {
    const premiumStatus = await RevenueCatService.getPremiumStatus();
    return premiumStatus.isPremium && premiumStatus.isActive;
  }

  static async recordAIUsage(userId: string): Promise<void> {
    // Premium kullanıcılar için AI kullanım kaydı
    Logger.info('AI usage recorded for premium user:', userId);
  }
}

// Credit Service (simplified version)
class CreditService {
  static async canUseCredits(userId: string, amount: number): Promise<boolean> {
    const premiumStatus = await RevenueCatService.getPremiumStatus();
    if (premiumStatus.isPremium && premiumStatus.isActive) return true;

    const canMakeRequest = await UsageLimitService.canMakeRequest();
    return canMakeRequest;
  }

  static async spendCredits(userId: string, amount: number): Promise<boolean> {
    const premiumStatus = await RevenueCatService.getPremiumStatus();
    if (premiumStatus.isPremium && premiumStatus.isActive) return true;

    await UsageLimitService.useRequest();
    return true;
  }
}

export class RecipeService {
  // Kullanıcının girdiği malzemelere göre tarif arama (Offline-First + AI + Cache + Fallback)
  static async searchRecipesByIngredients(
    request: SearchRequest & {
      userId?: string;
      useAI?: boolean;
      userAgent?: string;
      ipAddress?: string;
      sessionId?: string;
    }
  ): Promise<RecipeSearchResult & { isCached?: boolean; isStale?: boolean }> {
    const startTime = Date.now();
    let resultType: 'community_pool' | 'ai_cache' | 'ai_generation' | 'mock' =
      'mock';

    let isCachedResult = false;
    let isStaleResult = false;

    try {
      const {
        ingredients,
        maxMissingIngredients = 10,
        userId,
        useAI = false,
        userAgent,
        ipAddress,
        sessionId,
      } = request;

      const isOnline = await MobileStorageService.isOnline();
      Logger.info('🔍 Recipe search started:', {
        ingredients,
        useAI,
        offline: !isOnline,
      });

      // 0. ÖNCE AsyncStorage'dan kontrol et (Mobile Offline-First)
      const cachedResult =
        await MobileStorageService.getCachedSearchResult(ingredients);
      if (cachedResult) {
        Logger.info('⚡ Found in mobile cache:', cachedResult.metadata.source);
        isCachedResult = true;
        isStaleResult = cachedResult.metadata.isStale || false;

        // Local search history ekle
        await MobileStorageService.addSearchHistory(
          ingredients,
          ingredients.join(', '),
          cachedResult.results.exactMatches.length +
            cachedResult.results.nearMatches.length,
          `cached_${cachedResult.metadata.source}`
        );

        // Stale değilse direkt döndür
        if (!isStaleResult) {
          return {
            ...cachedResult.results,
            isCached: true,
            isStale: false,
          };
        }

        // Stale ise background'da güncelle (stale-while-revalidate pattern)
        Logger.info('🔄 Cached result is stale, updating in background...');
        this.updateCacheInBackground(request, cachedResult);

        return {
          ...cachedResult.results,
          isCached: true,
          isStale: true,
        };
      }

      // Offline durumunda cached sonuç yoksa mock data kullan
      if (!isOnline) {
        Logger.info('📱 Mobile offline mode: Using mock recipes');
        const mockResult = this.searchInMockRecipes(
          ingredients,
          maxMissingIngredients
        );

        // Mock result'ı cache'e kaydet
        await MobileStorageService.cacheSearchResult(
          ingredients,
          mockResult,
          'mock',
          Date.now() - startTime
        );

        // Local history ekle
        await MobileStorageService.addSearchHistory(
          ingredients,
          ingredients.join(', '),
          mockResult.exactMatches.length + mockResult.nearMatches.length,
          'offline_mock'
        );

        return { ...mockResult, isCached: false, isStale: false };
      }

      Logger.info('🌐 Online mode: Fetching fresh data...');

      // 1. Community AI recipes pool'da ara
      try {
        const communityResults = await this.searchCommunityAIRecipes(
          ingredients,
          userId
        );
        if (
          communityResults.exactMatches.length > 0 ||
          communityResults.nearMatches.length > 0
        ) {
          Logger.info('✅ Found results in community AI recipe pool');
          resultType = 'community_pool';
          const result = communityResults;

          // AsyncStorage'a cache'le
          await MobileStorageService.cacheSearchResult(
            ingredients,
            result,
            'community_pool',
            Date.now() - startTime
          );

          // Local search history ekle
          await MobileStorageService.addSearchHistory(
            ingredients,
            ingredients.join(', '),
            result.exactMatches.length + result.nearMatches.length,
            'community_pool'
          );

          // Server search history kaydet
          if (userId) {
            await this.recordSearchHistory({
              userId,
              searchIngredients: ingredients,
              resultType,
              resultsFound:
                result.exactMatches.length + result.nearMatches.length,
              exactMatches: result.exactMatches.length,
              nearMatches: result.nearMatches.length,
              usedAI: false,
              responseTimeMs: Date.now() - startTime,
              userAgent,
              ipAddress,
              sessionId,
            });
          }

          return { ...result, isCached: false, isStale: false };
        }
      } catch (communityError) {
        Logger.warn('⚠️ Community search failed:', communityError);
      }

      // 2. Cache'den ara (kısa vadeli AI cache)
      try {
        const cachedResults = await this.searchInCache(ingredients);
        if (
          cachedResults.exactMatches.length > 0 ||
          cachedResults.nearMatches.length > 0
        ) {
          Logger.info('✅ Found results in AI cache');
          resultType = 'ai_cache';
          const result = cachedResults;

          // AsyncStorage'a cache'le
          await MobileStorageService.cacheSearchResult(
            ingredients,
            result,
            'ai_cache',
            Date.now() - startTime
          );

          // Local search history ekle
          await MobileStorageService.addSearchHistory(
            ingredients,
            ingredients.join(', '),
            result.exactMatches.length + result.nearMatches.length,
            'ai_cache'
          );

          // Server search history kaydet
          if (userId) {
            await this.recordSearchHistory({
              userId,
              searchIngredients: ingredients,
              resultType,
              resultsFound:
                result.exactMatches.length + result.nearMatches.length,
              exactMatches: result.exactMatches.length,
              nearMatches: result.nearMatches.length,
              usedAI: false,
              responseTimeMs: Date.now() - startTime,
              userAgent,
              ipAddress,
              sessionId,
            });
          }

          return { ...result, isCached: false, isStale: false };
        }
      } catch (cacheError) {
        Logger.warn('⚠️ Cache search failed:', cacheError);
      }

      // 3. Eğer AI kullanımı istenmişse ve kullanıcı ID'si varsa
      if (useAI && userId) {
        try {
          const aiResult = await this.searchWithAI(ingredients, userId);
          resultType = 'ai_generation';

          // AsyncStorage'a cache'le (AI results uzun süre cache'lenir)
          await MobileStorageService.cacheSearchResult(
            ingredients,
            aiResult,
            'ai_generation',
            Date.now() - startTime
          );

          // Local search history ekle
          await MobileStorageService.addSearchHistory(
            ingredients,
            ingredients.join(', '),
            aiResult.exactMatches.length + aiResult.nearMatches.length,
            'ai_generation'
          );

          // Server search history kaydet
          await this.recordSearchHistory({
            userId,
            searchIngredients: ingredients,
            resultType,
            resultsFound:
              aiResult.exactMatches.length + aiResult.nearMatches.length,
            exactMatches: aiResult.exactMatches.length,
            nearMatches: aiResult.nearMatches.length,
            usedAI: true,
            responseTimeMs: Date.now() - startTime,
            userAgent,
            ipAddress,
            sessionId,
          });

          return { ...aiResult, isCached: false, isStale: false };
        } catch (aiError) {
          Logger.warn(
            '⚠️ AI search failed, falling back to mock data:',
            aiError
          );
        }
      }

      // Fallback 2: Mock verileri kullan
      Logger.info('📦 Using mock recipe data');
      const recipes = MOCK_RECIPES;

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

      recipes.forEach(recipe => {
        const recipeIngredients = recipe.ingredients.map(ing =>
          ing.toLowerCase().trim()
        );
        const userIngredients = ingredients.map(ing =>
          ing.toLowerCase().trim()
        );

        // Kullanıcının sahip olduğu malzemeler (daha esnek eşleştirme)
        const matchingIngredients = recipeIngredients.filter(ing =>
          userIngredients.some(
            userIng =>
              ing.includes(userIng) ||
              userIng.includes(ing) ||
              this.areSimilarIngredients(ing, userIng)
          )
        );

        // Eksik malzemeler
        const missingIngredients = recipeIngredients.filter(
          ing =>
            !userIngredients.some(
              userIng =>
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
        if (matchingIngredients.some(ing => this.isBasicIngredient(ing))) {
          priority += 2;
        }

        const mappedRecipe: Recipe = {
          id: recipe.id,
          name: recipe.name,
          description: recipe.description || undefined,
          ingredients: recipe.ingredients,
          instructions: recipe.instructions,
          preparationTime: recipe.preparationTime || undefined,
          servings: recipe.servings || undefined,
          difficulty: recipe.difficulty as any,
          category: recipe.category as any,
          imageUrl: recipe.imageUrl || undefined,
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

      const result = {
        exactMatches: exactMatches.slice(0, 15),
        nearMatches: nearMatches.slice(0, 25),
      };

      // AsyncStorage'a cache'le
      await MobileStorageService.cacheSearchResult(
        ingredients,
        result,
        'mock',
        Date.now() - startTime
      );

      // Local search history ekle
      await MobileStorageService.addSearchHistory(
        ingredients,
        ingredients.join(', '),
        result.exactMatches.length + result.nearMatches.length,
        'mock'
      );

      // Server search history kaydet
      if (userId) {
        await this.recordSearchHistory({
          userId,
          searchIngredients: ingredients,
          resultType: 'mock',
          resultsFound: result.exactMatches.length + result.nearMatches.length,
          exactMatches: result.exactMatches.length,
          nearMatches: result.nearMatches.length,
          usedAI: false,
          responseTimeMs: Date.now() - startTime,
          userAgent,
          ipAddress,
          sessionId,
        });
      }

      return { ...result, isCached: false, isStale: false };
    } catch (error) {
      Logger.error('Recipe search error:', error);

      // Hata durumu için de history kaydet
      if (request.userId && request.ingredients) {
        try {
          await this.recordSearchHistory({
            userId: request.userId,
            searchIngredients: request.ingredients,
            resultType: resultType,
            resultsFound: 0,
            exactMatches: 0,
            nearMatches: 0,
            usedAI: request.useAI || false,
            responseTimeMs: Date.now() - startTime,
            userAgent: request.userAgent,
            ipAddress: request.ipAddress,
            sessionId: request.sessionId,
          });
        } catch (historyError) {
          Logger.warn(
            '⚠️ Failed to record error search history:',
            historyError
          );
        }
      }

      throw error;
    }
  }

  /**
   * Community AI recipes'ta arama yap (Premium limit kontrolü ile)
   */
  private static async searchCommunityAIRecipes(
    ingredients: string[],
    userId?: string
  ): Promise<RecipeSearchResult> {
    try {
      Logger.info('🔍 Searching in community AI recipes pool...');

      // Premium kullanıcılar için community pool limit kontrolü
      if (userId) {
        const communityCheck =
          await PremiumLimitsService.canUseCommunityPool(userId);
        if (!communityCheck) {
          Logger.info(`⚠️ Premium community pool limit exceeded`);
          return { exactMatches: [], nearMatches: [] };
        }

        // Community pool kullanımını kaydet
        await PremiumLimitsService.recordCommunityUsage(userId);
        Logger.info(`👥 Premium community pool used`);
      }

      const sortedIngredients = ingredients
        .map(ing => ing.toLowerCase().trim())
        .sort();

      // 1. Önce tam eşleşme ara
      const { data: exactMatches, error: exactError } = await supabase
        .from('recipes')
        .select('*')
        .eq('ai_generated', true)
        .contains('ingredient_combination', sortedIngredients)
        .order('popularity_score', { ascending: false })
        .limit(5);

      if (exactError) {
        Logger.warn('⚠️ Exact match search failed:', exactError);
      }

      // 2. Kısmi eşleşmeler ara (en az %60 eşleşme)
      const { data: allAIRecipes, error: allError } = await supabase
        .from('recipes')
        .select('*')
        .eq('ai_generated', true)
        .not('ingredient_combination', 'is', null)
        .order('popularity_score', { ascending: false })
        .limit(50);

      if (allError) {
        Logger.warn('⚠️ Community search failed:', allError);
        return { exactMatches: [], nearMatches: [] };
      }

      const exactResults: Recipe[] = [];
      const nearResults: Recipe[] = [];

      // Exact matches'i işle
      if (exactMatches && exactMatches.length > 0) {
        exactMatches.forEach(recipe => {
          exactResults.push(this.mapDatabaseRecipeToRecipe(recipe));
        });

        // Popularity score artır
        await this.incrementPopularityScore(exactMatches.map(r => r.id));
      }

      // Kısmi eşleşmeler için analiz yap
      if (allAIRecipes && allAIRecipes.length > 0) {
        const partialMatches = allAIRecipes
          .filter(recipe => {
            if (!recipe.ingredient_combination) return false;

            const recipeIngredients = recipe.ingredient_combination.map(
              (ing: string) => ing.toLowerCase().trim()
            );
            const matchingCount = sortedIngredients.filter((userIng: string) =>
              recipeIngredients.some(
                (recipeIng: string) =>
                  recipeIng.includes(userIng) || userIng.includes(recipeIng)
              )
            ).length;

            const matchRatio = matchingCount / sortedIngredients.length;
            return matchRatio >= 0.6 && matchingCount >= 2; // En az %60 eşleşme ve 2 malzeme
          })
          .slice(0, 10); // En fazla 10 kısmi eşleşme

        partialMatches.forEach(recipe => {
          // Exact matches'te yoksa near matches'e ekle
          if (!exactResults.find(er => er.id === recipe.id)) {
            nearResults.push(this.mapDatabaseRecipeToRecipe(recipe));
          }
        });

        // Kısmi eşleşmeler için de popularity artır (daha az)
        if (partialMatches.length > 0) {
          await this.incrementPopularityScore(
            partialMatches.map(r => r.id),
            0.5
          );
        }
      }

      const totalResults = exactResults.length + nearResults.length;
      if (totalResults > 0) {
        Logger.info(
          `✅ Found ${totalResults} community AI recipes (${exactResults.length} exact, ${nearResults.length} near)`
        );
      }

      return {
        exactMatches: exactResults,
        nearMatches: nearResults,
      };
    } catch (error) {
      Logger.error('❌ Community AI search error:', error);
      return { exactMatches: [], nearMatches: [] };
    }
  }

  /**
   * AI tariflerini community pool'a kaydet
   */
  private static async saveToCommunityPool(
    recipes: Recipe[],
    originalIngredients: string[],
    userId: string,
    tokensUsed: number = 0
  ): Promise<void> {
    try {
      Logger.info('💾 Saving AI recipes to community pool...');

      const sortedIngredients = originalIngredients
        .map(ing => ing.toLowerCase().trim())
        .sort();

      const communityRecipes = recipes.map(recipe => ({
        id: recipe.id, // AI'dan gelen ID'yi kullan
        name: recipe.name,
        description: recipe.description,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        preparation_time: recipe.preparationTime,
        cooking_time: recipe.cookingTime,
        servings: recipe.servings,
        difficulty: recipe.difficulty,
        category: recipe.category,
        image_url: recipe.imageUrl,
        source: 'ai',
        ai_generated: true,
        popularity_score: 1, // Başlangıç popülerlik skoru
        ingredient_combination: sortedIngredients,
        original_ingredients: originalIngredients,
        tokens_used: Math.floor(tokensUsed / recipes.length), // Token'ları tariflere böl
        created_by_user_id: userId,
        created_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('recipes')
        .upsert(communityRecipes, {
          onConflict: 'id',
          ignoreDuplicates: false,
        });

      if (error) {
        throw error;
      }

      Logger.info(
        `✅ Successfully saved ${recipes.length} AI recipes to community pool`
      );
    } catch (error) {
      Logger.error('❌ Failed to save recipes to community pool:', error);
    }
  }

  /**
   * Popülerlik skorunu artır
   */
  private static async incrementPopularityScore(
    recipeIds: string[],
    increment: number = 1
  ): Promise<void> {
    try {
      for (const recipeId of recipeIds) {
        await supabase.rpc('increment_popularity', {
          recipe_id: recipeId,
          increment_value: increment,
        });
      }
    } catch (error) {
      Logger.warn('⚠️ Failed to increment popularity score:', error);
    }
  }

  /**
   * Database recipe'sini Recipe type'ına çevir
   */
  private static mapDatabaseRecipeToRecipe(dbRecipe: any): Recipe {
    return {
      id: dbRecipe.id,
      name: dbRecipe.name,
      description: dbRecipe.description || undefined,
      ingredients: dbRecipe.ingredients || [],
      instructions: dbRecipe.instructions || [],
      preparationTime: dbRecipe.preparation_time || undefined,
      cookingTime: dbRecipe.cooking_time || undefined,
      servings: dbRecipe.servings || undefined,
      difficulty: dbRecipe.difficulty as any,
      category: dbRecipe.category as any,
      imageUrl: dbRecipe.image_url || undefined,
      source: dbRecipe.source || 'database',
      aiGenerated: dbRecipe.ai_generated || false,
      popularityScore: dbRecipe.popularity_score || 0,
      ingredientCombination: dbRecipe.ingredient_combination || undefined,
      originalIngredients: dbRecipe.original_ingredients || undefined,
      tokensUsed: dbRecipe.tokens_used || undefined,
      createdByUserId: dbRecipe.created_by_user_id || undefined,
      createdAt: dbRecipe.created_at || undefined,
    };
  }

  /**
   * AI ile tarif arama (Credit system + Premium limits entegreli)
   */
  private static async searchWithAI(
    ingredients: string[],
    userId: string
  ): Promise<RecipeSearchResult> {
    // Kullanıcının premium durumunu kontrol et
    const premiumStatus = await RevenueCatService.getPremiumStatus();

    if (premiumStatus.isPremium && premiumStatus.isActive) {
      // Premium kullanıcı - günlük AI limit kontrolü
      const aiCheck = await PremiumLimitsService.canUseAI(userId);
      if (!aiCheck) {
        throw new Error(`Daily AI generation limit exceeded.`);
      }

      // AI tarif üretimi
      const aiRequest: RecipeGenerationRequest = {
        ingredients,
        preferences: {
          difficulty: undefined,
          servings: 2,
        },
      };

      const aiResponse = await OpenAIService.generateRecipes(aiRequest);

      // Premium kullanım kaydı
      await PremiumLimitsService.recordAIUsage(userId);

      // Community pool'a kaydet
      await this.saveToCommunityPool(
        aiResponse.recipes,
        ingredients,
        userId,
        aiResponse.totalTokensUsed
      );

      // Cache'e kaydet
      await this.cacheAIRecipes(
        ingredients,
        aiResponse.recipes,
        aiResponse.totalTokensUsed,
        aiResponse.estimatedCost
      );

      // Kullanıcı geçmişine kaydet
      await this.recordUserRecipeHistory(
        userId,
        aiResponse.recipes,
        ingredients,
        aiResponse.totalTokensUsed
      );

      Logger.info(`🎯 Premium AI generation used`);

      return {
        exactMatches: aiResponse.recipes,
        nearMatches: [],
      };
    } else {
      // Free kullanıcı - kredi kontrolü
      const creditCheck = await CreditService.canUseCredits(userId, 1);
      if (!creditCheck) {
        throw new Error('Insufficient credits for AI recipe generation');
      }

      // Kredi düş (API çağrısı öncesinde)
      const creditResult = await CreditService.spendCredits(userId, 1);

      if (!creditResult) {
        throw new Error('Insufficient credits for AI recipe generation');
      }

      // AI tarif üretimi
      const aiRequest: RecipeGenerationRequest = {
        ingredients,
        preferences: {
          difficulty: undefined,
          servings: 2,
        },
      };

      const aiResponse = await OpenAIService.generateRecipes(aiRequest);

      // Community pool'a kaydet
      await this.saveToCommunityPool(
        aiResponse.recipes,
        ingredients,
        userId,
        aiResponse.totalTokensUsed
      );

      // Cache'e kaydet
      await this.cacheAIRecipes(
        ingredients,
        aiResponse.recipes,
        aiResponse.totalTokensUsed,
        aiResponse.estimatedCost
      );

      // Kullanıcı geçmişine kaydet
      await this.recordUserRecipeHistory(
        userId,
        aiResponse.recipes,
        ingredients,
        aiResponse.totalTokensUsed
      );

      Logger.info(`💎 Credit AI generation completed`);

      return {
        exactMatches: aiResponse.recipes,
        nearMatches: [],
      };
    }
  }

  /**
   * Cache'den tarif ara
   */
  private static async searchInCache(
    ingredients: string[]
  ): Promise<RecipeSearchResult> {
    const ingredientHash = this.generateIngredientHash(ingredients);

    const { data, error } = await supabase
      .from('ai_recipe_cache')
      .select('recipe_data')
      .eq('ingredient_hash', ingredientHash)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !data) {
      return { exactMatches: [], nearMatches: [] };
    }

    const recipes = data.recipe_data as Recipe[];
    return {
      exactMatches: recipes,
      nearMatches: [],
    };
  }

  /**
   * AI tariflerini cache'e kaydet
   */
  private static async cacheAIRecipes(
    ingredients: string[],
    recipes: Recipe[],
    tokensUsed: number,
    costUSD: number
  ): Promise<void> {
    try {
      const cacheData = {
        ingredient_hash: this.generateIngredientHash(ingredients),
        ingredients,
        recipe_data: recipes,
        tokens_used: tokensUsed,
        cost_usd: costUSD,
        popularity_score: 1,
        expires_at: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000
        ).toISOString(), // 30 gün
      };

      await supabase.from('ai_recipe_cache').insert(cacheData);
      Logger.info('✅ AI recipes cached successfully');
    } catch (error) {
      Logger.warn('⚠️ Failed to cache AI recipes:', error);
    }
  }

  /**
   * Kullanıcı geçmişine kaydet
   */
  private static async recordUserRecipeHistory(
    userId: string,
    recipes: Recipe[],
    ingredients: string[],
    tokensUsed: number
  ): Promise<void> {
    try {
      const historyEntries = recipes.map(recipe => ({
        user_id: userId,
        recipe_id: recipe.id,
        recipe_name: recipe.name,
        ingredients_used: ingredients,
        action_type: 'generated',
        credits_spent: 1, // recipe_generation cost
        ai_model_used: 'gpt-3.5-turbo',
        tokens_used: Math.floor(tokensUsed / recipes.length), // Distribute tokens across recipes
      }));

      await supabase.from('user_recipe_history').insert(historyEntries);
      Logger.info('✅ Recipe history recorded successfully');
    } catch (error) {
      Logger.warn('⚠️ Failed to record user history:', error);
    }
  }

  /**
   * Malzeme hash'i oluştur (cache key için)
   */
  private static generateIngredientHash(ingredients: string[]): string {
    const sortedIngredients = ingredients
      .map(ing => ing.toLowerCase().trim())
      .sort()
      .join('|');

    // Basit hash function (production'da crypto hash kullanılabilir)
    let hash = 0;
    for (let i = 0; i < sortedIngredients.length; i++) {
      const char = sortedIngredients.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  // Benzer malzemeleri kontrol et
  private static areSimilarIngredients(ing1: string, ing2: string): boolean {
    const synonyms = [
      ['domates', 'domates salçası'],
      ['soğan', 'taze soğan'],
      ['biber', 'sivri biber', 'yeşil biber', 'kırmızı biber'],
      ['peynir', 'beyaz peynir', 'kaşar peyniri'],
      ['yağ', 'zeytinyağı', 'ayçiçek yağı'],
      ['un', 'galeta unu'],
    ];

    return synonyms.some(group => group.includes(ing1) && group.includes(ing2));
  }

  // Temel malzemeleri kontrol et
  private static isBasicIngredient(ingredient: string): boolean {
    const basicIngredients = ['tuz', 'karabiber', 'zeytinyağı', 'su', 'şeker'];
    return basicIngredients.includes(ingredient);
  }

  // Tarif detayını al
  static async getRecipeById(id: string): Promise<Recipe | null> {
    try {
      // Önce mock verilerden ara
      const mockRecipe = MOCK_RECIPES.find(recipe => recipe.id === id);
      if (mockRecipe) {
        Logger.info('✅ Recipe found in mock data:', mockRecipe.name);
        return mockRecipe;
      }

      // Fallback: Supabase'den ara
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        Logger.warn('⚠️ Supabase getRecipeById failed:', error);
        return null;
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
      Logger.error('Get recipe error:', error);
      return null;
    }
  }

  // Tüm mevcut malzemeleri al (önerilerde kullanmak için)
  static async getAllIngredients(): Promise<string[]> {
    try {
      // Fallback: Supabase'den al
      const { data, error } = await supabase
        .from('ingredients')
        .select('name')
        .order('name');

      if (error) {
        throw error;
      }

      return data?.map(item => item.name) || [];
    } catch (error) {
      Logger.error('Get ingredients error:', error);
      // Güvenli fallback: Temel malzemeler
      return [
        'Domates',
        'Soğan',
        'Sarımsak',
        'Biber',
        'Patlıcan',
        'Havuç',
        'Patates',
        'Et',
        'Tavuk',
        'Balık',
        'Pirinç',
        'Makarna',
        'Yoğurt',
        'Peynir',
        'Yumurta',
      ];
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

      allRecipes.forEach(recipe => {
        recipe.missingIngredients?.forEach(ingredient => {
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
      Logger.error('Get suggestions error:', error);
      return [];
    }
  }

  // Kategoriye göre öneriler
  static async getRecipesByCategory(category: string): Promise<Recipe[]> {
    try {
      const { data: recipes, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('category', category)
        .limit(10);

      if (error) {
        throw error;
      }

      return (
        recipes?.map(recipe => ({
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
      Logger.error('Get recipes by category error:', error);
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

      // Önce mock verilerden al
      const allRecipes = MOCK_RECIPES;
      const totalCount = allRecipes.length;
      const paginatedRecipes = allRecipes.slice(offset, offset + limit);

      if (paginatedRecipes.length > 0) {
        Logger.info(
          '✅ Using mock recipes for getAllRecipes:',
          paginatedRecipes.length
        );
        return {
          recipes: paginatedRecipes,
          totalCount,
          hasMore: totalCount > offset + limit,
        };
      }

      // Fallback: Supabase'den al
      const { count } = await supabase
        .from('recipes')
        .select('*', { count: 'exact', head: true });

      const { data: recipes, error } = await supabase
        .from('recipes')
        .select('*')
        .order('name')
        .range(offset, offset + limit - 1);

      if (error) {
        throw error;
      }

      const mappedRecipes =
        recipes?.map(recipe => ({
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
      Logger.error('Get all recipes error:', error);
      // Son fallback: Mock veriler
      const allRecipes = MOCK_RECIPES;
      const totalCount = allRecipes.length;
      const offset = (page - 1) * limit;
      const paginatedRecipes = allRecipes.slice(offset, offset + limit);

      return {
        recipes: paginatedRecipes,
        totalCount,
        hasMore: totalCount > offset + limit,
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
        .from('recipes')
        .select('*', { count: 'exact', head: true })
        .ilike('name', searchPattern);

      // Tarifleri al
      const { data: recipes, error } = await supabase
        .from('recipes')
        .select('*')
        .ilike('name', searchPattern)
        .order('name')
        .range(offset, offset + limit - 1);

      if (error) {
        throw error;
      }

      const mappedRecipes =
        recipes?.map(recipe => ({
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
      Logger.error('Search recipes by name error:', error);
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
      let query = supabase.from('recipes').select('*');

      // Filtreleri uygula
      if (category && category !== 'all') {
        query = query.eq('category', category);
      }
      if (difficulty && difficulty !== 'all') {
        query = query.eq('difficulty', difficulty);
      }

      // Toplam sayıyı al
      const countQuery = supabase
        .from('recipes')
        .select('*', { count: 'exact', head: true });
      if (category && category !== 'all') {
        countQuery.eq('category', category);
      }
      if (difficulty && difficulty !== 'all') {
        countQuery.eq('difficulty', difficulty);
      }
      const { count } = await countQuery;

      // Tarifleri al
      const { data: recipes, error } = await query
        .order('name')
        .range(offset, offset + limit - 1);

      if (error) {
        throw error;
      }

      const mappedRecipes =
        recipes?.map(recipe => ({
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
      Logger.error('Get recipes by filter error:', error);
      return {
        recipes: [],
        totalCount: 0,
        hasMore: false,
      };
    }
  }

  /**
   * API durumunu kontrol et ve gerekirse yerel veritabanını kullan
   */
  static async checkApiHealth(): Promise<{
    spoonacular: boolean;
    supabase: boolean;
  }> {
    const results = {
      spoonacular: false,
      supabase: false,
    };

    // Spoonacular API (devre dışı)
    results.spoonacular = false;

    // Supabase durumunu kontrol et
    try {
      const { error } = await supabase.from('recipes').select('id').limit(1);
      results.supabase = !error;
    } catch (error) {
      Logger.warn('Supabase health check failed:', error);
    }

    Logger.info('🏥 API Health Status:', results);
    return results;
  }

  /**
   * Gelişmiş malzeme önerisi (çeviri servisi ile)
   */
  static async getIngredientSuggestions(
    partialInput: string,
    limit: number = 10
  ): Promise<string[]> {
    try {
      const allIngredients = await this.getAllIngredients();
      const searchTerm = partialInput.toLowerCase().trim();

      if (!searchTerm) {
        return allIngredients.slice(0, limit);
      }

      // Türkçe malzemeler içinde ara
      const matches = allIngredients.filter(ingredient =>
        ingredient.toLowerCase().includes(searchTerm)
      );

      // Önce tam eşleşenleri al, sonra kısmi eşleşenleri
      const exactMatches = matches.filter(ingredient =>
        ingredient.toLowerCase().startsWith(searchTerm)
      );
      const partialMatches = matches.filter(
        ingredient => !ingredient.toLowerCase().startsWith(searchTerm)
      );

      return [...exactMatches, ...partialMatches].slice(0, limit);
    } catch (error) {
      Logger.warn(
        '⚠️ getIngredientSuggestions failed, falling back to mobile storage:',
        error
      );
      return await MobileStorageService.getIngredientSuggestions(
        partialInput,
        limit
      );
    }
  }

  /**
   * Community Pool Analytics - Popüler malzeme kombinasyonlarını al
   */
  static async getPopularIngredientCombinations(limit: number = 10): Promise<
    {
      combination: string[];
      recipeCount: number;
      avgPopularity: number;
      latestRecipe: string;
    }[]
  > {
    try {
      const { data, error } = await supabase
        .from('popular_ingredient_combinations')
        .select('*')
        .limit(limit);

      if (error) {
        throw error;
      }

      return (
        data?.map(item => ({
          combination: item.ingredient_combination || [],
          recipeCount: item.recipe_count || 0,
          avgPopularity: item.avg_popularity || 0,
          latestRecipe: item.latest_recipe || '',
        })) || []
      );
    } catch (error) {
      Logger.error('Get popular combinations error:', error);
      return [];
    }
  }

  /**
   * Community Pool Analytics - AI tarif istatistikleri
   */
  static async getAIRecipeStats(): Promise<{
    totalAIRecipes: number;
    uniqueContributors: number;
    avgPopularity: number;
    totalTokensUsed: number;
    latestRecipeDate: string;
  }> {
    try {
      const { data, error } = await supabase
        .from('ai_recipe_stats')
        .select('*')
        .single();

      if (error) {
        throw error;
      }

      return {
        totalAIRecipes: data?.total_ai_recipes || 0,
        uniqueContributors: data?.unique_contributors || 0,
        avgPopularity: data?.avg_popularity || 0,
        totalTokensUsed: data?.total_tokens_used || 0,
        latestRecipeDate: data?.latest_recipe_date || '',
      };
    } catch (error) {
      Logger.error('Get AI recipe stats error:', error);
      return {
        totalAIRecipes: 0,
        uniqueContributors: 0,
        avgPopularity: 0,
        totalTokensUsed: 0,
        latestRecipeDate: '',
      };
    }
  }

  /**
   * Kullanıcıya özel AI tarif geçmişi
   */
  static async getUserAIRecipes(
    userId: string,
    limit: number = 20
  ): Promise<Recipe[]> {
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('created_by_user_id', userId)
        .eq('ai_generated', true)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      return data?.map(recipe => this.mapDatabaseRecipeToRecipe(recipe)) || [];
    } catch (error) {
      Logger.error('Get user AI recipes error:', error);
      return [];
    }
  }

  /**
   * En popüler AI tariflerini al
   */
  static async getMostPopularAIRecipes(limit: number = 10): Promise<Recipe[]> {
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('ai_generated', true)
        .order('popularity_score', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      return data?.map(recipe => this.mapDatabaseRecipeToRecipe(recipe)) || [];
    } catch (error) {
      Logger.error('Get popular AI recipes error:', error);
      return [];
    }
  }

  /**
   * Arama geçmişini kaydet
   */
  private static async recordSearchHistory(
    historyData: Omit<SearchHistoryEntry, 'id' | 'searchTimestamp'>
  ): Promise<void> {
    try {
      const { error } = await supabase.from('user_search_history').insert({
        user_id: historyData.userId,
        search_ingredients: historyData.searchIngredients,
        search_query: historyData.searchQuery,
        result_type: historyData.resultType,
        results_found: historyData.resultsFound,
        exact_matches: historyData.exactMatches,
        near_matches: historyData.nearMatches,
        used_ai: historyData.usedAI,
        credits_spent: 0,
        response_time_ms: historyData.responseTimeMs,
        user_agent: historyData.userAgent,
        ip_address: historyData.ipAddress,
        session_id: historyData.sessionId,
      });

      if (error) {
        Logger.warn('⚠️ Failed to record search history:', error);
      } else {
        Logger.info('📝 Search history recorded successfully');
      }
    } catch (error) {
      Logger.warn('⚠️ Search history recording error:', error);
    }
  }

  /**
   * Kullanıcının arama geçmişini al
   */
  static async getUserSearchHistory(
    userId: string,
    limit: number = 50
  ): Promise<SearchHistoryEntry[]> {
    try {
      const { data, error } = await supabase
        .from('user_search_history')
        .select('*')
        .eq('user_id', userId)
        .order('search_timestamp', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      return (
        data?.map(item => ({
          id: item.id,
          userId: item.user_id,
          searchIngredients: item.search_ingredients || [],
          searchQuery: item.search_query,
          resultType: item.result_type,
          resultsFound: item.results_found || 0,
          exactMatches: item.exact_matches || 0,
          nearMatches: item.near_matches || 0,
          usedAI: item.used_ai || false,
          creditsSpent: item.credits_spent || 0,
          responseTimeMs: item.response_time_ms,
          searchTimestamp: item.search_timestamp,
          userAgent: item.user_agent,
          ipAddress: item.ip_address,
          sessionId: item.session_id,
        })) || []
      );
    } catch (error) {
      Logger.error('Get user search history error:', error);
      return [];
    }
  }

  /**
   * Kullanıcının arama istatistiklerini al
   */
  static async getUserSearchStats(
    userId: string
  ): Promise<UserSearchStats | null> {
    try {
      const { data, error } = await supabase
        .from('user_search_stats')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        throw error;
      }

      return data
        ? {
            userId: data.user_id,
            totalSearches: data.total_searches || 0,
            aiSearches: data.ai_searches || 0,
            communitySearches: data.community_searches || 0,
            failedSearches: data.failed_searches || 0,
            // totalCreditsSpent: data.total_credits_spent || 0, // Removed as not in UserSearchStats type
            avgResponseTime: data.avg_response_time || 0,
            lastSearchDate: data.last_search_date,
            firstSearchDate: data.first_search_date,
          }
        : null;
    } catch (error) {
      Logger.error('Get user search stats error:', error);
      return null;
    }
  }

  /**
   * Popüler arama malzemelerini al
   */
  static async getPopularSearchIngredients(
    limit: number = 20
  ): Promise<PopularSearchIngredient[]> {
    try {
      const { data, error } = await supabase
        .from('popular_search_ingredients')
        .select('*')
        .limit(limit);

      if (error) {
        throw error;
      }

      return (
        data?.map(item => ({
          ingredient: item.ingredient,
          searchCount: item.search_count || 0,
          uniqueUsers: item.unique_users || 0,
          avgResultsFound: item.avg_results_found || 0,
          latestSearch: item.latest_search,
        })) || []
      );
    } catch (error) {
      Logger.error('Get popular search ingredients error:', error);
      return [];
    }
  }

  /**
   * Genel arama analitiklerini al
   */
  static async getSearchAnalytics(
    days: number = 30
  ): Promise<SearchAnalytics[]> {
    try {
      const { data, error } = await supabase
        .from('search_analytics')
        .select('*')
        .gte(
          'search_date',
          new Date(Date.now() - days * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0]
        )
        .order('search_date', { ascending: false });

      if (error) {
        throw error;
      }

      return (
        data?.map(item => ({
          searchDate: item.search_date,
          totalSearches: item.total_searches || 0,
          uniqueUsers: item.unique_users || 0,
          aiSearches: item.ai_searches || 0,
          communityPoolHits: item.community_pool_hits || 0,
          cacheHits: item.cache_hits || 0,
          fallbackSearches: item.fallback_searches || 0,
          avgResultsFound: item.avg_results_found || 0,
          avgResponseTime: item.avg_response_time || 0,
          totalCreditsSpent: item.total_credits_spent || 0,
        })) || []
      );
    } catch (error) {
      Logger.error('Get search analytics error:', error);
      return [];
    }
  }

  /**
   * Kullanıcının son aramalarını öner (frequently searched)
   */
  static async getUserFrequentIngredients(
    userId: string,
    limit: number = 10
  ): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('user_search_history')
        .select('search_ingredients')
        .eq('user_id', userId)
        .gte(
          'search_timestamp',
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
        ) // Son 30 gün
        .order('search_timestamp', { ascending: false })
        .limit(100);

      if (error || !data) {
        return [];
      }

      // Tüm malzemeleri say
      const ingredientCount = new Map<string, number>();
      data.forEach((record: any) => {
        record.search_ingredients?.forEach((ingredient: string) => {
          const normalizedIngredient = ingredient.toLowerCase().trim();
          ingredientCount.set(
            normalizedIngredient,
            (ingredientCount.get(normalizedIngredient) || 0) + 1
          );
        });
      });

      // En çok aranan malzemeleri döndür
      return Array.from(ingredientCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([ingredient]) => ingredient);
    } catch (error) {
      Logger.error('Get user frequent ingredients error:', error);
      return [];
    }
  }

  /**
   * Background'da cache güncelle (stale-while-revalidate)
   */
  private static async updateCacheInBackground(
    request: SearchRequest & {
      userId?: string;
      useAI?: boolean;
      userAgent?: string;
      ipAddress?: string;
      sessionId?: string;
    },
    staleCache: any
  ): Promise<void> {
    try {
      Logger.info('🔄 Updating stale cache in background...');

      // Background'da fresh data çek (ana akışı engelleme)
      setTimeout(async () => {
        try {
          const {
            ingredients,
            userId,
            useAI,
            userAgent,
            ipAddress,
            sessionId,
          } = request;

          // Fresh search yap (cache bypass)
          const freshResult = await this.searchFresh(
            ingredients,
            userId,
            useAI
          );

          if (freshResult) {
            // Yeni result'ı cache'e kaydet
            await MobileStorageService.cacheSearchResult(
              ingredients,
              freshResult.result,
              freshResult.source,
              freshResult.responseTime
            );

            Logger.info('✅ Background cache update completed');
          }
        } catch (error) {
          Logger.warn('⚠️ Background cache update failed:', error);
        }
      }, 100); // 100ms gecikme ile background'da çalış
    } catch (error) {
      Logger.warn('⚠️ Failed to start background update:', error);
    }
  }

  /**
   * Fresh search (cache bypass)
   */
  private static async searchFresh(
    ingredients: string[],
    userId?: string,
    useAI: boolean = false
  ): Promise<{
    result: any;
    source: 'community_pool' | 'ai_cache' | 'ai_generation' | 'mock';
    creditsSpent: number;
    responseTime: number;
  } | null> {
    const startTime = Date.now();

    try {
      // Community pool'dan ara
      const communityResults = await this.searchCommunityAIRecipes(
        ingredients,
        userId
      );
      if (
        communityResults.exactMatches.length > 0 ||
        communityResults.nearMatches.length > 0
      ) {
        return {
          result: communityResults,
          source: 'community_pool',
          creditsSpent: 0,
          responseTime: Date.now() - startTime,
        };
      }

      // AI cache'den ara
      const cacheResults = await this.searchInCache(ingredients);
      if (
        cacheResults.exactMatches.length > 0 ||
        cacheResults.nearMatches.length > 0
      ) {
        return {
          result: cacheResults,
          source: 'ai_cache',
          creditsSpent: 0,
          responseTime: Date.now() - startTime,
        };
      }

      // AI generation (eğer izin varsa)
      if (useAI && userId) {
        try {
          const aiResults = await this.searchWithAI(ingredients, userId);
          return {
            result: aiResults,
            source: 'ai_generation',
            creditsSpent: 1,
            responseTime: Date.now() - startTime,
          };
        } catch (aiError) {
          Logger.warn('⚠️ AI search failed in fresh search:', aiError);
        }
      }

      // Mock fallback
      const mockResults = this.searchInMockRecipes(ingredients, 10);
      return {
        result: mockResults,
        source: 'mock',
        creditsSpent: 0,
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      Logger.warn('⚠️ Fresh search failed:', error);
      return null;
    }
  }

  /**
   * Mock recipes'ta arama yap (extracted method)
   */
  private static searchInMockRecipes(
    ingredients: string[],
    maxMissingIngredients: number = 10
  ): RecipeSearchResult {
    const recipes = MOCK_RECIPES;
    const exactMatches: Recipe[] = [];
    const nearMatches: Recipe[] = [];

    // Mock search logic (mevcut kodu buraya taşı)
    const recipeAnalysis: Array<{
      recipe: Recipe;
      matchingCount: number;
      missingCount: number;
      matchRatio: number;
      priority: number;
    }> = [];

    recipes.forEach(recipe => {
      const recipeIngredients = recipe.ingredients.map(ing =>
        ing.toLowerCase().trim()
      );
      const userIngredients = ingredients.map(ing => ing.toLowerCase().trim());

      const matchingIngredients = recipeIngredients.filter(ing =>
        userIngredients.some(
          userIng =>
            ing.includes(userIng) ||
            userIng.includes(ing) ||
            this.areSimilarIngredients(ing, userIng)
        )
      );

      const missingIngredients = recipeIngredients.filter(
        ing =>
          !userIngredients.some(
            userIng =>
              ing.includes(userIng) ||
              userIng.includes(ing) ||
              this.areSimilarIngredients(ing, userIng)
          )
      );

      const matchingCount = matchingIngredients.length;
      const missingCount = missingIngredients.length;
      const matchRatio = matchingCount / recipeIngredients.length;

      let priority = matchingCount * 10;
      priority += matchRatio * 5;
      priority -= missingCount * 0.5;

      if (matchingIngredients.some(ing => this.isBasicIngredient(ing))) {
        priority += 2;
      }

      const mappedRecipe: Recipe = {
        id: recipe.id,
        name: recipe.name,
        description: recipe.description || undefined,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        preparationTime: recipe.preparationTime || undefined,
        servings: recipe.servings || undefined,
        difficulty: recipe.difficulty as any,
        category: recipe.category as any,
        imageUrl: recipe.imageUrl || undefined,
        missingIngredients: missingIngredients,
      };

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

    recipeAnalysis.sort((a, b) => b.priority - a.priority);

    recipeAnalysis.forEach(
      ({ recipe, missingCount, matchingCount, matchRatio }) => {
        if (missingCount === 0) {
          exactMatches.push(recipe);
        } else if (
          matchingCount >= 1 &&
          (matchRatio >= 0.3 || matchingCount >= 2 || missingCount <= 3)
        ) {
          nearMatches.push(recipe);
        }
      }
    );

    return {
      exactMatches: exactMatches.slice(0, 15),
      nearMatches: nearMatches.slice(0, 25),
    };
  }

  /**
   * Mobile storage'dan kullanıcı preferences al
   */
  static async getMobileUserPreferences() {
    return await MobileStorageService.getUserPreferences();
  }

  /**
   * Mobile storage'dan search history al
   */
  static async getMobileSearchHistory(limit: number = 50) {
    const history = await MobileStorageService.getSearchHistory();
    return history.slice(0, limit);
  }

  /**
   * Mobile cache'i temizle
   */
  static async clearMobileCache(): Promise<void> {
    await MobileStorageService.clearCache();
  }

  /**
   * Tüm mobile data'yı temizle
   */
  static async clearAllMobileData(): Promise<void> {
    await MobileStorageService.clearAllData();
  }

  /**
   * Sync local data to server
   */
  static async syncLocalDataToServer(userId: string): Promise<void> {
    if (!(await MobileStorageService.isOnline())) {
      Logger.info('📱 Offline: Cannot sync to server');
      return;
    }

    try {
      Logger.info('🔄 Syncing local data to server...');

      // Local search history'yi server'a gönder
      const localHistory = (
        await MobileStorageService.getSearchHistory()
      ).filter(entry => !entry.isSynced);

      for (const entry of localHistory) {
        try {
          await this.recordSearchHistory({
            userId,
            searchIngredients: entry.ingredients,
            searchQuery: entry.searchQuery,
            resultType: entry.source as any,
            resultsFound: entry.resultsCount,
            exactMatches: Math.floor(entry.resultsCount * 0.7), // Estimate
            nearMatches: Math.floor(entry.resultsCount * 0.3), // Estimate
            usedAI: entry.source.includes('ai_generation'),
            // creditsSpent: entry.source.includes("ai_generation") ? 1 : 0, // Removed as not in SearchHistoryEntry type
            responseTimeMs: 0, // Historical data
          });

          // Mark as synced
          entry.isSynced = true;
        } catch (syncError) {
          Logger.warn('⚠️ Failed to sync entry:', entry.id?.toString() || 'unknown', syncError?.toString());
        }
      }

      // Update mobile storage with synced status
      const updatedHistory = await MobileStorageService.getSearchHistory();
      await AsyncStorage.setItem(
        '@yemek_bulucu:search_history',
        JSON.stringify(updatedHistory)
      );

      Logger.info('✅ Local data synced to server');
    } catch (error) {
      Logger.error('❌ Failed to sync local data:', error);
    }
  }
}
