import { Recipe } from '../types/Recipe';

export interface RecipeGenerationRequest {
  ingredients: string[];
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
  private static readonly API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  private static readonly BASE_URL = 'https://api.openai.com/v1/chat/completions';
  private static readonly MODEL = 'gpt-3.5-turbo';
  
  // Token fiyatlandırması (GPT-3.5-turbo)
  private static readonly TOKEN_COST_PER_1K = 0.002; // $0.002 per 1K tokens

  /**
   * Malzemelere göre AI ile tarif üret
   */
  static async generateRecipes(request: RecipeGenerationRequest): Promise<RecipeGenerationResponse> {
    try {
      if (!this.API_KEY || this.API_KEY === 'your_openai_api_key_here') {
        throw new Error('OpenAI API key bulunamadı. Lütfen .env dosyasını kontrol edin.');
      }

      const prompt = this.buildPrompt(request);
      
      console.log('🤖 OpenAI API: Recipe generation started');
      console.log('📝 Ingredients:', request.ingredients);

      const response = await fetch(this.BASE_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.MODEL,
          messages: [
            {
              role: 'system',
              content: 'Sen Türk mutfağı konusunda uzman bir şefsin. Verilen malzemelerle pratik, lezzetli tarifler öneriyorsun. Yanıtlarını JSON formatında ver.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 2000,
          temperature: 0.8, // Yaratıcılık için
          response_format: { type: "json_object" }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;
      
      if (!content) {
        throw new Error('OpenAI\'dan yanıt alınamadı');
      }

      // JSON parse et
      const parsedResponse = JSON.parse(content);
      const recipes = this.parseRecipesFromAI(parsedResponse);

      // Token kullanımı ve maliyet hesapla
      const tokensUsed = data.usage?.total_tokens || 0;
      const estimatedCost = (tokensUsed / 1000) * this.TOKEN_COST_PER_1K;

      console.log('✅ OpenAI API: Success');
      console.log(`📊 Tokens used: ${tokensUsed}, Cost: $${estimatedCost.toFixed(4)}`);
      console.log(`🍽️ Generated ${recipes.length} recipes`);

      return {
        recipes,
        totalTokensUsed: tokensUsed,
        estimatedCost
      };

    } catch (error) {
      console.error('❌ OpenAI API Error:', error);
      throw error;
    }
  }

  /**
   * AI için adaptif prompt oluştur
   */
  private static buildPrompt(request: RecipeGenerationRequest): string {
    const { ingredients, mealTime, userProfile, preferences, excludeIngredients } = request;
    
    // Adaptif strateji belirleme
    const recipeHistory = userProfile?.recipeHistory || 0;
    let strategy = 'conservative'; // 3 tercihli
    if (recipeHistory >= 5) strategy = 'balanced';    // 2+1
    if (recipeHistory >= 20) strategy = 'adventurous'; // 1+2
    
    // Öğün zamanına göre özel öneriler
    const mealTimePrompt = this.getMealTimePrompt(mealTime);
    
    let prompt = `${mealTimePrompt} Bu malzemeleri kullanarak 3 tarif öner: ${ingredients.join(', ')}`;
    
    // Kullanıcı profili ekleme
    if (userProfile) {
      prompt += `\n\nKULLANICI PROFİLİ:`;
      if (userProfile.dietaryRestrictions.length) {
        prompt += `\n- Beslenme: ${userProfile.dietaryRestrictions.join(', ')}`;
      }
      if (userProfile.favoriteCategories.length) {
        prompt += `\n- Favori mutfaklar: ${userProfile.favoriteCategories.join(', ')}`;
      }
      if (userProfile.cookingLevel) {
        prompt += `\n- Mutfak deneyimi: ${userProfile.cookingLevel}`;
      }
    }
    
    // Adaptif strateji uygulama
    prompt += `\n\nTARİF DAĞILIMI (${strategy.toUpperCase()}):`;
    
    if (strategy === 'conservative') {
      prompt += `\n- 3 tarif: Tamamen kullanıcı tercihlerine uygun`;
    } else if (strategy === 'balanced') {
      prompt += `\n- 2 tarif: Kullanıcı tercihlerine uygun 🎯`;
      prompt += `\n- 1 tarif: Yeni keşif için farklı mutfaktan 🌟`;
    } else {
      prompt += `\n- 1 tarif: Kullanıcı tercihlerine uygun 🎯`;
      prompt += `\n- 2 tarif: Macera için yeni deneyimler 🌟`;
    }
    
    // Diğer tercihler
    if (preferences?.difficulty) {
      prompt += `\nZorluk: ${preferences.difficulty}`;
    }
    if (preferences?.cookingTime) {
      prompt += `\nSüre: Max ${preferences.cookingTime} dakika`;
    }
    if (preferences?.servings) {
      prompt += `\nPorsiyon: ${preferences.servings} kişi`;
    }
    if (excludeIngredients?.length) {
      prompt += `\nKullanma: ${excludeIngredients.join(', ')}`;
    }

    prompt += `\n\nYanıtını şu JSON formatında ver:
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
      "recommendationType": "preference", // "preference" veya "discovery"
      "recommendationReason": "Neden önerildiğini kısaca açıkla",
      "tips": "İpucu (opsiyonel)"
    }
  ]
}`;

    return prompt;
  }

  /**
   * AI yanıtını Recipe formatına çevir
   */
  private static parseRecipesFromAI(aiResponse: any): Recipe[] {
    const recipes: Recipe[] = [];
    
    if (!aiResponse.recipes || !Array.isArray(aiResponse.recipes)) {
      throw new Error('AI yanıtı beklenmeyen formatta');
    }

    aiResponse.recipes.forEach((recipe: any, index: number) => {
      try {
        const parsedRecipe: Recipe = {
          id: `ai_${Date.now()}_${index}`,
          name: recipe.name || 'İsimsiz Tarif',
          description: recipe.description || 'AI tarafından üretilen tarif',
          ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
          instructions: Array.isArray(recipe.instructions) ? recipe.instructions : [],
          preparationTime: typeof recipe.preparationTime === 'number' ? recipe.preparationTime : undefined,
          servings: typeof recipe.servings === 'number' ? recipe.servings : undefined,
          difficulty: ['kolay', 'orta', 'zor'].includes(recipe.difficulty) ? recipe.difficulty : 'orta',
          category: recipe.category || 'ana_yemek',
          imageUrl: undefined, // AI henüz görsel üretmiyor
          source: 'ai',
          aiGenerated: true,
          tips: recipe.tips
        };

        recipes.push(parsedRecipe);
      } catch (error) {
        console.warn(`⚠️ Recipe parsing error for index ${index}:`, error);
      }
    });

    return recipes;
  }

  /**
   * API durumunu kontrol et
   */
  static async checkApiStatus(): Promise<boolean> {
    try {
      if (!this.API_KEY || this.API_KEY === 'your_openai_api_key_here') {
        return false;
      }

      // Basit test isteği
      const response = await fetch(this.BASE_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.MODEL,
          messages: [{ role: 'user', content: 'Test' }],
          max_tokens: 5
        })
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
  static async askRecipeQuestion(recipe: any, question: string): Promise<string> {
    try {
      if (!this.API_KEY || this.API_KEY === 'your_openai_api_key_here') {
        throw new Error('OpenAI API key bulunamadı. Lütfen .env dosyasını kontrol edin.');
      }

      const prompt = this.buildQuestionPrompt(recipe, question);
      
      console.log('🤖 OpenAI API: Recipe Q&A started');
      console.log('❓ Question:', question);

      const response = await fetch(this.BASE_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.MODEL,
          messages: [
            {
              role: 'system',
              content: 'Sen deneyimli bir şef ve beslenme uzmanısın. Tariflerdeki soruları detaylı, pratik ve yardımcı şekilde yanıtlıyorsun. Yanıtların Türkçe olsun ve samimi bir dille konuş.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 500,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const answer = data.choices[0]?.message?.content;
      
      if (!answer) {
        throw new Error('OpenAI\'dan yanıt alınamadı');
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
   * Öğün zamanına göre prompt
   */
  private static getMealTimePrompt(mealTime?: string): string {
    const mealTimePrompts = {
      breakfast: '🌅 KAHVALTI için',
      lunch: '☀️ ÖĞLE YEMEĞİ için',
      dinner: '🌆 AKŞAM YEMEĞİ için',
      snack: '🍿 ATIŞTIRMALIK için'
    };
    
    const timePrompt = mealTime ? mealTimePrompts[mealTime as keyof typeof mealTimePrompts] : '';
    return timePrompt || '';
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