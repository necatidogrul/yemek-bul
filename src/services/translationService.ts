// Translation Service for Turkish <-> English ingredient conversion
export class TranslationService {
  // Türkçe -> İngilizce malzeme çeviri sözlüğü
  private static readonly turkishToEnglish: Record<string, string> = {
    // Temel malzemeler
    domates: "tomato",
    soğan: "onion",
    sarımsak: "garlic",
    biber: "pepper",
    "yeşil biber": "green pepper",
    "kırmızı biber": "red pepper",
    "sivri biber": "hot pepper",
    patlıcan: "eggplant",
    kabak: "zucchini",
    havuç: "carrot",
    patates: "potato",
    salatalık: "cucumber",

    // Et ve protein
    tavuk: "chicken",
    "tavuk eti": "chicken meat",
    "tavuk göğsü": "chicken breast",
    kıyma: "ground beef",
    "dana eti": "beef",
    "kuzu eti": "lamb",
    balık: "fish",
    "ton balığı": "tuna",
    somon: "salmon",
    yumurta: "egg",
    "beyaz peynir": "white cheese",
    "kaşar peyniri": "cheddar cheese",
    peynir: "cheese",

    // Tahıllar ve bakliyat
    pirinç: "rice",
    bulgur: "bulgur",
    makarna: "pasta",
    un: "flour",
    nohut: "chickpea",
    fasulye: "bean",
    mercimek: "lentil",
    "kırmızı mercimek": "red lentil",
    "yeşil mercimek": "green lentil",

    // Baharat ve otlar
    tuz: "salt",
    karabiber: "black pepper",
    "kırmızı pul biber": "red pepper flakes",
    kimyon: "cumin",
    nane: "mint",
    maydanoz: "parsley",
    dereotu: "dill",
    kekik: "thyme",
    fesleğen: "basil",
    "defne yaprağı": "bay leaf",
    tarçın: "cinnamon",
    zerdeçal: "turmeric",
    köri: "curry",

    // Süt ürünleri
    süt: "milk",
    yoğurt: "yogurt",
    tereyağı: "butter",
    krema: "cream",
    labne: "labneh",

    // Yağlar ve sirke
    zeytinyağı: "olive oil",
    "ayçiçek yağı": "sunflower oil",
    sirke: "vinegar",
    "elma sirkesi": "apple cider vinegar",

    // Sebzeler
    lahana: "cabbage",
    "beyaz lahana": "white cabbage",
    "kırmızı lahana": "red cabbage",
    ıspanak: "spinach",
    roka: "arugula",
    marul: "lettuce",
    semizotu: "purslane",
    turp: "radish",
    pancar: "beetroot",
    kereviz: "celery",
    brokoli: "broccoli",
    karnabahar: "cauliflower",

    // Meyveler
    elma: "apple",
    armut: "pear",
    muz: "banana",
    portakal: "orange",
    limon: "lemon",
    greyfurt: "grapefruit",
    üzüm: "grape",
    çilek: "strawberry",
    kiraz: "cherry",
    kayısı: "apricot",
    şeftali: "peach",
    karpuz: "watermelon",
    kavun: "melon",

    // Kuruyemişler ve tohumlar
    ceviz: "walnut",
    badem: "almond",
    fındık: "hazelnut",
    fıstık: "pistachio",
    susam: "sesame",
    "ayçiçeği çekirdeği": "sunflower seed",
    "kabak çekirdeği": "pumpkin seed",

    // Diğer
    şeker: "sugar",
    bal: "honey",
    reçel: "jam",
    zeytin: "olive",
    "yeşil zeytin": "green olive",
    "siyah zeytin": "black olive",
    turşu: "pickle",
    çay: "tea",
    kahve: "coffee",
    su: "water",
  };

  // İngilizce -> Türkçe çeviri sözlüğü (ters çeviri için)
  private static readonly englishToTurkish: Record<string, string> = {};

  // Statik constructor - ters çeviri sözlüğünü oluştur
  static {
    Object.entries(this.turkishToEnglish).forEach(([turkish, english]) => {
      this.englishToTurkish[english.toLowerCase()] = turkish;
    });
  }

  /**
   * Türkçe malzeme adını İngilizceye çevirir
   */
  static translateToEnglish(turkishIngredient: string): string {
    const cleaned = turkishIngredient.toLowerCase().trim();

    // Direkt eşleşme ara
    if (this.turkishToEnglish[cleaned]) {
      return this.turkishToEnglish[cleaned];
    }

    // Kısmi eşleşme ara (kelime içinde geçiyor mu?)
    for (const [turkish, english] of Object.entries(this.turkishToEnglish)) {
      if (cleaned.includes(turkish) || turkish.includes(cleaned)) {
        return english;
      }
    }

    // Çeviri bulunamazsa orijinal metni döndür
    return turkishIngredient;
  }

  /**
   * İngilizce malzeme adını Türkçeye çevirir
   */
  static translateToTurkish(englishIngredient: string): string {
    const cleaned = englishIngredient.toLowerCase().trim();

    // Direkt eşleşme ara
    if (this.englishToTurkish[cleaned]) {
      return this.englishToTurkish[cleaned];
    }

    // Kısmi eşleşme ara
    for (const [english, turkish] of Object.entries(this.englishToTurkish)) {
      if (cleaned.includes(english) || english.includes(cleaned)) {
        return turkish;
      }
    }

    // Çeviri bulunamazsa orijinal metni döndür
    return englishIngredient;
  }

  /**
   * Malzeme listesini Türkçe'den İngilizce'ye çevirir
   */
  static translateIngredientsToEnglish(turkishIngredients: string[]): string[] {
    return turkishIngredients.map((ingredient) =>
      this.translateToEnglish(ingredient)
    );
  }

  /**
   * Malzeme listesini İngilizce'den Türkçe'ye çevirir
   */
  static translateIngredientsToTurkish(englishIngredients: string[]): string[] {
    return englishIngredients.map((ingredient) =>
      this.translateToTurkish(ingredient)
    );
  }

  /**
   * Yeni çeviri ekleme (gelecekte genişletme için)
   */
  static addTranslation(turkish: string, english: string) {
    this.turkishToEnglish[turkish.toLowerCase().trim()] = english
      .toLowerCase()
      .trim();
    this.englishToTurkish[english.toLowerCase().trim()] = turkish
      .toLowerCase()
      .trim();
  }

  /**
   * Çeviri sözlüğünde malzeme var mı kontrol et
   */
  static hasTranslation(
    ingredient: string,
    fromTurkish: boolean = true
  ): boolean {
    const cleaned = ingredient.toLowerCase().trim();
    if (fromTurkish) {
      return this.turkishToEnglish.hasOwnProperty(cleaned);
    } else {
      return this.englishToTurkish.hasOwnProperty(cleaned);
    }
  }

  /**
   * Mevcut tüm Türkçe malzemeleri listele
   */
  static getAllTurkishIngredients(): string[] {
    return Object.keys(this.turkishToEnglish);
  }

  /**
   * Mevcut tüm İngilizce malzemeleri listele
   */
  static getAllEnglishIngredients(): string[] {
    return Object.values(this.turkishToEnglish);
  }
}
