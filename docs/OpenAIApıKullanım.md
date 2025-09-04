● 📊 OPENAI API KULLANIM RAPORU - YemekbulAI

🔄 MEVCUT AKIŞ ANALİZİ

1. GÖNDERİLEN PARAMETRELER (Request)

RecipeGenerationRequest Interface:

{ ingredients: string[] // Zorunlu - Ana malzemeler language?: 'tr' | 'en' // Dil seçimi mealTime?:
string // Öğün zamanı (kahvaltı/öğle/akşam/atıştırmalık) userProfile?: { dietaryRestrictions:
string[] // Diyet kısıtlamaları favoriteCategories: string[] // Favori mutfaklar cookingLevel:
string // Yemek yapma seviyesi recipeHistory: number // Daha önce kaç tarif denemiş } preferences?:
{ difficulty?: string // Zorluk seviyesi cookingTime?: number // Max pişirme süresi (dakika)
servings?: number // Porsiyon sayısı dietary?: string[] // Ek diyet tercihleri cuisine?: string //
Mutfak türü } excludeIngredients?: string[] // Kullanılmaması gereken malzemeler }

OpenAI'ya Gönderilen Parametreler:

{ "model": "gpt-3.5-turbo", "messages": [ { "role": "system", "content": "Uzman şef system prompt"
}, { "role": "user", "content": "Detaylı tarif isteği" } ], "max_tokens": 2000, "temperature": 0.8,
"response_format": { "type": "json_object" } }

2. OPENAI'DAN GELEN YANITLAR (Response)

AI'dan Dönen Recipe Objesi:

{ "recipes": [ { "name": "Tarif Adı", "description": "Kısa açıklama (max 100 karakter)",
"ingredients": ["malzeme listesi"], "instructions": ["adım adım tarif"], "preparationTime": 15,
"servings": 2, "difficulty": "kolay/orta/zor", "category": "ana_yemek", "imageSearchTerm": "arama
terimi", "imageUrl": "resim URL", "recommendationType": "preference/discovery",
"recommendationReason": "Öneri sebebi", "tips": "İpuçları" } ] }

OpenAI API Response Metadata:

{ "usage": { "total_tokens": 1500, "prompt_tokens": 500, "completion_tokens": 1000 }, "choices": [{
"message": { "content": "JSON formatted recipe" } }] }

🚀 GELİŞTİRME ÖNERİLERİ

1. YENİ PARAMETRELER EKLEYEBİLİRSİNİZ:

A. Beslenme Bilgileri

nutritionPreferences?: { maxCalories?: number // Maksimum kalori minProtein?: number // Minimum
protein (gram) maxCarbs?: number // Maksimum karbonhidrat maxFat?: number // Maksimum yağ
lowSodium?: boolean // Düşük tuz highFiber?: boolean // Yüksek lif }

B. Bütçe ve Maliyet

budgetPreferences?: { costLevel?: 'ekonomik' | 'orta' | 'lüks' maxCostPerServing?: number //
Porsiyon başı maliyet preferLocalIngredients?: boolean }

C. Ekipman ve Teknik

equipmentAvailable?: { hasOven?: boolean hasMicrowave?: boolean hasAirFryer?: boolean
hasInstantPot?: boolean hasSousVide?: boolean }

cookingMethods?: string[] // ['kızartma', 'haşlama', 'ızgara', 'buhar']

D. Özel Durumlar

specialOccasion?: { type?: 'doğum günü' | 'romantik' | 'parti' | 'piknik' season?: 'yaz' | 'kış' |
'ilkbahar' | 'sonbahar' weather?: 'sıcak' | 'soğuk' | 'yağmurlu' }

allergies?: { nuts?: boolean dairy?: boolean gluten?: boolean seafood?: boolean eggs?: boolean }

2. AI'DAN İSTEYEBİLECEĞİNİZ YENİ BİLGİLER:

A. Detaylı Beslenme Analizi

nutrition?: { calories: number protein: number carbs: number fat: number fiber: number sugar: number
sodium: number vitamins?: string[] minerals?: string[] }

B. Maliyet Tahmini

costEstimate?: { totalCost: number costPerServing: number expensiveIngredients?: string[]
budgetAlternatives?: string[] }

C. Saklama ve Meal Prep

storageInfo?: { refrigeratorDays: number freezerMonths: number reheatingInstructions?: string
mealPrepFriendly?: boolean }

D. Eşleştirme Önerileri

pairings?: { beverages?: string[] // İçecek önerileri sideDishes?: string[] // Yan yemek önerileri
desserts?: string[] // Tatlı önerileri wines?: string[] // Şarap önerileri }

E. Zorluk Detayları

skillsRequired?: { techniques: string[] // Gerekli teknikler difficultyBreakdown?: { prep: 'kolay' |
'orta' | 'zor' cooking: 'kolay' | 'orta' | 'zor' presentation: 'kolay' | 'orta' | 'zor' } }

3. MODEL VE PERFORMANS İYİLEŞTİRMELERİ:

A. Model Upgrade

// Mevcut: gpt-3.5-turbo // Önerilen alternatifleri: model: 'gpt-4' | 'gpt-4-turbo' |
'gpt-3.5-turbo-16k'

// Farklı görevler için farklı modeller: const models = { quickRecipes: 'gpt-3.5-turbo', // Hızlı
basit tarifler gourmetRecipes: 'gpt-4', // Detaylı gurme tarifler nutritionAnalysis: 'gpt-4-turbo'
// Beslenme analizi }

B. Token Optimizasyonu

// Dinamik token ayarlama maxTokens: { simple: 1000, // Basit tarifler detailed: 2000, // Detaylı
tarifler withNutrition: 2500 // Beslenme bilgili }

C. Temperature Ayarları

// Dinamik temperature temperature: { conservative: 0.5, // Klasik tarifler balanced: 0.7, //
Dengeli creative: 0.9 // Yaratıcı tarifler }

4. YENİ ÖZELLİKLER:

A. Çoklu Tarif Varyasyonları

variations?: { vegetarianVersion?: Recipe veganVersion?: Recipe glutenFreeVersion?: Recipe }

B. Adım Adım Görsel Talimatlar

visualInstructions?: { stepNumber: number imagePrompt: string // DALL-E için prompt technique:
string }

C. Video Referansları

videoReferences?: { youtubeTutorials?: string[] techniqueVideos?: string[] }

D. Sezonluk Varyasyonlar

seasonalVariations?: { spring?: string[] summer?: string[] autumn?: string[] winter?: string[] }

5. GELİŞMİŞ ANALİTİK VE TAKİP:

analytics?: { popularityScore: number // 0-100 popülerlik healthScore: number // 0-100 sağlık skoru
sustainabilityScore: number // Sürdürülebilirlik authenticity: number // Otantiklik skoru
userRatings?: { taste: number difficulty: number value: number } }

6. PROMPT MÜHENDİSLİĞİ İYİLEŞTİRMELERİ:

// Daha detaylı context sağlama contextEnhancements?: { userCookingHistory?: Recipe[] // Son
tarifleri kitchenInventory?: string[] // Mutfak envanteri previousFeedback?: string[] // Önceki geri
bildirimler culturalPreferences?: string[] // Kültürel tercihler }

📈 PERFORMANS OPTİMİZASYONU ÖNERİLERİ

1. Response Caching: Benzer istekler için önbellekleme
2. Batch Processing: Toplu tarif üretimi
3. Stream Response: Büyük yanıtlar için streaming
4. Fallback Strategies: Hata durumları için yedek planlar
5. Rate Limiting: API kullanım optimizasyonu

🔒 GÜVENLİK İYİLEŞTİRMELERİ

1. Input Validation: Girdi doğrulama katmanı
2. Content Filtering: İçerik filtreleme
3. PII Protection: Kişisel veri koruması
4. API Key Rotation: Düzenli anahtar yenileme
5. Request Signing: İstek imzalama

Bu geliştirmelerle uygulamanız çok daha zengin, kişiselleştirilmiş ve profesyonel tarif önerileri
sunabilir.  
 Her yeni parametre, kullanıcı deneyimini artırırken AI'dan daha değerli içgörüler almanızı
sağlayacaktır. Peki ş
