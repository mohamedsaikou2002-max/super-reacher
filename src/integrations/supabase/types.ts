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
      approval_requests: {
        Row: {
          approved: boolean
          created_at: string
          estimated_cost_usd: number
          id: string
          job_id: string | null
          reason: string
          resolved: boolean
          tier: string
          user_id: string
        }
        Insert: {
          approved?: boolean
          created_at?: string
          estimated_cost_usd?: number
          id?: string
          job_id?: string | null
          reason?: string
          resolved?: boolean
          tier?: string
          user_id: string
        }
        Update: {
          approved?: boolean
          created_at?: string
          estimated_cost_usd?: number
          id?: string
          job_id?: string | null
          reason?: string
          resolved?: boolean
          tier?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_requests_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          channel: string
          country_code: string
          created_at: string
          id: string
          name: string
          positive_count: number
          reply_count: number
          sent_count: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          channel: string
          country_code: string
          created_at?: string
          id?: string
          name: string
          positive_count?: number
          reply_count?: number
          sent_count?: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          channel?: string
          country_code?: string
          created_at?: string
          id?: string
          name?: string
          positive_count?: number
          reply_count?: number
          sent_count?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      corpus_records: {
        Row: {
          country_code: string
          created_at: string
          id: string
          industry: string
          record: Json
          source: string
          stage: string
          user_id: string
        }
        Insert: {
          country_code?: string
          created_at?: string
          id?: string
          industry?: string
          record?: Json
          source?: string
          stage?: string
          user_id: string
        }
        Update: {
          country_code?: string
          created_at?: string
          id?: string
          industry?: string
          record?: Json
          source?: string
          stage?: string
          user_id?: string
        }
        Relationships: []
      }
      demos: {
        Row: {
          company_name: string
          configuration: Json
          created_at: string
          deployment_url: string | null
          domain_id: string | null
          expires_at: string | null
          fully_qualified_domain: string | null
          html: string
          id: string
          slug: string
          status: string
          subdomain: string | null
          template_id: string
          theme: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_name: string
          configuration?: Json
          created_at?: string
          deployment_url?: string | null
          domain_id?: string | null
          expires_at?: string | null
          fully_qualified_domain?: string | null
          html?: string
          id?: string
          slug: string
          status?: string
          subdomain?: string | null
          template_id?: string
          theme?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_name?: string
          configuration?: Json
          created_at?: string
          deployment_url?: string | null
          domain_id?: string | null
          expires_at?: string | null
          fully_qualified_domain?: string | null
          html?: string
          id?: string
          slug?: string
          status?: string
          subdomain?: string | null
          template_id?: string
          theme?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "demos_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "domains"
            referencedColumns: ["id"]
          },
        ]
      }
      deployments: {
        Row: {
          demo_id: string
          deployment_url: string | null
          finished_at: string | null
          id: string
          log: string
          started_at: string
          status: string
          user_id: string
        }
        Insert: {
          demo_id: string
          deployment_url?: string | null
          finished_at?: string | null
          id?: string
          log?: string
          started_at?: string
          status?: string
          user_id: string
        }
        Update: {
          demo_id?: string
          deployment_url?: string | null
          finished_at?: string | null
          id?: string
          log?: string
          started_at?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deployments_demo_id_fkey"
            columns: ["demo_id"]
            isOneToOne: false
            referencedRelation: "demos"
            referencedColumns: ["id"]
          },
        ]
      }
      domains: {
        Row: {
          created_at: string
          domain: string
          id: string
          provider: string
          provider_zone_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          domain: string
          id?: string
          provider?: string
          provider_zone_id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          domain?: string
          id?: string
          provider?: string
          provider_zone_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          country_code: string
          created_at: string
          html_content: string
          id: string
          industry: string
          name: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          country_code: string
          created_at?: string
          html_content: string
          id?: string
          industry: string
          name: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          country_code?: string
          created_at?: string
          html_content?: string
          id?: string
          industry?: string
          name?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      engine_settings: {
        Row: {
          allow_paid_apis: boolean
          allow_remote_gpu: boolean
          demo_base_domain: string
          engine_api_key: string
          engine_base_url: string
          engine_enabled: boolean
          local_first: boolean
          monthly_budget_usd: number
          require_cost_approval: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          allow_paid_apis?: boolean
          allow_remote_gpu?: boolean
          demo_base_domain?: string
          engine_api_key?: string
          engine_base_url?: string
          engine_enabled?: boolean
          local_first?: boolean
          monthly_budget_usd?: number
          require_cost_approval?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          allow_paid_apis?: boolean
          allow_remote_gpu?: boolean
          demo_base_domain?: string
          engine_api_key?: string
          engine_base_url?: string
          engine_enabled?: boolean
          local_first?: boolean
          monthly_budget_usd?: number
          require_cost_approval?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      jobs: {
        Row: {
          agent_type: string
          cost_usd: number
          created_at: string
          error: string | null
          id: string
          model_used: string | null
          payload: Json
          provider_used: string | null
          result: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_type: string
          cost_usd?: number
          created_at?: string
          error?: string | null
          id?: string
          model_used?: string | null
          payload?: Json
          provider_used?: string | null
          result?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_type?: string
          cost_usd?: number
          created_at?: string
          error?: string | null
          id?: string
          model_used?: string | null
          payload?: Json
          provider_used?: string | null
          result?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          business_name: string
          campaign_id: string | null
          contact_name: string
          country_code: string
          created_at: string
          email: string
          id: string
          industry: string
          phone: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          business_name: string
          campaign_id?: string | null
          contact_name?: string
          country_code: string
          created_at?: string
          email?: string
          id?: string
          industry: string
          phone?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          business_name?: string
          campaign_id?: string | null
          contact_name?: string
          country_code?: string
          created_at?: string
          email?: string
          id?: string
          industry?: string
          phone?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body_html: string
          body_text: string
          campaign_id: string | null
          channel: string
          created_at: string
          direction: string
          id: string
          lead_id: string | null
          provider: string
          sentiment: string | null
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body_html?: string
          body_text?: string
          campaign_id?: string | null
          channel: string
          created_at?: string
          direction?: string
          id?: string
          lead_id?: string | null
          provider?: string
          sentiment?: string | null
          status?: string
          subject?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body_html?: string
          body_text?: string
          campaign_id?: string | null
          channel?: string
          created_at?: string
          direction?: string
          id?: string
          lead_id?: string | null
          provider?: string
          sentiment?: string | null
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company_name: string
          created_at: string
          display_name: string
          id: string
          updated_at: string
        }
        Insert: {
          company_name?: string
          created_at?: string
          display_name?: string
          id: string
          updated_at?: string
        }
        Update: {
          company_name?: string
          created_at?: string
          display_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
