import { createClient } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://demo.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'demo_key'

// In der Browser-Umgebung schreiben wir die Auth-Session zusätzlich in Cookies,
// damit Server-Routen den Benutzer authentifizieren können.
export const supabase = typeof window !== 'undefined'
  ? createBrowserClient(supabaseUrl, supabaseKey)
  : createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string
          address: string
          city: string
          tax_number: string | null
          vat_id: string | null
          tax_status: 'regular' | 'small_business'
          logo_url: string | null

          current_period_end?: string | null
          cancel_at_period_end?: boolean | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          name: string
          address: string
          city: string
          tax_number?: string | null
          vat_id?: string | null
          tax_status: 'regular' | 'small_business'
          logo_url?: string | null

          current_period_end?: string | null
          cancel_at_period_end?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          address?: string
          city?: string
          tax_number?: string | null
          vat_id?: string | null
          tax_status?: 'regular' | 'small_business'
          logo_url?: string | null

          current_period_end?: string | null
          cancel_at_period_end?: boolean | null
          updated_at?: string
        }
      }
      invoices: {
        Row: {
          id: string
          user_id: string
          invoice_number: string
          order_date: string
          service_date: string
          buyer_name: string
          buyer_address: string
          country: string
          country_classification: 'Deutschland' | 'EU-Ausland' | 'Drittland'
          net_total: number
          vat_total: number
          gross_total: number
          tax_note: string
          items: any[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          invoice_number: string
          order_date: string
          service_date: string
          buyer_name: string
          buyer_address: string
          country: string
          country_classification: 'Deutschland' | 'EU-Ausland' | 'Drittland'
          net_total: number
          vat_total: number
          gross_total: number
          tax_note: string
          items: any[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          invoice_number?: string
          order_date?: string
          service_date?: string
          buyer_name?: string
          buyer_address?: string
          country?: string
          country_classification?: 'Deutschland' | 'EU-Ausland' | 'Drittland'
          net_total?: number
          vat_total?: number
          gross_total?: number
          tax_note?: string
          items?: any[]
          updated_at?: string
        }
      }
      user_monthly_usage: {
        Row: {
          id: string
          user_id: string
          month_year: string
          invoice_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          month_year: string
          invoice_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          month_year?: string
          invoice_count?: number
          updated_at?: string
        }
      }
      user_credits: {
        Row: {
          id: string
          user_id: string
          credits: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          credits?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          credits?: number
          updated_at?: string
        }
      }
      credit_packages: {
        Row: {
          id: string
          name: string
          credits: number
          price_euros: number
          description: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          credits: number
          price_euros: number
          description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          credits?: number
          price_euros?: number
          description?: string | null
          is_active?: boolean
          updated_at?: string
        }
      }
      credit_transactions: {
        Row: {
          id: string
          user_id: string
          transaction_type: 'purchase' | 'usage' | 'refund' | 'bonus'
          credits_change: number
          credits_balance_after: number
          description: string | null
          purchase_id: string | null
          invoice_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          transaction_type: 'purchase' | 'usage' | 'refund' | 'bonus'
          credits_change: number
          credits_balance_after: number
          description?: string | null
          purchase_id?: string | null
          invoice_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          transaction_type?: 'purchase' | 'usage' | 'refund' | 'bonus'
          credits_change?: number
          credits_balance_after?: number
          description?: string | null
          purchase_id?: string | null
          invoice_id?: string | null
        }
      }
      credit_purchases: {
        Row: {
          id: string
          user_id: string
          package_id: string | null
          credits_purchased: number
          price_paid: number
          payment_status: 'pending' | 'completed' | 'failed' | 'refunded'
          paypal_transaction_id: string | null
          paypal_payment_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          package_id?: string | null
          credits_purchased: number
          price_paid: number
          payment_status?: 'pending' | 'completed' | 'failed' | 'refunded'
          paypal_transaction_id?: string | null
          paypal_payment_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          package_id?: string | null
          credits_purchased?: number
          price_paid?: number
          payment_status?: 'pending' | 'completed' | 'failed' | 'refunded'
          paypal_transaction_id?: string | null
          paypal_payment_id?: string | null
          updated_at?: string
        }
      }
      invoice_counters: {
        Row: {
          id: string
          user_id: string
          year: number
          last_number: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          year: number
          last_number?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          year?: number
          last_number?: number
          updated_at?: string
        }
      }
    }
  }
}
