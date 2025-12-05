/**
 * TaxTracker.ts — Complete Tax Tracking for Domain Flipping
 * Tracks all transactions for tax reporting
 * December 27, 2025
 */

import { toast } from 'sonner'

interface Transaction {
  id: string
  type: 'purchase' | 'sale' | 'funding' | 'withdrawal' | 'fee'
  domain?: string
  amount: number
  date: Date
  category: 'short-term' | 'long-term' | 'expense' | 'income'
  holdingPeriod?: number // days held
  costBasis?: number     // original purchase price
  profit?: number        // realized gain/loss
  registrar?: string
  marketplace?: string
  notes?: string
}

interface TaxSummary {
  year: number
  totalRevenue: number
  totalCosts: number
  totalFees: number
  netProfit: number
  shortTermGains: number
  longTermGains: number
  estimatedTax: number
  transactions: Transaction[]
}

interface DomainCostBasis {
  domain: string
  purchasePrice: number
  purchaseDate: Date
  fees: number
  totalCost: number
}

export class TaxTracker {
  private transactions: Transaction[] = []
  private costBasis: Map<string, DomainCostBasis> = new Map()
  private taxRate = {
    shortTerm: 0.37,  // Ordinary income rate (adjust based on bracket)
    longTerm: 0.20,   // Long-term capital gains
    selfEmployment: 0.153, // Self-employment tax
  }

  constructor() {
    // Load from localStorage on init
    this.loadFromStorage()
  }

  /**
   * Record a domain purchase
   */
  recordPurchase(
    domain: string,
    amount: number,
    registrar: string,
    fees: number = 0
  ): void {
    const transaction: Transaction = {
      id: this.generateId(),
      type: 'purchase',
      domain,
      amount: amount + fees,
      date: new Date(),
      category: 'expense',
      registrar,
      notes: `Purchased from ${registrar}`,
    }

    this.transactions.push(transaction)

    // Track cost basis
    this.costBasis.set(domain, {
      domain,
      purchasePrice: amount,
      purchaseDate: new Date(),
      fees,
      totalCost: amount + fees,
    })

    this.saveToStorage()
  }

  /**
   * Record a domain sale
   */
  recordSale(
    domain: string,
    salePrice: number,
    marketplace: string,
    fees: number = 0
  ): void {
    const basis = this.costBasis.get(domain)
    const netSale = salePrice - fees

    let category: 'short-term' | 'long-term' = 'short-term'
    let holdingPeriod = 0
    let profit = netSale

    if (basis) {
      holdingPeriod = Math.floor((Date.now() - basis.purchaseDate.getTime()) / (1000 * 60 * 60 * 24))
      category = holdingPeriod > 365 ? 'long-term' : 'short-term'
      profit = netSale - basis.totalCost
    }

    const transaction: Transaction = {
      id: this.generateId(),
      type: 'sale',
      domain,
      amount: netSale,
      date: new Date(),
      category,
      holdingPeriod,
      costBasis: basis?.totalCost,
      profit,
      marketplace,
      notes: `Sold on ${marketplace} (held ${holdingPeriod} days)`,
    }

    this.transactions.push(transaction)

    // Record marketplace fee as separate expense
    if (fees > 0) {
      this.recordFee(domain, fees, marketplace)
    }

    // Remove from cost basis
    this.costBasis.delete(domain)

    this.saveToStorage()

    // Show tax impact
    if (profit > 0) {
      const taxRate = category === 'long-term' ? this.taxRate.longTerm : this.taxRate.shortTerm
      const estimatedTax = profit * taxRate

      toast.success('Sale Recorded', {
        description: `${domain}: $${profit.toLocaleString()} profit (${category}). Est. tax: $${estimatedTax.toLocaleString()}`,
      })
    }
  }

  /**
   * Record a fee/expense
   */
  recordFee(
    domain: string | null,
    amount: number,
    description: string
  ): void {
    const transaction: Transaction = {
      id: this.generateId(),
      type: 'fee',
      domain: domain || undefined,
      amount,
      date: new Date(),
      category: 'expense',
      notes: description,
    }

    this.transactions.push(transaction)
    this.saveToStorage()
  }

  /**
   * Record funding (credit card charge, etc.)
   */
  recordFunding(amount: number, source: string): void {
    const transaction: Transaction = {
      id: this.generateId(),
      type: 'funding',
      amount,
      date: new Date(),
      category: 'income', // Not taxable, but tracked
      notes: `Capital injection from ${source}`,
    }

    this.transactions.push(transaction)
    this.saveToStorage()
  }

  /**
   * Get tax summary for a year
   */
  getTaxSummary(year: number = new Date().getFullYear()): TaxSummary {
    const yearTransactions = this.transactions.filter(
      t => t.date.getFullYear() === year
    )

    const sales = yearTransactions.filter(t => t.type === 'sale')
    const purchases = yearTransactions.filter(t => t.type === 'purchase')
    const fees = yearTransactions.filter(t => t.type === 'fee')

    const totalRevenue = sales.reduce((sum, t) => sum + t.amount, 0)
    const totalCosts = purchases.reduce((sum, t) => sum + t.amount, 0)
    const totalFees = fees.reduce((sum, t) => sum + t.amount, 0)
    const netProfit = totalRevenue - totalCosts - totalFees

    const shortTermGains = sales
      .filter(t => t.category === 'short-term')
      .reduce((sum, t) => sum + (t.profit || 0), 0)

    const longTermGains = sales
      .filter(t => t.category === 'long-term')
      .reduce((sum, t) => sum + (t.profit || 0), 0)

    // Calculate estimated tax
    const shortTermTax = Math.max(0, shortTermGains) * this.taxRate.shortTerm
    const longTermTax = Math.max(0, longTermGains) * this.taxRate.longTerm
    const selfEmploymentTax = Math.max(0, netProfit) * this.taxRate.selfEmployment * 0.9235 // SE tax calculation

    const estimatedTax = shortTermTax + longTermTax + selfEmploymentTax

    return {
      year,
      totalRevenue,
      totalCosts,
      totalFees,
      netProfit,
      shortTermGains,
      longTermGains,
      estimatedTax,
      transactions: yearTransactions,
    }
  }

