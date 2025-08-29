import { Recipe } from '../types/Recipe';
import { supabase } from './supabase';
import { UnsplashService } from './unsplashService';
import { GoogleImageService } from './googleImageService';

export interface RecipeGenerationRequest {
  ingredients: string[];
  language?: 'tr' | 'en';
  mealTime?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  userProfile?: {
    dietaryRestrictions: string[];
    favoriteCategories: string[];
    cookingLevel: string;
    recipeHistory: number; // kaç tarif denemiş
  };
  preferences?: {
    difficulty?: 'kolay' | 'orta' | 'zor';
    cookingTime?: number; // dakika
    servings?: number;
    dietary?: string[]; // ['vegan', 'glutensiz', 'laktozsuz']
    cuisine?: string; // 'türk', 'italyan', 'çin'
  };
  excludeIngredients?: string[];
}

export interface RecipeGenerationResponse {
  recipes: Recipe[];
  totalTokensUsed: number;
  estimatedCost: number; // USD
}

export class OpenAIService {
  // GÜVENLIK: Production'da Supabase Edge Function kullanır
  private static readonly DEV_API_KEY = __DEV__
    ? process.env.EXPO_PUBLIC_OPENAI_API_KEY
    : null;
  private static readonly PRODUCTION_URL =
    process.env.EXPO_PUBLIC_SUPABASE_URL + '/functions/v1/openai-proxy';
  private static readonly DEV_URL =
    'https://api.openai.com/v1/chat/completions';
  private static readonly MODEL = 'gpt-3.5-turbo';

  // Token fiyatlandırması (GPT-3.5-turbo)
  private static readonly TOKEN_COST_PER_1K = 0.002; // $0.002 per 1K tokens

  /**
   * Dile ve kullanıcı tercihlerine göre system prompt getir
   */
  private static getSystemPrompt(
    language: 'tr' | 'en' = 'tr',
    userPreferences?: { favoriteCategories?: string[] }
  ): string {
    const favoriteCategories = userPreferences?.favoriteCategories || [];

    // Kullanıcının en sevdiği mutfağı belirle
    let cuisineExpertise = '';
    if (favoriteCategories.includes('italian')) {
      cuisineExpertise =
        language === 'tr'
          ? 'İtalyan ve uluslararası'
          : 'Italian and international';
    } else if (favoriteCategories.includes('asian')) {
      cuisineExpertise =
        language === 'tr' ? 'Asya ve uluslararası' : 'Asian and international';
    } else if (favoriteCategories.includes('healthy')) {
      cuisineExpertise =
        language === 'tr'
          ? 'sağlıklı beslenme ve uluslararası'
          : 'healthy cooking and international';
    } else if (favoriteCategories.includes('turkish')) {
      cuisineExpertise =
        language === 'tr'
          ? 'Türk ve uluslararası'
          : 'Turkish and international';
    } else {
      cuisineExpertise = language === 'tr' ? 'uluslararası' : 'international';
    }

    const prompts = {
      tr: `Sen ${cuisineExpertise} mutfağı konusunda uzman bir şefsin. Verilen malzemelerle pratik, lezzetli tarifler öneriyorsun. Yanıtlarını JSON formatında ver.`,
      en: `You are an expert chef specializing in ${cuisineExpertise} cuisine. You suggest practical, delicious recipes using given ingredients. Respond in JSON format.`,
    };

    return prompts[language];
  }

