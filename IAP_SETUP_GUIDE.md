# 🍎 Apple In-App Purchase Kurulum Rehberi

## 1. Apple Developer Console Kurulumu

### App Store Connect'te Subscription Products:

1. **App Store Connect** → **My Apps** → **Yemek Bulucu**
2. **Features** → **In-App Purchases**
3. **Create** → **Auto-Renewable Subscription**

### Ürün Bilgileri:
```
Product ID: com.yemekbulucu.premium_monthly
Reference Name: Premium Monthly Subscription
Duration: 1 Month
Price: ₺29.99 (Tier 4)
```

### Subscription Group:
```
Group Name: Premium Subscriptions
Group ID: premium_group
```

### Product Details:
```
Display Name (TR): Premium Abonelik
Description (TR): Sınırsız tarif erişimi, favoriler, AI asistan ve reklamsız deneyim
```

### Free Trial:
```
Duration: 7 days
Introductory Price: Free
```

## 2. RevenueCat Kurulumu

1. **RevenueCat Dashboard** → **Create Project**
2. **Project Name**: Yemek Bulucu
3. **Add App** → **iOS**
4. **Bundle ID**: com.yourcompany.yemekbulucu
5. **App Store Connect API Key** ekle

### Products:
```
Identifier: premium_monthly
Duration: 1 month
```

### Entitlements:
```
Identifier: premium
Description: Premium features access
Products: premium_monthly
```

## 3. Test Environment

### Sandbox Testing:
1. **App Store Connect** → **Users and Access** → **Sandbox Testers**
2. Test kullanıcısı oluştur
3. iOS cihazda **Settings** → **App Store** → **Sandbox Account**

### Test Product IDs:
```
Production: com.yemekbulucu.premium_monthly
Sandbox: com.yemekbulucu.premium_monthly (same)
```

## 4. Code Implementation

Bu rehber kodu takip ederek RevenueCat entegrasyonu yapılacak.

## 5. App Store Review

### Required Screenshots:
- Subscription purchase flow
- Subscription management screen
- Terms of service page
- Privacy policy page

### Review Notes:
"Premium subscription provides unlimited recipe access, favorites, AI assistant, and ad-free experience. Free tier includes daily limits."