# TestFlight & Sandbox Satın Alma Rehberi

## 🚀 RevenueCat Yapılandırması Tamamlandı

RevenueCat entegrasyonunda yapılan düzeltmeler:

### 1. **Initialization Sıralaması Düzeltildi**

- App.tsx'te RevenueCat SDK önce configure ediliyor
- Service katmanı SDK hazır olduktan sonra başlatılıyor
- Retry logic ile SDK'nın hazır olması bekleniyor (5 deneme)

### 2. **Sandbox/Production Ayarları**

- TestFlight otomatik olarak Sandbox modda çalışır
- Debug logging production'da kapalı
- Observer mode devre dışı (RevenueCat satın almaları yönetir)

### 3. **Platform Yapılandırması**

- iOS API Key: `appl_aAFWiEGXPfzbOgzBYpVMbfvojQD`
- Bundle ID: `com.yemekbulucuai.app`
- GoogleService-Info.plist ios klasörüne eklendi

## RevenueCat TestFlight Sandbox Test Sorunları Çözümü

### 1. App Store Connect'te Sandbox Test Kullanıcısı Oluşturma

1. **App Store Connect'e Giriş**
   - https://appstoreconnect.apple.com adresine gidin
   - Apple Developer hesabınızla giriş yapın

2. **Sandbox Testers Bölümüne Gidin**
   - Sol menüden "Users and Access" seçin
   - "Sandbox Testers" sekmesine tıklayın

3. **Yeni Test Kullanıcısı Ekleme**
   - "+" butonuna tıklayın
   - Aşağıdaki bilgileri doldurun:
     - **First Name**: Test
     - **Last Name**: User
     - **Email**: test@example.com (gerçek bir email adresi kullanın)
     - **Password**: Güçlü bir şifre oluşturun
     - **Confirm Password**: Şifreyi tekrar girin
     - **Date of Birth**: Geçerli bir doğum tarihi
     - **App Store Territory**: Turkey (veya test yapacağınız ülke)

4. **Test Kullanıcısını Kaydetme**
   - "Save" butonuna tıklayın
   - Test kullanıcısı oluşturuldu

### 2. iOS Cihazda Sandbox Hesabı Ayarlama

1. **iPhone'da Ayarlar Uygulamasını Açın**
   - Settings (Ayarlar) uygulamasına gidin

2. **App Store Ayarlarına Gidin**
   - "App Store" seçeneğine tıklayın

3. **Sandbox Hesabına Giriş Yapın**
   - "Sandbox Account" bölümüne tıklayın
   - Oluşturduğunuz test kullanıcısı bilgileriyle giriş yapın:
     - Email: test@example.com
     - Password: Oluşturduğunuz şifre

4. **TestFlight'ta Normal Hesabınızla Kalın**
   - TestFlight uygulamasında normal Apple ID'nizle kalın
   - Sandbox hesabı sadece satın alma işlemleri için kullanılacak

### 3. RevenueCat Dashboard Kontrolleri

1. **API Key Kontrolü**
   - RevenueCat dashboard'da projenizi açın
   - "Project Settings" > "API Keys" bölümüne gidin
   - iOS API key'in doğru olduğunu kontrol edin: `appl_aAFWiEGXPfzbOgzBYpVMbfvojQD`

2. **Bundle ID Kontrolü**
   - "Project Settings" > "General" bölümüne gidin
   - Bundle ID'nin `com.yemekbulucuai.app` olduğunu kontrol edin

3. **Product'ları Kontrol Edin**
   - "Products" bölümüne gidin
   - Aşağıdaki product'ların tanımlı olduğunu kontrol edin:
     - `com.yemekbulucu.subscription.basic.monthly`

4. **Offering'leri Kontrol Edin**
   - "Offerings" bölümüne gidin
   - "Default" offering'inin mevcut olduğunu kontrol edin
   - Package'ların doğru product'lara bağlı olduğunu kontrol edin

### 4. App Store Connect'te In-App Purchase Kontrolleri

1. **In-App Purchases Bölümüne Gidin**
   - App Store Connect'te uygulamanızı seçin
   - "Features" > "In-App Purchases" seçin

2. **Product Durumunu Kontrol Edin**
   - `com.yemekbulucu.subscription.basic.monthly` product'ının "Ready to Submit" durumunda olduğunu
     kontrol edin
   - Eğer "Missing Metadata" durumundaysa, gerekli bilgileri doldurun

### 5. Test Adımları

1. **TestFlight Uygulamasını Açın**
   - TestFlight'ta YemekbulAI uygulamasını açın

2. **Premium Özelliği Test Edin**
   - Uygulamada premium özelliği tetikleyin (örn: sınırsız tarif)
   - Paywall açılmalı

