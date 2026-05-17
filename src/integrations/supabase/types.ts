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
      blocked_slots: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          professional_id: string
          service_request_id: string | null
          slot_date: string
          slot_end_time: string | null
          slot_status: string
          slot_time: string
          station_index: number | null
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          professional_id: string
          service_request_id?: string | null
          slot_date: string
          slot_end_time?: string | null
          slot_status?: string
          slot_time: string
          station_index?: number | null
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          professional_id?: string
          service_request_id?: string | null
          slot_date?: string
          slot_end_time?: string | null
          slot_status?: string
          slot_time?: string
          station_index?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "blocked_slots_service_request_id_fkey"
            columns: ["service_request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
        ]
      }
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
      favorites: {
        Row: {
          client_user_id: string
          created_at: string
          id: string
          professional_id: string
        }
        Insert: {
          client_user_id: string
          created_at?: string
          id?: string
          professional_id: string
        }
        Update: {
          client_user_id?: string
          created_at?: string
          id?: string
          professional_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          service_request_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          service_request_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          service_request_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      professional_availability: {
        Row: {
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          is_active: boolean
          professional_id: string
          start_time: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          is_active?: boolean
          professional_id: string
          start_time: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          is_active?: boolean
          professional_id?: string
          start_time?: string
          updated_at?: string
        }
        Relationships: []
      }
      professional_portfolio: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          photo_url: string
          professional_id: string
          title: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          photo_url: string
          professional_id: string
          title?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          photo_url?: string
          professional_id?: string
          title?: string | null
        }
        Relationships: []
      }
      professional_profiles: {
        Row: {
          address: string
          available: boolean
          created_at: string
          descripcion: string
          dni_back_url: string | null
          dni_front_url: string | null
          dni_rejection_reason: string | null
          dni_submitted_at: string | null
          dni_verification_status: string
          full_name: string
          google_maps_url: string
          id: string
          lat: number | null
          lng: number | null
          locality: string
          matricula_url: string | null
          neighborhood: string
          parking_spots: number
          photo_url: string | null
          plan: string
          province: string
          rubro: string
          services: Json
          slot_duration_minutes: number
          updated_at: string
          user_id: string
          vehicle_types: string[]
          verified: boolean
          work_stations: number
        }
        Insert: {
          address?: string
          available?: boolean
          created_at?: string
          descripcion?: string
          dni_back_url?: string | null
          dni_front_url?: string | null
          dni_rejection_reason?: string | null
          dni_submitted_at?: string | null
          dni_verification_status?: string
          full_name?: string
          google_maps_url?: string
          id?: string
          lat?: number | null
          lng?: number | null
          locality?: string
          matricula_url?: string | null
          neighborhood?: string
          parking_spots?: number
          photo_url?: string | null
          plan?: string
          province?: string
          rubro?: string
          services?: Json
          slot_duration_minutes?: number
          updated_at?: string
          user_id: string
          vehicle_types?: string[]
          verified?: boolean
          work_stations?: number
        }
        Update: {
          address?: string
          available?: boolean
          created_at?: string
          descripcion?: string
          dni_back_url?: string | null
          dni_front_url?: string | null
          dni_rejection_reason?: string | null
          dni_submitted_at?: string | null
          dni_verification_status?: string
          full_name?: string
          google_maps_url?: string
          id?: string
          lat?: number | null
          lng?: number | null
          locality?: string
          matricula_url?: string | null
          neighborhood?: string
          parking_spots?: number
          photo_url?: string | null
          plan?: string
          province?: string
          rubro?: string
          services?: Json
          slot_duration_minutes?: number
          updated_at?: string
          user_id?: string
          vehicle_types?: string[]
          verified?: boolean
          work_stations?: number
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
          cancellation_reason: string | null
          cancelled_by: string | null
          client_address: string | null
          client_name: string
          client_phone: string | null
          client_user_id: string | null
          completed_at: string | null
          created_at: string
          deposit_amount: number | null
          deposit_init_point: string | null
          deposit_paid: boolean | null
          deposit_payment_id: string | null
          deposit_refund_id: string | null
          deposit_status: string
          description: string
          dropoff_mode: boolean
          dropoff_time: string | null
          estimated_duration: number | null
          id: string
          pickup_time: string | null
          professional_id: string
          quoted_amount: number | null
          quoted_details: string | null
          request_mode: string
          responded_at: string | null
          schedule_met: boolean | null
          scheduled_date: string | null
          scheduled_time: string | null
          service_amount: number | null
          service_type: string
          service_window_end: string | null
          service_window_start: string | null
          status: Database["public"]["Enums"]["request_status"]
          updated_at: string
        }
        Insert: {
          cancellation_reason?: string | null
          cancelled_by?: string | null
          client_address?: string | null
          client_name?: string
          client_phone?: string | null
          client_user_id?: string | null
          completed_at?: string | null
          created_at?: string
          deposit_amount?: number | null
          deposit_init_point?: string | null
          deposit_paid?: boolean | null
          deposit_payment_id?: string | null
          deposit_refund_id?: string | null
          deposit_status?: string
          description?: string
          dropoff_mode?: boolean
          dropoff_time?: string | null
          estimated_duration?: number | null
          id?: string
          pickup_time?: string | null
          professional_id: string
          quoted_amount?: number | null
          quoted_details?: string | null
          request_mode?: string
          responded_at?: string | null
          schedule_met?: boolean | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          service_amount?: number | null
          service_type?: string
          service_window_end?: string | null
          service_window_start?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
        }
        Update: {
          cancellation_reason?: string | null
          cancelled_by?: string | null
          client_address?: string | null
          client_name?: string
          client_phone?: string | null
          client_user_id?: string | null
          completed_at?: string | null
          created_at?: string
          deposit_amount?: number | null
          deposit_init_point?: string | null
          deposit_paid?: boolean | null
          deposit_payment_id?: string | null
          deposit_refund_id?: string | null
          deposit_status?: string
          description?: string
          dropoff_mode?: boolean
          dropoff_time?: string | null
          estimated_duration?: number | null
          id?: string
          pickup_time?: string | null
          professional_id?: string
          quoted_amount?: number | null
          quoted_details?: string | null
          request_mode?: string
          responded_at?: string | null
          schedule_met?: boolean | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          service_amount?: number | null
          service_type?: string
          service_window_end?: string | null
          service_window_start?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          environment: string
          id: string
          init_point: string | null
          price_id: string | null
          product_id: string | null
          provider: string
          provider_customer_id: string | null
          provider_subscription_id: string | null
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          init_point?: string | null
          price_id?: string | null
          product_id?: string | null
          provider?: string
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          init_point?: string | null
          price_id?: string | null
          product_id?: string | null
          provider?: string
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      professional_profiles_public: {
        Row: {
          created_at: string | null
          descripcion: string | null
          full_name: string | null
          id: string | null
          photo_url: string | null
          plan: string | null
          rubro: string | null
          updated_at: string | null
          user_id: string | null
          verified: boolean | null
        }
        Insert: {
          created_at?: string | null
          descripcion?: string | null
          full_name?: string | null
          id?: string | null
          photo_url?: string | null
          plan?: string | null
          rubro?: string | null
          updated_at?: string | null
          user_id?: string | null
          verified?: boolean | null
        }
        Update: {
          created_at?: string | null
          descripcion?: string | null
          full_name?: string | null
          id?: string | null
          photo_url?: string | null
          plan?: string | null
          rubro?: string | null
          updated_at?: string | null
          user_id?: string | null
          verified?: boolean | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_professional_score: {
        Args: { p_professional_id: string }
        Returns: Json
      }
      has_active_subscription: {
        Args: { check_env?: string; user_uuid: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      request_status:
        | "nueva"
        | "cotizada"
        | "aceptada"
        | "en_servicio"
        | "finalizada"
        | "rechazada_profesional"
        | "rechazada_cliente"
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
      app_role: ["admin", "moderator", "user"],
      request_status: [
        "nueva",
        "cotizada",
        "aceptada",
        "en_servicio",
        "finalizada",
        "rechazada_profesional",
        "rechazada_cliente",
      ],
    },
  },
} as const
