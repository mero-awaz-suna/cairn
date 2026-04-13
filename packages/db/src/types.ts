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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_hash: string | null
          metadata: Json | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_hash?: string | null
          metadata?: Json | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_hash?: string | null
          metadata?: Json | null
        }
        Relationships: []
      }
      burden_drops: {
        Row: {
          burden_embedding: string | null
          created_at: string
          extracted_theme: string
          id: string
          raw_burden_text: string
          theme_confidence: number
          user_id: string
        }
        Insert: {
          burden_embedding?: string | null
          created_at?: string
          extracted_theme: string
          id?: string
          raw_burden_text: string
          theme_confidence: number
          user_id: string
        }
        Update: {
          burden_embedding?: string | null
          created_at?: string
          extracted_theme?: string
          id?: string
          raw_burden_text?: string
          theme_confidence?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "burden_drops_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      burden_taxonomy: {
        Row: {
          created_at: string
          cultural_tags: string[] | null
          display_label: string
          id: string
          is_active: boolean | null
          parent_theme: string | null
          theme_key: string
        }
        Insert: {
          created_at?: string
          cultural_tags?: string[] | null
          display_label: string
          id?: string
          is_active?: boolean | null
          parent_theme?: string | null
          theme_key: string
        }
        Update: {
          created_at?: string
          cultural_tags?: string[] | null
          display_label?: string
          id?: string
          is_active?: boolean | null
          parent_theme?: string | null
          theme_key?: string
        }
        Relationships: []
      }
      circle_members: {
        Row: {
          anonymous_alias: string
          circle_id: string
          id: string
          insight_saved_to_wall: boolean
          joined_at: string
          last_active_at: string | null
          left_at: string | null
          message_count: number
          role_label: Database["public"]["Enums"]["circle_role_enum"]
          session_summary: string | null
          user_id: string
        }
        Insert: {
          anonymous_alias: string
          circle_id: string
          id?: string
          insight_saved_to_wall?: boolean
          joined_at?: string
          last_active_at?: string | null
          left_at?: string | null
          message_count?: number
          role_label: Database["public"]["Enums"]["circle_role_enum"]
          session_summary?: string | null
          user_id: string
        }
        Update: {
          anonymous_alias?: string
          circle_id?: string
          id?: string
          insight_saved_to_wall?: boolean
          joined_at?: string
          last_active_at?: string | null
          left_at?: string | null
          message_count?: number
          role_label?: Database["public"]["Enums"]["circle_role_enum"]
          session_summary?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "circle_members_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "circles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "circle_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      circles: {
        Row: {
          closed_at: string | null
          created_at: string
          crisis_triggered: boolean
          cultural_context:
            | Database["public"]["Enums"]["cultural_context_enum"]
            | null
          facilitator_state: Json
          formed_at: string | null
          id: string
          intervention_count: number
          primary_burden_tag: string | null
          purge_at: string | null
          status: Database["public"]["Enums"]["circle_status_enum"]
          target_size: number
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          crisis_triggered?: boolean
          cultural_context?:
            | Database["public"]["Enums"]["cultural_context_enum"]
            | null
          facilitator_state?: Json
          formed_at?: string | null
          id?: string
          intervention_count?: number
          primary_burden_tag?: string | null
          purge_at?: string | null
          status?: Database["public"]["Enums"]["circle_status_enum"]
          target_size?: number
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          crisis_triggered?: boolean
          cultural_context?:
            | Database["public"]["Enums"]["cultural_context_enum"]
            | null
          facilitator_state?: Json
          formed_at?: string | null
          id?: string
          intervention_count?: number
          primary_burden_tag?: string | null
          purge_at?: string | null
          status?: Database["public"]["Enums"]["circle_status_enum"]
          target_size?: number
        }
        Relationships: []
      }
      expense_splits: {
        Row: {
          amount: number
          created_at: string | null
          expense_id: string
          id: string
          is_settled: boolean | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          expense_id: string
          id?: string
          is_settled?: boolean | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          expense_id?: string
          id?: string
          is_settled?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_splits_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_splits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string | null
          created_at: string | null
          description: string
          group_id: string | null
          id: string
          paid_by: string
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string | null
          description: string
          group_id?: string | null
          id?: string
          paid_by: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string | null
          description?: string
          group_id?: string | null
          id?: string
          paid_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_paid_by_fkey"
            columns: ["paid_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      friendships: {
        Row: {
          created_at: string | null
          friend_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          friend_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          friend_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "friendships_friend_id_fkey"
            columns: ["friend_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string | null
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string | null
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          created_at: string | null
          created_by: string | null
          emoji: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          emoji?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          emoji?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          ai_model_used: string
          ai_processing_ms: number | null
          assigned_persona: Database["public"]["Enums"]["persona_enum"]
          audio_storage_path: string | null
          burden_themes: string[]
          created_at: string
          crisis_detected: boolean
          crisis_keywords: string[] | null
          id: string
          input_type: Database["public"]["Enums"]["input_type_enum"]
          micro_intervention: string
          persona_confidence: number
          raw_transcript: string | null
          recognition_message: string
          stress_level: number
          transcript_embedding: string | null
          transcription_ms: number | null
          user_id: string
        }
        Insert: {
          ai_model_used?: string
          ai_processing_ms?: number | null
          assigned_persona: Database["public"]["Enums"]["persona_enum"]
          audio_storage_path?: string | null
          burden_themes?: string[]
          created_at?: string
          crisis_detected?: boolean
          crisis_keywords?: string[] | null
          id?: string
          input_type: Database["public"]["Enums"]["input_type_enum"]
          micro_intervention: string
          persona_confidence: number
          raw_transcript?: string | null
          recognition_message: string
          stress_level: number
          transcript_embedding?: string | null
          transcription_ms?: number | null
          user_id: string
        }
        Update: {
          ai_model_used?: string
          ai_processing_ms?: number | null
          assigned_persona?: Database["public"]["Enums"]["persona_enum"]
          audio_storage_path?: string | null
          burden_themes?: string[]
          created_at?: string
          crisis_detected?: boolean
          crisis_keywords?: string[] | null
          id?: string
          input_type?: Database["public"]["Enums"]["input_type_enum"]
          micro_intervention?: string
          persona_confidence?: number
          raw_transcript?: string | null
          recognition_message?: string
          stress_level?: number
          transcript_embedding?: string | null
          transcription_ms?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      memories: {
        Row: {
          ai_safety_score: number | null
          burden_tag: string
          created_at: string
          cultural_tag: Database["public"]["Enums"]["cultural_context_enum"]
          display_weight: number
          helped_count: number
          id: string
          is_approved: boolean
          is_featured: boolean
          quote_text: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          source_session_id: string | null
          source_type: Database["public"]["Enums"]["memory_source_enum"]
          source_user_id: string | null
        }
        Insert: {
          ai_safety_score?: number | null
          burden_tag: string
          created_at?: string
          cultural_tag?: Database["public"]["Enums"]["cultural_context_enum"]
          display_weight?: number
          helped_count?: number
          id?: string
          is_approved?: boolean
          is_featured?: boolean
          quote_text: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_session_id?: string | null
          source_type: Database["public"]["Enums"]["memory_source_enum"]
          source_user_id?: string | null
        }
        Update: {
          ai_safety_score?: number | null
          burden_tag?: string
          created_at?: string
          cultural_tag?: Database["public"]["Enums"]["cultural_context_enum"]
          display_weight?: number
          helped_count?: number
          id?: string
          is_approved?: boolean
          is_featured?: boolean
          quote_text?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_session_id?: string | null
          source_type?: Database["public"]["Enums"]["memory_source_enum"]
          source_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "memories_source_user_id_fkey"
            columns: ["source_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          circle_id: string
          content: string
          created_at: string
          crisis_score: number | null
          id: string
          is_crisis_resource: boolean
          is_facilitator_msg: boolean
          member_id: string | null
          sender_type: Database["public"]["Enums"]["sender_type_enum"]
          sentiment_score: number | null
          themes_detected: string[] | null
        }
        Insert: {
          circle_id: string
          content: string
          created_at?: string
          crisis_score?: number | null
          id?: string
          is_crisis_resource?: boolean
          is_facilitator_msg?: boolean
          member_id?: string | null
          sender_type: Database["public"]["Enums"]["sender_type_enum"]
          sentiment_score?: number | null
          themes_detected?: string[] | null
        }
        Update: {
          circle_id?: string
          content?: string
          created_at?: string
          crisis_score?: number | null
          id?: string
          is_crisis_resource?: boolean
          is_facilitator_msg?: boolean
          member_id?: string | null
          sender_type?: Database["public"]["Enums"]["sender_type_enum"]
          sentiment_score?: number | null
          themes_detected?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "circles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "circle_members"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          display_name: string | null
          id: string
          phone: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          id: string
          phone?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string
          phone?: string | null
        }
        Relationships: []
      }
      rate_limit_events: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_hash: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_hash?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_hash?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rate_limit_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_persona_history: {
        Row: {
          id: string
          journal_entry_id: string | null
          persona: Database["public"]["Enums"]["persona_enum"]
          recorded_at: string
          stress_level: number | null
          user_id: string
        }
        Insert: {
          id?: string
          journal_entry_id?: string | null
          persona: Database["public"]["Enums"]["persona_enum"]
          recorded_at?: string
          stress_level?: number | null
          user_id: string
        }
        Update: {
          id?: string
          journal_entry_id?: string | null
          persona?: Database["public"]["Enums"]["persona_enum"]
          recorded_at?: string
          stress_level?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_persona_history_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_persona_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          granted_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role_enum"]
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role_enum"]
          user_id: string
        }
        Update: {
          created_at?: string
          granted_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role_enum"]
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          academic_stage: Database["public"]["Enums"]["academic_stage_enum"]
          burdens_dropped: number
          circles_joined: number
          consented_to_ai_at: string
          consented_to_terms_at: string
          created_at: string
          crisis_flagged_at: string | null
          cultural_context:
            | Database["public"]["Enums"]["cultural_context_enum"]
            | null
          current_persona: Database["public"]["Enums"]["persona_enum"]
          current_stress_level: number | null
          data_deletion_requested: boolean
          deletion_requested_at: string | null
          id: string
          is_in_crisis: boolean
          is_suspended: boolean
          journal_streak: number
          last_journal_at: string | null
          memories_saved: number
          persona_confidence: number
          primary_burden: Database["public"]["Enums"]["primary_burden_enum"]
          supabase_auth_id: string
          suspension_reason: string | null
          updated_at: string
        }
        Insert: {
          academic_stage?: Database["public"]["Enums"]["academic_stage_enum"]
          burdens_dropped?: number
          circles_joined?: number
          consented_to_ai_at?: string
          consented_to_terms_at?: string
          created_at?: string
          crisis_flagged_at?: string | null
          cultural_context?:
            | Database["public"]["Enums"]["cultural_context_enum"]
            | null
          current_persona?: Database["public"]["Enums"]["persona_enum"]
          current_stress_level?: number | null
          data_deletion_requested?: boolean
          deletion_requested_at?: string | null
          id?: string
          is_in_crisis?: boolean
          is_suspended?: boolean
          journal_streak?: number
          last_journal_at?: string | null
          memories_saved?: number
          persona_confidence?: number
          primary_burden?: Database["public"]["Enums"]["primary_burden_enum"]
          supabase_auth_id: string
          suspension_reason?: string | null
          updated_at?: string
        }
        Update: {
          academic_stage?: Database["public"]["Enums"]["academic_stage_enum"]
          burdens_dropped?: number
          circles_joined?: number
          consented_to_ai_at?: string
          consented_to_terms_at?: string
          created_at?: string
          crisis_flagged_at?: string | null
          cultural_context?:
            | Database["public"]["Enums"]["cultural_context_enum"]
            | null
          current_persona?: Database["public"]["Enums"]["persona_enum"]
          current_stress_level?: number | null
          data_deletion_requested?: boolean
          deletion_requested_at?: string | null
          id?: string
          is_in_crisis?: boolean
          is_suspended?: boolean
          journal_streak?: number
          last_journal_at?: string | null
          memories_saved?: number
          persona_confidence?: number
          primary_burden?: Database["public"]["Enums"]["primary_burden_enum"]
          supabase_auth_id?: string
          suspension_reason?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      burden_theme_counts: {
        Row: {
          extracted_theme: string | null
          total_count: number | null
          unique_user_count: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      auth_has_role: {
        Args: { _role: Database["public"]["Enums"]["app_role_enum"] }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role_enum"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      academic_stage_enum:
        | "just_arrived"
        | "in_the_middle"
        | "finding_footing"
        | "helping_others"
      app_role_enum: "user" | "moderator" | "admin"
      circle_role_enum: "storm" | "finding_ground" | "through_it" | "helper"
      circle_status_enum: "forming" | "active" | "closing" | "closed" | "purged"
      cultural_context_enum:
        | "nepali"
        | "south_asian"
        | "international"
        | "universal"
      input_type_enum: "audio" | "text"
      memory_source_enum: "user_submitted" | "seed" | "ai_generated"
      persona_enum: "storm" | "ground" | "through_it"
      primary_burden_enum: "career" | "family" | "belonging" | "all_of_it"
      sender_type_enum: "member" | "facilitator"
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
      academic_stage_enum: [
        "just_arrived",
        "in_the_middle",
        "finding_footing",
        "helping_others",
      ],
      app_role_enum: ["user", "moderator", "admin"],
      circle_role_enum: ["storm", "finding_ground", "through_it", "helper"],
      circle_status_enum: ["forming", "active", "closing", "closed", "purged"],
      cultural_context_enum: [
        "nepali",
        "south_asian",
        "international",
        "universal",
      ],
      input_type_enum: ["audio", "text"],
      memory_source_enum: ["user_submitted", "seed", "ai_generated"],
      persona_enum: ["storm", "ground", "through_it"],
      primary_burden_enum: ["career", "family", "belonging", "all_of_it"],
      sender_type_enum: ["member", "facilitator"],
    },
  },
} as const