3. **Satın Alma İşlemini Test Edin**
   - "Satın Al" butonuna tıklayın
   - Apple'ın satın alma dialogu açılmalı
   - Sandbox hesabınızla giriş yapın
   - Satın alma işlemini tamamlayın

4. **Premium Özelliklerin Aktif Olduğunu Kontrol Edin**
   - Satın alma sonrası premium özelliklerin aktif olduğunu kontrol edin

### 6. Hata Durumunda Kontrol Edilecekler (MacBook Olmadan)

1. **iPhone'da Debug Logları**
   - iPhone'da Safari'yi açın
   - Adres çubuğuna `debug://` yazın
   - Console loglarını kontrol edin
   - RevenueCat hata mesajlarını arayın

2. **Network Bağlantısı**
   - İnternet bağlantısının aktif olduğunu kontrol edin
   - WiFi veya mobil veri bağlantısını test edin

3. **Sandbox Hesabı Durumu**
   - Sandbox hesabının aktif olduğunu kontrol edin
   - Gerekirse yeni bir sandbox hesabı oluşturun

4. **RevenueCat Dashboard**
   - Dashboard'da satın alma işlemlerinin görünüp görünmediğini kontrol edin
   - https://app.revenuecat.com adresinden erişebilirsiniz

5. **TestFlight Logları**
   - TestFlight uygulamasında "Activity" sekmesine gidin
   - Uygulama crash'lerini ve hataları kontrol edin

### 7. Yaygın Sorunlar ve Çözümleri (MacBook Olmadan)

1. **"There is no singleton instance" Hatası**
   - RevenueCat SDK'nın uygulama başlarken initialize edildiğinden emin olun
   - App.tsx'teki RevenueCat.configure() çağrısının çalıştığını kontrol edin
   - EAS Build ile yeni bir build alın: `eas build --platform ios --profile preview`

2. **"No offerings available" Hatası**
   - RevenueCat dashboard'da offering'lerin tanımlı olduğunu kontrol edin
   - Product'ların offering'lere bağlı olduğunu kontrol edin
   - https://app.revenuecat.com adresinden "Offerings" bölümünü kontrol edin

3. **Sandbox Satın Alma Çalışmıyor**
   - iPhone'da doğru sandbox hesabına giriş yapıldığını kontrol edin
   - TestFlight'ta normal hesabınızla kaldığınızı kontrol edin
   - Ayarlar > App Store > Sandbox Account'u kontrol edin

4. **TestFlight'ta Uygulama Açılmıyor**
   - TestFlight uygulamasında "Activity" sekmesine gidin
   - Uygulama crash'lerini kontrol edin
   - Gerekirse uygulamayı yeniden yükleyin

5. **RevenueCat API Hatası**
   - RevenueCat dashboard'da "Events" bölümünü kontrol edin
   - API çağrılarının başarılı olup olmadığını kontrol edin
   - API key'in doğru olduğunu kontrol edin

### 8. Debug İpuçları (MacBook Olmadan)

1. **Development Build'de Test**
   - EAS Build ile development build alın
   - `eas build --platform ios --profile development`

2. **iPhone'da Debug Logları**
   - iPhone'da Safari'yi açın
   - Adres çubuğuna `debug://` yazın
   - Console loglarını kontrol edin
   - RevenueCat hata mesajlarını arayın

3. **Network Monitoring**
   - iPhone'da Ayarlar > Gizlilik ve Güvenlik > Analytics & Improvements > Analytics Data
   - Uygulama crash loglarını kontrol edin

4. **TestFlight Debug**
   - TestFlight uygulamasında "Activity" sekmesine gidin
   - Uygulama crash'lerini ve hataları kontrol edin
   - "Feedback" bölümünden hata raporları gönderin

5. **RevenueCat Dashboard Monitoring**
   - https://app.revenuecat.com adresinden dashboard'a gidin
   - "Events" bölümünde API çağrılarını takip edin
   - "Customers" bölümünde kullanıcı aktivitelerini kontrol edin

### 9. Güvenlik Notları

- Sandbox test kullanıcısı bilgilerini güvenli tutun
- Test kullanıcısını production'da kullanmayın
- API key'leri asla public repository'de paylaşmayın

Bu rehberi takip ederek TestFlight'ta sandbox test yapabilirsiniz. MacBook olmadan da iPhone'da
debug yapabilir ve sorunları çözebilirsiniz. Sorun devam ederse:

1. **Yeni Build Alın**: `eas build --platform ios --profile preview`
2. **RevenueCat Dashboard'ı Kontrol Edin**: https://app.revenuecat.com
3. **TestFlight Activity Loglarını Kontrol Edin**
4. **Gerekirse yeni bir sandbox test kullanıcısı oluşturun**

**Önemli Not**: MacBook olmadan da TestFlight'ta sandbox test yapabilirsiniz. Sadece iPhone'da
sandbox hesabı ayarlamanız ve doğru test adımlarını takip etmeniz yeterli.
