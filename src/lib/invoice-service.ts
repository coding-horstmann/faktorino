import { supabase } from './supabase'
import type { Database } from './supabase'

type InvoiceRow = Database['public']['Tables']['invoices']['Row']
type InvoiceInsert = Database['public']['Tables']['invoices']['Insert']
type InvoiceUpdate = Database['public']['Tables']['invoices']['Update']

export class InvoiceService {
  static async getUserInvoices(userId: string): Promise<InvoiceRow[]> {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching invoices:', error)
      return []
    }

    return data || []
  }

  static async createInvoice(invoice: InvoiceInsert): Promise<InvoiceRow | null> {
    const { data, error } = await supabase
      .from('invoices')
      .insert(invoice)
      .select()
      .single()

    if (error) {
      console.error('Error creating invoice:', error)
      return null
    }

    return data
  }

  static async createMultipleInvoices(invoices: InvoiceInsert[]): Promise<InvoiceRow[]> {
    const { data, error } = await supabase
      .from('invoices')
      .insert(invoices)
      .select()

    if (error) {
      console.error('Error creating invoices:', error)
      return []
    }

    return data || []
  }

  static async updateInvoice(invoiceId: string, updates: InvoiceUpdate): Promise<InvoiceRow | null> {
    const { data, error } = await supabase
      .from('invoices')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', invoiceId)
      .select()
      .single()

    if (error) {
      console.error('Error updating invoice:', error)
      return null
    }

    return data
  }

  static async deleteInvoice(invoiceId: string): Promise<boolean> {
    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', invoiceId)

    if (error) {
      console.error('Error deleting invoice:', error)
      return false
    }

    return true
  }

  static async deleteAllUserInvoices(userId: string): Promise<boolean> {
    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('user_id', userId)

    if (error) {
      console.error('Error deleting all invoices:', error)
      return false
    }

    return true
  }

  static async getInvoiceById(invoiceId: string): Promise<InvoiceRow | null> {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single()

    if (error) {
      console.error('Error fetching invoice:', error)
      return null
    }

    return data
  }
}
