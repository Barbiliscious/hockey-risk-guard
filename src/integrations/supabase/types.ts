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
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      rg_audit_log: {
        Row: {
          action_type: string | null
          created_at: string
          device_info: string | null
          entity_id: string | null
          entity_type: string | null
          field_changed: string | null
          id: string
          ip_address: string | null
          is_sensitive: boolean
          new_value: string | null
          previous_value: string | null
          reason_for_change: string | null
          user_id: string | null
          user_name: string | null
          user_role: string | null
        }
        Insert: {
          action_type?: string | null
          created_at?: string
          device_info?: string | null
          entity_id?: string | null
          entity_type?: string | null
          field_changed?: string | null
          id?: string
          ip_address?: string | null
          is_sensitive?: boolean
          new_value?: string | null
          previous_value?: string | null
          reason_for_change?: string | null
          user_id?: string | null
          user_name?: string | null
          user_role?: string | null
        }
        Update: {
          action_type?: string | null
          created_at?: string
          device_info?: string | null
          entity_id?: string | null
          entity_type?: string | null
          field_changed?: string | null
          id?: string
          ip_address?: string | null
          is_sensitive?: boolean
          new_value?: string | null
          previous_value?: string | null
          reason_for_change?: string | null
          user_id?: string | null
          user_name?: string | null
          user_role?: string | null
        }
        Relationships: []
      }
      rg_dropdown_values: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          list_type: string
          sort_order: number | null
          value: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          list_type: string
          sort_order?: number | null
          value: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          list_type?: string
          sort_order?: number | null
          value?: string
        }
        Relationships: []
      }
      rg_risk_guidance_sections: {
        Row: {
          content: string
          created_at: string
          id: string
          section_key: string
          sort_order: number | null
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          section_key: string
          sort_order?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          section_key?: string
          sort_order?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      rg_risk_matrix: {
        Row: {
          consequence_label: string
          consequence_score: number
          created_at: string
          id: string
          likelihood_label: string
          likelihood_score: number
          rating: string
          updated_at: string
        }
        Insert: {
          consequence_label: string
          consequence_score: number
          created_at?: string
          id?: string
          likelihood_label: string
          likelihood_score: number
          rating: string
          updated_at?: string
        }
        Update: {
          consequence_label?: string
          consequence_score?: number
          created_at?: string
          id?: string
          likelihood_label?: string
          likelihood_score?: number
          rating?: string
          updated_at?: string
        }
        Relationships: []
      }
      rg_risk_register: {
        Row: {
          archived_at: string | null
          archived_by: string | null
          consequences: string | null
          controls_in_place: string | null
          created_at: string
          created_by: string | null
          current_risk_summary: string | null
          evidence_notes: string | null
          id: string
          inherent_consequence_score: number | null
          inherent_likelihood_score: number | null
          is_archived: boolean
          last_reviewed_date: string | null
          level: string | null
          next_review_date: string | null
          residual_consequence_score: number | null
          residual_likelihood_score: number | null
          review_frequency: string | null
          reviewed_by: string | null
          risk_category: string | null
          risk_event: string
          risk_external_id: string
          risk_owner: string | null
          risk_target_description: string | null
          risk_target_rating: string | null
          risk_type: string | null
          status: string | null
          team_id: string | null
          treatment_plan: string | null
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          archived_by?: string | null
          consequences?: string | null
          controls_in_place?: string | null
          created_at?: string
          created_by?: string | null
          current_risk_summary?: string | null
          evidence_notes?: string | null
          id?: string
          inherent_consequence_score?: number | null
          inherent_likelihood_score?: number | null
          is_archived?: boolean
          last_reviewed_date?: string | null
          level?: string | null
          next_review_date?: string | null
          residual_consequence_score?: number | null
          residual_likelihood_score?: number | null
          review_frequency?: string | null
          reviewed_by?: string | null
          risk_category?: string | null
          risk_event: string
          risk_external_id: string
          risk_owner?: string | null
          risk_target_description?: string | null
          risk_target_rating?: string | null
          risk_type?: string | null
          status?: string | null
          team_id?: string | null
          treatment_plan?: string | null
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          archived_by?: string | null
          consequences?: string | null
          controls_in_place?: string | null
          created_at?: string
          created_by?: string | null
          current_risk_summary?: string | null
          evidence_notes?: string | null
          id?: string
          inherent_consequence_score?: number | null
          inherent_likelihood_score?: number | null
          is_archived?: boolean
          last_reviewed_date?: string | null
          level?: string | null
          next_review_date?: string | null
          residual_consequence_score?: number | null
          residual_likelihood_score?: number | null
          review_frequency?: string | null
          reviewed_by?: string | null
          risk_category?: string | null
          risk_event?: string
          risk_external_id?: string
          risk_owner?: string | null
          risk_target_description?: string | null
          risk_target_rating?: string | null
          risk_type?: string | null
          status?: string | null
          team_id?: string | null
          treatment_plan?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rg_risk_register_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      rg_risk_reviews: {
        Row: {
          created_at: string
          id: string
          inherent_consequence_score: number | null
          inherent_likelihood_score: number | null
          inherent_rating_snapshot: string | null
          notes: string | null
          outcome: string | null
          residual_consequence_score: number | null
          residual_likelihood_score: number | null
          residual_rating_snapshot: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          risk_id: string | null
          risk_status_snapshot: string | null
          risk_target_rating_snapshot: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          inherent_consequence_score?: number | null
          inherent_likelihood_score?: number | null
          inherent_rating_snapshot?: string | null
          notes?: string | null
          outcome?: string | null
          residual_consequence_score?: number | null
          residual_likelihood_score?: number | null
          residual_rating_snapshot?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          risk_id?: string | null
          risk_status_snapshot?: string | null
          risk_target_rating_snapshot?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          inherent_consequence_score?: number | null
          inherent_likelihood_score?: number | null
          inherent_rating_snapshot?: string | null
          notes?: string | null
          outcome?: string | null
          residual_consequence_score?: number | null
          residual_likelihood_score?: number | null
          residual_rating_snapshot?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          risk_id?: string | null
          risk_status_snapshot?: string | null
          risk_target_rating_snapshot?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rg_risk_reviews_risk_id_fkey"
            columns: ["risk_id"]
            isOneToOne: false
            referencedRelation: "rg_risk_register"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_edit_risk_matrix: { Args: { _user_id: string }; Returns: boolean }
      has_risk_access: { Args: { _user_id: string }; Returns: boolean }
      has_role: { Args: { _role: string; _user_id: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
