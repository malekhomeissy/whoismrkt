export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_recommendations: {
        Row: {
          action: string | null
          created_at: string
          explanation: string | null
          id: string
          is_done: boolean
          priority: Database["public"]["Enums"]["recommendation_priority"]
          recommendation_type: string
          title: string
          user_id: string
        }
        Insert: {
          action?: string | null
          created_at?: string
          explanation?: string | null
          id?: string
          is_done?: boolean
          priority?: Database["public"]["Enums"]["recommendation_priority"]
          recommendation_type: string
          title: string
          user_id: string
        }
        Update: {
          action?: string | null
          created_at?: string
          explanation?: string | null
          id?: string
          is_done?: boolean
          priority?: Database["public"]["Enums"]["recommendation_priority"]
          recommendation_type?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      analytics_snapshots: {
        Row: {
          created_at: string
          engagement_rate: number | null
          follower_growth: number | null
          followers: number | null
          id: string
          impressions: number | null
          platform: Database["public"]["Enums"]["platform"]
          profile_visits: number | null
          reach: number | null
          user_id: string
          views: number | null
        }
        Insert: {
          created_at?: string
          engagement_rate?: number | null
          follower_growth?: number | null
          followers?: number | null
          id?: string
          impressions?: number | null
          platform: Database["public"]["Enums"]["platform"]
          profile_visits?: number | null
          reach?: number | null
          user_id: string
          views?: number | null
        }
        Update: {
          created_at?: string
          engagement_rate?: number | null
          follower_growth?: number | null
          followers?: number | null
          id?: string
          impressions?: number | null
          platform?: Database["public"]["Enums"]["platform"]
          profile_visits?: number | null
          reach?: number | null
          user_id?: string
          views?: number | null
        }
        Relationships: []
      }
      chats: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      connected_accounts: {
        Row: {
          access_token_placeholder: string | null
          connection_status: Database["public"]["Enums"]["connection_status"]
          created_at: string
          id: string
          platform: Database["public"]["Enums"]["platform"]
          platform_account_id: string | null
          refresh_token_placeholder: string | null
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          access_token_placeholder?: string | null
          connection_status?: Database["public"]["Enums"]["connection_status"]
          created_at?: string
          id?: string
          platform: Database["public"]["Enums"]["platform"]
          platform_account_id?: string | null
          refresh_token_placeholder?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          access_token_placeholder?: string | null
          connection_status?: Database["public"]["Enums"]["connection_status"]
          created_at?: string
          id?: string
          platform?: Database["public"]["Enums"]["platform"]
          platform_account_id?: string | null
          refresh_token_placeholder?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      content_calendar: {
        Row: {
          caption: string | null
          created_at: string
          cta: string | null
          hook: string | null
          id: string
          platform: Database["public"]["Enums"]["platform"]
          scheduled_date: string | null
          status: Database["public"]["Enums"]["calendar_status"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          cta?: string | null
          hook?: string | null
          id?: string
          platform: Database["public"]["Enums"]["platform"]
          scheduled_date?: string | null
          status?: Database["public"]["Enums"]["calendar_status"]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          cta?: string | null
          hook?: string | null
          id?: string
          platform?: Database["public"]["Enums"]["platform"]
          scheduled_date?: string | null
          status?: Database["public"]["Enums"]["calendar_status"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          budget: string | null
          company: string | null
          created_at: string
          email: string
          id: string
          message: string
          name: string
          source: string | null
        }
        Insert: {
          budget?: string | null
          company?: string | null
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          source?: string | null
        }
        Update: {
          budget?: string | null
          company?: string | null
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          source?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          chat_id: string
          content: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          chat_id: string
          content: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          chat_id?: string
          content?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          ai_analysis: string | null
          caption: string | null
          comments: number | null
          created_at: string
          cta: string | null
          engagement_rate: number | null
          hook: string | null
          id: string
          likes: number | null
          platform: Database["public"]["Enums"]["platform"]
          posted_at: string | null
          reach: number | null
          saves: number | null
          shares: number | null
          suggested_improvement: string | null
          thumbnail_url: string | null
          user_id: string
          views: number | null
        }
        Insert: {
          ai_analysis?: string | null
          caption?: string | null
          comments?: number | null
          created_at?: string
          cta?: string | null
          engagement_rate?: number | null
          hook?: string | null
          id?: string
          likes?: number | null
          platform: Database["public"]["Enums"]["platform"]
          posted_at?: string | null
          reach?: number | null
          saves?: number | null
          shares?: number | null
          suggested_improvement?: string | null
          thumbnail_url?: string | null
          user_id: string
          views?: number | null
        }
        Update: {
          ai_analysis?: string | null
          caption?: string | null
          comments?: number | null
          created_at?: string
          cta?: string | null
          engagement_rate?: number | null
          hook?: string | null
          id?: string
          likes?: number | null
          platform?: Database["public"]["Enums"]["platform"]
          posted_at?: string | null
          reach?: number | null
          saves?: number | null
          shares?: number | null
          suggested_improvement?: string | null
          thumbnail_url?: string | null
          user_id?: string
          views?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"] | null
          biggest_problem: string | null
          business_stage: string | null
          created_at: string
          email: string | null
          goal: string | null
          id: string
          name: string | null
          niche: string | null
          onboarding_completed: boolean
          onboarding_path: string | null
          platforms: string[] | null
          post_frequency: string | null
          updated_at: string
        }
        Insert: {
          account_type?: Database["public"]["Enums"]["account_type"] | null
          biggest_problem?: string | null
          business_stage?: string | null
          created_at?: string
          email?: string | null
          goal?: string | null
          id: string
          name?: string | null
          niche?: string | null
          onboarding_completed?: boolean
          onboarding_path?: string | null
          platforms?: string[] | null
          post_frequency?: string | null
          updated_at?: string
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"] | null
          biggest_problem?: string | null
          business_stage?: string | null
          created_at?: string
          email?: string | null
          goal?: string | null
          id?: string
          name?: string | null
          niche?: string | null
          onboarding_completed?: boolean
          onboarding_path?: string | null
          platforms?: string[] | null
          post_frequency?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      trends: {
        Row: {
          created_at: string
          difficulty: string | null
          format: string | null
          how_to_use: string | null
          id: string
          platform: Database["public"]["Enums"]["platform"]
          sound_name: string | null
          title: string
          why_it_works: string | null
        }
        Insert: {
          created_at?: string
          difficulty?: string | null
          format?: string | null
          how_to_use?: string | null
          id?: string
          platform: Database["public"]["Enums"]["platform"]
          sound_name?: string | null
          title: string
          why_it_works?: string | null
        }
        Update: {
          created_at?: string
          difficulty?: string | null
          format?: string | null
          how_to_use?: string | null
          id?: string
          platform?: Database["public"]["Enums"]["platform"]
          sound_name?: string | null
          title?: string
          why_it_works?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      account_type: "creator" | "business" | "agency" | "brand"
      calendar_status: "idea" | "drafted" | "scheduled" | "posted"
      connection_status: "connected" | "disconnected" | "pending" | "error"
      platform: "instagram" | "tiktok"
      recommendation_priority: "low" | "medium" | "high" | "critical"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      account_type: ["creator", "business", "agency", "brand"],
      calendar_status: ["idea", "drafted", "scheduled", "posted"],
      connection_status: ["connected", "disconnected", "pending", "error"],
      platform: ["instagram", "tiktok"],
      recommendation_priority: ["low", "medium", "high", "critical"],
    },
  },
} as const
