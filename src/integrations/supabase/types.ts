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
      activation_events: {
        Row: {
          created_at: string
          detail: string | null
          event_type: string
          id: string
          method: string
          user_id: string
        }
        Insert: {
          created_at?: string
          detail?: string | null
          event_type: string
          id?: string
          method?: string
          user_id: string
        }
        Update: {
          created_at?: string
          detail?: string | null
          event_type?: string
          id?: string
          method?: string
          user_id?: string
        }
        Relationships: []
      }
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
      cosigners: {
        Row: {
          address_city: string | null
          address_state: string | null
          address_street: string | null
          address_zip: string | null
          created_at: string
          date_of_birth: string | null
          email: string | null
          employer_name: string | null
          employer_phone: string | null
          full_name: string
          id: string
          id_document_path: string | null
          inmate_id: string | null
          invite_channel: string | null
          invite_sent_at: string | null
          phone: string | null
          relationship: string | null
          status: Database["public"]["Enums"]["cosigner_status"]
          updated_at: string
          user_id: string
          years_at_address: number | null
        }
        Insert: {
          address_city?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          employer_name?: string | null
          employer_phone?: string | null
          full_name: string
          id?: string
          id_document_path?: string | null
          inmate_id?: string | null
          invite_channel?: string | null
          invite_sent_at?: string | null
          phone?: string | null
          relationship?: string | null
          status?: Database["public"]["Enums"]["cosigner_status"]
          updated_at?: string
          user_id: string
          years_at_address?: number | null
        }
        Update: {
          address_city?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          employer_name?: string | null
          employer_phone?: string | null
          full_name?: string
          id?: string
          id_document_path?: string | null
          inmate_id?: string | null
          invite_channel?: string | null
          invite_sent_at?: string | null
          phone?: string | null
          relationship?: string | null
          status?: Database["public"]["Enums"]["cosigner_status"]
          updated_at?: string
          user_id?: string
          years_at_address?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cosigners_inmate_id_fkey"
            columns: ["inmate_id"]
            isOneToOne: false
            referencedRelation: "tracked_inmates"
            referencedColumns: ["id"]
          },
        ]
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
          call_in_number: string | null
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
          call_in_number?: string | null
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
          call_in_number?: string | null
          created_at?: string
          currency?: string
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      holder_activations: {
        Row: {
          activated_at: string | null
          activated_via: string | null
          activation_code: string
          card_printed_at: string | null
          created_at: string
          deactivated_at: string | null
          pin: string
          tracking_active: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          activated_at?: string | null
          activated_via?: string | null
          activation_code: string
          card_printed_at?: string | null
          created_at?: string
          deactivated_at?: string | null
          pin: string
          tracking_active?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          activated_at?: string | null
          activated_via?: string | null
          activation_code?: string
          card_printed_at?: string | null
          created_at?: string
          deactivated_at?: string | null
          pin?: string
          tracking_active?: boolean
          updated_at?: string
          user_id?: string
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
      release_plans: {
        Row: {
          address_city: string
          address_state: string
          address_street: string
          address_zip: string
          created_at: string
          id: string
          inmate_id: string
          notes: string | null
          phone: string | null
          relationship: string | null
          released_to_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address_city: string
          address_state: string
          address_street: string
          address_zip: string
          created_at?: string
          id?: string
          inmate_id: string
          notes?: string | null
          phone?: string | null
          relationship?: string | null
          released_to_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address_city?: string
          address_state?: string
          address_street?: string
          address_zip?: string
          created_at?: string
          id?: string
          inmate_id?: string
          notes?: string | null
          phone?: string | null
          relationship?: string | null
          released_to_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "release_plans_inmate_id_fkey"
            columns: ["inmate_id"]
            isOneToOne: true
            referencedRelation: "tracked_inmates"
            referencedColumns: ["id"]
          },
        ]
      }
      signature_documents: {
        Row: {
          cosigner_id: string | null
          created_at: string
          decline_reason: string | null
          declined_at: string | null
          doc_type: Database["public"]["Enums"]["signature_doc_type"]
          envelope_id: string | null
          id: string
          inmate_id: string | null
          provider: string
          recipient_email: string | null
          recipient_name: string | null
          sent_at: string | null
          signed_at: string | null
          signed_document_url: string | null
          status: Database["public"]["Enums"]["signature_doc_status"]
          updated_at: string
          user_id: string
          viewed_at: string | null
        }
        Insert: {
          cosigner_id?: string | null
          created_at?: string
          decline_reason?: string | null
          declined_at?: string | null
          doc_type: Database["public"]["Enums"]["signature_doc_type"]
          envelope_id?: string | null
          id?: string
          inmate_id?: string | null
          provider?: string
          recipient_email?: string | null
          recipient_name?: string | null
          sent_at?: string | null
          signed_at?: string | null
          signed_document_url?: string | null
          status?: Database["public"]["Enums"]["signature_doc_status"]
          updated_at?: string
          user_id: string
          viewed_at?: string | null
        }
        Update: {
          cosigner_id?: string | null
          created_at?: string
          decline_reason?: string | null
          declined_at?: string | null
          doc_type?: Database["public"]["Enums"]["signature_doc_type"]
          envelope_id?: string | null
          id?: string
          inmate_id?: string | null
          provider?: string
          recipient_email?: string | null
          recipient_name?: string | null
          sent_at?: string | null
          signed_at?: string | null
          signed_document_url?: string | null
          status?: Database["public"]["Enums"]["signature_doc_status"]
          updated_at?: string
          user_id?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "signature_documents_cosigner_id_fkey"
            columns: ["cosigner_id"]
            isOneToOne: false
            referencedRelation: "cosigners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signature_documents_inmate_id_fkey"
            columns: ["inmate_id"]
            isOneToOne: false
            referencedRelation: "tracked_inmates"
            referencedColumns: ["id"]
          },
        ]
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
      activate_tracking_by_pin: {
        Args: { _caller?: string; _pin: string }
        Returns: Json
      }
      contribute_to_pool: {
        Args: { _amount_cents: number; _note?: string; _pool_id: string }
        Returns: string
      }
      ensure_holder_activation: {
        Args: { _user_id: string }
        Returns: undefined
      }
      gen_activation_code: { Args: never; Returns: string }
      gen_activation_pin: { Args: never; Returns: string }
      is_pool_member: {
        Args: { _pool_id: string; _user_id: string }
        Returns: boolean
      }
      is_pool_owner: {
        Args: { _pool_id: string; _user_id: string }
        Returns: boolean
      }
      regenerate_activation_code: {
        Args: never
        Returns: {
          activated_at: string | null
          activated_via: string | null
          activation_code: string
          card_printed_at: string | null
          created_at: string
          deactivated_at: string | null
          pin: string
          tracking_active: boolean
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "holder_activations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      request_disbursement: {
        Args: { _amount_cents: number; _inmate_id: string }
        Returns: string
      }
      set_tracking_active: {
        Args: { _active: boolean }
        Returns: {
          activated_at: string | null
          activated_via: string | null
          activation_code: string
          card_printed_at: string | null
          created_at: string
          deactivated_at: string | null
          pin: string
          tracking_active: boolean
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "holder_activations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      cosigner_status:
        | "invited"
        | "documents_pending"
        | "signature_pending"
        | "verified"
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
      signature_doc_status:
        | "draft"
        | "sent"
        | "viewed"
        | "signed"
        | "declined"
        | "voided"
      signature_doc_type:
        | "cosigner_indemnity"
        | "bond_application"
        | "disclosure_of_terms"
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
      cosigner_status: [
        "invited",
        "documents_pending",
        "signature_pending",
        "verified",
      ],
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
      signature_doc_status: [
        "draft",
        "sent",
        "viewed",
        "signed",
        "declined",
        "voided",
      ],
      signature_doc_type: [
        "cosigner_indemnity",
        "bond_application",
        "disclosure_of_terms",
      ],
    },
  },
} as const
