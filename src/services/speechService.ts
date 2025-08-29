import * as Speech from 'expo-speech';
import { Platform, Alert } from 'react-native';
import { Logger } from '../services/LoggerService';

interface SpeechState {
  isListening: boolean;
  isAvailable: boolean;
}

export class SpeechService {
  private static speechState: SpeechState = {
    isListening: false,
    isAvailable: true, // Text-to-speech is always available
  };

  /**
   * Speech servisi başlat (sadece text-to-speech)
   */
  static async initialize(): Promise<boolean> {
    try {
      this.speechState.isAvailable = true;
      console.log('🎤 Speech service initialized: Text-to-speech available');
      return true;
    } catch (error) {
      console.error('❌ Speech service initialization failed:', error);
      return false;
    }
  }

  /**
   * Sesli giriş başlat (sadece UI feedback)
   */
  static async startListening(): Promise<void> {
    this.speechState.isListening = true;
    console.log('🎤 Speech listening UI started (text-to-speech only)');
  }

  /**
   * Sesli girişi durdur
   */
  static async stopListening(): Promise<void> {
    this.speechState.isListening = false;
    console.log('🛑 Speech listening UI stopped');
  }

  /**
   * Sesli girişi iptal et
   */
  static async cancelListening(): Promise<void> {
    this.speechState.isListening = false;
    console.log('❌ Speech listening cancelled');
  }

  /**
   * Metni sesli okuma
   */
  static speak(
    text: string,
    options?: {
      language?: string;
      pitch?: number;
      rate?: number;
    }
  ): void {
    const speechOptions = {
      language: options?.language || 'tr-TR',
      pitch: options?.pitch || 1.0,
      rate: options?.rate || 0.8,
    };

    Speech.speak(text, speechOptions);
  }

  /**
   * Sesli okumayı durdur
   */
  static stopSpeaking(): void {
    Speech.stop();
  }

