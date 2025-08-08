import { Recipe } from '../types/Recipe';

export const MOCK_RECIPES: Recipe[] = [
  {
    id: "1",
    name: "Menemen",
    description: "Geleneksel Türk kahvaltısının vazgeçilmezi menemen",
    ingredients: ["domates", "biber", "soğan", "yumurta", "zeytinyağı", "tuz", "karabiber"],
    instructions: [
      "Zeytinyağını tavada ısıtın",
      "Soğanları kavurun",
      "Biberleri ekleyin ve kavurun", 
      "Domatesleri ekleyin ve pişirin",
      "Yumurtaları kırın ve karıştırın",
      "Tuz ve karabiber ekleyin"
    ],
    preparationTime: 15,
    servings: 2,
    difficulty: "kolay",
    category: "kahvaltı",
    imageUrl: "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400"
  },
  {
    id: "2", 
    name: "Mercimek Çorbası",
    description: "Besleyici ve lezzetli kırmızı mercimek çorbası",
    ingredients: ["kırmızı mercimek", "soğan", "havuç", "patates", "zeytinyağı", "tuz", "karabiber", "limon"],
    instructions: [
      "Sebzeleri doğrayın",
      "Zeytinyağında soğanları kavurun",
      "Havuç ve patatesleri ekleyin",
      "Mercimeği ekleyin ve su ile kapatın",
      "20 dakika kaynatın",
      "Blender ile püre yapın",
      "Tuz, karabiber ve limon ekleyin"
    ],
    preparationTime: 30,
    servings: 4,
    difficulty: "kolay",
    category: "çorba",
    imageUrl: "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400"
  },
  {
    id: "3",
    name: "Tavuk Sote",
    description: "Sebzeli tavuk sote, pratik ve lezzetli",
    ingredients: ["tavuk göğsü", "biber", "soğan", "domates", "zeytinyağı", "tuz", "karabiber", "kimyon"],
    instructions: [
      "Tavuk etini küp küp doğrayın",
      "Zeytinyağında tavukları kavurun",
      "Soğanları ekleyin",
      "Biberleri ekleyin",
      "Domatesleri ekleyin", 
      "Baharatları ekleyin ve pişirin"
    ],
    preparationTime: 25,
    servings: 3,
    difficulty: "orta",
    category: "ana_yemek",
    imageUrl: "https://images.unsplash.com/photo-1564834724105-918b73d1b9e0?w=400"
  },
  {
    id: "4",
    name: "Makarna",
    description: "Basit domates soslu makarna",
    ingredients: ["makarna", "domates", "soğan", "sarımsak", "zeytinyağı", "tuz", "karabiber", "fesleğen"],
    instructions: [
      "Makarnayı kaynar tuzlu suda haşlayın",
      "Zeytinyağında soğan ve sarımsağı kavurun",
      "Domatesleri ekleyin ve pişirin",
      "Haşlanan makarnayı ekleyin",
      "Baharatları ve fesleğeni ekleyin"
    ],
    preparationTime: 20,
    servings: 4,
    difficulty: "kolay",
    category: "ana_yemek",
    imageUrl: "https://images.unsplash.com/photo-1551782450-17144efb9c50?w=400"
  },
  {
    id: "5",
    name: "Omlet",
    description: "Peynirli omlet, hızlı kahvaltı seçeneği",
    ingredients: ["yumurta", "peynir", "tereyağı", "tuz", "karabiber"],
    instructions: [
      "Yumurtaları çırpın",
      "Tuz ve karabiber ekleyin",
      "Tavada tereyağını eritin",
      "Yumurtaları dökün",
      "Peyniri üzerine serpin",
      "Ikiye katlayın"
    ],
    preparationTime: 10,
    servings: 1,
    difficulty: "kolay", 
    category: "kahvaltı",
    imageUrl: "https://images.unsplash.com/photo-1506084868230-bb9d95c24759?w=400"
  },
  {
    id: "6",
    name: "Pilav",
    description: "Tereyağlı pirinç pilavı",
    ingredients: ["pirinç", "tereyağı", "su", "tuz"],
    instructions: [
      "Pirinci yıkayın",
      "Tavada tereyağını eritin",
      "Pirinci kavurun",
      "Sıcak su ekleyin",
      "Tuz ekleyin",
      "Kısık ateşte pişirin"
    ],
    preparationTime: 25,
    servings: 4,
    difficulty: "kolay",
    category: "ana_yemek",
    imageUrl: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400"
  },
  {
    id: "7",
    name: "Salata",
    description: "Taze mevsim salatası",
    ingredients: ["domates", "salatalık", "soğan", "maydanoz", "zeytinyağı", "limon", "tuz"],
    instructions: [
      "Sebzeleri yıkayın",
      "Domatesleri doğrayın",
      "Salatalığı dilimleyin",
      "Soğanı ince doğrayın",
      "Maydanozu kıyın",
      "Zeytinyağı, limon ve tuz ile harmanlayın"
    ],
    preparationTime: 10,
    servings: 4,
    difficulty: "kolay",
    category: "salata",
    imageUrl: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400"
  },
  {
    id: "8",
    name: "Köfte",
    description: "Ev yapımı köfte",
    ingredients: ["kıyma", "soğan", "ekmek içi", "yumurta", "maydanoz", "tuz", "karabiber", "kimyon"],
    instructions: [
      "Ekmek içini suda ıslatın",
      "Soğanı rendeleyin",
      "Tüm malzemeleri karıştırın",
      "Yuvarlak köfteler yapın",
      "Tavada kızartın",
      "Her tarafını çevirerek pişirin"
    ],
    preparationTime: 30,
    servings: 4,
    difficulty: "orta",
    category: "ana_yemek",
    imageUrl: "https://images.unsplash.com/photo-1529042410759-befb1204b468?w=400"
  },
  {
    id: "9",
    name: "Sucuklu Yumurta", 
    description: "Geleneksel Türk kahvaltısı",
    ingredients: ["sucuk", "yumurta", "zeytinyağı"],
    instructions: [
      "Sucuğu dilimleyin",
      "Tavada kızartın",
      "Yumurtaları kırın",
      "Sucukla beraber pişirin"
    ],
    preparationTime: 8,
    servings: 2,
    difficulty: "kolay",
    category: "kahvaltı",
    imageUrl: "https://images.unsplash.com/photo-1525755662312-1d6c2ebf7953?w=400"
  },
  {
    id: "10",
    name: "Patates Kızartması",
    description: "Çıtır patates kızartması",
    ingredients: ["patates", "ayçiçek yağı", "tuz"],
    instructions: [
      "Patatesleri soyun",
      "Çubuk şeklinde doğrayın",
      "Bol yağda kızartın",
      "Tuz serpin"
    ],
    preparationTime: 20,
    servings: 3,
    difficulty: "kolay",
    category: "aperatif",
    imageUrl: "https://images.unsplash.com/photo-1518013431117-eb1465fa5752?w=400"
  }
];