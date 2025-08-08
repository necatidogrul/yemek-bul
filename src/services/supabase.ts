import { createClient } from "@supabase/supabase-js";

// Gerçek Supabase bağlantı bilgileri
const supabaseUrl = "https://hvfwuyobhsejiflimgzr.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2Znd1eW9iaHNlamlmbGltZ3pyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzODIwMzUsImV4cCI6MjA2ODk1ODAzNX0.b6RNmLyshFnc0piuFGarGFLMWukG7nj29xzmnqib5ns";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database tabloları için type definitions
export interface Database {
  public: {
    Tables: {
      recipes: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          ingredients: string[];
          instructions: string[];
          preparation_time: number | null;
          servings: number | null;
          difficulty: string | null;
          category: string | null;
          image_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          ingredients: string[];
          instructions: string[];
          preparation_time?: number | null;
          servings?: number | null;
          difficulty?: string | null;
          category?: string | null;
          image_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          ingredients?: string[];
          instructions?: string[];
          preparation_time?: number | null;
          servings?: number | null;
          difficulty?: string | null;
          category?: string | null;
          image_url?: string | null;
          created_at?: string;
        };
      };
      ingredients: {
        Row: {
          id: string;
          name: string;
          category: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          category?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          category?: string | null;
          created_at?: string;
        };
      };
      user_credits: {
        Row: {
          id: string;
          user_id: string;
          total_credits: number;
          used_credits: number;
          remaining_credits: number;
          daily_free_credits: number;
          daily_free_used: number;
          last_daily_reset: string;
          lifetime_credits_earned: number;
          lifetime_credits_spent: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          total_credits?: number;
          used_credits?: number;
          remaining_credits?: number;
          daily_free_credits?: number;
          daily_free_used?: number;
          last_daily_reset?: string;
          lifetime_credits_earned?: number;
          lifetime_credits_spent?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          total_credits?: number;
          used_credits?: number;
          remaining_credits?: number;
          daily_free_credits?: number;
          daily_free_used?: number;
          last_daily_reset?: string;
          lifetime_credits_earned?: number;
          lifetime_credits_spent?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      credit_transactions: {
        Row: {
          id: string;
          user_id: string;
          transaction_type: 'earn' | 'spend' | 'purchase' | 'bonus' | 'daily_free';
          amount: number;
          description: string;
          related_action: string | null;
          package_id: string | null;
          receipt_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          transaction_type: 'earn' | 'spend' | 'purchase' | 'bonus' | 'daily_free';
          amount: number;
          description: string;
          related_action?: string | null;
          package_id?: string | null;
          receipt_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          transaction_type?: 'earn' | 'spend' | 'purchase' | 'bonus' | 'daily_free';
          amount?: number;
          description?: string;
          related_action?: string | null;
          package_id?: string | null;
          receipt_id?: string | null;
          created_at?: string;
        };
      };
    };
  };
}
