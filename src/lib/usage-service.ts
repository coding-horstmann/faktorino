import { supabase } from './supabase'

// DEPRECATED: Diese Klasse wurde durch das Credit-System ersetzt
// Das monatliche Limit-System ist nicht mehr aktiv
export interface MonthlyUsage {
  user_id: string
  month_year: string
  invoice_count: number
  limit: number
  remaining: number
  percentage: number
}

export class UsageService {
  // DEPRECATED: Monatliches Limit-System wurde durch Credit-System ersetzt
  // Diese Klasse wird nur noch für Kompatibilität behalten
  
  /**
   * DEPRECATED: Get current month's usage for a user
   * Wird durch CreditService.getUserCredits() ersetzt
   */
  static async getCurrentMonthUsage(userId: string): Promise<MonthlyUsage> {
    // Rückwärtskompatibilität - gibt immer 0 zurück
    return {
      user_id: userId,
      month_year: new Date().toISOString().slice(0, 7), // YYYY-MM
      invoice_count: 0,
      limit: 0,
      remaining: 0,
      percentage: 0
    }
  }

  /**
   * DEPRECATED: Check if user can create specified number of invoices
   * Wird durch CreditService.canUseCredits() ersetzt
   */
  static async canCreateInvoices(userId: string, count: number): Promise<{ canCreate: boolean; usage: MonthlyUsage; message?: string }> {
    // Rückwärtskompatibilität - immer true, da Credit-System verwendet wird
    return { 
      canCreate: true, 
      usage: await this.getCurrentMonthUsage(userId),
      message: 'Monatliches Limit-System wurde durch Credit-System ersetzt'
    }
  }

  /**
   * DEPRECATED: Increment usage count for user
   * Wird durch CreditService.useCredits() ersetzt
   */
  static async incrementUsage(userId: string, count: number = 1): Promise<MonthlyUsage> {
    // Rückwärtskompatibilität - keine Aktion
    return await this.getCurrentMonthUsage(userId)
  }

  /**
   * DEPRECATED: Get usage history for user
   * Wird durch CreditService.getCreditTransactions() ersetzt
   */
  static async getUserUsageHistory(userId: string): Promise<MonthlyUsage[]> {
    // Rückwärtskompatibilität - leeres Array
    return []
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
