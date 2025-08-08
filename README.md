# 🍳 Yemek Bulucu - AI Recipe Finder

> Transform your available ingredients into delicious Turkish meals with AI-powered recipe suggestions.

[![App Store](https://img.shields.io/badge/App%20Store-Available-blue?style=for-the-badge&logo=app-store)](https://apps.apple.com/app/yemek-bulucu)
[![Google Play](https://img.shields.io/badge/Google%20Play-Available-green?style=for-the-badge&logo=google-play)](https://play.google.com/store/apps/details?id=com.yemekbulucu.app)
[![Version](https://img.shields.io/badge/Version-1.0.0-orange?style=for-the-badge)]()
[![Turkish](https://img.shields.io/badge/Language-Turkish-red?style=for-the-badge)]()

Production-ready mobile application for AI-powered Turkish recipe discovery. Built with React Native, TypeScript, and modern mobile architecture.

## 📱 Özellikler

- ✅ **Malzeme Girişi:** Manuel ve sesli giriş seçenekleri
- ✅ **Akıllı Tarif Önerme:** Tam eşleşme ve yakın eşleşme algoritması
- ✅ **Sesli Okuma:** Tarifleri sesli dinleme özelliği
- ✅ **Alışveriş Listesi:** Eksik malzemeleri otomatik liste oluşturma
- ✅ **Modern UI:** React Native ile responsive tasarım

## 🛠 Teknolojiler

- **Frontend:** React Native + Expo + TypeScript
- **Backend:** Supabase (PostgreSQL)
- **Navigation:** React Navigation
- **Icons:** Expo Vector Icons
- **Speech:** Expo Speech

## 🚀 Kurulum

### 1. Projeyi klonlayın

```bash
git clone [repo-url]
cd yemek-bulucu
```

### 2. Bağımlılıkları yükleyin

```bash
npm install
```

### 3. Environment variables'ları ayarlayın

```bash
cp .env.example .env
# .env dosyasına Supabase bilgilerinizi ekleyin
```

### 4. Uygulamayı çalıştırın

```bash
npm start
```

## 📋 Supabase Kurulumu

1. [Supabase](https://supabase.com) hesabı oluşturun
2. Yeni bir proje başlatın
3. Aşağıdaki tabloları oluşturun:

### Recipes Tablosu

```sql
CREATE TABLE recipes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  ingredients TEXT[] NOT NULL,
  instructions TEXT[] NOT NULL,
  preparation_time INTEGER,
  servings INTEGER,
  difficulty TEXT,
  category TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Ingredients Tablosu

```sql
CREATE TABLE ingredients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 📖 Kullanım

1. **Ana Ekran:** Evdeki malzemelerinizi girin

   - Manuel olarak yazabilir veya sesli komut kullanabilirsiniz
   - Malzemeleri virgülle ayırın

2. **Sonuç Ekranı:** Size önerilen tarifleri görün

   - "Hemen Yapabilirsiniz" bölümünde mevcut malzemelerle yapılabilenler
   - "Şunu Alırsan Bunları da Yapabilirsin" bölümünde eksik 1-2 malzemeli tarifler

3. **Tarif Detayı:** Seçtiğiniz tarifin detaylarını görün
   - Malzemeler listesi (eksikler vurgulanmış)
   - Adım adım yapılış talimatları
   - Sesli okuma özelliği
   - Alışveriş listesi oluşturma

## 🎯 Gelecek Özellikler

- [ ] Favori tarifler
- [ ] Kategori filtreleme
- [ ] Haftalık menü planlayıcı
- [ ] Kullanıcı tarif ekleme
- [ ] Sosyal paylaşım

## 🤝 Katkıda Bulunma

1. Fork edin
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Değişikliklerinizi commit edin (`git commit -m 'Add amazing feature'`)
4. Branch'inizi push edin (`git push origin feature/amazing-feature`)
5. Pull Request oluşturun

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır. Detaylar için `LICENSE` dosyasını inceleyebilirsiniz.

## 📞 İletişim

Proje Sahibi - [İsim] - email@example.com

Proje Linki: [GitHub Repository URL]
