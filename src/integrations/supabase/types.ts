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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      businesses: {
        Row: {
          id: string
          user_id: string
          business_name: string
          country_code: string
          region_code: string
          industry: string
          registration_id: string
          official_website: string | null
          website_status: string
          enrichment_status: string
          outreach_eligibility: string
          discovered_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          business_name: string
          country_code?: string
          region_code?: string
          industry?: string
          registration_id?: string
          official_website?: string | null
          website_status?: string
          enrichment_status?: string
          outreach_eligibility?: string
          discovered_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          business_name?: string
          country_code?: string
          region_code?: string
          industry?: string
          registration_id?: string
          official_website?: string | null
          website_status?: string
          enrichment_status?: string
          outreach_eligibility?: string
          discovered_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      business_sources: {
        Row: {
          id: string
          business_id: string
          source_system: string
          source_url: string | null
          source_record_id: string | null
          raw_data: Json
          retrieved_at: string
        }
        Insert: {
          id?: string
          business_id: string
          source_system: string
          source_url?: string | null
          source_record_id?: string | null
          raw_data?: Json
          retrieved_at?: string
        }
        Update: {
          id?: string
          business_id?: string
          source_system?: string
          source_url?: string | null
          source_record_id?: string | null
          raw_data?: Json
          retrieved_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_sources_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      web_pages: {
        Row: {
          id: string
          business_id: string
          url: string
          canonical_url: string
          title: string
          content: string
          content_hash: string
          http_status: number | null
          crawl_status: string
          crawled_at: string | null
        }
        Insert: {
          id?: string
          business_id: string
          url: string
          canonical_url: string
          title?: string
          content?: string
          content_hash?: string
          http_status?: number | null
          crawl_status?: string
          crawled_at?: string | null
        }
        Update: {
          id?: string
          business_id?: string
          url?: string
          canonical_url?: string
          title?: string
          content?: string
          content_hash?: string
          http_status?: number | null
          crawl_status?: string
          crawled_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "web_pages_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          id: string
          business_id: string
          full_name: string
          role: string
          email: string
          phone: string
          contact_type: string
          verification_status: string
          outreach_status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          business_id: string
          full_name?: string
          role?: string
          email?: string
          phone?: string
          contact_type?: string
          verification_status?: string
          outreach_status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          business_id?: string
          full_name?: string
          role?: string
          email?: string
          phone?: string
          contact_type?: string
          verification_status?: string
          outreach_status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_sources: {
        Row: {
          id: string
          contact_id: string
          source: string
          source_url: string | null
          evidence: string
          confidence: string
          provider: string | null
          provider_record_id: string | null
          retrieved_at: string
        }
        Insert: {
          id?: string
          contact_id: string
          source: string
          source_url?: string | null
          evidence?: string
          confidence?: string
          provider?: string | null
          provider_record_id?: string | null
          retrieved_at?: string
        }
        Update: {
          id?: string
          contact_id?: string
          source?: string
          source_url?: string | null
          evidence?: string
          confidence?: string
          provider?: string | null
          provider_record_id?: string | null
          retrieved_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_sources_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      enrichment_runs: {
        Row: {
          id: string
          user_id: string
          business_id: string
          type: string
          status: string
          attempt: number
          error: string | null
          started_at: string | null
          completed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          business_id: string
          type: string
          status?: string
          attempt?: number
          error?: string | null
          started_at?: string | null
          completed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          business_id?: string
          type?: string
          status?: string
          attempt?: number
          error?: string | null
          started_at?: string | null
          completed_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrichment_runs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      research_results: {
        Row: {
          id: string
          business_id: string
          provider: string
          model: string
          result: Json
          status: string
          retrieved_at: string
        }
        Insert: {
          id?: string
          business_id: string
          provider: string
          model?: string
          result?: Json
          status?: string
          retrieved_at?: string
        }
        Update: {
          id?: string
          business_id?: string
          provider?: string
          model?: string
          result?: Json
          status?: string
          retrieved_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "research_results_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      research_evidence: {
        Row: {
          id: string
          business_id: string
          field: string
          value: string
          source_url: string | null
          evidence: string
          confidence: string
          retrieved_at: string
        }
        Insert: {
          id?: string
          business_id: string
          field: string
          value: string
          source_url?: string | null
          evidence?: string
          confidence?: string
          retrieved_at?: string
        }
        Update: {
          id?: string
          business_id?: string
          field?: string
          value?: string
          source_url?: string | null
          evidence?: string
          confidence?: string
          retrieved_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "research_evidence_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressions: {
        Row: {
          id: string
          user_id: string
          email: string
          phone: string
          channel: string
          reason: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          email?: string
          phone?: string
          channel?: string
          reason: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          email?: string
          phone?: string
          channel?: string
          reason?: string
          created_at?: string
        }
        Relationships: []
      }
      outreach_events: {
        Row: {
          id: string
          user_id: string
          business_id: string | null
          contact_id: string | null
          channel: string
          event_type: string
          provider: string
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          business_id?: string | null
          contact_id?: string | null
          channel: string
          event_type: string
          provider?: string
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          business_id?: string | null
          contact_id?: string | null
          channel?: string
          event_type?: string
          provider?: string
          metadata?: Json
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "outreach_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_events_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      phone_numbers: {
        Row: {
          id: string
          user_id: string
          country_code: string
          phone_number: string
          provider: string
          status: string
          capabilities: Json
          routing: Json
          last_used_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          country_code: string
          phone_number: string
          provider?: string
          status?: string
          capabilities?: Json
          routing?: Json
          last_used_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          country_code?: string
          phone_number?: string
          provider?: string
          status?: string
          capabilities?: Json
          routing?: Json
          last_used_at?: string | null
        }
        Relationships: []
      }
      source_policies: {
        Row: {
          id: string
          source: string
          tor_allowed: boolean
          direct_allowed: boolean
          requires_manual_review: boolean
          robots_status: string
          terms_status: string
          rate_limit: string | null
          captcha_detected: boolean
          last_access: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          source: string
          tor_allowed?: boolean
          direct_allowed?: boolean
          requires_manual_review?: boolean
          robots_status?: string
          terms_status?: string
          rate_limit?: string | null
          captcha_detected?: boolean
          last_access?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          source?: string
          tor_allowed?: boolean
          direct_allowed?: boolean
          requires_manual_review?: boolean
          robots_status?: string
          terms_status?: string
          rate_limit?: string | null
          captcha_detected?: boolean
          last_access?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      research_requests_log: {
        Row: {
          id: string
          request_id: string
          worker_id: string
          source: string
          destination_domain: string
          egress_mode: string
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          request_id: string
          worker_id: string
          source: string
          destination_domain: string
          egress_mode: string
          status: string
          created_at?: string
        }
        Update: {
          id?: string
          request_id?: string
          worker_id?: string
          source?: string
          destination_domain?: string
          egress_mode?: string
          status?: string
          created_at?: string
        }
        Relationships: []
      }
      raw_businesses: {
        Row: {
          id: string
          user_id: string
          business_name: string
          country_code: string
          industry: string
          address: string
          source: string
          raw_source_url: string
          source_record_id: string
          raw_payload: Json
          fetched_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          business_name: string
          country_code: string
          industry?: string
          address?: string
          source: string
          raw_source_url: string
          source_record_id: string
          raw_payload?: Json
          fetched_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          business_name?: string
          country_code?: string
          industry?: string
          address?: string
          source?: string
          raw_source_url?: string
          source_record_id?: string
          raw_payload?: Json
          fetched_at?: string
          created_at?: string
        }
        Relationships: []
      }
      curated_leads: {
        Row: {
          id: string
          user_id: string
          raw_business_id: string
          business_id: string
          niche_tag: string
          relevance_score: number
          relevance_note: string
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          raw_business_id: string
          business_id: string
          niche_tag?: string
          relevance_score?: number
          relevance_note?: string
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          raw_business_id?: string
          business_id?: string
          niche_tag?: string
          relevance_score?: number
          relevance_note?: string
          status?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "curated_leads_raw_business_id_fkey"
            columns: ["raw_business_id"]
            isOneToOne: false
            referencedRelation: "raw_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curated_leads_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      email_dispatches: {
        Row: {
          id: string
          user_id: string
          contact_id: string
          subject: string
          status: string
          provider_message_id: string | null
          error_code: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          user_id: string
          contact_id: string
          subject: string
          status?: string
          provider_message_id?: string | null
          error_code?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          contact_id?: string
          subject?: string
          status?: string
          provider_message_id?: string | null
          error_code?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_dispatches_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
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
      global_outreach_profiles: {
        Row: {
          audience: string
          offer: string
          preferred_channel: string
          preferred_market: string
          profession: string
          sender_name: string
          updated_at: string
          user_id: string
          value_proposition: string
        }
        Insert: {
          audience?: string
          offer?: string
          preferred_channel?: string
          preferred_market?: string
          profession?: string
          sender_name?: string
          updated_at?: string
          user_id: string
          value_proposition?: string
        }
        Update: {
          audience?: string
          offer?: string
          preferred_channel?: string
          preferred_market?: string
          profession?: string
          sender_name?: string
          updated_at?: string
          user_id?: string
          value_proposition?: string
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
          business_id: string | null
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
          business_id?: string | null
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
          business_id?: string | null
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
            foreignKeyName: "leads_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
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
      provider_credentials: {
        Row: {
          cost_acknowledged: boolean
          created_at: string
          encrypted_secret: string
          key_hint: string
          provider: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cost_acknowledged?: boolean
          created_at?: string
          encrypted_secret: string
          key_hint?: string
          provider: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cost_acknowledged?: boolean
          created_at?: string
          encrypted_secret?: string
          key_hint?: string
          provider?: string
          updated_at?: string
          user_id?: string
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
