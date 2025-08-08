-- Yemek Bulucu - Credit System Database Migration
-- Bu dosyayı Supabase Dashboard > SQL Editor'da çalıştırın

-- 1. User Credits Tablosu
CREATE TABLE IF NOT EXISTS user_credits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE,
    total_credits INTEGER DEFAULT 0 NOT NULL,
    used_credits INTEGER DEFAULT 0 NOT NULL,
    remaining_credits INTEGER DEFAULT 0 NOT NULL,
    daily_free_credits INTEGER DEFAULT 2 NOT NULL,
    daily_free_used INTEGER DEFAULT 0 NOT NULL,
    last_daily_reset TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    lifetime_credits_earned INTEGER DEFAULT 0 NOT NULL,
    lifetime_credits_spent INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 2. Credit Transactions Tablosu
CREATE TABLE IF NOT EXISTS credit_transactions (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('earn', 'spend', 'purchase', 'bonus', 'daily_free')),
    amount INTEGER NOT NULL,
    description TEXT NOT NULL,
    related_action TEXT, -- recipe_generation, meal_plan, etc.
    package_id TEXT,
    receipt_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 3. User Profiles Tablosu (genişletilmiş)
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE,
    display_name TEXT,
    email TEXT,
    phone TEXT,
    premium_status BOOLEAN DEFAULT FALSE,
    subscription_type TEXT, -- 'free', 'premium', 'vip'
    subscription_expires_at TIMESTAMP WITH TIME ZONE,
    dietary_preferences TEXT[], -- ['vegan', 'glutensiz', 'laktozsuz']
    allergies TEXT[], -- ['fındık', 'yumurta']
    cooking_experience TEXT CHECK (cooking_experience IN ('başlangıç', 'orta', 'ileri')),
    preferred_cuisine TEXT[], -- ['türk', 'italyan', 'çin']
    onboarding_completed BOOLEAN DEFAULT FALSE,
    notifications_enabled BOOLEAN DEFAULT TRUE,
    language_preference TEXT DEFAULT 'tr',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 4. AI Generated Recipes Cache Tablosu
CREATE TABLE IF NOT EXISTS ai_recipe_cache (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ingredient_hash TEXT NOT NULL, -- MD5 hash of sorted ingredients
    ingredients TEXT[] NOT NULL,
    recipe_data JSONB NOT NULL,
    tokens_used INTEGER DEFAULT 0,
    cost_usd DECIMAL(10,6) DEFAULT 0,
    popularity_score INTEGER DEFAULT 0,
    language TEXT DEFAULT 'tr',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days') NOT NULL
);

-- 5. User Favorites Tablosu (genişletilmiş)
CREATE TABLE IF NOT EXISTS user_favorites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    recipe_id TEXT NOT NULL,
    recipe_name TEXT NOT NULL,
    recipe_source TEXT NOT NULL CHECK (recipe_source IN ('ai', 'database', 'mock')),
    recipe_data JSONB, -- Tam tarif verisi (AI tarifler için)
    tags TEXT[], -- Kullanıcının eklediği etiketler
    personal_notes TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    last_cooked_at TIMESTAMP WITH TIME ZONE,
    cook_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE(user_id, recipe_id)
);

-- 6. User Recipe History Tablosu
CREATE TABLE IF NOT EXISTS user_recipe_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    recipe_id TEXT NOT NULL,
    recipe_name TEXT NOT NULL,
    ingredients_used TEXT[] NOT NULL,
    action_type TEXT NOT NULL CHECK (action_type IN ('generated', 'viewed', 'favorited', 'cooked')),
    credits_spent INTEGER DEFAULT 0,
    ai_model_used TEXT, -- 'gpt-3.5-turbo', 'gemini-pro'
    tokens_used INTEGER DEFAULT 0,
    generation_time_ms INTEGER,
    user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- İNDEXLER
