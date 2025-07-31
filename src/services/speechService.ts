import * as Speech from "expo-speech";
// React Native'de built-in speech-to-text yok, bu yüzden manuel bir çözüm yapacağız

export class SpeechService {
  // Metni sesli okuma
  static speak(text: string): void {
    Speech.speak(text, {
      language: "tr-TR",
      pitch: 1.0,
      rate: 0.8,
    });
  }

  // Sesli komuttan malzeme çıkarma (basit keyword matching)
  static extractIngredientsFromText(text: string): string[] {
    const commonIngredients = [
      "domates",
      "soğan",
      "sarımsak",
      "biber",
      "patates",
      "havuç",
      "kabak",
      "pırasa",
      "ıspanak",
      "kıyma",
      "tavuk",
      "et",
      "balık",
      "ton",
      "dana",
      "kuzu",
      "pirinç",
      "bulgur",
      "makarna",
      "nohut",
      "mercimek",
      "fasulye",
      "yumurta",
      "süt",
      "yoğurt",
      "peynir",
      "tereyağı",
      "zeytinyağı",
      "sıvıyağ",
      "un",
      "şeker",
      "tuz",
      "karabiber",
      "kırmızıbiber",
      "kimyon",
      "nane",
      "maydanoz",
      "dereotu",
      "fesleğen",
      "kekik",
      "salça",
      "sos",
      "sirke",
      "limon",
      "portakal",
      "elma",
      "muz",
      "çilek",
      "üzüm",
      "armut",
      "ekmek",
      "lavaş",
      "pide",
      "börek",
      "pasta",
      "çikolata",
      "bal",
      "reçel",
      "turşu",
      "zeytin",
      "peynir",
      "kaşar",
      "beyaz peynir",
    ];

    const lowerText = text.toLowerCase();
    const foundIngredients: string[] = [];

    commonIngredients.forEach((ingredient) => {
      if (lowerText.includes(ingredient)) {
        foundIngredients.push(ingredient);
      }
    });

    return foundIngredients;
  }

  // Sesli giriş simülasyonu (gerçek uygulamada 3rd party API kullanılacak)
  static async simulateSpeechToText(mockText?: string): Promise<string[]> {
    // Gerçek uygulamada burada sesli giriş API'si çağrılacak
    // Şu an için test amaçlı mock veri döndürüyoruz
    const simulatedText = mockText || "Evde domates soğan kıyma var";

    return new Promise((resolve) => {
      setTimeout(() => {
        const ingredients = this.extractIngredientsFromText(simulatedText);
        resolve(ingredients);
      }, 1500); // 1.5 saniye gecikme simülasyonu
    });
  }

  // Daha sonra entegre edilecek gerçek speech-to-text servisi
  static async speechToText(): Promise<string[]> {
    try {
      // Bu alan daha sonra gerçek speech-to-text API'si ile doldurulacak
      // Örneğin: Google Speech-to-Text, Microsoft Cognitive Services, vs.

      // Şu an için simülasyon kullanıyoruz
      return await this.simulateSpeechToText();
    } catch (error) {
      console.error("Speech to text error:", error);
      return [];
    }
  }
}
