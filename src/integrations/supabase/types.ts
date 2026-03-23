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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          account_name: string
          created_at: string
          data_expiracao: string | null
          id: string
          owner_id: string
          plan_id: string | null
          subscription_status: string
          updated_at: string
        }
        Insert: {
          account_name: string
          created_at?: string
          data_expiracao?: string | null
          id?: string
          owner_id: string
          plan_id?: string | null
          subscription_status?: string
          updated_at?: string
        }
        Update: {
          account_name?: string
          created_at?: string
          data_expiracao?: string | null
          id?: string
          owner_id?: string
          plan_id?: string | null
          subscription_status?: string
          updated_at?: string
        }
        Relationships: []
      }
      agent_configs: {
        Row: {
          context_window: number | null
          created_at: string | null
          customer_prompt: string | null
          handoff_triggers: Json | null
          id: string
          is_active: boolean | null
          language: string | null
          lead_prompt: string | null
          max_tokens: number | null
          name: string
          personality: string | null
          system_prompt: string
          temperature: number | null
          tone: string | null
          training_examples: Json | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          context_window?: number | null
          created_at?: string | null
          customer_prompt?: string | null
          handoff_triggers?: Json | null
          id?: string
          is_active?: boolean | null
          language?: string | null
          lead_prompt?: string | null
          max_tokens?: number | null
          name: string
          personality?: string | null
          system_prompt: string
          temperature?: number | null
          tone?: string | null
          training_examples?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          context_window?: number | null
          created_at?: string | null
          customer_prompt?: string | null
          handoff_triggers?: Json | null
          id?: string
          is_active?: boolean | null
          language?: string | null
          lead_prompt?: string | null
          max_tokens?: number | null
          name?: string
          personality?: string | null
          system_prompt?: string
          temperature?: number | null
          tone?: string | null
          training_examples?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      billing_plans: {
        Row: {
          created_at: string
          days_duration: number
          id: string
          name: string
          price_cents: number
          provider: string
          provider_link: string
        }
        Insert: {
          created_at?: string
          days_duration?: number
          id: string
          name: string
          price_cents: number
          provider?: string
          provider_link: string
        }
        Update: {
          created_at?: string
          days_duration?: number
          id?: string
          name?: string
          price_cents?: number
          provider?: string
          provider_link?: string
        }
        Relationships: []
      }
      checkout_sessions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          plan_id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          plan_id: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          plan_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checkout_sessions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "billing_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          account_id: string | null
          address: string | null
          company: string | null
          contact_type: string
          created_at: string | null
          document: string | null
          email: string | null
          id: string
          lead_score: number | null
          name: string
          notes: string | null
          phone: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_id?: string | null
          address?: string | null
          company?: string | null
          contact_type: string
          created_at?: string | null
          document?: string | null
          email?: string | null
          id?: string
          lead_score?: number | null
          name: string
          notes?: string | null
          phone?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_id?: string | null
          address?: string | null
          company?: string | null
          contact_type?: string
          created_at?: string | null
          document?: string | null
          email?: string | null
          id?: string
          lead_score?: number | null
          name?: string
          notes?: string | null
          phone?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          account_id: string | null
          adjustment_index: string | null
          cleaning_fee: number | null
          co_tenants: Json | null
          condo_fee: number | null
          contract_number: string | null
          created_at: string | null
          documents: Json | null
          electricity_amount: number | null
          end_date: string | null
          extra_charges: Json | null
          gas_amount: number | null
          guarantee_type: string | null
          guarantee_value: number | null
          id: string
          internet_amount: number | null
          payment_day: number | null
          payment_method: string | null
          pre_paid: boolean | null
          property_id: string | null
          rental_value: number
          start_date: string
          status: string
          tenant_document: string | null
          tenant_email: string | null
          tenant_emergency_phone: string | null
          tenant_name: string
          tenant_phone: string | null
          tenant_profession: string | null
          tenant_rg: string | null
          updated_at: string | null
          user_id: string
          water_amount: number | null
        }
        Insert: {
          account_id?: string | null
          adjustment_index?: string | null
          cleaning_fee?: number | null
          co_tenants?: Json | null
          condo_fee?: number | null
          contract_number?: string | null
          created_at?: string | null
          documents?: Json | null
          electricity_amount?: number | null
          end_date?: string | null
          extra_charges?: Json | null
          gas_amount?: number | null
          guarantee_type?: string | null
          guarantee_value?: number | null
          id?: string
          internet_amount?: number | null
          payment_day?: number | null
          payment_method?: string | null
          pre_paid?: boolean | null
          property_id?: string | null
          rental_value: number
          start_date: string
          status?: string
          tenant_document?: string | null
          tenant_email?: string | null
          tenant_emergency_phone?: string | null
          tenant_name: string
          tenant_phone?: string | null
          tenant_profession?: string | null
          tenant_rg?: string | null
          updated_at?: string | null
          user_id: string
          water_amount?: number | null
        }
        Update: {
          account_id?: string | null
          adjustment_index?: string | null
          cleaning_fee?: number | null
          co_tenants?: Json | null
          condo_fee?: number | null
          contract_number?: string | null
          created_at?: string | null
          documents?: Json | null
          electricity_amount?: number | null
          end_date?: string | null
          extra_charges?: Json | null
          gas_amount?: number | null
          guarantee_type?: string | null
          guarantee_value?: number | null
          id?: string
          internet_amount?: number | null
          payment_day?: number | null
          payment_method?: string | null
          pre_paid?: boolean | null
          property_id?: string | null
          rental_value?: number
          start_date?: string
          status?: string
          tenant_document?: string | null
          tenant_email?: string | null
          tenant_emergency_phone?: string | null
          tenant_name?: string
          tenant_phone?: string | null
          tenant_profession?: string | null
          tenant_rg?: string | null
          updated_at?: string | null
          user_id?: string
          water_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_summaries: {
        Row: {
          action_items: Json | null
          conversation_id: string | null
          customer_preferences: Json | null
          id: string
          interaction_patterns: Json | null
          key_information: Json | null
          long_term_memory: Json | null
          next_steps: string | null
          short_term_memory: Json | null
          summary: string | null
          updated_at: string | null
        }
        Insert: {
          action_items?: Json | null
          conversation_id?: string | null
          customer_preferences?: Json | null
          id?: string
          interaction_patterns?: Json | null
          key_information?: Json | null
          long_term_memory?: Json | null
          next_steps?: string | null
          short_term_memory?: Json | null
          summary?: string | null
          updated_at?: string | null
        }
        Update: {
          action_items?: Json | null
          conversation_id?: string | null
          customer_preferences?: Json | null
          id?: string
          interaction_patterns?: Json | null
          key_information?: Json | null
          long_term_memory?: Json | null
          next_steps?: string | null
          short_term_memory?: Json | null
          summary?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_summaries_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: true
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          agent_type: string | null
          context_summary: string | null
          created_at: string | null
          customer_type: string | null
          human_agent_id: string | null
          human_takeover: boolean | null
          id: string
          is_active: boolean | null
          last_message_at: string | null
          lead_id: string | null
          session_id: string
          takeover_at: string | null
        }
        Insert: {
          agent_type?: string | null
          context_summary?: string | null
          created_at?: string | null
          customer_type?: string | null
          human_agent_id?: string | null
          human_takeover?: boolean | null
          id?: string
          is_active?: boolean | null
          last_message_at?: string | null
          lead_id?: string | null
          session_id: string
          takeover_at?: string | null
        }
        Update: {
          agent_type?: string | null
          context_summary?: string | null
          created_at?: string | null
          customer_type?: string | null
          human_agent_id?: string | null
          human_takeover?: boolean | null
          id?: string
          is_active?: boolean | null
          last_message_at?: string | null
          lead_id?: string | null
          session_id?: string
          takeover_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      extrato_aliases: {
        Row: {
          account_id: string
          contract_id: string
          created_at: string
          id: string
          nome_extrato: string
          tenant_name: string
          updated_at: string
        }
        Insert: {
          account_id: string
          contract_id: string
          created_at?: string
          id?: string
          nome_extrato: string
          tenant_name: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          contract_id?: string
          created_at?: string
          id?: string
          nome_extrato?: string
          tenant_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "extrato_aliases_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extrato_aliases_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          account_id: string | null
          bank_data: Json | null
          cleaning_fee: number | null
          condo_fee: number | null
          contract_id: string | null
          created_at: string | null
          discount: number | null
          discount_description: string | null
          due_date: string
          electricity_amount: number | null
          extra_charges: Json | null
          gas_amount: number | null
          guarantee_installment: number | null
          guarantee_installment_number: number | null
          history: Json | null
          id: string
          internet_amount: number | null
          invoice_number: string | null
          issue_date: string
          notes: string | null
          payment_date: string | null
          payment_method: string | null
          property_id: string | null
          reference_month: string
          rental_amount: number
          status: string
          total_amount: number
          updated_at: string | null
          user_id: string
          water_amount: number | null
        }
        Insert: {
          account_id?: string | null
          bank_data?: Json | null
          cleaning_fee?: number | null
          condo_fee?: number | null
          contract_id?: string | null
          created_at?: string | null
          discount?: number | null
          discount_description?: string | null
          due_date: string
          electricity_amount?: number | null
          extra_charges?: Json | null
          gas_amount?: number | null
          guarantee_installment?: number | null
          guarantee_installment_number?: number | null
          history?: Json | null
          id?: string
          internet_amount?: number | null
          invoice_number?: string | null
          issue_date?: string
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
          property_id?: string | null
          reference_month: string
          rental_amount?: number
          status?: string
          total_amount: number
          updated_at?: string | null
          user_id: string
          water_amount?: number | null
        }
        Update: {
          account_id?: string | null
          bank_data?: Json | null
          cleaning_fee?: number | null
          condo_fee?: number | null
          contract_id?: string | null
          created_at?: string | null
          discount?: number | null
          discount_description?: string | null
          due_date?: string
          electricity_amount?: number | null
          extra_charges?: Json | null
          gas_amount?: number | null
          guarantee_installment?: number | null
          guarantee_installment_number?: number | null
          history?: Json | null
          id?: string
          internet_amount?: number | null
          invoice_number?: string | null
          issue_date?: string
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
          property_id?: string | null
          reference_month?: string
          rental_amount?: number
          status?: string
          total_amount?: number
          updated_at?: string | null
          user_id?: string
          water_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      lancamentos_financeiros: {
        Row: {
          account_id: string | null
          categoria: string | null
          created_at: string | null
          data_pagamento: string | null
          data_vencimento: string
          descricao: string | null
          id: string
          id_contrato: string | null
          id_imovel: string | null
          invoice_id: string | null
          observacoes: string | null
          status: Database["public"]["Enums"]["lancamento_status"]
          tipo: Database["public"]["Enums"]["lancamento_tipo"]
          updated_at: string | null
          user_id: string
          valor: number
        }
        Insert: {
          account_id?: string | null
          categoria?: string | null
          created_at?: string | null
          data_pagamento?: string | null
          data_vencimento: string
          descricao?: string | null
          id?: string
          id_contrato?: string | null
          id_imovel?: string | null
          invoice_id?: string | null
          observacoes?: string | null
          status?: Database["public"]["Enums"]["lancamento_status"]
          tipo: Database["public"]["Enums"]["lancamento_tipo"]
          updated_at?: string | null
          user_id: string
          valor: number
        }
        Update: {
          account_id?: string | null
          categoria?: string | null
          created_at?: string | null
          data_pagamento?: string | null
          data_vencimento?: string
          descricao?: string | null
          id?: string
          id_contrato?: string | null
          id_imovel?: string | null
          invoice_id?: string | null
          observacoes?: string | null
          status?: Database["public"]["Enums"]["lancamento_status"]
          tipo?: Database["public"]["Enums"]["lancamento_tipo"]
          updated_at?: string | null
          user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "lancamentos_financeiros_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamentos_financeiros_id_contrato_fkey"
            columns: ["id_contrato"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamentos_financeiros_id_imovel_fkey"
            columns: ["id_imovel"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamentos_financeiros_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          budget_range: string | null
          company: string | null
          created_at: string | null
          decision_maker: boolean | null
          email: string | null
          id: string
          lead_score: number | null
          lead_type: string | null
          name: string | null
          phone_number: string
          segment: string | null
          sentiment: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          budget_range?: string | null
          company?: string | null
          created_at?: string | null
          decision_maker?: boolean | null
          email?: string | null
          id?: string
          lead_score?: number | null
          lead_type?: string | null
          name?: string | null
          phone_number: string
          segment?: string | null
          sentiment?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          budget_range?: string | null
          company?: string | null
          created_at?: string | null
          decision_maker?: boolean | null
          email?: string | null
          id?: string
          lead_score?: number | null
          lead_type?: string | null
          name?: string | null
          phone_number?: string
          segment?: string | null
          sentiment?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      license_audit: {
        Row: {
          created_at: string
          id: number
          new_expiration: string | null
          previous_expiration: string | null
          ref_payment_id: number | null
          source: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: number
          new_expiration?: string | null
          previous_expiration?: string | null
          ref_payment_id?: number | null
          source: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: number
          new_expiration?: string | null
          previous_expiration?: string | null
          ref_payment_id?: number | null
          source?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "license_audit_ref_payment_id_fkey"
            columns: ["ref_payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string | null
          created_at: string | null
          data: string | null
          fromMe: string | null
          id: string | null
          message_type: string | null
          pushName: string | null
          session_Id: string
          tipo: string
        }
        Insert: {
          content: string
          conversation_id?: string | null
          created_at?: string | null
          data?: string | null
          fromMe?: string | null
          id?: string | null
          message_type?: string | null
          pushName?: string | null
          session_Id: string
          tipo: string
        }
        Update: {
          content?: string
          conversation_id?: string | null
          created_at?: string | null
          data?: string | null
          fromMe?: string | null
          id?: string | null
          message_type?: string | null
          pushName?: string | null
          session_Id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_messages_conversation"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_cents: number | null
          created_at: string
          currency: string | null
          event_id: string | null
          external_tx_id: string | null
          id: number
          plan_id: string | null
          provider: string
          raw: Json
          session_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          amount_cents?: number | null
          created_at?: string
          currency?: string | null
          event_id?: string | null
          external_tx_id?: string | null
          id?: number
          plan_id?: string | null
          provider?: string
          raw: Json
          session_id?: string | null
          status: string
          user_id: string
        }
        Update: {
          amount_cents?: number | null
          created_at?: string
          currency?: string | null
          event_id?: string | null
          external_tx_id?: string | null
          id?: number
          plan_id?: string | null
          provider?: string
          raw?: Json
          session_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "billing_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "checkout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_integrations: {
        Row: {
          account_id: string
          ad_limit: number | null
          created_at: string | null
          credentials: Json | null
          featured_limit: number | null
          feed_url: string | null
          id: string
          is_active: boolean | null
          provider: string
          updated_at: string | null
        }
        Insert: {
          account_id: string
          ad_limit?: number | null
          created_at?: string | null
          credentials?: Json | null
          featured_limit?: number | null
          feed_url?: string | null
          id?: string
          is_active?: boolean | null
          provider: string
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          ad_limit?: number | null
          created_at?: string | null
          credentials?: Json | null
          featured_limit?: number | null
          feed_url?: string | null
          id?: string
          is_active?: boolean | null
          provider?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portal_integrations_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_sync_logs: {
        Row: {
          account_id: string | null
          action: string | null
          error_message: string | null
          id: string
          portal: string | null
          property_id: string | null
          status: string | null
          synced_at: string | null
        }
        Insert: {
          account_id?: string | null
          action?: string | null
          error_message?: string | null
          id?: string
          portal?: string | null
          property_id?: string | null
          status?: string | null
          synced_at?: string | null
        }
        Update: {
          account_id?: string | null
          action?: string | null
          error_message?: string | null
          id?: string
          portal?: string | null
          property_id?: string | null
          status?: string | null
          synced_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portal_sync_logs_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_sync_logs_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_id: string | null
          avatar_url: string | null
          created_at: string | null
          data_expiracao: string | null
          full_name: string | null
          google_calendar_embed_url: string | null
          id: string
          is_active: boolean | null
          last_access: string | null
          updated_at: string | null
        }
        Insert: {
          account_id?: string | null
          avatar_url?: string | null
          created_at?: string | null
          data_expiracao?: string | null
          full_name?: string | null
          google_calendar_embed_url?: string | null
          id: string
          is_active?: boolean | null
          last_access?: string | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string | null
          avatar_url?: string | null
          created_at?: string | null
          data_expiracao?: string | null
          full_name?: string | null
          google_calendar_embed_url?: string | null
          id?: string
          is_active?: boolean | null
          last_access?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          account_id: string | null
          address: string
          built_area: number | null
          city: string
          classification: string | null
          complement: string | null
          construction_year: number | null
          country: string | null
          cover_photo: string | null
          created_at: string | null
          documents: Json | null
          id: string
          land_area: number | null
          linked_persons: Json | null
          name: string
          nearby_facilities: Json | null
          neighborhood: string | null
          number: string | null
          owner_contact: string | null
          owner_email: string | null
          owner_name: string | null
          photos: string[] | null
          portal_last_sync: string | null
          portal_listing_id: string | null
          portal_status: string | null
          postal_code: string | null
          property_type: string
          publish_to_portals: boolean | null
          registry_data: string | null
          state: string
          status: string
          total_area: number | null
          transaction_type: string | null
          updated_at: string | null
          useful_area: number | null
          user_id: string
        }
        Insert: {
          account_id?: string | null
          address: string
          built_area?: number | null
          city: string
          classification?: string | null
          complement?: string | null
          construction_year?: number | null
          country?: string | null
          cover_photo?: string | null
          created_at?: string | null
          documents?: Json | null
          id?: string
          land_area?: number | null
          linked_persons?: Json | null
          name: string
          nearby_facilities?: Json | null
          neighborhood?: string | null
          number?: string | null
          owner_contact?: string | null
          owner_email?: string | null
          owner_name?: string | null
          photos?: string[] | null
          portal_last_sync?: string | null
          portal_listing_id?: string | null
          portal_status?: string | null
          postal_code?: string | null
          property_type: string
          publish_to_portals?: boolean | null
          registry_data?: string | null
          state: string
          status?: string
          total_area?: number | null
          transaction_type?: string | null
          updated_at?: string | null
          useful_area?: number | null
          user_id: string
        }
        Update: {
          account_id?: string | null
          address?: string
          built_area?: number | null
          city?: string
          classification?: string | null
          complement?: string | null
          construction_year?: number | null
          country?: string | null
          cover_photo?: string | null
          created_at?: string | null
          documents?: Json | null
          id?: string
          land_area?: number | null
          linked_persons?: Json | null
          name?: string
          nearby_facilities?: Json | null
          neighborhood?: string | null
          number?: string | null
          owner_contact?: string | null
          owner_email?: string | null
          owner_name?: string | null
          photos?: string[] | null
          portal_last_sync?: string | null
          portal_listing_id?: string | null
          portal_status?: string | null
          postal_code?: string | null
          property_type?: string
          publish_to_portals?: boolean | null
          registry_data?: string | null
          state?: string
          status?: string
          total_area?: number | null
          transaction_type?: string | null
          updated_at?: string | null
          useful_area?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "properties_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_visits: {
        Row: {
          account_id: string | null
          contact_id: string | null
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          property_id: string | null
          status: string
          updated_at: string
          user_id: string
          visit_date: string
          visit_time: string
          visitor_email: string | null
          visitor_name: string
          visitor_phone: string
        }
        Insert: {
          account_id?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          property_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
          visit_date: string
          visit_time: string
          visitor_email?: string | null
          visitor_name: string
          visitor_phone: string
        }
        Update: {
          account_id?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          property_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          visit_date?: string
          visit_time?: string
          visitor_email?: string | null
          visitor_name?: string
          visitor_phone?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_visits_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_visits_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_visits_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_logs: {
        Row: {
          action: string
          created_at: string | null
          error_message: string | null
          id: string
          metadata: Json | null
          phone_number: string
          status: string
        }
        Insert: {
          action: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          phone_number: string
          status: string
        }
        Update: {
          action?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          phone_number?: string
          status?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_resumo_financeiro: {
        Args: { p_data_fim: string; p_data_inicio: string; p_user_id: string }
        Returns: {
          saldo: number
          total_despesas: number
          total_inadimplencia: number
          total_receitas: number
        }[]
      }
      get_user_account_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      unaccent: { Args: { "": string }; Returns: string }
    }
    Enums: {
      app_role:
        | "admin"
        | "socio"
        | "assistente"
        | "sdr"
        | "suporte"
        | "full"
        | "agenda"
        | "cadastro_leads"
        | "financeiro"
        | "super_admin"
        | "trial"
      lancamento_status: "pendente" | "pago" | "atrasado" | "cancelado"
      lancamento_tipo: "receita" | "despesa"
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
      app_role: [
        "admin",
        "socio",
        "assistente",
        "sdr",
        "suporte",
        "full",
        "agenda",
        "cadastro_leads",
        "financeiro",
        "super_admin",
        "trial",
      ],
      lancamento_status: ["pendente", "pago", "atrasado", "cancelado"],
      lancamento_tipo: ["receita", "despesa"],
    },
  },
} as const
