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
    };
  };
}
