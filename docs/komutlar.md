npx eas build:version:set -p ios
npx eas build --platform ios --profile production
npx eas submit --platform ios

Alternatif Çözüm (Daha Kalıcı):
Eğer gerçek kullanıcı kimlik doğrulaması istiyorsanız, Supabase Auth entegrasyonu ekleyebiliriz:
Anonim kullanıcı girişi eklemek
Email/şifre ile kayıt sistemi
Sosyal medya ile giriş (Google, Apple)
Hangi yolu tercih edersiniz? Şu anki çözüm (temp kullanıcılar) TestFlight testleri için yeterli olacaktır.
