import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import { debugLog } from '../config/environment';

// Güvenli Supabase bağlantı bilgileri - environment variables'dan alınır
const supabaseUrl =
  Constants.expoConfig?.extra?.supabaseUrl ||
  process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey =
  Constants.expoConfig?.extra?.supabaseAnonKey ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '🚨 Supabase configuration missing! Check environment variables.'
  );
}

// Debug logging - sadece dev mode'da URL göster
debugLog('🔌 Supabase connection initialized', {
  url: supabaseUrl ? '***masked***' : 'missing',
  hasAnonKey: !!supabaseAnonKey,
});

// Create client with security-focused configuration
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Web güvenliği için
  },
  global: {
    headers: {
      'User-Agent': 'YemekBulucu/1.0.0',
    },
  },
  realtime: {
    params: {
      eventsPerSecond: 10, // Rate limiting
    },
  },
});

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
          transaction_type:
            | 'earn'
            | 'spend'
            | 'purchase'
            | 'bonus'
            | 'daily_free';
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
          transaction_type:
            | 'earn'
            | 'spend'
            | 'purchase'
            | 'bonus'
            | 'daily_free';
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
          transaction_type?:
            | 'earn'
            | 'spend'
            | 'purchase'
            | 'bonus'
            | 'daily_free';
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
