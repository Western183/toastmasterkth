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
      people: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          session_id: string
        }
        Insert: {
          color: string
          created_at?: string
          id?: string
          name: string
          session_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "people_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions_public"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          created_at: string
          edit_token: string
          id: string
          name: string
          pin_code: string | null
          share_code: string
        }
        Insert: {
          created_at?: string
          edit_token: string
          id?: string
          name: string
          pin_code?: string | null
          share_code: string
        }
        Update: {
          created_at?: string
          edit_token?: string
          id?: string
          name?: string
          pin_code?: string | null
          share_code?: string
        }
        Relationships: []
      }
      tempo_items: {
        Row: {
          created_at: string
          done: boolean
          id: string
          live_count: number | null
          note: string | null
          order_index: number
          page: string | null
          person_id: string | null
          session_id: string
          title: string
          updated_at: string
          video_count: number | null
        }
        Insert: {
          created_at?: string
          done?: boolean
          id?: string
          live_count?: number | null
          note?: string | null
          order_index: number
          page?: string | null
          person_id?: string | null
          session_id: string
          title: string
          updated_at?: string
          video_count?: number | null
        }
        Update: {
          created_at?: string
          done?: boolean
          id?: string
          live_count?: number | null
          note?: string | null
          order_index?: number
          page?: string | null
          person_id?: string | null
          session_id?: string
          title?: string
          updated_at?: string
          video_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tempo_items_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tempo_items_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tempo_items_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions_public"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      sessions_public: {
        Row: {
          created_at: string | null
          id: string | null
          name: string | null
          share_code: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          name?: string | null
          share_code?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          name?: string | null
          share_code?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_person_with_token: {
        Args: {
          p_color: string
          p_edit_token: string
          p_name: string
          p_session_id: string
        }
        Returns: string
      }
      create_tempo_item_with_token: {
        Args: {
          p_edit_token: string
          p_live_count?: number
          p_note?: string
          p_order_index: number
          p_page?: string
          p_person_id?: string
          p_session_id: string
          p_title: string
          p_video_count?: number
        }
        Returns: string
      }
      delete_person_with_token: {
        Args: { p_edit_token: string; p_person_id: string }
        Returns: boolean
      }
      delete_session_with_token: {
        Args: { p_edit_token: string; p_session_id: string }
        Returns: boolean
      }
      delete_tempo_item_with_token: {
        Args: { p_edit_token: string; p_item_id: string }
        Returns: boolean
      }
      get_session_by_share_code: {
        Args: { p_share_code: string }
        Returns: {
          created_at: string
          has_pin: boolean
          id: string
          name: string
          share_code: string
        }[]
      }
      update_tempo_done: {
        Args: { p_done: boolean; p_item_id: string }
        Returns: boolean
      }
      update_tempo_item_with_token: {
        Args: {
          p_done?: boolean
          p_edit_token: string
          p_item_id: string
          p_live_count?: number
          p_note?: string
          p_order_index?: number
          p_page?: string
          p_person_id?: string
          p_title?: string
          p_video_count?: number
        }
        Returns: boolean
      }
      update_tempo_order_with_token: {
        Args: { p_edit_token: string; p_items: Json; p_session_id: string }
        Returns: boolean
      }
      verify_edit_token: {
        Args: { p_edit_token: string; p_session_id: string }
        Returns: boolean
      }
      verify_session_pin: {
        Args: { p_pin_code: string; p_session_id: string }
        Returns: {
          created_at: string
          id: string
          name: string
          pin_is_valid: boolean
          share_code: string
        }[]
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
