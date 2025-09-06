# Supabase Edge Functions Setup

## 🔒 Güvenlik Notu
Production'da OpenAI API anahtarını client-side'da tutmak **App Store Guideline 2.5.2** ihlalidir. Bu yüzden Supabase Edge Functions kullanıyoruz.

## 📋 Kurulum Adımları

### 1. Supabase CLI Kurulumu
```bash
npm install -g supabase
```

### 2. Supabase Projesi Bağlantısı
```bash
supabase login
supabase link --project-ref your-project-ref
```

### 3. Environment Variables Ayarlama
Supabase Dashboard'da şu secret'ı ekleyin:
- Settings > Edge Functions > Secrets
- `OPENAI_API_KEY` = your-openai-api-key

### 4. Edge Function Deploy
```bash
# Tek bir function deploy etmek için
supabase functions deploy openai-proxy

# Tüm functions'ları deploy etmek için
supabase functions deploy
```

### 5. Test Etme
```bash
# Local test
supabase functions serve openai-proxy

# Production test
curl -X POST https://your-project.supabase.co/functions/v1/openai-proxy \
  -H "Authorization: Bearer your-anon-key" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Test"}]}'
```

## 📁 Dosya Yapısı
```
supabase/
├── functions/
│   ├── _shared/
│   │   └── cors.ts         # CORS headers
│   └── openai-proxy/
│       └── index.ts         # OpenAI proxy function
└── README.md
```

## 🔍 Güvenlik Kontrol Listesi
- [ ] OpenAI API key Supabase Secrets'ta mı?
- [ ] Production build'de EXPO_PUBLIC_OPENAI_API_KEY yok mu?
- [ ] Edge Function deploy edildi mi?
- [ ] CORS ayarları doğru mu?

## ⚠️ Önemli Notlar
1. **Development**: Direkt OpenAI API kullanılabilir (test için)
2. **Production**: ZORUNLU olarak Edge Functions kullanılmalı
3. **App Store Review**: API key'lerin client'ta olması RED sebebi

## 🚀 Production Checklist
- [ ] `.env` dosyasında OPENAI_API_KEY yok
- [ ] Supabase Edge Function deploy edildi
- [ ] OpenAI service production'da Edge Function kullanıyor
- [ ] Test edildi ve çalışıyor