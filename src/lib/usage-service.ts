import { supabase } from './supabase'

export interface MonthlyUsage {
  user_id: string
  month_year: string
  invoice_count: number
  limit: number
  remaining: number
  percentage: number
}

export class UsageService {
  static readonly MONTHLY_LIMIT = 10000

  /**
   * Get current month's usage for a user
   */
  static async getCurrentMonthUsage(userId: string): Promise<MonthlyUsage> {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const currentMonth = `${year}-${month}`;
    
    // Use maybeSingle() instead of single() to avoid 406 errors when no rows exist
    const { data, error } = await supabase
      .from('user_monthly_usage')
      .select('*')
      .eq('user_id', userId)
      .eq('month_year', currentMonth)
      .maybeSingle()

    if (error) {
      console.error('Error fetching usage:', error)
      throw error
    }

    const invoiceCount = data?.invoice_count || 0
    const remaining = Math.max(0, this.MONTHLY_LIMIT - invoiceCount)
    const percentage = Math.round((invoiceCount / this.MONTHLY_LIMIT) * 100)

    return {
      user_id: userId,
      month_year: currentMonth,
      invoice_count: invoiceCount,
      limit: this.MONTHLY_LIMIT,
      remaining,
      percentage
    }
  }

  /**
   * Check if user can create specified number of invoices
   */
  static async canCreateInvoices(userId: string, count: number): Promise<{ canCreate: boolean; usage: MonthlyUsage; message?: string }> {
    const usage = await this.getCurrentMonthUsage(userId)
    const canCreate = usage.remaining >= count

    let message: string | undefined
    if (!canCreate) {
      if (usage.remaining === 0) {
        message = `Sie haben Ihr monatliches Limit von ${this.MONTHLY_LIMIT.toLocaleString()} Rechnungen erreicht.`
      } else {
        message = `Sie können nur noch ${usage.remaining.toLocaleString()} Rechnungen in diesem Monat erstellen. Sie möchten ${count.toLocaleString()} erstellen.`
      }
    }

    return { canCreate, usage, message }
  }

  /**
   * Increment usage count for user (called after successful invoice creation)
   */
  static async incrementUsage(userId: string, count: number = 1): Promise<MonthlyUsage> {
    const { data, error } = await supabase.rpc('increment_monthly_usage', {
      p_user_id: userId,
      p_count: count
    })

    if (error) {
      console.error('Error incrementing usage:', error)
      throw error
    }

    // Return updated usage
    return await this.getCurrentMonthUsage(userId)
  }

  /**
   * Get usage history for user (last 12 months)
   */
  static async getUserUsageHistory(userId: string): Promise<MonthlyUsage[]> {
    const { data, error } = await supabase
      .from('user_monthly_usage')
      .select('*')
      .eq('user_id', userId)
      .order('month_year', { ascending: false })
      .limit(12)

    if (error) {
      console.error('Error fetching usage history:', error)
      return []
    }

    return (data || []).map(item => ({
      user_id: item.user_id,
      month_year: item.month_year,
      invoice_count: item.invoice_count,
      limit: this.MONTHLY_LIMIT,
      remaining: Math.max(0, this.MONTHLY_LIMIT - item.invoice_count),
      percentage: Math.round((item.invoice_count / this.MONTHLY_LIMIT) * 100)
    }))
  }

  /**
   * Format month year for display
   */
  static formatMonthYear(monthYear: string): string {
    const [year, month] = monthYear.split('-')
    const date = new Date(parseInt(year), parseInt(month) - 1)
    return date.toLocaleDateString('de-DE', { year: 'numeric', month: 'long' })
  }
}