CREATE INDEX IF NOT EXISTS idx_user_credits_user_id ON user_credits(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON credit_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_recipe_cache_ingredient_hash ON ai_recipe_cache(ingredient_hash);
CREATE INDEX IF NOT EXISTS idx_ai_recipe_cache_expires_at ON ai_recipe_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_recipe_history_user_id ON user_recipe_history(user_id);
CREATE INDEX IF NOT EXISTS idx_user_recipe_history_created_at ON user_recipe_history(created_at DESC);

-- ROW LEVEL SECURITY (RLS) POLİCİLERİ
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_recipe_history ENABLE ROW LEVEL SECURITY;

-- Kullanıcılar sadece kendi verilerini görebilir/düzenleyebilir
CREATE POLICY "Users can view own credits" ON user_credits FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Users can view own transactions" ON credit_transactions FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Users can view own profile" ON user_profiles FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Users can view own favorites" ON user_favorites FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Users can view own history" ON user_recipe_history FOR ALL USING (user_id = auth.uid());

-- AI recipe cache herkese açık (okuma)
ALTER TABLE ai_recipe_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "AI cache is readable by all" ON ai_recipe_cache FOR SELECT USING (true);
CREATE POLICY "AI cache is writable by authenticated users" ON ai_recipe_cache FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- TETİKLEYİCİLER (Otomatik updated_at)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_credits_updated_at BEFORE UPDATE ON user_credits 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_favorites_updated_at BEFORE UPDATE ON user_favorites 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- TEMIZLIK FONKSIYONU (Expired cache temizleme)
CREATE OR REPLACE FUNCTION cleanup_expired_ai_cache()
RETURNS void AS $$
BEGIN
    DELETE FROM ai_recipe_cache WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Günlük otomatik temizlik (isteğe bağlı - cron extension gerekir)
-- SELECT cron.schedule('cleanup-ai-cache', '0 2 * * *', 'SELECT cleanup_expired_ai_cache();');

COMMENT ON TABLE user_credits IS 'Kullanıcı kredi bakiyeleri ve günlük limitleri';
COMMENT ON TABLE credit_transactions IS 'Tüm kredi işlemleri geçmişi';
COMMENT ON TABLE user_profiles IS 'Genişletilmiş kullanıcı profilleri';
COMMENT ON TABLE ai_recipe_cache IS 'AI tarif sonuçları cache''i - maliyet optimizasyonu için';
COMMENT ON TABLE user_favorites IS 'Kullanıcı favori tarifleri - AI ve database tarifler dahil';
COMMENT ON TABLE user_recipe_history IS 'Kullanıcı tarif geçmişi ve analytics';

-- TEST VERİLERİ (Opsiyonel - Development için)
-- INSERT INTO user_profiles (user_id, display_name, email) 
-- VALUES ('00000000-0000-0000-0000-000000000001', 'Test User', 'test@example.com');

-- INSERT INTO user_credits (user_id, total_credits, remaining_credits, lifetime_credits_earned)
-- VALUES ('00000000-0000-0000-0000-000000000001', 50, 50, 50);

-- 7. User History Table (AI Request History) - Cihazlar arası senkronizasyon için
CREATE TABLE IF NOT EXISTS user_history (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL,
    ingredients JSONB NOT NULL,
    preferences JSONB,
    results JSONB NOT NULL,
    timestamp BIGINT NOT NULL,
    success BOOLEAN NOT NULL DEFAULT false,
    error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Indexes for user_history
CREATE INDEX IF NOT EXISTS idx_user_history_user_id ON user_history(user_id);
CREATE INDEX IF NOT EXISTS idx_user_history_timestamp ON user_history(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_user_history_success ON user_history(success);

-- RLS Policies for user_history
ALTER TABLE user_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own history" ON user_history
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own history" ON user_history
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own history" ON user_history
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own history" ON user_history
    FOR DELETE USING (user_id = auth.uid());

-- History tablosu için trigger
CREATE TRIGGER update_user_history_updated_at BEFORE UPDATE ON user_history 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE user_history IS 'Kullanıcı AI arama geçmişi - cihazlar arası senkronizasyon';

COMMIT;