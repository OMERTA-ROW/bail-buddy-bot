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
      bondsmen: {
        Row: {
          agency_name: string
          bio: string | null
          contact_name: string
          counties_served: string[]
          created_at: string
          email: string
          hours_247: boolean
          id: string
          license_number: string
          license_state: string
          phone: string
          premium_rate_pct: number
          states_served: string[]
          updated_at: string
          user_id: string | null
          verified: boolean
        }
        Insert: {
          agency_name: string
          bio?: string | null
          contact_name: string
          counties_served?: string[]
          created_at?: string
          email: string
          hours_247?: boolean
          id?: string
          license_number: string
          license_state: string
          phone: string
          premium_rate_pct?: number
          states_served?: string[]
          updated_at?: string
          user_id?: string | null
          verified?: boolean
        }
        Update: {
          agency_name?: string
          bio?: string | null
          contact_name?: string
          counties_served?: string[]
          created_at?: string
          email?: string
          hours_247?: boolean
          id?: string
          license_number?: string
          license_state?: string
          phone?: string
          premium_rate_pct?: number
          states_served?: string[]
          updated_at?: string
          user_id?: string | null
          verified?: boolean
        }
        Relationships: []
      }
      disbursements: {
        Row: {
          amount_cents: number
          created_at: string
          failure_reason: string | null
          id: string
          initiated_by: string
          inmate_id: string | null
          payment_method_id: string | null
          pool_id: string | null
          routed_bondsman_id: string | null
          source: Database["public"]["Enums"]["payout_source"]
          status: Database["public"]["Enums"]["payout_status"]
          updated_at: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          failure_reason?: string | null
          id?: string
          initiated_by: string
          inmate_id?: string | null
          payment_method_id?: string | null
          pool_id?: string | null
          routed_bondsman_id?: string | null
          source?: Database["public"]["Enums"]["payout_source"]
          status?: Database["public"]["Enums"]["payout_status"]
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          failure_reason?: string | null
          id?: string
          initiated_by?: string
          inmate_id?: string | null
          payment_method_id?: string | null
          pool_id?: string | null
          routed_bondsman_id?: string | null
          source?: Database["public"]["Enums"]["payout_source"]
          status?: Database["public"]["Enums"]["payout_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "disbursements_inmate_id_fkey"
            columns: ["inmate_id"]
            isOneToOne: false
            referencedRelation: "tracked_inmates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disbursements_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disbursements_pool_id_fkey"
            columns: ["pool_id"]
            isOneToOne: false
            referencedRelation: "funding_pools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disbursements_routed_bondsman_id_fkey"
            columns: ["routed_bondsman_id"]
            isOneToOne: false
            referencedRelation: "bondsmen"
            referencedColumns: ["id"]
          },
        ]
      }
      funding_pools: {
        Row: {
          allow_card_fallback: boolean
          balance_cents: number
          created_at: string
          currency: string
          id: string
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          allow_card_fallback?: boolean
          balance_cents?: number
          created_at?: string
          currency?: string
          id?: string
          name?: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          allow_card_fallback?: boolean
          balance_cents?: number
          created_at?: string
          currency?: string
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          brand: string
          created_at: string
          exp_month: number
          exp_year: number
          id: string
          is_default: boolean
          label: string | null
          last4: string
          processor: string
          processor_token: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          brand: string
          created_at?: string
          exp_month: number
          exp_year: number
          id?: string
          is_default?: boolean
          label?: string | null
          last4: string
          processor?: string
          processor_token?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          brand?: string
          created_at?: string
          exp_month?: number
          exp_year?: number
          id?: string
          is_default?: boolean
          label?: string | null
          last4?: string
          processor?: string
          processor_token?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pool_contributions: {
        Row: {
          amount_cents: number
          contributor_id: string
          created_at: string
          id: string
          note: string | null
          pool_id: string
        }
        Insert: {
          amount_cents: number
          contributor_id: string
          created_at?: string
          id?: string
          note?: string | null
          pool_id: string
        }
        Update: {
          amount_cents?: number
          contributor_id?: string
          created_at?: string
          id?: string
          note?: string | null
          pool_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pool_contributions_pool_id_fkey"
            columns: ["pool_id"]
            isOneToOne: false
            referencedRelation: "funding_pools"
            referencedColumns: ["id"]
          },
        ]
      }
      pool_members: {
        Row: {
          can_draw: boolean
          card_fallback_consent: boolean
          created_at: string
          id: string
          pool_id: string
          role: Database["public"]["Enums"]["pool_role"]
          spend_limit_cents: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          can_draw?: boolean
          card_fallback_consent?: boolean
          created_at?: string
          id?: string
          pool_id: string
          role?: Database["public"]["Enums"]["pool_role"]
          spend_limit_cents?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          can_draw?: boolean
          card_fallback_consent?: boolean
          created_at?: string
          id?: string
          pool_id?: string
          role?: Database["public"]["Enums"]["pool_role"]
          spend_limit_cents?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pool_members_pool_id_fkey"
            columns: ["pool_id"]
            isOneToOne: false
            referencedRelation: "funding_pools"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          notify_email: boolean
          notify_sms: boolean
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          notify_email?: boolean
          notify_sms?: boolean
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          notify_email?: boolean
          notify_sms?: boolean
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      status_events: {
        Row: {
          bond_amount_cents: number | null
          created_at: string
          description: string | null
          event_type: string
          id: string
          inmate_id: string
        }
        Insert: {
          bond_amount_cents?: number | null
          created_at?: string
          description?: string | null
          event_type: string
          id?: string
          inmate_id: string
        }
        Update: {
          bond_amount_cents?: number | null
          created_at?: string
          description?: string | null
          event_type?: string
          id?: string
          inmate_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "status_events_inmate_id_fkey"
            columns: ["inmate_id"]
            isOneToOne: false
            referencedRelation: "tracked_inmates"
            referencedColumns: ["id"]
          },
        ]
      }
      tracked_inmates: {
        Row: {
          auto_refer_bondsman: boolean
          bond_amount_cents: number | null
          booking_number: string | null
          charges: string | null
          county: string
          created_at: string
          date_of_birth: string | null
          facility_name: string | null
          full_name: string
          funding_pool_id: string | null
          id: string
          last_checked_at: string | null
          notes: string | null
          state: string
          status: Database["public"]["Enums"]["inmate_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_refer_bondsman?: boolean
          bond_amount_cents?: number | null
          booking_number?: string | null
          charges?: string | null
          county: string
          created_at?: string
          date_of_birth?: string | null
          facility_name?: string | null
          full_name: string
          funding_pool_id?: string | null
          id?: string
          last_checked_at?: string | null
          notes?: string | null
          state: string
          status?: Database["public"]["Enums"]["inmate_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_refer_bondsman?: boolean
          bond_amount_cents?: number | null
          booking_number?: string | null
          charges?: string | null
          county?: string
          created_at?: string
          date_of_birth?: string | null
          facility_name?: string | null
          full_name?: string
          funding_pool_id?: string | null
          id?: string
          last_checked_at?: string | null
          notes?: string | null
          state?: string
          status?: Database["public"]["Enums"]["inmate_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracked_inmates_funding_pool_id_fkey"
            columns: ["funding_pool_id"]
            isOneToOne: false
            referencedRelation: "funding_pools"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_pool_member: {
        Args: { _pool_id: string; _user_id: string }
        Returns: boolean
      }
      is_pool_owner: {
        Args: { _pool_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      inmate_status:
        | "searching"
        | "in_custody"
        | "bond_set"
        | "bond_posted"
        | "released"
        | "transferred"
        | "not_found"
      payout_source: "pool" | "personal_card"
      payout_status:
        | "pending"
        | "authorized"
        | "routed_to_agent"
        | "completed"
        | "failed"
        | "cancelled"
      pool_role: "owner" | "member"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      inmate_status: [
        "searching",
        "in_custody",
        "bond_set",
        "bond_posted",
        "released",
        "transferred",
        "not_found",
      ],
      payout_source: ["pool", "personal_card"],
      payout_status: [
        "pending",
        "authorized",
        "routed_to_agent",
        "completed",
        "failed",
        "cancelled",
      ],
      pool_role: ["owner", "member"],
    },
  },
} as const
