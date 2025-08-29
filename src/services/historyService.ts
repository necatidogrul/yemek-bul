import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AIRequestHistory,
  HistoryStats,
  HistoryFilter,
} from '../types/History';

class HistoryService {
  private static readonly HISTORY_KEY = 'ai_request_history';
  private static readonly MAX_HISTORY_ITEMS = 100; // Maksimum 100 kayıt tut

  /**
   * Yeni AI isteği kaydeder
   */
  static async saveRequest(
    request: Omit<AIRequestHistory, 'id' | 'timestamp'>
  ): Promise<void> {
    try {
      const history = await this.getHistory();

      const newRequest: AIRequestHistory = {
        ...request,
        id: this.generateId(),
        timestamp: Date.now(),
      };

      // Yeni kaydı başa ekle
      const updatedHistory = [newRequest, ...history];

      // Maksimum sayıda tutma
      const trimmedHistory = updatedHistory.slice(0, this.MAX_HISTORY_ITEMS);

      await AsyncStorage.setItem(
        this.HISTORY_KEY,
        JSON.stringify(trimmedHistory)
      );

      console.log('📝 AI Request saved to history:', {
        id: newRequest.id,
        ingredients: newRequest.ingredients,
        success: newRequest.success,
        resultsCount: newRequest.results.count,
      });
    } catch (error) {
      console.error('❌ Failed to save AI request to history:', error);
    }
  }

  /**
   * Tüm geçmişi getirir
   */
  static async getHistory(filter?: HistoryFilter): Promise<AIRequestHistory[]> {
    try {
      const historyData = await AsyncStorage.getItem(this.HISTORY_KEY);
      let history: AIRequestHistory[] = historyData
        ? JSON.parse(historyData)
        : [];

      // Filtreleme uygula
      if (filter) {
        history = this.applyFilter(history, filter);
      }

      return history;
    } catch (error) {
      console.error('❌ Failed to get history:', error);
      return [];
    }
  }

  /**
   * Belirli bir kaydı getirir
   */
  static async getRequestById(id: string): Promise<AIRequestHistory | null> {
    try {
      const history = await this.getHistory();
      return history.find(item => item.id === id) || null;
    } catch (error) {
      console.error('❌ Failed to get request by id:', error);
      return null;
    }
  }

  /**
   * İstatistikleri hesaplar
   */
  static async getStats(): Promise<HistoryStats> {
    try {
      const history = await this.getHistory();

      const totalRequests = history.length;
      const successfulRequests = history.filter(item => item.success).length;
      const totalRecipesGenerated = history.reduce(
        (sum, item) => sum + (item.success ? item.results.count : 0),
        0
      );

      // En çok kullanılan malzemeleri hesapla
      const ingredientCounts: { [key: string]: number } = {};
      history.forEach(item => {
        item.ingredients.forEach(ingredient => {
          const normalized = ingredient.toLowerCase().trim();
          ingredientCounts[normalized] =
            (ingredientCounts[normalized] || 0) + 1;
        });
      });

      const mostUsedIngredients = Object.entries(ingredientCounts)
        .map(([ingredient, count]) => ({ ingredient, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10); // Top 10

      const totalIngredients = history.reduce(
        (sum, item) => sum + item.ingredients.length,
        0
      );
      const averageIngredientsPerRequest =
        totalRequests > 0 ? totalIngredients / totalRequests : 0;

      const lastRequestDate =
        history.length > 0 ? history[0].timestamp : undefined;

      return {
        totalRequests,
        successfulRequests,
        totalRecipesGenerated,
        mostUsedIngredients,
        averageIngredientsPerRequest,
        lastRequestDate,
      };
    } catch (error) {
      console.error('❌ Failed to get history stats:', error);
      return {
        totalRequests: 0,
        successfulRequests: 0,
        totalRecipesGenerated: 0,
        mostUsedIngredients: [],
        averageIngredientsPerRequest: 0,
      };
    }
  }

  /**
   * Geçmişi temizler
   */
  static async clearHistory(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.HISTORY_KEY);
      console.log('🗑️ AI Request history cleared');
    } catch (error) {
      console.error('❌ Failed to clear history:', error);
    }
  }

  /**
   * Belirli bir kaydı siler
   */
  static async deleteRequest(id: string): Promise<void> {
    try {
      const history = await this.getHistory();
      const filteredHistory = history.filter(item => item.id !== id);
      await AsyncStorage.setItem(
        this.HISTORY_KEY,
        JSON.stringify(filteredHistory)
      );
      console.log('🗑️ AI Request deleted from history:', id);
    } catch (error) {
      console.error('❌ Failed to delete request from history:', error);
    }
  }

  /**
   * Popüler malzeme kombinasyonlarını getirir
   */
  static async getPopularCombinations(limit: number = 5): Promise<
    Array<{
      ingredients: string[];
      count: number;
      successRate: number;
    }>
  > {
    try {
      const history = await this.getHistory();

      // Malzeme kombinasyonlarını grupla
      const combinations: {
        [key: string]: {
          count: number;
          successful: number;
          ingredients: string[];
        };
      } = {};

      history.forEach(item => {
        const sortedIngredients = [...item.ingredients].sort();
        const key = sortedIngredients.join(',');

        if (!combinations[key]) {
          combinations[key] = {
            count: 0,
            successful: 0,
            ingredients: sortedIngredients,
          };
        }

        combinations[key].count++;
        if (item.success) {
          combinations[key].successful++;
        }
      });

      // En popüler kombinasyonları döndür
      return Object.values(combinations)
        .map(combo => ({
          ingredients: combo.ingredients,
          count: combo.count,
          successRate: combo.count > 0 ? combo.successful / combo.count : 0,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
    } catch (error) {
      console.error('❌ Failed to get popular combinations:', error);
      return [];
    }
  }

  /**
   * Filtreleme uygular
   */
  private static applyFilter(
    history: AIRequestHistory[],
    filter: HistoryFilter
  ): AIRequestHistory[] {
    let filtered = [...history];

    // Tarih filtresi
    if (filter.dateRange && filter.dateRange !== 'all') {
      const now = Date.now();
      let cutoffTime = 0;

      switch (filter.dateRange) {
        case 'today':
          cutoffTime = now - 24 * 60 * 60 * 1000; // 24 saat
          break;
        case 'week':
          cutoffTime = now - 7 * 24 * 60 * 60 * 1000; // 7 gün
          break;
        case 'month':
          cutoffTime = now - 30 * 24 * 60 * 60 * 1000; // 30 gün
          break;
      }

      filtered = filtered.filter(item => item.timestamp >= cutoffTime);
    }

    // Başarı filtresi
    if (filter.success !== undefined) {
      filtered = filtered.filter(item => item.success === filter.success);
    }

    // Malzeme filtresi
    if (filter.ingredient) {
      const searchIngredient = filter.ingredient.toLowerCase();
      filtered = filtered.filter(item =>
        item.ingredients.some(ing =>
          ing.toLowerCase().includes(searchIngredient)
        )
      );
    }

    return filtered;
  }

  /**
   * Benzersiz ID üretir
   */
  private static generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export { HistoryService };
