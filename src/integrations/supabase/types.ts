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
      client_profiles: {
        Row: {
          address: string
          age: number | null
          created_at: string
          full_name: string
          gender: string
          id: string
          phone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string
          age?: number | null
          created_at?: string
          full_name?: string
          gender?: string
          id?: string
          phone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string
          age?: number | null
          created_at?: string
          full_name?: string
          gender?: string
          id?: string
          phone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      professional_profiles: {
        Row: {
          created_at: string
          descripcion: string
          full_name: string
          id: string
          matricula_url: string | null
          photo_url: string | null
          plan: string
          rubro: string
          updated_at: string
          user_id: string
          verified: boolean
        }
        Insert: {
          created_at?: string
          descripcion?: string
          full_name?: string
          id?: string
          matricula_url?: string | null
          photo_url?: string | null
          plan?: string
          rubro?: string
          updated_at?: string
          user_id: string
          verified?: boolean
        }
        Update: {
          created_at?: string
          descripcion?: string
          full_name?: string
          id?: string
          matricula_url?: string | null
          photo_url?: string | null
          plan?: string
          rubro?: string
          updated_at?: string
          user_id?: string
          verified?: boolean
        }
        Relationships: []
      }
      reviews: {
        Row: {
          client_user_id: string
          comment: string | null
          created_at: string
          id: string
          professional_id: string
          rating: number
          service_request_id: string
        }
        Insert: {
          client_user_id: string
          comment?: string | null
          created_at?: string
          id?: string
          professional_id: string
          rating: number
          service_request_id: string
        }
        Update: {
          client_user_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          professional_id?: string
          rating?: number
          service_request_id?: string
        }
        Relationships: []
      }
      service_requests: {
        Row: {
          client_address: string | null
          client_name: string
          client_phone: string | null
          completed_at: string | null
          created_at: string
          description: string
          id: string
          professional_id: string
          quoted_amount: number | null
          quoted_details: string | null
          responded_at: string | null
          schedule_met: boolean | null
          scheduled_date: string | null
          scheduled_time: string | null
          service_type: string
          status: Database["public"]["Enums"]["request_status"]
          updated_at: string
        }
        Insert: {
          client_address?: string | null
          client_name?: string
          client_phone?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string
          id?: string
          professional_id: string
          quoted_amount?: number | null
          quoted_details?: string | null
          responded_at?: string | null
          schedule_met?: boolean | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          service_type?: string
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
        }
        Update: {
          client_address?: string | null
          client_name?: string
          client_phone?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string
          id?: string
          professional_id?: string
          quoted_amount?: number | null
          quoted_details?: string | null
          responded_at?: string | null
          schedule_met?: boolean | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          service_type?: string
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_professional_score: {
        Args: { p_professional_id: string }
        Returns: Json
      }
    }
    Enums: {
      request_status:
        | "nueva"
        | "cotizada"
        | "aceptada"
        | "en_servicio"
        | "finalizada"
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
      request_status: [
        "nueva",
        "cotizada",
        "aceptada",
        "en_servicio",
        "finalizada",
      ],
    },
  },
} as const