  /**
   * Get quarterly tax estimate
   */
  getQuarterlyEstimate(quarter: 1 | 2 | 3 | 4, year: number = new Date().getFullYear()): number {
    const summary = this.getTaxSummary(year)
    
    // Quarterly payments are 25% of estimated annual
    // But adjust based on which quarter we're in
    const monthsElapsed = (quarter - 1) * 3 + 3
    const annualized = (summary.estimatedTax / monthsElapsed) * 12

    return annualized / 4
  }

  /**
   * Get unrealized gains (domains still held)
   */
  getUnrealizedGains(currentValues: Map<string, number>): {
    domain: string
    costBasis: number
    currentValue: number
    unrealizedGain: number
    holdingPeriod: number
  }[] {
    const unrealized: {
      domain: string
      costBasis: number
      currentValue: number
      unrealizedGain: number
      holdingPeriod: number
    }[] = []

    for (const [domain, basis] of this.costBasis) {
      const currentValue = currentValues.get(domain) || basis.totalCost
      const holdingPeriod = Math.floor((Date.now() - basis.purchaseDate.getTime()) / (1000 * 60 * 60 * 24))

      unrealized.push({
        domain,
        costBasis: basis.totalCost,
        currentValue,
        unrealizedGain: currentValue - basis.totalCost,
        holdingPeriod,
      })
    }

    return unrealized.sort((a, b) => b.unrealizedGain - a.unrealizedGain)
  }

  /**
   * Export transactions for tax software
   */
  exportCSV(year: number = new Date().getFullYear()): string {
    const summary = this.getTaxSummary(year)

    const headers = [
      'Date',
      'Type',
      'Domain',
      'Amount',
      'Cost Basis',
      'Profit/Loss',
      'Holding Period',
      'Category',
      'Notes',
    ]

    const rows = summary.transactions.map(t => [
      t.date.toISOString().split('T')[0],
      t.type,
      t.domain || '',
      t.amount.toFixed(2),
      t.costBasis?.toFixed(2) || '',
      t.profit?.toFixed(2) || '',
      t.holdingPeriod?.toString() || '',
      t.category,
      t.notes || '',
    ])

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
  }

  /**
   * Generate IRS Schedule C summary
   */
  getScheduleCSummary(year: number = new Date().getFullYear()): {
    grossReceipts: number
    costOfGoodsSold: number
    grossProfit: number
    expenses: {
      name: string
      amount: number
    }[]
    netProfit: number
  } {
    const summary = this.getTaxSummary(year)

    return {
      grossReceipts: summary.totalRevenue,
      costOfGoodsSold: summary.totalCosts,
      grossProfit: summary.totalRevenue - summary.totalCosts,
      expenses: [
        { name: 'Marketplace Fees', amount: summary.totalFees },
        { name: 'API Subscriptions', amount: 0 }, // Add your API costs
        { name: 'Software/Tools', amount: 0 },
      ],
      netProfit: summary.netProfit,
    }
  }

  /**
   * Update tax rates
   */
  setTaxRates(rates: Partial<typeof this.taxRate>): void {
    this.taxRate = { ...this.taxRate, ...rates }
  }

  /**
   * Get all transactions
   */
  getAllTransactions(): Transaction[] {
    return [...this.transactions]
  }

  /**
   * Get cost basis for all held domains
   */
  getAllCostBasis(): DomainCostBasis[] {
    return Array.from(this.costBasis.values())
  }

  /**
   * Save to localStorage
   */
  private saveToStorage(): void {
    try {
      localStorage.setItem('domainFlipper_taxTransactions', JSON.stringify(this.transactions))
      localStorage.setItem('domainFlipper_costBasis', JSON.stringify(Array.from(this.costBasis.entries())))
    } catch (error) {
      console.error('Failed to save tax data:', error)
    }
  }

  /**
   * Load from localStorage
   */
  private loadFromStorage(): void {
    try {
      const transactions = localStorage.getItem('domainFlipper_taxTransactions')
      if (transactions) {
        this.transactions = JSON.parse(transactions).map((t: any) => ({
          ...t,
          date: new Date(t.date),
        }))
      }

      const costBasis = localStorage.getItem('domainFlipper_costBasis')
      if (costBasis) {
        const entries = JSON.parse(costBasis).map(([key, value]: [string, any]) => [
          key,
          { ...value, purchaseDate: new Date(value.purchaseDate) },
        ])
        this.costBasis = new Map(entries)
      }
    } catch (error) {
      console.error('Failed to load tax data:', error)
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

export const taxTracker = new TaxTracker()

