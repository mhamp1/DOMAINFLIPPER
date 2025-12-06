/**
 * Supabase Database Integration
 * Real database for tracking domains, flips, profits
 * Falls back to demo mode if Supabase is not configured
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
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
  user_id?: string
}

interface DomainQueryResult {
  user_id: string
  domain: string
  strategy_id: string
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

// Demo data for when Supabase is not configured
const demoOwnedDomains: OwnedDomain[] = []
const demoTransactions: Transaction[] = []
let demoIdCounter = 1

export class SupabaseDB {
  private client: SupabaseClient | null = null
  private isDemoMode: boolean = false

  constructor(config: SupabaseConfig) {
    // Check if Supabase is properly configured
    if (config.url && config.anonKey && config.url !== '' && config.anonKey !== '') {
      try {
        this.client = createClient(config.url, config.anonKey)
        this.isDemoMode = false
        console.log('✅ Supabase connected')
      } catch (error) {
        console.warn('⚠️ Supabase connection failed, using demo mode:', error)
        this.isDemoMode = true
      }
    } else {
      console.info('ℹ️ Supabase not configured, running in demo mode')
      this.isDemoMode = true
    }
  }

  /**
   * Check if running in demo mode
   */
  isDemo(): boolean {
    return this.isDemoMode
  }

  /**
   * Get underlying Supabase client for direct access
   */
  getClient(): SupabaseClient | null {
    return this.client
  }

  /**
   * Shorthand for direct table access (for backward compatibility)
   */
  from(table: string) {
    if (!this.client) {
      // Return a mock that mimics Supabase's chainable API
      return {
        select: () => this.from(table),
        insert: () => this.from(table),
        update: () => this.from(table),
        delete: () => this.from(table),
        eq: () => this.from(table),
        single: () => Promise.resolve({ data: null, error: null }),
        order: () => this.from(table),
        limit: () => Promise.resolve({ data: [], error: null }),
      }
    }
    return this.client.from(table)
  }

  /**
   * Save owned domain
   */
  async saveOwnedDomain(domain: Domain, purchasePrice: number, userId: string): Promise<OwnedDomain> {
    if (this.isDemoMode) {
      const newDomain: OwnedDomain = {
        id: `demo-${demoIdCounter++}`,
        domain: domain.name,
        purchase_price: purchasePrice,
        purchase_date: new Date().toISOString(),
        estimated_value: domain.estimatedValue || purchasePrice * 3,
        current_value: domain.estimatedValue || purchasePrice * 3,
        strategy_id: domain.strategyId || 'default',
        listed: false,
        sold: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_id: userId,
      }
      demoOwnedDomains.push(newDomain)
      return newDomain
    }

    const { data, error } = await this.client!
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
      } as any)
      .select()
      .single()

    if (error) throw error
    return data as OwnedDomain
  }

  /**
   * Get all owned domains
   */
  async getOwnedDomains(): Promise<OwnedDomain[]> {
    if (this.isDemoMode) {
      return [...demoOwnedDomains].sort((a, b) => 
        new Date(b.purchase_date).getTime() - new Date(a.purchase_date).getTime()
      )
    }

    const { data, error } = await this.client!
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
    if (this.isDemoMode) {
      const domain = demoOwnedDomains.find(d => d.id === domainId)
      if (domain) {
        domain.current_value = currentValue
        domain.updated_at = new Date().toISOString()
      }
      return
    }

    const { error } = await this.client!
      .from('owned_domains')
      // @ts-ignore - Supabase type inference issue
      .update({ current_value: currentValue, updated_at: new Date().toISOString() } as any)
      .eq('id', domainId)

    if (error) throw error
  }

  /**
   * Mark domain as listed
   */
  async markDomainListed(domainId: string, marketplace: string): Promise<void> {
    if (this.isDemoMode) {
      const domain = demoOwnedDomains.find(d => d.id === domainId)
      if (domain) {
        domain.listed = true
        domain.updated_at = new Date().toISOString()
        
        // Log demo transaction
        demoTransactions.push({
          id: `tx-${demoIdCounter++}`,
          type: 'sell',
          domain: domain.domain,
          amount: 0,
          date: new Date().toISOString(),
          strategy_id: domain.strategy_id,
          status: 'pending',
          marketplace,
        })
      }
      return
    }

    // Get domain to retrieve user_id
    const { data: domain, error: fetchError } = await this.client!
      .from('owned_domains')
      .select('user_id, domain, strategy_id')
      .eq('id', domainId)
      .single()

    if (fetchError) throw fetchError
    if (!domain) throw new Error('Domain not found')
    
    // Type safety: ensure user_id exists
    const domainData = domain as DomainQueryResult
    if (!domainData.user_id) {
      throw new Error('Domain user_id not found - cannot log transaction')
    }

    const { error } = await this.client!
      .from('owned_domains')
      // @ts-ignore - Supabase type inference issue
      .update({ listed: true, updated_at: new Date().toISOString() } as any)
      .eq('id', domainId)

    if (error) throw error

    // Log transaction
    await this.logTransaction({
      type: 'sell',
      domain: domainData.domain,
      amount: 0,
      date: new Date().toISOString(),
      strategy_id: domainData.strategy_id,
      status: 'pending',
      marketplace,
    }, domainData.user_id)
  }

  /**
   * Mark domain as sold
   */
  async markDomainSold(domainId: string, salePrice: number): Promise<void> {
    if (this.isDemoMode) {
      const domain = demoOwnedDomains.find(d => d.id === domainId)
      if (domain) {
        domain.sold = true
        domain.sale_price = salePrice
        domain.sale_date = new Date().toISOString()
        domain.updated_at = new Date().toISOString()
        
        demoTransactions.push({
          id: `tx-${demoIdCounter++}`,
          type: 'sell',
          domain: domain.domain,
          amount: salePrice,
          date: new Date().toISOString(),
          strategy_id: domain.strategy_id,
          status: 'completed',
        })
      }
      return
    }

    // Get domain to retrieve user_id
    const { data: domain, error: fetchError } = await this.client!
      .from('owned_domains')
      .select('user_id, domain, strategy_id')
      .eq('id', domainId)
      .single()

    if (fetchError) throw fetchError
    if (!domain) throw new Error('Domain not found')
    
    // Type safety: ensure user_id exists
    const domainData = domain as DomainQueryResult
    if (!domainData.user_id) {
      throw new Error('Domain user_id not found - cannot log transaction')
    }

    const { error } = await this.client!
      .from('owned_domains')
      // @ts-ignore - Supabase type inference issue
      .update({
        sold: true,
        sale_price: salePrice,
        sale_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any)
      .eq('id', domainId)

    if (error) throw error

    // Log transaction
    await this.logTransaction({
      type: 'sell',
      domain: domainData.domain,
      amount: salePrice,
      date: new Date().toISOString(),
      strategy_id: domainData.strategy_id,
      status: 'completed',
    }, domainData.user_id)
  }

  /**
   * Log transaction
   */
  async logTransaction(transaction: Omit<Transaction, 'id'>, userId: string): Promise<Transaction> {
    if (this.isDemoMode) {
      const tx: Transaction = {
        id: `tx-${demoIdCounter++}`,
        ...transaction,
      }
      demoTransactions.push(tx)
      return tx
    }

    const { data, error } = await this.client!
      .from('transactions')
      .insert({
        ...transaction,
        user_id: userId,
      } as any)
      .select()
      .single()

    if (error) throw error
    return data as Transaction
  }

  /**
   * Get transaction history
   */
  async getTransactions(limit = 100): Promise<Transaction[]> {
    if (this.isDemoMode) {
      return [...demoTransactions]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, limit)
    }

    const { data, error } = await this.client!
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
    if (this.isDemoMode) {
      const ownedDomains = demoOwnedDomains
      const totalSpent = ownedDomains.reduce((sum, d) => sum + (d.purchase_price || 0), 0)
      const totalValue = ownedDomains.reduce((sum, d) => sum + (d.current_value || 0), 0)
      const totalEarned = ownedDomains
        .filter(d => d.sold)
        .reduce((sum, d) => sum + (d.sale_price || 0), 0)
      const totalProfit = totalEarned + totalValue - totalSpent
      const domainsOwned = ownedDomains.filter(d => !d.sold).length
      const domainsSold = ownedDomains.filter(d => d.sold).length

      return {
        totalSpent,
        totalEarned,
        totalValue,
        totalProfit,
        domainsOwned,
        domainsSold,
      }
    }

    const { data: owned, error: ownedError } = await this.client!
      .from('owned_domains')
      .select('purchase_price, current_value, sale_price, sold')

    if (ownedError) throw ownedError

    const ownedDomains = (owned || []) as any[]
    const totalSpent = ownedDomains.reduce((sum: number, d: any) => sum + (d.purchase_price || 0), 0)
    const totalValue = ownedDomains.reduce((sum: number, d: any) => sum + (d.current_value || 0), 0)
    const totalEarned = ownedDomains
      .filter((d: any) => d.sold)
      .reduce((sum: number, d: any) => sum + (d.sale_price || 0), 0)
    const totalProfit = totalEarned + totalValue - totalSpent
    const domainsOwned = ownedDomains.length
    const domainsSold = ownedDomains.filter((d: any) => d.sold).length

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

// Initialize with MasterConfig (HARDCODED CREDENTIALS - NEVER EMPTY)
import { masterConfig } from '@/lib/config/MasterConfig'

// Get credentials from MasterConfig (always has owner's hardcoded values)
const getSupabaseConfig = () => {
  const config = masterConfig.getSupabase()
  return {
    url: config.url || 'https://gipcuhnjbzcnkclemopv.supabase.co',
    anonKey: config.anonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpcGN1aG5qYnpjbmtjbGVtb3B2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5NTU4MjcsImV4cCI6MjA4MDUzMTgyN30.8F1JWsoplrS6NC7aQnCj722uWQz4x10E_Y2xQfn0Mnk',
  }
}

const { url: supabaseUrl, anonKey: supabaseAnonKey } = getSupabaseConfig()

export const supabaseDB = new SupabaseDB({
  url: supabaseUrl,
  anonKey: supabaseAnonKey,
})

// Export client for direct access if needed
export const supabaseClient = supabaseDB
