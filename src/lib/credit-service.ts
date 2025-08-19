import { supabase, supabaseAdmin } from './supabase'
import { CreditEvents } from './credit-events'

export interface UserCredits {
  user_id: string
  credits: number
  created_at: string
  updated_at: string
}

export interface CreditTransaction {
  id: string
  user_id: string
  transaction_type: 'purchase' | 'usage' | 'refund' | 'bonus'
  credits_change: number
  credits_balance_after: number
  description?: string
  purchase_id?: string
  invoice_id?: string
  created_at: string
}

export interface CreditPackage {
  id: string
  name: string
  credits: number
  price_euros: number
  description?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreditPurchase {
  id: string
  user_id: string
  package_id?: string
  credits_purchased: number
  price_paid: number
  payment_status: 'pending' | 'completed' | 'failed' | 'refunded'
  paypal_transaction_id?: string
  paypal_payment_id?: string
  created_at: string
  updated_at: string
}

export class CreditService {
  
  /**
   * Benutzer-Credits abrufen (für Frontend)
   */
  static async getUserCredits(userId: string): Promise<UserCredits | null> {
    console.log('CreditService.getUserCredits called for user:', userId);
    
    const { data, error } = await supabase
      .from('user_credits')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    console.log('CreditService.getUserCredits result:', { data, error });
    console.log('CreditService.getUserCredits - data details:', data);
    console.log('CreditService.getUserCredits - credits value:', data?.credits);

    if (error) {
      console.error('Error fetching user credits:', error)
      throw error
    }

    return data
  }

  /**
   * Benutzer-Credits abrufen (für Server Actions)
   */
  static async getUserCreditsServer(userId: string): Promise<UserCredits | null> {
    console.log('CreditService.getUserCreditsServer called for user:', userId);
    
    const { data, error } = await supabaseAdmin
      .from('user_credits')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    console.log('CreditService.getUserCreditsServer result:', { data, error });
    console.log('CreditService.getUserCreditsServer - data details:', data);
    console.log('CreditService.getUserCreditsServer - credits value:', data?.credits);

    if (error) {
      console.error('Error fetching user credits (server):', error)
      throw error
    }

    return data
  }

  /**
   * Prüfen ob Benutzer genügend Credits hat
   */
  static async hasEnoughCredits(userId: string, requiredCredits: number): Promise<boolean> {
    const userCredits = await this.getUserCredits(userId)
    if (!userCredits) {
      return false
    }
    return userCredits.credits >= requiredCredits
  }

  /**
   * Credits verwenden (für Rechnungserstellung)
   */
  static async useCredits(
    userId: string, 
    creditsToUse: number, 
    description?: string, 
    invoiceId?: string
  ): Promise<{ success: boolean; newBalance?: number; error?: string }> {
    const { data, error } = await supabase.rpc('use_credits', {
      p_user_id: userId,
      p_credits_to_use: creditsToUse,
      p_description: description,
      p_invoice_id: invoiceId
    })

    if (error) {
      console.error('Error using credits:', error)
      return { success: false, error: error.message }
    }

    if (!data) {
      return { success: false, error: 'Nicht genügend Credits verfügbar' }
    }

    // Neue Balance abrufen
    const updatedCredits = await this.getUserCredits(userId)
    
    // Event für Echtzeit-Update auslösen
    CreditEvents.triggerCreditChange({
      userId,
      newCredits: updatedCredits?.credits || 0,
      change: -creditsToUse
    })
    
    return { 
      success: true, 
      newBalance: updatedCredits?.credits 
    }
  }

  /**
   * Credits hinzufügen (nach erfolgreichem Kauf)
   */
  static async addCredits(
    userId: string, 
    creditsToAdd: number, 
    description?: string, 
    purchaseId?: string
  ): Promise<{ success: boolean; newBalance?: number; error?: string }> {
    const { data, error } = await supabase.rpc('add_credits', {
      p_user_id: userId,
      p_credits_to_add: creditsToAdd,
      p_description: description,
      p_purchase_id: purchaseId
    })

    if (error) {
      console.error('Error adding credits:', error)
      return { success: false, error: error.message }
    }

    // Neue Balance abrufen
    const updatedCredits = await this.getUserCredits(userId)
    
    // Event für Echtzeit-Update auslösen
    CreditEvents.triggerCreditChange({
      userId,
      newCredits: updatedCredits?.credits || 0,
      change: creditsToAdd
    })
    
    return { 
      success: true, 
      newBalance: updatedCredits?.credits 
    }
  }

