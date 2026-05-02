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
      admin_audit_log: {
        Row: {
          action: string
          admin_user_id: string
          created_at: string
          id: string
          new_values: Json | null
          notes: string | null
          old_values: Json | null
          record_id: string
          table_name: string
        }
        Insert: {
          action: string
          admin_user_id: string
          created_at?: string
          id?: string
          new_values?: Json | null
          notes?: string | null
          old_values?: Json | null
          record_id: string
          table_name: string
        }
        Update: {
          action?: string
          admin_user_id?: string
          created_at?: string
          id?: string
          new_values?: Json | null
          notes?: string | null
          old_values?: Json | null
          record_id?: string
          table_name?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          is_public: boolean
          key: string
          updated_at: string
          updated_by: string | null
          value: string
        }
        Insert: {
          is_public?: boolean
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: string
        }
        Update: {
          is_public?: boolean
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          completed_at: string | null
          daily_earning: number
          days_remaining: number
          duration_days: number
          earned_amount: number
          id: string
          invested_amount: number
          max_revenue: number
          pack_category: string
          pack_id: string
          pack_level: number
          pack_name: string
          purchased_at: string
          status: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          daily_earning: number
          days_remaining: number
          duration_days: number
          earned_amount?: number
          id?: string
          invested_amount: number
          max_revenue: number
          pack_category: string
          pack_id: string
          pack_level: number
          pack_name: string
          purchased_at?: string
          status?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          daily_earning?: number
          days_remaining?: number
          duration_days?: number
          earned_amount?: number
          id?: string
          invested_amount?: number
          max_revenue?: number
          pack_category?: string
          pack_id?: string
          pack_level?: number
          pack_name?: string
          purchased_at?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      pack_controls: {
        Row: {
          admin_note: string | null
          daily_earning_override: number | null
          duration_override: number | null
          is_paused: boolean
          pack_id: string
          price_override: number | null
          total_revenue_override: number | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          admin_note?: string | null
          daily_earning_override?: number | null
          duration_override?: number | null
          is_paused?: boolean
          pack_id: string
          price_override?: number | null
          total_revenue_override?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          admin_note?: string | null
          daily_earning_override?: number | null
          duration_override?: number | null
          is_paused?: boolean
          pack_id?: string
          price_override?: number | null
          total_revenue_override?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          balance: number
          created_at: string
          disabled_at: string | null
          id: string
          invitation_code: string
          nickname: string
          phone: string
          product_revenue: number
          profile_picture: string | null
          referred_by: string | null
          total_recharge: number
          total_withdrawal: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          disabled_at?: string | null
          id?: string
          invitation_code: string
          nickname: string
          phone: string
          product_revenue?: number
          profile_picture?: string | null
          referred_by?: string | null
          total_recharge?: number
          total_withdrawal?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          disabled_at?: string | null
          id?: string
          invitation_code?: string
          nickname?: string
          phone?: string
          product_revenue?: number
          profile_picture?: string | null
          referred_by?: string | null
          total_recharge?: number
          total_withdrawal?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      recharge_requests: {
        Row: {
          admin_notes: string | null
          amount: number
          created_at: string
          id: string
          processed_at: string | null
          screenshot_url: string | null
          status: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          created_at?: string
          id?: string
          processed_at?: string | null
          screenshot_url?: string | null
          status?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          created_at?: string
          id?: string
          processed_at?: string | null
          screenshot_url?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      recharge_request_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          method: string
          reference: string | null
          request_id: string
          screenshot_url: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          method: string
          reference?: string | null
          request_id: string
          screenshot_url?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          method?: string
          reference?: string | null
          request_id?: string
          screenshot_url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      withdraw_requests: {
        Row: {
          admin_notes: string | null
          amount: number
          created_at: string
          details: Json
          id: string
          method: string
          net_amount: number
          processed_at: string | null
          status: string
          tax_amount: number
          tax_rate: number
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          created_at?: string
          details?: Json
          id?: string
          method: string
          net_amount?: number
          processed_at?: string | null
          status?: string
          tax_amount?: number
          tax_rate?: number
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          created_at?: string
          details?: Json
          id?: string
          method?: string
          net_amount?: number
          processed_at?: string | null
          status?: string
          tax_amount?: number
          tax_rate?: number
          user_id?: string
        }
        Relationships: []
      }
      wallet_history: {
        Row: {
          balance_after: number
          balance_before: number
          changed_by: string | null
          created_at: string
          delta: number
          id: string
          note: string | null
          source: string
          user_id: string
        }
        Insert: {
          balance_after: number
          balance_before: number
          changed_by?: string | null
          created_at?: string
          delta: number
          id?: string
          note?: string | null
          source?: string
          user_id: string
        }
        Update: {
          balance_after?: number
          balance_before?: number
          changed_by?: string | null
          created_at?: string
          delta?: number
          id?: string
          note?: string | null
          source?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          granted_at: string
          granted_by: string | null
          id: string
          notes: string | null
          revoked_at: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          notes?: string | null
          revoked_at?: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          notes?: string | null
          revoked_at?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_process_withdraw_request: {
        Args: { p_action: string; p_admin_notes: string; p_request_id: string }
        Returns: undefined
      }
      admin_create_redeem_code: {
        Args: {
          p_code: string
          p_is_active: boolean
          p_max_claims: number
          p_reward_amount: number
        }
        Returns: string
      }
      admin_delete_redeem_code: {
        Args: { p_code_id: string }
        Returns: undefined
      }
      admin_list_redeem_claims: {
        Args: Record<PropertyKey, never>
        Returns: {
          amount: number
          claim_id: string
          claimed_at: string
          code: string
          code_id: string
          user_id: string
          user_nickname: string
          user_phone: string
        }[]
      }
      admin_list_redeem_codes: {
        Args: Record<PropertyKey, never>
        Returns: {
          claims_used: number
          code: string
          created_at: string
          id: string
          is_active: boolean
          max_claims: number
          reward_amount: number
        }[]
      }
      admin_set_redeem_code_active: {
        Args: { p_code_id: string; p_is_active: boolean }
        Returns: undefined
      }
      admin_adjust_user_balance: {
        Args: {
          p_admin_id: string
          p_delta: number
          p_reason: string
          p_target_user_id: string
        }
        Returns: number
      }
      admin_set_user_disabled: {
        Args: {
          p_admin_id: string
          p_disabled: boolean
          p_reason: string
          p_target_user_id: string
        }
        Returns: undefined
      }
      admin_set_user_role: {
        Args: {
          p_admin_id: string
          p_grant: boolean
          p_reason: string
          p_role: Database["public"]["Enums"]["app_role"]
          p_target_user_id: string
        }
        Returns: undefined
      }
      admin_terminate_order_early: {
        Args: { p_admin_id: string; p_order_id: string; p_reason: string }
        Returns: undefined
      }
      generate_invitation_code: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      process_recharge_request: {
        Args: {
          p_action: string
          p_admin_id: string
          p_admin_notes: string
          p_request_id: string
        }
        Returns: undefined
      }
      purchase_pack_bulk: {
        Args: {
          p_daily_earning: number
          p_duration_days: number
          p_max_revenue: number
          p_pack_category: string
          p_pack_id: string
          p_pack_level: number
          p_pack_name: string
          p_quantity: number
          p_unit_price: number
          p_user_id: string
        }
        Returns: string[]
      }
      purchase_pack_transaction: {
        Args: {
          p_daily_earning: number
          p_duration_days: number
          p_invested_amount: number
          p_max_revenue: number
          p_pack_category: string
          p_pack_id: string
          p_pack_level: number
          p_pack_name: string
          p_user_id: string
        }
        Returns: string
      }
      create_withdraw_request: {
        Args: { p_amount: number; p_details: Json; p_method: string }
        Returns: string
      }
      credit_user_earnings: { Args: { p_user_id: string }; Returns: number }
      pack_earnings_display_total: {
        Args: { p_user_id: string }
        Returns: number
      }
      redeem_code_apply: { Args: { p_code: string }; Returns: number }
      redeem_code_apply_safe: {
        Args: { p_code: string }
        Returns: Json
      }
      validate_invitation_code: { Args: { code: string }; Returns: boolean }
    }
    Enums: {
      app_role: "super_admin" | "finance" | "support"
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
      app_role: ["super_admin", "finance", "support"],
    },
  },
} as const