  /**
   * API yapılandırmasını environment'a göre getir
   */
  private static async getApiConfig(): Promise<{
    url: string;
    headers: Record<string, string>;
  }> {
    // Her zaman direkt OpenAI API kullan (Supabase Edge Function yok)
    console.log('🤖 Using direct OpenAI API');
    return {
      url: this.DEV_URL,
      headers: {
        Authorization: `Bearer ${process.env.EXPO_PUBLIC_OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
    };
  }

  /**
   * Malzemelere göre AI ile tarif üret
   */
  static async generateRecipes(
    request: RecipeGenerationRequest
  ): Promise<RecipeGenerationResponse> {
    try {
      const { language = 'tr', userProfile } = request;
      const prompt = this.buildPrompt(request);

      console.log('🤖 OpenAI API: Recipe generation started');
      console.log('📝 Ingredients:', request.ingredients);
      console.log('🌍 Language:', language);
      console.log('🍽️ Favorite cuisines:', userProfile?.favoriteCategories);

      const { url, headers } = await this.getApiConfig();

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: this.MODEL,
          messages: [
            {
              role: 'system',
              content: this.getSystemPrompt(language, {
                favoriteCategories: userProfile?.favoriteCategories,
              }),
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          max_tokens: 2000,
          temperature: 0.8, // Yaratıcılık için
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `OpenAI API error: ${response.status} - ${
            errorData.error?.message || response.statusText
          }`
        );
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;

      if (!content) {
        throw new Error("OpenAI'dan yanıt alınamadı");
      }

      // JSON parse et
      const parsedResponse = JSON.parse(content);
      const recipes = await this.parseRecipesFromAI(parsedResponse);

      // Token kullanımı ve maliyet hesapla
      const tokensUsed = data.usage?.total_tokens || 0;
      const estimatedCost = (tokensUsed / 1000) * this.TOKEN_COST_PER_1K;

      console.log('✅ OpenAI API: Success');
      console.log(
        `📊 Tokens used: ${tokensUsed}, Cost: $${estimatedCost.toFixed(4)}`
      );
      console.log(`🍽️ Generated ${recipes.length} recipes`);

      return {
        recipes,
        totalTokensUsed: tokensUsed,
        estimatedCost,
      };
    } catch (error) {
      console.error('❌ OpenAI API Error:', error);
      throw error;
    }
  }

  /**
   * Dile göre çeviri template'leri
   */
  private static getPromptTemplates(language: 'tr' | 'en') {
    const templates = {
      tr: {
        mealTimes: {
          breakfast: '🌅 KAHVALTI için',
          lunch: '☀️ ÖĞLE YEMEĞİ için',
          dinner: '🌆 AKŞAM YEMEĞİ için',
          snack: '🍿 ATIŞTIRMALIK için',
        },
        basePrompt: 'Bu malzemeleri kullanarak 3 tarif öner:',
        userProfile: 'KULLANICI PROFİLİ:',
        nutrition: 'Beslenme:',
        favorites: 'Favori mutfaklar:',
        experience: 'Mutfak deneyimi:',
        recipeDistribution: 'TARİF DAĞILIMI',
        difficulty: 'Zorluk:',
        time: 'Süre: Max',
        servings: 'Porsiyon:',
        exclude: 'Kullanma:',
        conservative: '3 tarif: Tamamen kullanıcı tercihlerine uygun',
        balanced: [
          '2 tarif: Kullanıcı tercihlerine uygun 🎯',
          '1 tarif: Yeni keşif için farklı mutfaktan 🌟',
        ],
        adventurous: [
          '1 tarif: Kullanıcı tercihlerine uygun 🎯',
          '2 tarif: Macera için yeni deneyimler 🌟',
        ],
      },
      en: {
        mealTimes: {
          breakfast: '🌅 For BREAKFAST',
          lunch: '☀️ For LUNCH',
          dinner: '🌆 For DINNER',
          snack: '🍿 For SNACK',
        },
        basePrompt: 'Suggest 3 recipes using these ingredients:',
        userProfile: 'USER PROFILE:',
        nutrition: 'Dietary restrictions:',
        favorites: 'Favorite cuisines:',
        experience: 'Cooking experience:',
        recipeDistribution: 'RECIPE DISTRIBUTION',
        difficulty: 'Difficulty:',
        time: 'Time: Max',
        servings: 'Servings:',
        exclude: 'Exclude:',
        conservative: '3 recipes: Fully matching user preferences',
        balanced: [
          '2 recipes: Matching user preferences 🎯',
          '1 recipe: New discovery from different cuisine 🌟',
        ],
        adventurous: [
          '1 recipe: Matching user preferences 🎯',
          '2 recipes: New adventures for exploration 🌟',
        ],
      },
    };

    return templates[language];
  }

  /**
   * AI için adaptif prompt oluştur
   */
  private static buildPrompt(request: RecipeGenerationRequest): string {
    const {
      ingredients,
      mealTime,
      userProfile,
      preferences,
      excludeIngredients,
      language = 'tr',
    } = request;
    const t = this.getPromptTemplates(language);

    // Adaptif strateji belirleme
    const recipeHistory = userProfile?.recipeHistory || 0;
    let strategy = 'conservative'; // 3 tercihli
    if (recipeHistory >= 5) strategy = 'balanced'; // 2+1
    if (recipeHistory >= 20) strategy = 'adventurous'; // 1+2

    // Öğün zamanına göre özel öneriler
    const mealTimePrompt =
      mealTime && t.mealTimes[mealTime as keyof typeof t.mealTimes]
        ? t.mealTimes[mealTime as keyof typeof t.mealTimes]
        : '';

    let prompt = `${mealTimePrompt} ${t.basePrompt} ${ingredients.join(', ')}`;

    // Kullanıcı profili ekleme
    if (userProfile) {
      prompt += `\n\n${t.userProfile}`;
      if (userProfile.dietaryRestrictions.length) {
        prompt += `\n- ${t.nutrition} ${userProfile.dietaryRestrictions.join(
          ', '
        )}`;
      }
      if (userProfile.favoriteCategories.length) {
        prompt += `\n- ${t.favorites} ${userProfile.favoriteCategories.join(
          ', '
        )}`;
      }
      if (userProfile.cookingLevel) {
        prompt += `\n- ${t.experience} ${userProfile.cookingLevel}`;
      }
    }

    // Adaptif strateji uygulama
    prompt += `\n\n${t.recipeDistribution} (${strategy.toUpperCase()}):`;

    if (strategy === 'conservative') {
      prompt += `\n- ${t.conservative}`;
    } else if (strategy === 'balanced') {
      prompt += `\n- ${t.balanced[0]}`;
      prompt += `\n- ${t.balanced[1]}`;
    } else {
      prompt += `\n- ${t.adventurous[0]}`;
      prompt += `\n- ${t.adventurous[1]}`;
    }

    // Diğer tercihler
    if (preferences?.difficulty) {
      prompt += `\n${t.difficulty} ${preferences.difficulty}`;
    }
    if (preferences?.cookingTime) {
      prompt += `\n${t.time} ${preferences.cookingTime} ${
        language === 'en' ? 'minutes' : 'dakika'
      }`;
    }
    if (preferences?.servings) {
      prompt += `\n${t.servings} ${preferences.servings} ${
        language === 'en' ? 'people' : 'kişi'
      }`;
    }
    if (excludeIngredients?.length) {
      prompt += `\n${t.exclude} ${excludeIngredients.join(', ')}`;
    }

    // JSON formatı talimatları
    const jsonInstructions =
      language === 'en'
        ? `\n\nRespond in this JSON format:
{
  "recipes": [
    {
      "name": "Recipe Name",
      "description": "Brief description (max 100 chars)",
      "ingredients": ["ingredient 1", "ingredient 2"],
      "instructions": ["step 1", "step 2", "step 3"],
      "preparationTime": 15,
      "servings": 2,
      "difficulty": "easy",
      "category": "main_dish",
      "imageSearchTerm": "chicken pasta italian food", // English image search keywords (2-4 words)
      "imageUrl": "https://source.unsplash.com/featured/?pasta,food", // Prefer direct Unsplash Source URL; if unknown, leave empty
      "recommendationType": "preference", // "preference" or "discovery"
      "recommendationReason": "Briefly explain why recommended",
      "tips": "Tip (optional)"
    }
  ]
}`
        : `\n\nYanıtını şu JSON formatında ver:
{
  "recipes": [
    {
      "name": "Tarif Adı",
      "description": "Kısa açıklama (max 100 karakter)",
      "ingredients": ["malzeme 1", "malzeme 2"],
      "instructions": ["adım 1", "adım 2", "adım 3"],
      "preparationTime": 15,
      "servings": 2,
      "difficulty": "kolay",
      "category": "ana_yemek",
      "imageSearchTerm": "chicken pasta italian food", // İngilizce resim arama kelimesi (2-4 kelime)
      "imageUrl": "https://source.unsplash.com/featured/?pasta,food", // Mümkünse direkt Unsplash Source URL ver; bilmiyorsan boş bırak
      "recommendationType": "preference", // "preference" veya "discovery"
      "recommendationReason": "Neden önerildiğini kısaca açıkla",
      "tips": "İpucu (opsiyonel)"
    }
  ]
}`;

    prompt += jsonInstructions;

    return prompt;
  }

  /**
   * AI yanıtını Recipe formatına çevir ve Unsplash'ten fotoğraf getir
   */
  private static async parseRecipesFromAI(aiResponse: any): Promise<Recipe[]> {
    const recipes: Recipe[] = [];

    if (!aiResponse.recipes || !Array.isArray(aiResponse.recipes)) {
      throw new Error('AI yanıtı beklenmeyen formatta');
    }

    // Her tarif için seri olarak işlem yap (API rate limit için)
    for (let index = 0; index < aiResponse.recipes.length; index++) {
      const recipe = aiResponse.recipes[index];

      try {
        const searchTerm = recipe.imageSearchTerm || recipe.name;

        // 1) Google görsel arama
        let imageUrl: string | null =
          await GoogleImageService.searchImageUrl(searchTerm);

        // 2) AI tarafından verilmiş URL varsa onu kullan (Google sonuç vermediyse)
        if (
          !imageUrl &&
          typeof recipe.imageUrl === 'string' &&
          recipe.imageUrl.trim()
        ) {
          imageUrl = recipe.imageUrl.trim();
          console.log('📸 AI imageUrl kullanılıyor:', imageUrl);
        }

        // 3) Hâlâ yoksa Unsplash fallback
        if (!imageUrl) {
          console.log('🔍 Unsplash arama terimi:', searchTerm);
          imageUrl = await UnsplashService.searchFoodImage(searchTerm);
          console.log('📸 Unsplash sonucu:', imageUrl);
        }

        const parsedRecipe: Recipe = {
          id: `ai_${Date.now()}_${index}`,
          name: recipe.name || 'İsimsiz Tarif',
          description: recipe.description || 'AI tarafından üretilen tarif',
          ingredients: Array.isArray(recipe.ingredients)
            ? recipe.ingredients
            : [],
          instructions: Array.isArray(recipe.instructions)
            ? recipe.instructions
            : [],
          preparationTime:
            typeof recipe.preparationTime === 'number'
              ? recipe.preparationTime
              : undefined,
          servings:
            typeof recipe.servings === 'number' ? recipe.servings : undefined,
          difficulty: ['kolay', 'orta', 'zor'].includes(recipe.difficulty)
            ? recipe.difficulty
            : 'orta',
          category: recipe.category || 'ana_yemek',
          imageUrl: imageUrl || undefined,
          imageSearchTerm: recipe.imageSearchTerm || recipe.name,
          source: 'ai',
          aiGenerated: true,
          tips: recipe.tips,
        };

        recipes.push(parsedRecipe);
      } catch (error) {
        console.warn(`⚠️ Recipe parsing error for index ${index}:`, error);
      }
    }

    return recipes;
  }

  /**
   * API durumunu kontrol et
   */
  static async checkApiStatus(): Promise<boolean> {
    try {
      const { url, headers } = await this.getApiConfig();

      // Basit test isteği
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: this.MODEL,
          messages: [{ role: 'user', content: 'Test' }],
          max_tokens: 5,
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('❌ OpenAI API status check failed:', error);
      return false;
    }
  }

  /**
   * Tarif hakkında soru-cevap
   */
  static async askRecipeQuestion(
    recipe: any,
    question: string
  ): Promise<string> {
    try {
      const prompt = this.buildQuestionPrompt(recipe, question);

      console.log('🤖 OpenAI API: Recipe Q&A started');
      console.log('❓ Question:', question);

      const { url, headers } = await this.getApiConfig();

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: this.MODEL,
          messages: [
            {
              role: 'system',
              content:
                'Sen deneyimli bir şef ve beslenme uzmanısın. Tariflerdeki soruları detaylı, pratik ve yardımcı şekilde yanıtlıyorsun. Yanıtların Türkçe olsun ve samimi bir dille konuş.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          max_tokens: 500,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `OpenAI API error: ${response.status} - ${
            errorData.error?.message || response.statusText
          }`
        );
      }

      const data = await response.json();
      const answer = data.choices[0]?.message?.content;

      if (!answer) {
        throw new Error("OpenAI'dan yanıt alınamadı");
      }

      console.log('✅ OpenAI API: Q&A Success');
      return answer.trim();
    } catch (error) {
      console.error('❌ OpenAI Q&A Error:', error);
      throw error;
    }
  }

  /**
   * Soru için prompt oluştur
   */
  private static buildQuestionPrompt(recipe: any, question: string): string {
    return `Şu tarif hakkında soruyu yanıtla:

TARİF:
Adı: ${recipe.name}
Açıklama: ${recipe.description || ''}
Malzemeler: ${recipe.ingredients?.join(', ') || ''}
Tarif: ${recipe.instructions?.join(' ') || ''}
Süre: ${recipe.preparationTime || recipe.cookingTime || 'Belirtilmemiş'} dakika
Porsiyon: ${recipe.servings || 'Belirtilmemiş'} kişi
Zorluk: ${recipe.difficulty || 'Belirtilmemiş'}

SORU: ${question}

Lütfen bu soruyu net, pratik ve yardımcı şekilde yanıtla. Gerekirse alternatif öneriler de sun.`;
  }

  /**
   * Öğün zamanına göre prompt (deprecated - template sistemi kullanılıyor)
   */
  private static getMealTimePrompt(mealTime?: string): string {
    // Bu fonksiyon artık kullanılmıyor, template sistemi kullanılıyor
    return '';
  }

  /**
   * Token sayısını tahmin et (approximate)
   */
  static estimateTokens(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters for Turkish
    return Math.ceil(text.length / 4);
  }

  /**
   * Maliyet tahmini
   */
  static estimateCost(ingredients: string[], preferences?: any): number {
    const prompt = this.buildPrompt({ ingredients, preferences });
    const estimatedTokens = this.estimateTokens(prompt) + 1500; // Response tokens
    return (estimatedTokens / 1000) * this.TOKEN_COST_PER_1K;
  }
}
