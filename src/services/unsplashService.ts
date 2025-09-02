import { Logger } from './LoggerService';

export interface UnsplashImage {
  id: string;
  width: number;
  height: number;
  color: string;
  description?: string;
  alt_description?: string;
  urls: {
    raw: string;
    full: string;
    regular: string;
    small: string;
    thumb: string;
  };
  user: {
    name: string;
    username: string;
  };
}

export interface UnsplashSearchResponse {
  total: number;
  total_pages: number;
  results: UnsplashImage[];
}

export class UnsplashService {
  private static readonly API_URL = 'https://api.unsplash.com';
  private static readonly ACCESS_KEY = process.env.EXPO_PUBLIC_UNSPLASH_API_KEY;

  /**
   * Yemek fotoğrafı ara
   */
  static async searchFoodImage(searchTerm: string): Promise<string | null> {
    try {
      if (!this.ACCESS_KEY) {
        Logger.warn('⚠️ Unsplash API key bulunamadı');
        // Temporary fallback for testing
        return 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop';
      }

      Logger.info('🔍 Unsplash: Fotoğraf aranıyor:', searchTerm);

      const response = await fetch(
        `${this.API_URL}/search/photos?query=${encodeURIComponent(searchTerm)}&page=1&per_page=1&orientation=landscape`,
        {
          headers: {
            Authorization: `Client-ID ${this.ACCESS_KEY}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Unsplash API error: ${response.status}`);
      }

      const data: UnsplashSearchResponse = await response.json();

      if (data.results && data.results.length > 0) {
        const image = data.results[0];
        Logger.info('✅ Unsplash: Fotoğraf bulundu:', image.urls.regular);
        return image.urls.regular;
      }

      Logger.info('❌ Unsplash: Fotoğraf bulunamadı:', searchTerm);
      // Fallback image when no results
      return this.getFallbackFoodImage(searchTerm);
    } catch (error) {
      Logger.error('❌ Unsplash API Error:', error);
      // Fallback image on error
      return this.getFallbackFoodImage(searchTerm);
    }
  }

  /**
   * Yemek kategorisine göre rastgele fotoğraf
   */
  static async getRandomFoodImage(
    category: string = 'food'
  ): Promise<string | null> {
    try {
      if (!this.ACCESS_KEY) {
        Logger.warn('⚠️ Unsplash API key bulunamadı');
        return null;
      }

      const response = await fetch(
        `${this.API_URL}/photos/random?query=${encodeURIComponent(category)}&orientation=landscape`,
        {
          headers: {
            Authorization: `Client-ID ${this.ACCESS_KEY}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Unsplash API error: ${response.status}`);
      }

      const image: UnsplashImage = await response.json();
      return image.urls.regular;
    } catch (error) {
      Logger.error('❌ Unsplash Random API Error:', error);
      return null;
    }
  }

  /**
   * Birden fazla fotoğraf seçeneği getir
   */
  static async searchMultipleFoodImages(
    searchTerm: string,
    count: number = 3
  ): Promise<string[]> {
    try {
      if (!this.ACCESS_KEY) {
        Logger.warn('⚠️ Unsplash API key bulunamadı');
        return [];
      }

      const response = await fetch(
        `${this.API_URL}/search/photos?query=${encodeURIComponent(searchTerm)}&page=1&per_page=${count}&orientation=landscape`,
        {
          headers: {
            Authorization: `Client-ID ${this.ACCESS_KEY}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Unsplash API error: ${response.status}`);
      }

      const data: UnsplashSearchResponse = await response.json();
      return data.results.map(image => image.urls.regular);
    } catch (error) {
      Logger.error('❌ Unsplash Multiple API Error:', error);
      return [];
    }
  }

  /**
   * Fallback yemek fotoğrafları
   */
  private static getFallbackFoodImage(searchTerm: string): string {
    const fallbackImages = [
      'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop', // Food preparation
      'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&h=300&fit=crop', // Pancakes
      'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop', // Pizza
      'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&h=300&fit=crop', // Burger
      'https://images.unsplash.com/photo-1563379091339-03246963d960?w=400&h=300&fit=crop', // Pasta
      'https://images.unsplash.com/photo-1572441713132-1a7e4c5b3bdc?w=400&h=300&fit=crop', // Salad
    ];

    // Arama terimine göre hash oluştur ve tutarlı bir resim seç
    let hash = 0;
    for (let i = 0; i < searchTerm.length; i++) {
      const char = searchTerm.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }

    const index = Math.abs(hash) % fallbackImages.length;
    return fallbackImages[index];
  }

  /**
   * API durumunu kontrol et
   */
  static async checkApiStatus(): Promise<boolean> {
    try {
      if (!this.ACCESS_KEY) {
        return false;
      }

      const response = await fetch(`${this.API_URL}/photos/random`, {
        headers: {
          Authorization: `Client-ID ${this.ACCESS_KEY}`,
        },
      });

      return response.ok;
    } catch (error) {
      Logger.error('❌ Unsplash API status check failed:', error);
      return false;
    }
  }
}
