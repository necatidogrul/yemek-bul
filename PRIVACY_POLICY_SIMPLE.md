# Gizlilik Politikası - Yemek Bulucu

**Son Güncelleme: 2 Ocak 2025**

## Özet
Yemek Bulucu uygulaması, **kullanıcı gizliliğine önem verir** ve **kişisel verilerinizi toplamaz veya paylaşmaz**.

## Veri Toplama

### ❌ Toplamadığımız Veriler:
- Kişisel bilgileriniz (ad, e-posta, telefon)
- Konum bilginiz
- Cihaz kimliği veya reklam kimlikleri
- Kullanım analitiği
- Çökme raporları
- Sosyal medya bilgileri

### ✅ Sadece Cihazınızda Saklanan Veriler:
Aşağıdaki veriler **SADECE SİZİN CİHAZINIZDA** saklanır, hiçbir sunucuya gönderilmez:

- **Favori Tarifler**: Beğendiğiniz tarifler
- **Arama Geçmişi**: Son 30 günlük arama geçmişiniz
- **Uygulama Tercihleri**: Tema (koyu/açık), dil seçimi
- **Kullanım Limitleri**: Günlük ücretsiz kullanım hakkı sayacı

Bu veriler AsyncStorage kullanılarak cihazınızda yerel olarak saklanır ve uygulamayı sildiğinizde tamamen silinir.

## API Kullanımı

Uygulama, tarif üretmek için aşağıdaki API'leri kullanır:

### OpenAI API
- **Gönderilen**: Sadece malzeme isimleri (örn: "domates, soğan, peynir")
- **Kişisel veri**: GÖNDERİLMEZ
- **Amaç**: AI ile tarif önerileri üretmek

### Görsel API'leri (Google/Unsplash)
- **Gönderilen**: Sadece tarif isimleri (örn: "menemen")
- **Kişisel veri**: GÖNDERİLMEZ
- **Amaç**: Tariflere uygun görseller getirmek

## RevenueCat (Premium Özellikler)
Premium satın alımlar için RevenueCat kullanılır:
- **Toplanan**: Anonim kullanıcı kimliği ve satın alma durumu
- **Kişisel bilgi**: TOPLANMAZ
- RevenueCat'in kendi gizlilik politikası: https://www.revenuecat.com/privacy

## Kamera İzni
- **Amaç**: Malzeme fotoğrafı çekmek için
- **Zorunlu değil**: İsteğe bağlı özellik
- Çekilen fotoğraflar cihazınızda kalır, sunucuya yüklenmez

## Veri Güvenliği
- Tüm API çağrıları HTTPS üzerinden şifrelidir
- Cihazınızdaki veriler iOS/Android güvenlik standartlarıyla korunur
- API anahtarları güvenli şekilde saklanır

## Çocukların Gizliliği
Uygulamamız 4+ yaş için uygundur ve çocuklardan veri toplamaz.

## Üçüncü Taraf Bağlantıları
Uygulama üçüncü taraf web sitelerine bağlantı içermez.

## Veri Silme
Uygulamayı sildiğinizde tüm yerel veriler otomatik olarak silinir. Başka bir işlem yapmanıza gerek yoktur.

## Değişiklikler
Bu politikada değişiklik yaparsak, uygulama içinde bilgilendirme yapacağız.

## İletişim
Sorularınız için: necatidogrul7@gmail.com
Geliştirici: Necati Doğrul
Website: https://necatidogrul.dev

## Yasal Uyumluluk
Bu politika aşağıdakilere uygundur:
- KVKK (Türkiye)
- GDPR (AB)
- Apple App Store gereksinimleri
- Google Play Store gereksinimleri

---

**Not**: Yemek Bulucu, kullanıcı verilerini toplamayan, gizliliğe saygılı bir uygulamadır. Tüm verileriniz cihazınızda kalır.