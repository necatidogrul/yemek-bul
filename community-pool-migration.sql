-- Community Recipe Pool Migration
-- Bu migration recipes tablosunu AI tarifleri için genişletir

-- Recipes tablosuna yeni kolonlar ekle
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'database';
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN DEFAULT FALSE;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS popularity_score INTEGER DEFAULT 0;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS ingredient_combination TEXT[];
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS original_ingredients TEXT[];
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS tokens_used INTEGER DEFAULT 0;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS created_by_user_id UUID;

-- AI tarifleri için index'ler ekle
CREATE INDEX IF NOT EXISTS idx_recipes_source ON recipes(source);
CREATE INDEX IF NOT EXISTS idx_recipes_ai_generated ON recipes(ai_generated);
CREATE INDEX IF NOT EXISTS idx_recipes_ingredient_combination ON recipes USING GIN(ingredient_combination);
CREATE INDEX IF NOT EXISTS idx_recipes_popularity_score ON recipes(popularity_score DESC);
CREATE INDEX IF NOT EXISTS idx_recipes_created_by_user_id ON recipes(created_by_user_id);

-- Ingredient combination arama için function
CREATE OR REPLACE FUNCTION match_ingredient_combinations(
    target_ingredients TEXT[],
    recipe_ingredients TEXT[],
    min_match_ratio FLOAT DEFAULT 0.6
) RETURNS FLOAT AS $$
DECLARE
    matching_count INTEGER := 0;
    ingredient TEXT;
    match_ratio FLOAT;
BEGIN
    -- Her target ingredient için recipe_ingredients'te arama yap
    FOREACH ingredient IN ARRAY target_ingredients
    LOOP
        IF ingredient = ANY(recipe_ingredients) THEN
            matching_count := matching_count + 1;
        END IF;
    END LOOP;
    
    -- Match ratio hesapla
    IF array_length(target_ingredients, 1) = 0 THEN
        RETURN 0;
    END IF;
    
    match_ratio := matching_count::FLOAT / array_length(target_ingredients, 1);
    
    RETURN match_ratio;
END;
$$ LANGUAGE plpgsql;

-- AI recipe statistics view
CREATE OR REPLACE VIEW ai_recipe_stats AS
SELECT 
    COUNT(*) as total_ai_recipes,
    COUNT(DISTINCT created_by_user_id) as unique_contributors,
    AVG(popularity_score) as avg_popularity,
    SUM(tokens_used) as total_tokens_used,
    MAX(created_at) as latest_recipe_date
FROM recipes 
WHERE ai_generated = true;

-- Popular ingredient combinations view
CREATE OR REPLACE VIEW popular_ingredient_combinations AS
SELECT 
    ingredient_combination,
    COUNT(*) as recipe_count,
    AVG(popularity_score) as avg_popularity,
    MAX(created_at) as latest_recipe
FROM recipes 
WHERE ai_generated = true 
  AND ingredient_combination IS NOT NULL
GROUP BY ingredient_combination
ORDER BY recipe_count DESC, avg_popularity DESC
LIMIT 100;

-- RPC function to increment popularity score
CREATE OR REPLACE FUNCTION increment_popularity(recipe_id UUID, increment_value FLOAT DEFAULT 1.0)
RETURNS VOID AS $$
BEGIN
    UPDATE recipes 
    SET popularity_score = COALESCE(popularity_score, 0) + increment_value
    WHERE id = recipe_id;
END;
$$ LANGUAGE plpgsql;

-- User Search History Table
CREATE TABLE IF NOT EXISTS user_search_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    search_ingredients TEXT[] NOT NULL,
    search_query TEXT, -- Raw arama string'i
    result_type TEXT NOT NULL, -- 'community_pool', 'ai_cache', 'ai_generation', 'mock'
    results_found INTEGER DEFAULT 0,
    exact_matches INTEGER DEFAULT 0,
    near_matches INTEGER DEFAULT 0,
    used_ai BOOLEAN DEFAULT FALSE,
    credits_spent INTEGER DEFAULT 0,
    response_time_ms INTEGER,
    search_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_agent TEXT,
    ip_address INET,
    session_id TEXT
);

-- Indexes for user search history
CREATE INDEX IF NOT EXISTS idx_user_search_history_user_id ON user_search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_user_search_history_timestamp ON user_search_history(search_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_user_search_history_ingredients ON user_search_history USING GIN(search_ingredients);
CREATE INDEX IF NOT EXISTS idx_user_search_history_result_type ON user_search_history(result_type);
CREATE INDEX IF NOT EXISTS idx_user_search_history_used_ai ON user_search_history(used_ai);

-- Popular search ingredients view
CREATE OR REPLACE VIEW popular_search_ingredients AS
SELECT 
    unnest(search_ingredients) as ingredient,
    COUNT(*) as search_count,
    COUNT(DISTINCT user_id) as unique_users,
    AVG(results_found) as avg_results_found,
    MAX(search_timestamp) as latest_search
FROM user_search_history
WHERE search_timestamp >= NOW() - INTERVAL '30 days'
GROUP BY unnest(search_ingredients)
ORDER BY search_count DESC, unique_users DESC
LIMIT 100;

-- User search stats view
CREATE OR REPLACE VIEW user_search_stats AS
SELECT 
    user_id,
    COUNT(*) as total_searches,
    COUNT(*) FILTER (WHERE used_ai = true) as ai_searches,
    COUNT(*) FILTER (WHERE result_type = 'community_pool') as community_searches,
    COUNT(*) FILTER (WHERE results_found = 0) as failed_searches,
    SUM(credits_spent) as total_credits_spent,
    AVG(response_time_ms) as avg_response_time,
    MAX(search_timestamp) as last_search_date,
    MIN(search_timestamp) as first_search_date
FROM user_search_history
GROUP BY user_id;

-- Global search analytics view
CREATE OR REPLACE VIEW search_analytics AS
SELECT 
    DATE(search_timestamp) as search_date,
    COUNT(*) as total_searches,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(*) FILTER (WHERE used_ai = true) as ai_searches,
    COUNT(*) FILTER (WHERE result_type = 'community_pool') as community_pool_hits,
    COUNT(*) FILTER (WHERE result_type = 'ai_cache') as cache_hits,
    COUNT(*) FILTER (WHERE result_type = 'mock') as fallback_searches,
    AVG(results_found) as avg_results_found,
    AVG(response_time_ms) as avg_response_time,
    SUM(credits_spent) as total_credits_spent
FROM user_search_history
WHERE search_timestamp >= NOW() - INTERVAL '90 days'
GROUP BY DATE(search_timestamp)
ORDER BY search_date DESC;