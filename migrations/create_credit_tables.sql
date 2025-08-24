-- Create user_credits table
CREATE TABLE IF NOT EXISTS user_credits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    total_credits INTEGER DEFAULT 0 NOT NULL,
    used_credits INTEGER DEFAULT 0 NOT NULL,
    remaining_credits INTEGER DEFAULT 0 NOT NULL,
    daily_free_credits INTEGER DEFAULT 0 NOT NULL,
    daily_free_used INTEGER DEFAULT 0 NOT NULL,
    last_daily_reset TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    lifetime_credits_earned INTEGER DEFAULT 0 NOT NULL,
    lifetime_credits_spent INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create credit_transactions table
CREATE TABLE IF NOT EXISTS credit_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    transaction_type TEXT CHECK (transaction_type IN ('earn', 'spend', 'purchase', 'bonus', 'daily_free')) NOT NULL,
    amount INTEGER NOT NULL,
    description TEXT NOT NULL,
    related_action TEXT,
    package_id TEXT,
    receipt_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    -- Foreign key reference (optional, depending on your user management)
    CONSTRAINT fk_user_credits FOREIGN KEY (user_id) REFERENCES user_credits(user_id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_credits_user_id ON user_credits(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON credit_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_type ON credit_transactions(transaction_type);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for user_credits table
DROP TRIGGER IF EXISTS update_user_credits_updated_at ON user_credits;
CREATE TRIGGER update_user_credits_updated_at
    BEFORE UPDATE ON user_credits
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS) for security
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- Create policies for user_credits (users can only access their own data)
-- GÜVENLI RLS POLİTİKALARI - auth.uid() kullanıyor
CREATE POLICY "Users can view own credits" ON user_credits
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own credits" ON user_credits
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own credits" ON user_credits
    FOR UPDATE USING (auth.uid()::text = user_id)
    WITH CHECK (auth.uid()::text = user_id);

-- Create policies for credit_transactions
CREATE POLICY "Users can view own transactions" ON credit_transactions
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own transactions" ON credit_transactions
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Allow service role to access all data (for admin operations)
CREATE POLICY "Service role can access all credits" ON user_credits
    FOR ALL USING (current_setting('role') = 'service_role');

CREATE POLICY "Service role can access all transactions" ON credit_transactions
    FOR ALL USING (current_setting('role') = 'service_role');

-- Grant necessary permissions
GRANT ALL ON user_credits TO authenticated;
GRANT ALL ON user_credits TO service_role;
GRANT ALL ON credit_transactions TO authenticated;
GRANT ALL ON credit_transactions TO service_role;

-- Grant usage on sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;