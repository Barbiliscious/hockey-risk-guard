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
      rg_be_smart_actions: {
        Row: {
          achievable: string | null
          action_external_id: string
          action_title: string
          archived_at: string | null
          archived_by: string | null
          baseline: string | null
          club_id: string | null
          created_at: string
          created_by: string | null
          date_completed: string | null
          due_date: string | null
          evaluate: string | null
          evidence_notes: string | null
          id: string
          is_archived: boolean
          linked_risk_id: string | null
          measurable: string | null
          progress_notes: string | null
          relevant: string | null
          resources_needed: string | null
          responsible_person_role: string | null
          specific: string | null
          status: string
          team_id: string | null
          time_based: string | null
          updated_at: string
        }
        Insert: {
          achievable?: string | null
          action_external_id?: string
          action_title: string
          archived_at?: string | null
          archived_by?: string | null
          baseline?: string | null
          club_id?: string | null
          created_at?: string
          created_by?: string | null
          date_completed?: string | null
          due_date?: string | null
          evaluate?: string | null
          evidence_notes?: string | null
          id?: string
          is_archived?: boolean
          linked_risk_id?: string | null
          measurable?: string | null
          progress_notes?: string | null
          relevant?: string | null
          resources_needed?: string | null
          responsible_person_role?: string | null
          specific?: string | null
          status?: string
          team_id?: string | null
          time_based?: string | null
          updated_at?: string
        }
        Update: {
          achievable?: string | null
          action_external_id?: string
          action_title?: string
          archived_at?: string | null
          archived_by?: string | null
          baseline?: string | null
          club_id?: string | null
          created_at?: string
          created_by?: string | null
          date_completed?: string | null
          due_date?: string | null
          evaluate?: string | null
          evidence_notes?: string | null
          id?: string
          is_archived?: boolean
          linked_risk_id?: string | null
          measurable?: string | null
          progress_notes?: string | null
          relevant?: string | null
          resources_needed?: string | null
          responsible_person_role?: string | null
          specific?: string | null
          status?: string
          team_id?: string | null
          time_based?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rg_be_smart_actions_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "rg_clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rg_be_smart_actions_linked_risk_id_fkey"
            columns: ["linked_risk_id"]
            isOneToOne: false
            referencedRelation: "rg_risk_register"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rg_be_smart_actions_linked_risk_id_fkey"
            columns: ["linked_risk_id"]
            isOneToOne: false
            referencedRelation: "rg_v_risk_alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rg_be_smart_actions_linked_risk_id_fkey"
            columns: ["linked_risk_id"]
            isOneToOne: false
            referencedRelation: "rg_v_risks_with_live_ratings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rg_be_smart_actions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      rg_clubs: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          short_name: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          short_name?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          short_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      rg_comments: {
        Row: {
          author_id: string | null
          body: string
          created_at: string
          edited_at: string | null
          entity_id: string
          entity_type: string
          id: string
          is_deleted: boolean
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string
          edited_at?: string | null
          entity_id: string
          entity_type: string
          id?: string
          is_deleted?: boolean
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          edited_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          is_deleted?: boolean
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
      rg_quality_improvement_items: {
        Row: {
          archived_at: string | null
          archived_by: string | null
          area: string | null
          club_id: string | null
          created_at: string
          date_closed: string | null
          date_logged: string
          description: string
          evidence_notes: string | null
          id: string
          is_archived: boolean
          linked_action_id: string | null
          linked_risk_id: string | null
          logged_by: string | null
          outcome_decision: string | null
          owner_reviewer: string | null
          priority: string | null
          qi_external_id: string
          qi_type: string | null
          reason_background: string | null
          recommended_action: string | null
          related_project_review: string | null
          review_date: string | null
          review_trigger: string | null
          source: string | null
          status: string
          team_id: string | null
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          archived_by?: string | null
          area?: string | null
          club_id?: string | null
          created_at?: string
          date_closed?: string | null
          date_logged?: string
          description: string
          evidence_notes?: string | null
          id?: string
          is_archived?: boolean
          linked_action_id?: string | null
          linked_risk_id?: string | null
          logged_by?: string | null
          outcome_decision?: string | null
          owner_reviewer?: string | null
          priority?: string | null
          qi_external_id?: string
          qi_type?: string | null
          reason_background?: string | null
          recommended_action?: string | null
          related_project_review?: string | null
          review_date?: string | null
          review_trigger?: string | null
          source?: string | null
          status?: string
          team_id?: string | null
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          archived_by?: string | null
          area?: string | null
          club_id?: string | null
          created_at?: string
          date_closed?: string | null
          date_logged?: string
          description?: string
          evidence_notes?: string | null
          id?: string
          is_archived?: boolean
          linked_action_id?: string | null
          linked_risk_id?: string | null
          logged_by?: string | null
          outcome_decision?: string | null
          owner_reviewer?: string | null
          priority?: string | null
          qi_external_id?: string
          qi_type?: string | null
          reason_background?: string | null
          recommended_action?: string | null
          related_project_review?: string | null
          review_date?: string | null
          review_trigger?: string | null
          source?: string | null
          status?: string
          team_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rg_quality_improvement_items_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "rg_clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rg_quality_improvement_items_linked_action_id_fkey"
            columns: ["linked_action_id"]
            isOneToOne: false
            referencedRelation: "rg_be_smart_actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rg_quality_improvement_items_linked_risk_id_fkey"
            columns: ["linked_risk_id"]
            isOneToOne: false
            referencedRelation: "rg_risk_register"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rg_quality_improvement_items_linked_risk_id_fkey"
            columns: ["linked_risk_id"]
            isOneToOne: false
            referencedRelation: "rg_v_risk_alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rg_quality_improvement_items_linked_risk_id_fkey"
            columns: ["linked_risk_id"]
            isOneToOne: false
            referencedRelation: "rg_v_risks_with_live_ratings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rg_quality_improvement_items_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
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
          club_id: string | null
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
          club_id?: string | null
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
        Update: {
          archived_at?: string | null
          archived_by?: string | null
          club_id?: string | null
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
            foreignKeyName: "rg_risk_register_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "rg_clubs"
            referencedColumns: ["id"]
          },
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
          {
            foreignKeyName: "rg_risk_reviews_risk_id_fkey"
            columns: ["risk_id"]
            isOneToOne: false
            referencedRelation: "rg_v_risk_alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rg_risk_reviews_risk_id_fkey"
            columns: ["risk_id"]
            isOneToOne: false
            referencedRelation: "rg_v_risks_with_live_ratings"
            referencedColumns: ["id"]
          },
        ]
      }
      rg_team_club_links: {
        Row: {
          active: boolean
          club_id: string
          created_at: string
          id: string
          team_id: string
        }
        Insert: {
          active?: boolean
          club_id: string
          created_at?: string
          id?: string
          team_id: string
        }
        Update: {
          active?: boolean
          club_id?: string
          created_at?: string
          id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rg_team_club_links_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "rg_clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rg_team_club_links_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
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
      rg_v_dashboard_summary: {
        Row: {
          alert_high_no_action: number | null
          alert_no_controls: number | null
          alert_no_owner: number | null
          alert_qi_awaiting_decision: number | null
          alert_residual_above_target: number | null
          alert_review_overdue: number | null
          bylaw_2027_items: number | null
          high_risks: number | null
          low_risks: number | null
          medium_risks: number | null
          open_actions: number | null
          overdue_actions: number | null
          qi_under_review: number | null
          total_risks: number | null
          very_high_risks: number | null
        }
        Relationships: []
      }
      rg_v_due_items: {
        Row: {
          days_overdue: number | null
          due_date: string | null
          external_id: string | null
          item_id: string | null
          item_type: string | null
          linked_risk_external_id: string | null
          linked_risk_id: string | null
          owner: string | null
          status: string | null
          title: string | null
        }
        Relationships: []
      }
      rg_v_risk_alerts: {
        Row: {
          active_action_count: number | null
          club_id: string | null
          controls_in_place: string | null
          flag_high_no_action: boolean | null
          flag_no_controls: boolean | null
          flag_no_owner: boolean | null
          flag_residual_above_target: boolean | null
          flag_review_overdue: boolean | null
          id: string | null
          live_inherent_rating: string | null
          live_residual_rating: string | null
          next_review_date: string | null
          risk_event: string | null
          risk_external_id: string | null
          risk_owner: string | null
          risk_target_rating: string | null
          status: string | null
          team_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rg_risk_register_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "rg_clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rg_risk_register_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      rg_v_risks_with_live_ratings: {
        Row: {
          archived_at: string | null
          archived_by: string | null
          club_id: string | null
          consequences: string | null
          controls_in_place: string | null
          created_at: string | null
          created_by: string | null
          current_risk_summary: string | null
          evidence_notes: string | null
          id: string | null
          inherent_consequence_score: number | null
          inherent_likelihood_score: number | null
          is_archived: boolean | null
          last_reviewed_date: string | null
          level: string | null
          live_inherent_rating: string | null
          live_residual_rating: string | null
          next_review_date: string | null
          residual_consequence_score: number | null
          residual_likelihood_score: number | null
          residual_rating_score: number | null
          review_frequency: string | null
          reviewed_by: string | null
          risk_category: string | null
          risk_event: string | null
          risk_external_id: string | null
          risk_owner: string | null
          risk_target_description: string | null
          risk_target_rating: string | null
          risk_type: string | null
          status: string | null
          target_rating_score: number | null
          team_id: string | null
          treatment_plan: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rg_risk_register_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "rg_clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rg_risk_register_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      can_edit_risk_matrix: { Args: { _user_id: string }; Returns: boolean }
      has_risk_access: { Args: { _user_id: string }; Returns: boolean }
      has_role: { Args: { _role: string; _user_id: string }; Returns: boolean }
      rg_next_action_external_id: { Args: never; Returns: string }
      rg_next_qi_external_id: { Args: never; Returns: string }
      rg_next_risk_external_id: { Args: never; Returns: string }
      rg_record_risk_review: {
        Args: { p_notes: string; p_outcome: string; p_risk_id: string }
        Returns: string
      }
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
