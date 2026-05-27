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
      agenda_days: {
        Row: {
          created_at: string
          date: string
          id: string
          is_open: boolean
          note: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          is_open: boolean
          note?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          is_open?: boolean
          note?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agenda_days_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_payments: {
        Row: {
          amount: number
          appointment_id: string
          created_at: string
          id: string
          notes: string | null
          paid_at: string
          payment_method: string | null
          tenant_id: string
        }
        Insert: {
          amount?: number
          appointment_id: string
          created_at?: string
          id?: string
          notes?: string | null
          paid_at?: string
          payment_method?: string | null
          tenant_id?: string
        }
        Update: {
          amount?: number
          appointment_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          paid_at?: string
          payment_method?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          amount: number
          client_id: string | null
          client_name: string
          created_at: string
          date: string
          discount: number
          id: string
          notes: string | null
          payment_method: string | null
          procedure: string | null
          status: string
          subtotal: number
          tenant_id: string
          time: string | null
        }
        Insert: {
          amount?: number
          client_id?: string | null
          client_name: string
          created_at?: string
          date: string
          discount?: number
          id?: string
          notes?: string | null
          payment_method?: string | null
          procedure?: string | null
          status?: string
          subtotal?: number
          tenant_id?: string
          time?: string | null
        }
        Update: {
          amount?: number
          client_id?: string | null
          client_name?: string
          created_at?: string
          date?: string
          discount?: number
          id?: string
          notes?: string | null
          payment_method?: string | null
          procedure?: string | null
          status?: string
          subtotal?: number
          tenant_id?: string
          time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          created_at: string
          id: string
          name: string
          normalized_name: string
          notes: string | null
          phone: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          normalized_name: string
          notes?: string | null
          phone?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          normalized_name?: string
          notes?: string | null
          phone?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_settings: {
        Row: {
          created_at: string
          id: string
          instagram_url: string
          logo_url: string
          pix_copia_cola: string
          pix_key: string
          pix_qr_url: string | null
          theme: string
          updated_at: string
          whatsapp_phone: string
        }
        Insert: {
          created_at?: string
          id?: string
          instagram_url?: string
          logo_url?: string
          pix_copia_cola?: string
          pix_key?: string
          pix_qr_url?: string | null
          theme?: string
          updated_at?: string
          whatsapp_phone?: string
        }
        Update: {
          created_at?: string
          id?: string
          instagram_url?: string
          logo_url?: string
          pix_copia_cola?: string
          pix_key?: string
          pix_qr_url?: string | null
          theme?: string
          updated_at?: string
          whatsapp_phone?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          created_at: string
          date: string
          description: string
          id: string
          notes: string | null
          payment_method: string | null
          quantity: number
          tenant_id: string
          total: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          date: string
          description: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          quantity?: number
          tenant_id?: string
          total?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          date?: string
          description?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          quantity?: number
          tenant_id?: string
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "expenses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      procedures: {
        Row: {
          created_at: string
          default_price: number
          estimated_minutes: number
          id: string
          name: string
          sort_order: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_price?: number
          estimated_minutes?: number
          id?: string
          name: string
          sort_order?: number
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_price?: number
          estimated_minutes?: number
          id?: string
          name?: string
          sort_order?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "procedures_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
          tenant_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string
          id?: string
          tenant_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          tenant_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          business_name: string
          created_at: string
          due_day: number
          id: string
          instagram_url: string
          logo_url: string
          monthly_price: number
          owner_name: string
          pix_copia_cola: string
          pix_key: string
          pix_qr_url: string
          plan_name: string
          primary_color: string
          slug: string
          status: Database["public"]["Enums"]["tenant_status"]
          theme: string
          updated_at: string
          whatsapp: string
        }
        Insert: {
          business_name: string
          created_at?: string
          due_day?: number
          id?: string
          instagram_url?: string
          logo_url?: string
          monthly_price?: number
          owner_name?: string
          pix_copia_cola?: string
          pix_key?: string
          pix_qr_url?: string
          plan_name?: string
          primary_color?: string
          slug: string
          status?: Database["public"]["Enums"]["tenant_status"]
          theme?: string
          updated_at?: string
          whatsapp?: string
        }
        Update: {
          business_name?: string
          created_at?: string
          due_day?: number
          id?: string
          instagram_url?: string
          logo_url?: string
          monthly_price?: number
          owner_name?: string
          pix_copia_cola?: string
          pix_key?: string
          pix_qr_url?: string
          plan_name?: string
          primary_color?: string
          slug?: string
          status?: Database["public"]["Enums"]["tenant_status"]
          theme?: string
          updated_at?: string
          whatsapp?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_tenant_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_superadmin: { Args: { _user_id: string }; Returns: boolean }
      my_tenant_status: {
        Args: never
        Returns: Database["public"]["Enums"]["tenant_status"]
      }
      normalize_client_name: { Args: { _name: string }; Returns: string }
    }
    Enums: {
      app_role: "superadmin" | "tenant_owner" | "tenant_member"
      tenant_status: "ativo" | "inadimplente" | "suspenso"
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
      app_role: ["superadmin", "tenant_owner", "tenant_member"],
      tenant_status: ["ativo", "inadimplente", "suspenso"],
    },
  },
} as const
