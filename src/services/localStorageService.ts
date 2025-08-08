/**
 * Mobile Storage Service - React Native AsyncStorage
 *
 * Features:
 * - Search result caching
 * - Offline support
 * - Search history
 * - User preferences
 * - Background sync
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { Logger } from "../services/LoggerService";

export interface CachedSearchResult {
  ingredients: string[];
  ingredientHash: string;
  results: {
    exactMatches: any[];
    nearMatches: any[];
  };
  metadata: {
    source: "community_pool" | "ai_cache" | "ai_generation" | "mock";
    timestamp: number;
    expiresAt: number;
    creditsSpent: number;
    responseTimeMs: number;
    isStale?: boolean;
  };
}

export interface LocalSearchHistory {
  id: string;
  ingredients: string[];
  searchQuery?: string;
  timestamp: number;
  resultsCount: number;
  source: string;
  isSynced: boolean; // Server'a gönderildi mi?
}

export interface UserPreferences {
  frequentIngredients: string[];
  preferredDifficulty?: "kolay" | "orta" | "zor";
  preferredCategories: string[];
  lastSearchDate: number;
  searchCount: number;
}

export class MobileStorageService {
  private static readonly KEYS = {
    SEARCH_CACHE: "@yemek_bulucu:search_cache",
    SEARCH_HISTORY: "@yemek_bulucu:search_history",
    USER_PREFERENCES: "@yemek_bulucu:user_prefs",
    OFFLINE_QUEUE: "@yemek_bulucu:offline_queue",
    SYNC_STATUS: "@yemek_bulucu:sync_status",
    RECIPE_FAVORITES: "@yemek_bulucu:favorites",
    USER_SESSION: "@yemek_bulucu:user_session",
  };

  private static readonly CACHE_DURATION = {
    COMMUNITY_POOL: 24 * 60 * 60 * 1000, // 24 saat
    AI_CACHE: 12 * 60 * 60 * 1000, // 12 saat
    AI_GENERATION: 7 * 24 * 60 * 60 * 1000, // 7 gün
    MOCK: 1 * 60 * 60 * 1000, // 1 saat
  };

  /**
   * Arama sonucunu cache'e kaydet
   */
  static async cacheSearchResult(
    ingredients: string[],
    results: any,
    source: CachedSearchResult["metadata"]["source"],
    creditsSpent: number = 0,
    responseTimeMs: number = 0
  ): Promise<void> {
    try {
      const ingredientHash = this.generateIngredientHash(ingredients);
      const cache = await this.getSearchCache();

      const cacheDuration =
        this.CACHE_DURATION[
          source.toUpperCase() as keyof typeof this.CACHE_DURATION
        ] || this.CACHE_DURATION.MOCK;

      const cachedResult: CachedSearchResult = {
        ingredients: ingredients.map((ing) => ing.toLowerCase().trim()),
        ingredientHash,
        results,
        metadata: {
          source,
          timestamp: Date.now(),
          expiresAt: Date.now() + cacheDuration,
          creditsSpent,
          responseTimeMs,
        },
      };

      cache[ingredientHash] = cachedResult;

      // Cache size kontrolü (max 100 arama)
      const cacheKeys = Object.keys(cache);
      if (cacheKeys.length > 100) {
        // En eski 20'sini sil
        const sortedKeys = cacheKeys
          .sort(
            (a, b) => cache[a].metadata.timestamp - cache[b].metadata.timestamp
          )
          .slice(0, 20);

        sortedKeys.forEach((key) => delete cache[key]);
      }

      await AsyncStorage.setItem(this.KEYS.SEARCH_CACHE, JSON.stringify(cache));
      console.log("✅ Search result cached on mobile:", ingredientHash);
    } catch (error) {
      console.warn("⚠️ Failed to cache search result:", error);
    }
  }

  /**
   * Cache'den arama sonucu al
   */
  static async getCachedSearchResult(
    ingredients: string[]
  ): Promise<CachedSearchResult | null> {
    try {
      const ingredientHash = this.generateIngredientHash(ingredients);
      const cache = await this.getSearchCache();
      const cached = cache[ingredientHash];

      if (!cached) {
        return null;
      }

      // Expire kontrolü
      if (Date.now() > cached.metadata.expiresAt) {
        delete cache[ingredientHash];
        await AsyncStorage.setItem(
          this.KEYS.SEARCH_CACHE,
          JSON.stringify(cache)
        );
        return null;
      }

      // Stale kontrolü (yarı ömür)
      const halfLife =
        (cached.metadata.expiresAt - cached.metadata.timestamp) / 2;
      const isStale = Date.now() > cached.metadata.timestamp + halfLife;

      if (isStale) {
        cached.metadata.isStale = true;
      }

      console.log(
        "✅ Found cached search result:",
        ingredientHash,
        isStale ? "(stale)" : "(fresh)"
      );
      return cached;
    } catch (error) {
      console.warn("⚠️ Failed to get cached result:", error);
      return null;
    }
  }

  /**
   * Arama geçmişine ekle (local)
   */
  static async addSearchHistory(
    ingredients: string[],
    searchQuery: string | undefined,
    resultsCount: number,
    source: string
  ): Promise<void> {
    try {
      const history = await this.getSearchHistory();

      const historyEntry: LocalSearchHistory = {
        id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ingredients: ingredients.map((ing) => ing.toLowerCase().trim()),
        searchQuery,
        timestamp: Date.now(),
        resultsCount: resultsCount,
        source,
        isSynced: false,
      };

      history.unshift(historyEntry); // En yeniler başta

      // History size kontrolü (max 200 arama)
      if (history.length > 200) {
        history.splice(200);
      }

      await AsyncStorage.setItem(
        this.KEYS.SEARCH_HISTORY,
        JSON.stringify(history)
      );

      // User preferences güncelle
      await this.updateUserPreferences(ingredients);

      console.log("📝 Search history added locally:", historyEntry.id);
    } catch (error) {
      console.warn("⚠️ Failed to add search history:", error);
    }
  }

  /**
   * Local arama geçmişini al
   */
  static async getSearchHistory(): Promise<LocalSearchHistory[]> {
    try {
      const history = await AsyncStorage.getItem(this.KEYS.SEARCH_HISTORY);
      return history ? JSON.parse(history) : [];
    } catch (error) {
      console.warn("⚠️ Failed to get search history:", error);
      return [];
    }
  }

  /**
   * User preferences güncelle
   */
  private static async updateUserPreferences(
    ingredients: string[]
  ): Promise<void> {
    try {
      const prefs = await this.getUserPreferences();

      // Frequent ingredients güncelle
      ingredients.forEach((ingredient) => {
        const normalizedIngredient = ingredient.toLowerCase().trim();
        const index = prefs.frequentIngredients.findIndex(
          (ing) => ing === normalizedIngredient
        );

        if (index !== -1) {
          // Var olan malzemeyi başa al (frequency artır)
          prefs.frequentIngredients.splice(index, 1);
          prefs.frequentIngredients.unshift(normalizedIngredient);
        } else {
          // Yeni malzeme ekle
          prefs.frequentIngredients.unshift(normalizedIngredient);
        }
      });

      // Max 50 malzeme tut
      prefs.frequentIngredients = prefs.frequentIngredients.slice(0, 50);

      prefs.lastSearchDate = Date.now();
      prefs.searchCount += 1;

      await AsyncStorage.setItem(
        this.KEYS.USER_PREFERENCES,
        JSON.stringify(prefs)
      );
    } catch (error) {
      console.warn("⚠️ Failed to update user preferences:", error);
    }
  }

  /**
   * User preferences al
   */
  static async getUserPreferences(): Promise<UserPreferences> {
    try {
      const prefs = await AsyncStorage.getItem(this.KEYS.USER_PREFERENCES);
      return prefs
        ? JSON.parse(prefs)
        : {
            frequentIngredients: [],
            preferredCategories: [],
            lastSearchDate: 0,
            searchCount: 0,
          };
    } catch (error) {
      console.warn("⚠️ Failed to get user preferences:", error);
      return {
        frequentIngredients: [],
        preferredCategories: [],
        lastSearchDate: 0,
        searchCount: 0,
      };
    }
  }

  /**
   * Offline queue'ya ekle (sync için)
   */
  static async addToOfflineQueue(action: string, data: any): Promise<void> {
    try {
      const queue = await this.getOfflineQueue();

      const queueItem = {
        id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        action,
        data,
        timestamp: Date.now(),
        retryCount: 0,
      };

      queue.push(queueItem);
      await AsyncStorage.setItem(
        this.KEYS.OFFLINE_QUEUE,
        JSON.stringify(queue)
      );

      console.log("📤 Added to offline queue:", action);
    } catch (error) {
      console.warn("⚠️ Failed to add to offline queue:", error);
    }
  }

  /**
   * Offline queue al
   */
  static async getOfflineQueue(): Promise<any[]> {
    try {
      const queue = await AsyncStorage.getItem(this.KEYS.OFFLINE_QUEUE);
      return queue ? JSON.parse(queue) : [];
    } catch (error) {
      console.warn("⚠️ Failed to get offline queue:", error);
      return [];
    }
  }

  /**
   * Offline queue'yu temizle
   */
  static async clearOfflineQueue(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.KEYS.OFFLINE_QUEUE);
      console.log("🗑️ Offline queue cleared");
    } catch (error) {
      console.warn("⚠️ Failed to clear offline queue:", error);
    }
  }

  /**
   * Network durumu kontrolü (React Native)
   */
  static async isOnline(): Promise<boolean> {
    try {
      const networkState = await NetInfo.fetch();
      if (networkState.isConnected && networkState.isInternetReachable) {
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.warn("⚠️ Network check failed:", error);
      return false;
    }
  }

  /**
   * Network durumunu dinle
   */
  static subscribeToNetworkChanges(
    callback: (isOnline: boolean) => void
  ): () => void {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const isOnline = state.isConnected && state.isInternetReachable;
      callback(isOnline ?? false);
    });

    return unsubscribe;
  }

  /**
   * Malzeme önerilerini al (local preferences'tan)
   */
  static async getIngredientSuggestions(
    partialInput: string,
    limit: number = 10
  ): Promise<string[]> {
    try {
      const prefs = await this.getUserPreferences();
      const searchTerm = partialInput.toLowerCase().trim();

      if (!searchTerm) {
        return prefs.frequentIngredients.slice(0, limit);
      }

      // Frequent ingredients'te ara
      const matches = prefs.frequentIngredients.filter((ingredient) =>
        ingredient.includes(searchTerm)
      );

      return matches.slice(0, limit);
    } catch (error) {
      console.warn("⚠️ Failed to get ingredient suggestions:", error);
      return [];
    }
  }

  /**
   * Cache temizle
   */
  static async clearCache(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.KEYS.SEARCH_CACHE);
      console.log("🗑️ Search cache cleared");
    } catch (error) {
      console.warn("⚠️ Failed to clear cache:", error);
    }
  }

  /**
   * Tüm local data'yı temizle
   */
  static async clearAllData(): Promise<void> {
    try {
      await Promise.all(
        Object.values(this.KEYS).map((key) => AsyncStorage.removeItem(key))
      );
      console.log("🗑️ All local data cleared");
    } catch (error) {
      console.warn("⚠️ Failed to clear all data:", error);
    }
  }

  /**
   * Storage quota kontrolü (React Native için basitleştirildi)
   */
  static async getStorageInfo(): Promise<{
    keysCount: number;
    estimatedSize: string;
  } | null> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const yemekBulucuKeys = allKeys.filter((key) =>
        key.startsWith("@yemek_bulucu:")
      );

      console.log(`📊 Storage: ${yemekBulucuKeys.length} keys stored`);

      return {
        keysCount: yemekBulucuKeys.length,
        estimatedSize: `${yemekBulucuKeys.length} keys`,
      };
    } catch (error) {
      console.warn("⚠️ Failed to get storage info:", error);
      return null;
    }
  }

  // Helper methods
  static async getSearchCache(): Promise<Record<string, CachedSearchResult>> {
    try {
      const cache = await AsyncStorage.getItem(this.KEYS.SEARCH_CACHE);
      return cache ? JSON.parse(cache) : {};
    } catch (error) {
      console.warn("⚠️ Failed to get search cache:", error);
      return {};
    }
  }

  private static generateIngredientHash(ingredients: string[]): string {
    const sortedIngredients = ingredients
      .map((ing) => ing.toLowerCase().trim())
      .sort()
      .join("|");

    // Simple hash function
    let hash = 0;
    for (let i = 0; i < sortedIngredients.length; i++) {
      const char = sortedIngredients.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }
}
