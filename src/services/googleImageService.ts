export interface GoogleImageItem {
  link: string;
  image?: {
    contextLink?: string;
    height?: number;
    width?: number;
    byteSize?: number;
    thumbnailLink?: string;
    thumbnailHeight?: number;
    thumbnailWidth?: number;
  };
}

export interface GoogleImageSearchResponse {
  items?: GoogleImageItem[];
  error?: { message?: string };
}

export class GoogleImageService {
  private static readonly API_URL =
    'https://www.googleapis.com/customsearch/v1';
  private static readonly API_KEY =
    process.env.EXPO_PUBLIC_GOOGLE_CUSTOM_SEARCH_API_KEY;
  private static readonly CSE_ID = process.env.EXPO_PUBLIC_GOOGLE_CSE_ID; // cx

  /**
   * Google Custom Search ile görsel arama (image)
   */
  static async searchImageUrl(query: string): Promise<string | null> {
    try {
      if (!this.API_KEY || !this.CSE_ID) {
        console.warn(
          '⚠️ Google CSE yapılandırması eksik (API_KEY veya CSE_ID).'
        );
        return null;
      }

      const params = new URLSearchParams({
        key: this.API_KEY,
        cx: this.CSE_ID,
        q: query,
        searchType: 'image',
        num: '1',
        safe: 'active',
        imgSize: 'large',
      });

      const url = `${this.API_URL}?${params.toString()}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Google CSE error: ${response.status}`);
      }

      const data: GoogleImageSearchResponse = await response.json();
      if (data?.items && data.items.length > 0) {
        return data.items[0].link;
      }

      return null;
    } catch (error) {
      console.error('❌ GoogleImageService Error:', error);
      return null;
    }
  }

  /**
   * Birden fazla görsel URL getirir
   */
  static async searchMultipleImageUrls(
    query: string,
    count: number = 3
  ): Promise<string[]> {
    try {
      if (!this.API_KEY || !this.CSE_ID) {
        console.warn(
          '⚠️ Google CSE yapılandırması eksik (API_KEY veya CSE_ID).'
        );
        return [];
      }

      const clamped = Math.max(1, Math.min(count, 10));
      const params = new URLSearchParams({
        key: this.API_KEY,
        cx: this.CSE_ID,
        q: query,
        searchType: 'image',
        num: String(clamped),
        safe: 'active',
        imgSize: 'large',
      });

      const url = `${this.API_URL}?${params.toString()}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Google CSE error: ${response.status}`);
      }

      const data: GoogleImageSearchResponse = await response.json();
      return (data.items || []).map(item => item.link).filter(Boolean);
    } catch (error) {
      console.error('❌ GoogleImageService (multiple) Error:', error);
      return [];
    }
  }
}