  /**
   * Credit-Transaktionshistorie abrufen
   */
  static async getCreditTransactions(userId: string, limit: number = 50): Promise<CreditTransaction[]> {
    const { data, error } = await supabase
      .from('credit_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching credit transactions:', error)
      return []
    }

    return data || []
  }

  /**
   * Verfügbare Credit-Pakete abrufen
   */
  static async getAvailablePackages(): Promise<CreditPackage[]> {
    const { data, error } = await supabase
      .from('credit_packages')
      .select('*')
      .eq('is_active', true)
      .order('credits', { ascending: true })

    if (error) {
      console.error('Error fetching credit packages:', error)
      return []
    }

    return data || []
  }

  /**
   * Credit-Kauf erstellen (für PayPal-Integration)
   */
  static async createPurchase(
    userId: string,
    packageId: string,
    creditsPurchased: number,
    pricePaid: number
  ): Promise<{ success: boolean; purchaseId?: string; error?: string }> {
    const { data, error } = await supabase
      .from('credit_purchases')
      .insert({
        user_id: userId,
        package_id: packageId,
        credits_purchased: creditsPurchased,
        price_paid: pricePaid,
        payment_status: 'pending'
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating purchase:', error)
      return { success: false, error: error.message }
    }

    return { success: true, purchaseId: data.id }
  }

  /**
   * Kauf-Status aktualisieren
   */
  static async updatePurchaseStatus(
    purchaseId: string,
    status: CreditPurchase['payment_status'],
    paypalTransactionId?: string,
    paypalPaymentId?: string
  ): Promise<{ success: boolean; error?: string }> {
    const updateData: any = {
      payment_status: status,
      updated_at: new Date().toISOString()
    }

    if (paypalTransactionId) {
      updateData.paypal_transaction_id = paypalTransactionId
    }

    if (paypalPaymentId) {
      updateData.paypal_payment_id = paypalPaymentId
    }

    const { error } = await supabase
      .from('credit_purchases')
      .update(updateData)
      .eq('id', purchaseId)

    if (error) {
      console.error('Error updating purchase status:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  }

  /**
   * Kauf abschließen (Credits hinzufügen nach erfolgreicher Zahlung)
   */
  static async completePurchase(purchaseId: string): Promise<{ success: boolean; error?: string }> {
    // Kaufdaten abrufen
    const { data: purchase, error: purchaseError } = await supabase
      .from('credit_purchases')
      .select('*')
      .eq('id', purchaseId)
      .single()

    if (purchaseError || !purchase) {
      console.error('Error fetching purchase:', purchaseError)
      return { success: false, error: 'Kauf nicht gefunden' }
    }

    if (purchase.payment_status !== 'pending') {
      return { success: false, error: `Kauf ist bereits ${purchase.payment_status}` }
    }

    // Credits hinzufügen
    const addResult = await this.addCredits(
      purchase.user_id,
      purchase.credits_purchased,
      `Kauf von ${purchase.credits_purchased} Credits`,
      purchaseId
    )

    if (!addResult.success) {
      return { success: false, error: addResult.error }
    }

    // Kauf-Status auf "completed" setzen
    const updateResult = await this.updatePurchaseStatus(purchaseId, 'completed')
    
    if (!updateResult.success) {
      return { success: false, error: updateResult.error }
    }

    return { success: true }
  }

  /**
   * Benutzer-Käufe abrufen
   */
  static async getUserPurchases(userId: string): Promise<CreditPurchase[]> {
    const { data, error } = await supabase
      .from('credit_purchases')
      .select(`
        *,
        credit_packages(name, credits, price_euros)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching user purchases:', error)
      return []
    }

    return data || []
  }

  /**
   * Statistiken für Dashboard abrufen
   */
  static async getUserCreditStats(userId: string): Promise<{
    currentCredits: number
    totalPurchased: number
    totalUsed: number
    totalTransactions: number
  }> {
    // Aktuelle Credits
    const userCredits = await this.getUserCredits(userId)
    const currentCredits = userCredits?.credits || 0

    // Transaktionsstatistiken
    const { data: transactions } = await supabase
      .from('credit_transactions')
      .select('transaction_type, credits_change')
      .eq('user_id', userId)

    let totalPurchased = 0
    let totalUsed = 0
    let totalTransactions = transactions?.length || 0

    transactions?.forEach(transaction => {
      if (transaction.transaction_type === 'purchase' || transaction.transaction_type === 'bonus') {
        totalPurchased += transaction.credits_change
      } else if (transaction.transaction_type === 'usage') {
        totalUsed += Math.abs(transaction.credits_change)
      }
    })

    return {
      currentCredits,
      totalPurchased,
      totalUsed,
      totalTransactions
    }
  }
}
