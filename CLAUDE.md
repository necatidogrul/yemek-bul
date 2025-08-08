# 🎯 Yemek Bulucu - AI Recipe App

## 📱 Kredi Sistemi 

### 🌍 Environment Sistemi
Artık 3 farklı ortamda test edebilirsiniz:

```bash
# Development: 100 kredi, admin panel açık
npm run env:dev
npx expo start --clear

# Testing: Production benzeri, 1 kredi, admin panel KAPALI
npm run env:test  
npx expo start --clear

# Production: Tam güvenlik, 1 kredi, admin panel YOK
npm run env:prod
npx expo start --clear
```

### 🔒 Güvenlik Özellikleri
- **Admin Panel**: Sadece development ortamında çalışır
- **Production Guard**: Test/prod ortamında admin özellikleri tamamen devre dışı
- **Environment Detection**: Otomatik ortam algılama
- **App Store Safe**: Production build'de hiçbir gizli özellik yok

### 🧪 Test Scenarios
1. **Development Test**: `npm run env:dev` → Admin panel ile kredi ekle
2. **Production Test**: `npm run env:test` → Gerçek kullanıcı deneyimi
3. **Store Submission**: `npm run env:prod` → App Store için hazır

### Komutlar
```bash
# Environment değiştirme
npm run env:dev   # Development ortamı
npm run env:test  # Test ortamı (production benzeri)  
npm run env:prod  # Production ortamı

# Projeyi çalıştır
npx expo start --clear

# iOS build
npx expo run:ios

# Supabase migration
# SQL Editor'da migrations/create_credit_tables.sql çalıştır
```

### Debug Logları
Environment'a göre loglar:
- **Development**: Tüm loglar açık
- **Testing/Production**: Sadece error logları

### Supabase Tables
- `user_credits`: Kullanıcı kredi durumu
- `credit_transactions`: Kredi hareketleri

### Kredi Maliyetleri
- AI Recipe Generation: 1 kredi
- Favorite View: 1 kredi
- Recipe Q&A: 3 kredi
- History Access: 2 kredi

## 🎮 Test Rehberi

### Development Test (npm run env:dev)
1. Expo Go'da aç
2. Header'da 100 kredi görülecek
3. AI tarif üret → kredi düşecek
4. Admin panel → Kredi butonuna 7x dokun
5. Hızlı kredi ekleme butonları çalışır

### Production Test (npm run env:test)
1. Expo Go'da aç  
2. Header'da 1 kredi görülecek
3. AI tarif üret → kredi düşecek, 0 olunca paywall
4. Admin panel → 7x dokunma ÇALIŞMAZ
5. Gerçek kullanıcı deneyimi