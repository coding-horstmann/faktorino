import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://demo.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'demo_key'

export const supabase = createClient(supabaseUrl, supabaseKey)

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
    }
  }
}
