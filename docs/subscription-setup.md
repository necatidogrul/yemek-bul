# 💳 Subscription Kurulum Rehberi

## 🍎 **Apple Developer Console Ayarları**

### 1. App Store Connect'te Subscription Oluşturma

#### Adım 1: Subscription Groups

```
1. App Store Connect'e giriş yap
2. My Apps > Yemek Bulucu seç
3. Features > In-App Purchases
4. Subscription Groups > "+" butonu
5. Group Name: "Premium Membership"
6. Group Display Name: "Premium Üyelik"
```

#### Adım 2: Subscription Products

```
Product ID: premium_monthly
Reference Name: Premium Monthly Subscription
Duration: 1 Month
Price: $0.99 (Tier 1)
Description: "Sınırsız favori tarif ve premium özellikler"
```

#### Adım 3: Localization (Türkçe)

```
Display Name: "Premium Üyelik"
Description: "Sınırsız favori tarif kaydetme, özel koleksiyonlar ve reklamsız deneyim"
```

### 2. **Revenue Cat Kurulumu**

#### Revenue Cat Dashboard

```
1. https://app.revenuecat.com/ kayıt ol
2. Yeni proje oluştur: "Yemek Bulucu"
3. iOS app ekle
4. Bundle ID: com.yourcompany.yemekbulucu
5. Shared Secret al (App Store Connect'ten)
```

#### Entitlements (Haklar) Tanımlama

```
Entitlement ID: premium
Display Name: Premium Üyelik
Description: Premium özelliklere erişim
```

#### Products Mapping

```
App Store Product ID: premium_monthly
Revenue Cat Product ID: premium_monthly
Entitlement: premium
```

## 💸 **Fiyatlandırma Stratejisi**

### Tier Önerileri

```
🥉 Ücretsiz: 3 favori tarif
🥈 Premium ($0.99/ay): Sınırsız + Premium özellikler
🥇 Premium+ ($2.99/ay): Tüm özellikler + AI önerileri (gelecek)
```

### A/B Test Fiyatları

```
Test A: $0.99/ay (Tier 1)
Test B: $1.99/ay (Tier 2)
Test C: $2.99/ay (Tier 3)
```

### Promosyon Stratejisi

```
- İlk hafta ücretsiz
- 3 gün ücretsiz deneme
- Yıllık %20 indirim ($9.99/yıl)
```

## 🛡️ **App Store Review Guidelines**

### Subscription Kuralları

```
✅ Ücretsiz versiyonda temel fonksiyonellik çalışmalı
✅ Premium özellikler açıkça belirtilmeli
✅ Kullanıcı subscription'ı kolayca iptal edebilmeli
✅ Restore purchases özelliği olmalı
✅ Fiyat bilgisi şeffaf olmalı
```

### Yasal Gereksinimler

```
- Terms of Service (Kullanım Şartları)
- Privacy Policy güncelleme
- Subscription iptal bilgileri
- Auto-renewal açıklaması
```

## 📊 **Revenue Cat Analytics**

### Takip Edilecek Metrikler

```
- Conversion Rate (Ücretsiz → Premium)
- Churn Rate (İptal oranı)
- LTV (Lifetime Value)
- ARPU (Average Revenue Per User)
- Trial-to-Paid conversion
```

### Dashboard Konfigürasyonu

```
- Monthly Recurring Revenue (MRR)
- Active Subscribers
- Cohort Analysis
- Revenue by Country
```