  /**
   * Sesli komuttan malzeme çıkarma (gelişmiş)
   */
  static extractIngredientsFromText(text: string): string[] {
    if (!text || typeof text !== 'string') {
      return [];
    }

    // Türkçe malzemeler sözlüğü (genişletilmiş)
    const ingredientDictionary = [
      // Sebzeler
      'domates',
      'salçalık',
      'köy domatesi',
      'cherry domates',
      'soğan',
      'kuru soğan',
      'taze soğan',
      'yeşil soğan',
      'sarımsak',
      'taze sarımsak',
      'biber',
      'yeşil biber',
      'kırmızı biber',
      'sivri biber',
      'dolma biber',
      'çarliston biber',
      'patates',
      'taze patates',
      'haşlama patates',
      'havuç',
      'taze havuç',
      'kabak',
      'sakız kabağı',
      'beyaz kabak',
      'pırasa',
      'taze pırasa',
      'ıspanak',
      'taze ıspanak',
      'dondurulmuş ıspanak',
      'lahana',
      'beyaz lahana',
      'kırmızı lahana',
      'brokoli',
      'karnabahar',
      'kereviz',
      'kereviz sapı',
      'marul',
      'roka',
      'maydanoz',
      'dereotu',
      'nane',
      'fesleğen',
      'kekik',

      // Etler
      'kıyma',
      'dana kıyma',
      'kuzu kıyma',
      'karışık kıyma',
      'tavuk',
      'tavuk eti',
      'tavuk göğsü',
      'tavuk but',
      'et',
      'dana eti',
      'kuzu eti',
      'sığır eti',
      'balık',
      'ton balığı',
      'somon',
      'levrek',
      'çipura',

      // Tahıllar ve Karbonhidratlar
      'pirinç',
      'baldo pirinç',
      'osmancık pirinç',
      'bulgur',
      'köftelik bulgur',
      'pilavlık bulgur',
      'makarna',
      'spagetti',
      'penne',
      'fırın makarnası',
      'nohut',
      'kuru nohut',
      'haşlanmış nohut',
      'mercimek',
      'kırmızı mercimek',
      'yeşil mercimek',
      'fasulye',
      'kuru fasulye',
      'barbunya',
      'börülce',

      // Süt Ürünleri
      'yumurta',
      'tavuk yumurtası',
      'süt',
      'tam yağlı süt',
      'yarım yağlı süt',
      'yoğurt',
      'süzme yoğurt',
      'kefir',
      'peynir',
      'beyaz peynir',
      'kaşar peyniri',
      'tulum peyniri',
      'feta peynir',
      'tereyağı',
      'margarin',
      'krema',
      'krema şanti',

      // Yağlar ve Soslar
      'zeytinyağı',
      'sızma zeytinyağı',
      'sıvıyağ',
      'ayçiçek yağı',
      'salça',
      'domates salçası',
      'biber salçası',
      'sos',
      'soya sosu',
      'barbekü sos',
      'sirke',
      'elma sirkesi',
      'üzüm sirkesi',

      // Baharatlar
      'tuz',
      'deniz tuzu',
      'sofra tuzu',
      'karabiber',
      'taze çekilmiş karabiber',
      'kırmızı biber',
      'pul biber',
      'acı biber',
      'kimyon',
      'kişniş',
      'köri',
      'tarçın',
      'karanfil',
      'defne yaprağı',

      // Meyveler
      'limon',
      'taze limon',
      'limon suyu',
      'portakal',
      'portakal suyu',
      'elma',
      'yeşil elma',
      'kırmızı elma',
      'muz',
      'olgun muz',
      'çilek',
      'taze çilek',
      'üzüm',
      'kuru üzüm',
      'sultani üzüm',
      'armut',
      'ankara armut',

      // Diğerleri
      'ekmek',
      'taze ekmek',
      'bayat ekmek',
      'lavaş',
      'yufka',
      'tortilla',
      'pide',
      'ramazan pidesi',
      'çikolata',
      'bitter çikolata',
      'sütlü çikolata',
      'bal',
      'çiçek balı',
      'kestane balı',
      'reçel',
      'çilek reçeli',
      'kayısı reçeli',
      'turşu',
      'karışık turşu',
      'zeytin',
      'yeşil zeytin',
      'siyah zeytin',
    ];

    const lowerText = text
      .toLowerCase()
      .replace(/[.,;:!?]/g, ' ') // Noktalama işaretlerini temizle
      .replace(/\s+/g, ' ') // Çoklu boşlukları tek boşluk yap
      .trim();

    const foundIngredients = new Set<string>(); // Duplicate önlemek için Set kullan

    // Uzun malzemelerden başla (daha spesifik eşleşmeler için)
    const sortedIngredients = ingredientDictionary.sort(
      (a, b) => b.length - a.length
    );

    sortedIngredients.forEach(ingredient => {
      if (lowerText.includes(ingredient)) {
        foundIngredients.add(ingredient);
      }
    });

    const result = Array.from(foundIngredients);
    console.log('🔍 Extracted ingredients from speech:', result);
    return result;
  }

  /**
   * Sesli giriş simülasyonu (Expo managed workflow'da gerçek speech-to-text yok)
   */
  static async speechToText(options?: {
    maxDuration?: number;
    partialResultsCallback?: (partialResults: string[]) => void;
  }): Promise<string[]> {
    return new Promise((resolve, reject) => {
      // Expo managed workflow'da gerçek speech-to-text desteklenmiyor
      // Kullanıcıya manuel giriş yapması için yönlendirme
      reject(
        new Error(
          'Sesli giriş özelliği şu anda desteklenmiyor. Lütfen malzemelerinizi manuel olarak girin.'
        )
      );
    });
  }

  // Getter methods
  static get isListening(): boolean {
    return this.speechState.isListening;
  }

  static get isAvailable(): boolean {
    return this.speechState.isAvailable;
  }

  /**
   * Service'i temizle
   */
  static async cleanup(): Promise<void> {
    try {
      if (this.speechState.isListening) {
        await this.stopListening();
      }
      console.log('🧹 Speech service cleaned up');
    } catch (error) {
      console.error('❌ Speech cleanup error:', error);
    }
  }
}
