import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import { Recipe } from '../types/Recipe';
import { RevenueCatService } from './RevenueCatService';
import { Logger } from '../services/LoggerService';

const FAVORITES_KEY = 'user_favorites';
const FREE_FAVORITES_LIMIT = 3; // Ücretsiz kullanıcılar için limit

export class FavoritesService {
  private static deviceId: string | null = null;

  // Get or generate device ID for user identification
  private static async getDeviceId(): Promise<string> {
    if (this.deviceId) {
      return this.deviceId;
    }

    try {
      // Try to get stored device ID first
      let deviceId = await AsyncStorage.getItem('device_id');

      if (!deviceId) {
        // Generate new device ID using device info
        const deviceName = Device.deviceName || 'unknown';
        const modelName = Device.modelName || 'unknown';
        const timestamp = Date.now();

        deviceId = `${deviceName}_${modelName}_${timestamp}`.replace(
          /[^a-zA-Z0-9_]/g,
          '_'
        );

        // Store for future use
        await AsyncStorage.setItem('device_id', deviceId);
      }

      this.deviceId = deviceId;
      return deviceId;
    } catch (error) {
      console.error('Error getting device ID:', error);
      // Fallback to timestamp-based ID
      const fallbackId = `device_${Date.now()}`;
      this.deviceId = fallbackId;
      return fallbackId;
    }
  }

  // Get all favorites from AsyncStorage
  private static async getFavoritesFromStorage(): Promise<Recipe[]> {
    try {
      const favoritesJson = await AsyncStorage.getItem(FAVORITES_KEY);
      if (!favoritesJson) {
        return [];
      }
      const favorites = JSON.parse(favoritesJson);
      return Array.isArray(favorites) ? favorites : [];
    } catch (error) {
      console.error('Error reading favorites from storage:', error);
      return [];
    }
  }

  // Save favorites to AsyncStorage
  private static async saveFavoritesToStorage(
    favorites: Recipe[]
  ): Promise<boolean> {
    try {
      const favoritesJson = JSON.stringify(favorites);
      await AsyncStorage.setItem(FAVORITES_KEY, favoritesJson);
      return true;
    } catch (error) {
      console.error('Error saving favorites to storage:', error);
      return false;
    }
  }

  // Check if user can add more favorites
  static async canAddFavorite(): Promise<{
    canAdd: boolean;
    message?: string;
  }> {
    try {
      // Check if user is premium
      const premiumStatus = await RevenueCatService.getPremiumStatus();
      const isPremium = premiumStatus.isPremium;
      if (isPremium) {
        return { canAdd: true };
      }

      // Free user - check limit
      const favorites = await this.getFavoritesFromStorage();
      const currentCount = favorites.length;

      if (currentCount >= FREE_FAVORITES_LIMIT) {
        return {
          canAdd: false,
          message: `Ücretsiz kullanıcılar en fazla ${FREE_FAVORITES_LIMIT} tarif kaydedebilir. Premium'a geçin!`,
        };
      }

      return { canAdd: true };
    } catch (error) {
      console.error('Error checking favorite limit:', error);
      return { canAdd: false, message: 'Bir hata oluştu.' };
    }
  }

