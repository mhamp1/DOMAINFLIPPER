/**
 * Supabase Database Integration
 * Real database for tracking domains, flips, profits
 */

import { createClient } from '@supabase/supabase-js'
import type { Domain } from '@/types/domain'

interface SupabaseConfig {
  url: string
  anonKey: string
}

interface OwnedDomain {
  id: string
  domain: string
  purchase_price: number
  purchase_date: string
  estimated_value: number
  current_value: number
  listed: boolean
  sold: boolean
  sale_price?: number
  sale_date?: string
  strategy_id: string
  created_at: string
  updated_at: string
}

interface Transaction {
  id: string
  type: 'buy' | 'sell'
  domain: string
  amount: number
  date: string
  strategy_id: string
  status: 'pending' | 'completed' | 'failed'
  marketplace?: string
}

export class SupabaseDB {
  private client: ReturnType<typeof createClient>

  constructor(config: SupabaseConfig) {
    this.client = createClient(config.url, config.anonKey)
  }

  /**
   * Save owned domain
   */
  async saveOwnedDomain(domain: Domain, purchasePrice: number, userId: string): Promise<OwnedDomain> {
    const { data, error } = await this.client
      .from('owned_domains')
      .insert({
        user_id: userId,
        domain: domain.name,
        purchase_price: purchasePrice,
        purchase_date: new Date().toISOString(),
        estimated_value: domain.estimatedValue,
        current_value: domain.estimatedValue,
        strategy_id: domain.strategyId,
        listed: false,
        sold: false,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Get all owned domains
   */
  async getOwnedDomains(): Promise<OwnedDomain[]> {
    const { data, error } = await this.client
      .from('owned_domains')
      .select('*')
      .order('purchase_date', { ascending: false })

    if (error) throw error
    return data || []
  }

  /**
   * Update domain value
   */
  async updateDomainValue(domainId: string, currentValue: number): Promise<void> {
    const { error } = await this.client
      .from('owned_domains')
      .update({ current_value: currentValue, updated_at: new Date().toISOString() })
      .eq('id', domainId)

    if (error) throw error
  }

  /**
   * Mark domain as listed
   */
  async markDomainListed(domainId: string, marketplace: string): Promise<void> {
    const { error } = await this.client
      .from('owned_domains')
      .update({ listed: true, updated_at: new Date().toISOString() })
      .eq('id', domainId)

    if (error) throw error

    // Log transaction
    await this.logTransaction({
      type: 'sell',
      domain: domainId,
      amount: 0,
      date: new Date().toISOString(),
      strategy_id: '',
      status: 'pending',
      marketplace,
    })
  }

  /**
   * Mark domain as sold
   */
  async markDomainSold(domainId: string, salePrice: number): Promise<void> {
    const { error } = await this.client
      .from('owned_domains')
      .update({
        sold: true,
        sale_price: salePrice,
        sale_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', domainId)

    if (error) throw error

    // Log transaction
    await this.logTransaction({
      type: 'sell',
      domain: domainId,
      amount: salePrice,
      date: new Date().toISOString(),
      strategy_id: '',
      status: 'completed',
    })
  }

  /**
   * Log transaction
   */
  async logTransaction(transaction: Omit<Transaction, 'id'>, userId: string): Promise<Transaction> {
    const { data, error } = await this.client
      .from('transactions')
      .insert({
        ...transaction,
        user_id: userId,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Get transaction history
   */
  async getTransactions(limit = 100): Promise<Transaction[]> {
    const { data, error } = await this.client
      .from('transactions')
      .select('*')
      .order('date', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  }

  /**
   * Get portfolio stats
   */
  async getPortfolioStats(): Promise<{
    totalSpent: number
    totalEarned: number
    totalValue: number
    totalProfit: number
    domainsOwned: number
    domainsSold: number
  }> {
    const { data: owned, error: ownedError } = await this.client
      .from('owned_domains')
      .select('purchase_price, current_value, sale_price, sold')

    if (ownedError) throw ownedError

    const totalSpent = owned.reduce((sum, d) => sum + (d.purchase_price || 0), 0)
    const totalValue = owned.reduce((sum, d) => sum + (d.current_value || 0), 0)
    const totalEarned = owned
      .filter(d => d.sold)
      .reduce((sum, d) => sum + (d.sale_price || 0), 0)
    const totalProfit = totalEarned + totalValue - totalSpent
    const domainsOwned = owned.length
    const domainsSold = owned.filter(d => d.sold).length

    return {
      totalSpent,
      totalEarned,
      totalValue,
      totalProfit,
      domainsOwned,
      domainsSold,
    }
  }
}

// Initialize with environment variables
export const supabaseDB = new SupabaseDB({
  url: import.meta.env.VITE_SUPABASE_URL || '',
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
})

