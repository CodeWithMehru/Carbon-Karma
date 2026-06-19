/**
 * Supabase Database type definitions.
 *
 * Mirrors `supabase/schema.sql` and conforms to the `GenericSchema` shape that
 * `@supabase/supabase-js` expects (each table/view carries a `Relationships`
 * tuple and the schema exposes `CompositeTypes`). Keeping this shape exact is
 * what lets every query be fully typed — no `as any` casts required.
 */

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          avatar_url: string | null;
          city: string | null;
          state: string | null;
          country: string;
          baseline_monthly_kg_co2: number;
          baseline_completed: boolean;
          baseline_data: Record<string, unknown>;
          karma_points: number;
          karma_level: number;
          current_streak: number;
          longest_streak: number;
          total_kg_co2_saved: number;
          high_contrast_mode: boolean;
          dyslexia_font: boolean;
          notification_preferences: Record<string, boolean>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string;
          avatar_url?: string | null;
          city?: string | null;
          state?: string | null;
          country?: string;
          baseline_monthly_kg_co2?: number;
          baseline_completed?: boolean;
          baseline_data?: Record<string, unknown>;
          karma_points?: number;
          karma_level?: number;
          current_streak?: number;
          longest_streak?: number;
          total_kg_co2_saved?: number;
          high_contrast_mode?: boolean;
          dyslexia_font?: boolean;
          notification_preferences?: Record<string, boolean>;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
        Relationships: [];
      };
      carbon_logs: {
        Row: {
          id: string;
          user_id: string;
          category: string;
          subcategory: string | null;
          kg_co2: number;
          is_saving: boolean;
          description: string;
          quantity: number | null;
          unit: string | null;
          source: string;
          ai_confidence: number | null;
          receipt_image_url: string | null;
          raw_ai_response: Record<string, unknown> | null;
          logged_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          category: string;
          subcategory?: string | null;
          kg_co2: number;
          is_saving?: boolean;
          description: string;
          quantity?: number | null;
          unit?: string | null;
          source?: string;
          ai_confidence?: number | null;
          receipt_image_url?: string | null;
          raw_ai_response?: Record<string, unknown> | null;
          logged_at?: string;
        };
        Update: Partial<Database['public']['Tables']['carbon_logs']['Insert']>;
        Relationships: [];
      };
      actions: {
        Row: {
          id: string;
          title: string;
          description: string;
          category: string;
          difficulty: string;
          kg_co2_saved: number;
          karma_reward: number;
          icon_name: string;
          color: string;
          is_active: boolean;
          times_logged: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description: string;
          category: string;
          difficulty?: string;
          kg_co2_saved: number;
          karma_reward?: number;
          icon_name?: string;
          color?: string;
          is_active?: boolean;
          times_logged?: number;
        };
        Update: Partial<Database['public']['Tables']['actions']['Insert']>;
        Relationships: [];
      };
      karma_transactions: {
        Row: {
          id: string;
          user_id: string;
          points: number;
          action_type: string;
          description: string;
          carbon_log_id: string | null;
          action_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          points: number;
          action_type: string;
          description: string;
          carbon_log_id?: string | null;
          action_id?: string | null;
        };
        Update: Partial<Database['public']['Tables']['karma_transactions']['Insert']>;
        Relationships: [];
      };
      ripple_events: {
        Row: {
          id: string;
          user_id: string;
          city: string | null;
          category: string;
          kg_co2_saved: number;
          action_description: string;
          emoji: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          city?: string | null;
          category: string;
          kg_co2_saved: number;
          action_description: string;
          emoji?: string;
        };
        Update: Partial<Database['public']['Tables']['ripple_events']['Insert']>;
        Relationships: [];
      };
      chat_messages: {
        Row: {
          id: string;
          user_id: string;
          role: string;
          content: string;
          tokens_used: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          role: string;
          content: string;
          tokens_used?: number | null;
        };
        Update: Partial<Database['public']['Tables']['chat_messages']['Insert']>;
        Relationships: [];
      };
    };
    Views: {
      user_monthly_carbon: {
        Row: {
          user_id: string;
          month: string;
          category: string;
          total_emitted: number;
          total_saved: number;
          log_count: number;
        };
        Relationships: [];
      };
      user_weekly_carbon: {
        Row: {
          user_id: string;
          week: string;
          total_emitted: number;
          total_saved: number;
          log_count: number;
        };
        Relationships: [];
      };
      city_karma_summary: {
        Row: {
          city: string;
          state: string;
          user_count: number;
          total_karma: number;
          total_kg_saved: number;
        };
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
    Enums: {
      carbon_category:
        | 'electricity'
        | 'transport'
        | 'food'
        | 'cooking_fuel'
        | 'waste'
        | 'shopping'
        | 'water'
        | 'other';
      transport_mode:
        | 'petrol_car'
        | 'diesel_car'
        | 'electric_car'
        | 'cng_auto'
        | 'two_wheeler'
        | 'bus'
        | 'metro'
        | 'train'
        | 'domestic_flight'
        | 'international_flight'
        | 'bicycle'
        | 'walking';
      food_type: 'veg_meal' | 'non_veg_meal' | 'vegan_meal' | 'dairy_product' | 'packaged_food';
      karma_action_type: 'earned' | 'bonus' | 'streak' | 'community' | 'redeemed';
      log_source: 'manual' | 'ai_receipt' | 'ai_photo' | 'action_library' | 'baseline_quiz';
      difficulty_level: 'easy' | 'medium' | 'hard';
    };
    CompositeTypes: Record<string, never>;
  };
}