  // Add recipe to favorites
  static async addToFavorites(
    recipe: Recipe
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const favorites = await this.getFavoritesFromStorage();

      // Check if already exists
      const existingIndex = favorites.findIndex(fav => fav.id === recipe.id);
      if (existingIndex >= 0) {
        // Update existing favorite
        favorites[existingIndex] = { ...recipe, isFavorite: true };
        const success = await this.saveFavoritesToStorage(favorites);
        return {
          success,
          message: success
            ? 'Tarif favorilerinizde güncellendi.'
            : 'Güncellenirken hata oluştu.',
        };
      }

      // Check limit for new additions
      const limitCheck = await this.canAddFavorite();
      if (!limitCheck.canAdd) {
        return { success: false, message: limitCheck.message };
      }

      // Add new favorite
      favorites.push({ ...recipe, isFavorite: true });
      const success = await this.saveFavoritesToStorage(favorites);

      return {
        success,
        message: success
          ? 'Tarif favorilerinize eklendi!'
          : 'Eklenirken hata oluştu.',
      };
    } catch (error) {
      console.error('Error in addToFavorites:', error);
      return { success: false, message: 'Bir hata oluştu.' };
    }
  }

  // Remove recipe from favorites
  static async removeFromFavorites(recipeId: string): Promise<boolean> {
    try {
      const favorites = await this.getFavoritesFromStorage();
      const filteredFavorites = favorites.filter(fav => fav.id !== recipeId);
      return await this.saveFavoritesToStorage(filteredFavorites);
    } catch (error) {
      console.error('Error in removeFromFavorites:', error);
      return false;
    }
  }

  // Toggle favorite status
  static async toggleFavorite(
    recipe: Recipe
  ): Promise<{ success: boolean; message?: string; isAdded?: boolean }> {
    try {
      const isFavorite = await this.isFavorite(recipe.id);

      if (isFavorite) {
        const success = await this.removeFromFavorites(recipe.id);
        return {
          success,
          isAdded: false,
          message: success
            ? 'Tarif favorilerden çıkarıldı.'
            : 'Çıkarılırken hata oluştu.',
        };
      } else {
        const result = await this.addToFavorites(recipe);
        return {
          success: result.success,
          isAdded: result.success,
          message: result.message,
        };
      }
    } catch (error) {
      console.error('Error in toggleFavorite:', error);
      return { success: false, message: 'Bir hata oluştu.' };
    }
  }

  // Check if recipe is favorite
  static async isFavorite(recipeId: string): Promise<boolean> {
    try {
      const favorites = await this.getFavoritesFromStorage();
      return favorites.some(fav => fav.id === recipeId);
    } catch (error) {
      console.error('Error in isFavorite:', error);
      return false;
    }
  }

  // Get all favorite recipes
  static async getFavoriteRecipes(): Promise<Recipe[]> {
    try {
      const favorites = await this.getFavoritesFromStorage();

      // Filter out recipes without valid IDs and fix malformed recipes
      const validFavorites = favorites
        .filter(recipe => recipe && typeof recipe === 'object')
        .map(recipe => {
          // If recipe doesn't have an id, generate one
          if (!recipe.id) {
            recipe.id = `recipe-${Date.now()}-${Math.random()
              .toString(36)
              .substr(2, 9)}`;
          }

          // Ensure required fields exist
          if (!recipe.name) {
            recipe.name = 'İsimsiz Tarif';
          }

          if (!recipe.ingredients || !Array.isArray(recipe.ingredients)) {
            recipe.ingredients = [];
          }

          if (!recipe.instructions || !Array.isArray(recipe.instructions)) {
            recipe.instructions = ['Tarif adımları mevcut değil'];
          }

          return { ...recipe, isFavorite: true };
        });

      // If we had to fix recipes, save the corrected data back
      if (
        validFavorites.length !== favorites.length ||
        validFavorites.some((recipe, index) => !favorites[index]?.id)
      ) {
        await this.saveFavoritesToStorage(validFavorites);
      }

      return validFavorites;
    } catch (error) {
      console.error('Error in getFavoriteRecipes:', error);
      return [];
    }
  }

  // Get favorite count
  static async getFavoriteCount(): Promise<number> {
    try {
      const favorites = await this.getFavoritesFromStorage();
      return favorites.length;
    } catch (error) {
      console.error('Error in getFavoriteCount:', error);
      return 0;
    }
  }

  // Get remaining favorite slots for free users
  static async getRemainingFavoriteSlots(isPremium: boolean): Promise<number> {
    try {
      if (isPremium) {
        return Infinity; // Unlimited for premium
      }

      const currentCount = await this.getFavoriteCount();
      return Math.max(0, FREE_FAVORITES_LIMIT - currentCount);
    } catch (error) {
      console.error('Error getting remaining slots:', error);
      return 0;
    }
  }

  // Update recipe data in favorites (in case recipe details change)
  static async updateFavoriteRecipe(recipe: Recipe): Promise<boolean> {
    try {
      const favorites = await this.getFavoritesFromStorage();
      const existingIndex = favorites.findIndex(fav => fav.id === recipe.id);

      if (existingIndex >= 0) {
        favorites[existingIndex] = { ...recipe, isFavorite: true };
        return await this.saveFavoritesToStorage(favorites);
      }

      return false; // Recipe not found in favorites
    } catch (error) {
      console.error('Error in updateFavoriteRecipe:', error);
      return false;
    }
  }

  // Clear all favorites for current device (useful for testing)
  static async clearAllFavorites(): Promise<boolean> {
    try {
      await AsyncStorage.removeItem(FAVORITES_KEY);
      return true;
    } catch (error) {
      console.error('Error in clearAllFavorites:', error);
      return false;
    }
  }

  // Export favorites (for backup or sharing)
  static async exportFavorites(): Promise<string | null> {
    try {
      const favorites = await this.getFavoritesFromStorage();
      return JSON.stringify(favorites, null, 2);
    } catch (error) {
      console.error('Error in exportFavorites:', error);
      return null;
    }
  }

  // Import favorites (from backup)
  static async importFavorites(favoritesJson: string): Promise<boolean> {
    try {
      const favorites = JSON.parse(favoritesJson);
      if (Array.isArray(favorites)) {
        return await this.saveFavoritesToStorage(favorites);
      }
      return false;
    } catch (error) {
      console.error('Error in importFavorites:', error);
      return false;
    }
  }

  // Get free favorites limit
  static getFreeFavoritesLimit(): number {
    return FREE_FAVORITES_LIMIT;
  }
}
