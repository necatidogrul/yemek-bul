# RevenueCat Kurulum Rehberi 🚀

Bu rehber, Yemek Bulucu uygulamasında RevenueCat SDK'sının nasıl kurulacağını ve yapılandırılacağını detaylı olarak açıklar.

## 📋 Önkoşullar

- Apple Developer Account ($99/yıl)
- App Store Connect erişimi
- RevenueCat hesabı (ücretsiz başlar)
- iOS cihaz (gerçek test için)

## 🔧 1. Adım: RevenueCat Hesabı Oluşturma

### 1.1 RevenueCat Dashboard
1. [RevenueCat](https://www.revenuecat.com) sitesine gidin
2. "Get Started" ile ücretsiz hesap oluşturun
3. Email doğrulamasını tamamlayın

### 1.2 Yeni Proje Oluşturma
1. Dashboard'da "Create new project" tıklayın
2. Proje adı: **Yemek Bulucu**
3. Platform: **iOS** seçin
4. Bundle ID: `com.yemekbulucu.app` (sizin bundle ID'niz)

## 📱 2. Adım: App Store Connect Kurulumu

### 2.1 App Store Connect'te Uygulama Oluşturma
1. [App Store Connect](https://appstoreconnect.apple.com) giriş yapın
2. "My Apps" → "+" → "New App"
3. **App Information:**
   - Name: `Bul-yemek`
   - Bundle ID: com.yemekbul.app
   - SKU: `yemekbul001`

### 2.2 In-App Purchase Ürünleri Oluşturma
1. App Store Connect'te uygulamanızı açın
2. **Features** → **In-App Purchases** → "+" tıklayın

#### Premium Aylık Abonelik:
- **Type:** Auto-Renewable Subscription
- **Reference Name:** `Premium Monthly`
- **Product ID:** `com.yemekbulucu.premium_monthly`
- **Subscription Group:** `premium_subscriptions` (yeni oluşturun)
- **Price:** ₺29,99 (Türkiye için)
- **Display Name:** `Premium Abonelik`
- **Description:** `Sınırsız tarif arama, AI öneriler ve premium özellikler`

#### Premium Yıllık Abonelik (Opsiyonel):
- **Type:** Auto-Renewable Subscription
- **Reference Name:** `Premium Yearly`
- **Product ID:** `com.yemekbulucu.premium_yearly`
- **Subscription Group:** `premium_subscriptions` (aynı grup)
- **Price:** ₺299,99 (Türkiye için)
- **Display Name:** `Premium Abonelik (Yıllık)`
- **Description:** `1 yıl boyunca tüm premium özellikler - %17 tasarruf!`

### 2.3 Sandbox Test Kullanıcısı Oluşturma
1. **Users and Access** → **Sandbox Testers** → "+"
2. Test email adresi oluşturun (örn: `test@yemekbulucu.com`)
3. Şifre belirleyin ve Türkiye'yi seçin

## 🔑 3. Adım: RevenueCat API Key'lerini Alma

### 3.1 iOS API Key
1. RevenueCat Dashboard → **Projects** → Projenizi seçin
2. **Apps** → iOS uygulamanızı seçin
3. **API Keys** sekmesine gidin
4. **iOS** key'ini kopyalayın (başında `appl_` ile başlar)

### 3.2 Android API Key (Gelecekte kullanım için)
- Şimdilik gerekli değil, iOS'a odaklanıyoruz
- İleride Android versiyonu için gerekli olacak

## ⚙️ 4. Adım: Uygulama Konfigürasyonu

### 4.1 API Key'leri Güncelleme
`src/config/revenuecat.config.ts` dosyasını açın:

```typescript
export const REVENUECAT_CONFIG = {
  API_KEYS: {
    ios: 'appl_YOUR_ACTUAL_IOS_KEY_HERE', // Gerçek key'inizi buraya yazın
    android: 'goog_PUT_YOUR_ANDROID_KEY_HERE', // Şimdilik boş bırakın
  },
  
  PRODUCTS: {
    PREMIUM_MONTHLY: 'com.yemekbulucu.premium_monthly', // App Store Connect'teki product ID
    PREMIUM_YEARLY: 'com.yemekbulucu.premium_yearly',   // İsteğe bağlı
  },
  
  DEVELOPMENT: {
    MOCK_MODE: false, // Gerçek test için false yapın
  },
};
```

### 4.2 Environment Variables (Önerilen - Güvenlik için)
Alternatif olarak, `.env` dosyası oluşturun:

```bash
REVENUECAT_IOS_API_KEY=appl_YOUR_ACTUAL_IOS_KEY_HERE
```

## 🧪 5. Adım: Test Etme

### 5.1 Simulator'da Mock Test
```bash
npx expo start
```
- Simulator'da çalıştırın
- Debug panelindeki mock düğmelerini kullanın
- Premium özelliklerini test edin

### 5.2 Gerçek Cihazda Sandbox Test
1. **Önemli:** iOS cihazını Settings → App Store → Production → Sandbox ortamına geçirin
2. Sandbox test kullanıcısı ile giriş yapın
3. Uygulamayı gerçek cihazda çalıştırın:
```bash
npx expo run:ios --device
```
4. Satın alma akışını test edin

### 5.3 Test Senaryoları
- ✅ Ücretsiz kullanıcı limitleri
- ✅ Premium satın alma
- ✅ Satın alma iptal etme
- ✅ Satın alımları geri yükleme
- ✅ Abonelik süresi doluma
- ✅ Uygulama yeniden başlatma

## 🔍 6. Adım: RevenueCat Dashboard Entitlements

### 6.1 Entitlement Oluşturma
1. RevenueCat Dashboard → **Entitlements** → "Create Entitlement"
2. **Entitlement ID:** `premium`
3. **Display Name:** `Premium Features`
4. **Attached Products:** `com.yemekbulucu.premium_monthly` ve yearly'yi seçin

### 6.2 Offerings Oluşturma
1. **Offerings** → "Create Offering"
2. **Identifier:** `default`
3. **Description:** `Premium Subscription`
4. Packages kısmında monthly ve yearly'yi ekleyin

## 📊 7. Adım: Analytics ve Monitoring

### 7.1 RevenueCat Charts
- Dashboard'da gelir, conversion rate ve churn metrikleri
- A/B testing için farklı offering'lar oluşturabilirsiniz

### 7.2 Debug Logs
Development sırasında konsolu takip edin:
```javascript
// RevenueCat logları
console.log('RevenueCat Status:', await RevenueCatService.isReady());
```

## 🚀 8. Adım: Production'a Geçiş

### 8.1 App Store Connect'te Production
1. In-App Purchase ürünlerinizi **Ready to Submit** durumuna getirin
2. App review için submit edin
3. Apple onayı bekleyin (1-3 gün)

### 8.2 Configuration Güncelleme
```typescript
DEVELOPMENT: {
  MOCK_MODE: false, // Production için false
  ENABLE_DEBUG_LOGS: false, // Production için false
}
```

### 8.3 Build ve Deploy
```bash
# Production build
eas build --platform ios --profile production

# App Store'a yükleme
eas submit --platform ios
```

## 🛠️ 9. Adım: Troubleshooting

### 9.1 Sık Karşılaşılan Hatalar

**"No products found" hatası:**
- App Store Connect'te product'ların "Ready to Submit" durumunda olduğunu kontrol edin
- Bundle ID'lerin eşleştiğini kontrol edin
- Sandbox kullanıcısı ile giriş yaptığınızı doğrulayın

**"Invalid API Key" hatası:**
- API key'in doğru kopyalandığını kontrol edin
- iOS key'in `appl_` ile başladığını doğrulayın
- RevenueCat dashboard'ta key'in aktif olduğunu kontrol edin

**Satın alma işlemi çalışmıyor:**
- Gerçek cihaz kullandığınızdan emin olun (Simulator desteklemez)
- Sandbox environment'ta olduğunuzu kontrol edin
- Test kullanıcısının App Store'da oturum açtığını doğrulayın

### 9.2 Debug Komutları
```bash
# RevenueCat durumunu kontrol et
npx expo start --clear

# Gerçek cihazda çalıştır
npx expo run:ios --device --clear
```

## 📞 Destek

**RevenueCat Dokümantasyon:**
- [RevenueCat Docs](https://docs.revenuecat.com)
- [iOS SDK Guide](https://docs.revenuecat.com/docs/ios)

**Apple Dokümantasyon:**
- [In-App Purchase Programming Guide](https://developer.apple.com/in-app-purchase/)
- [App Store Connect Help](https://help.apple.com/app-store-connect/)

**Yemek Bulucu Destek:**
- GitHub Issues: Repository'deki issues kısmında soru sorabilirsiniz
- Email: Proje sahibi ile iletişime geçin

---

## ✅ Kurulum Tamamlandı!

Bu adımları tamamladıktan sonra:
1. ✅ RevenueCat entegrasyonu hazır
2. ✅ Apple In-App Purchase çalışıyor
3. ✅ Premium özellikler aktif
4. ✅ Sandbox testleri geçiyor
5. ✅ Production'a geçmeye hazır

**Sonraki Adımlar:**
- App Store'a first review için submit
- Marketing ve ASO (App Store Optimization)
- Kullanıcı feedback toplama
- Feature geliştirme devam etmek

Başarılar! 🎉