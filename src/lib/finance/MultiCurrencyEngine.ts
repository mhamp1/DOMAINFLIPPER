/**
 * MultiCurrencyEngine.ts — GLOBAL FINANCIAL POWERHOUSE
 * Multi-currency support, crypto integration, AI tax advisor
 * December 2025 — Trade anywhere, in any currency
 */

import axios from 'axios'
import { toast } from 'sonner'

// ==================== TYPES ====================

type FiatCurrency = 'USD' | 'EUR' | 'GBP' | 'JPY' | 'AUD' | 'CAD' | 'CHF' | 'CNY' | 'INR'
type CryptoCurrency = 'BTC' | 'ETH' | 'USDC' | 'USDT' | 'SOL' | 'MATIC'
type Currency = FiatCurrency | CryptoCurrency

interface ExchangeRate {
  from: Currency
  to: Currency
  rate: number
  timestamp: Date
}

interface Balance {
  currency: Currency
  amount: number
  usdValue: number
}

interface Transaction {
  id: string
  type: 'income' | 'expense' | 'conversion' | 'tax'
  amount: number
  currency: Currency
  usdAmount: number
  description: string
  category: string
  timestamp: Date
  taxRelevant: boolean
  domain?: string
}

interface TaxRecommendation {
  entityType: 'sole-proprietor' | 'llc' | 's-corp' | 'c-corp'
  estimatedTaxRate: number
  annualSavings: number
  reasoning: string
  steps: string[]
}

interface TaxSummary {
  year: number
  totalIncome: number
  totalExpenses: number
  netProfit: number
  shortTermGains: number
  longTermGains: number
  estimatedTax: number
  quarterlyEstimates: number[]
  deductions: Array<{ name: string; amount: number }>
  entityRecommendation: TaxRecommendation
}

// ==================== MULTI-CURRENCY ENGINE ====================

export class MultiCurrencyEngine {
  private rates: Map<string, ExchangeRate> = new Map()
  private balances: Map<Currency, number> = new Map()
  private transactions: Transaction[] = []
  private baseCurrency: FiatCurrency = 'USD'
  private readonly RATE_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

  constructor() {
    // Initialize balances
    this.initializeBalances()
    // Start rate refresh
    this.refreshRates()
  }

  private initializeBalances(): void {
    const currencies: Currency[] = ['USD', 'EUR', 'GBP', 'BTC', 'ETH', 'USDC', 'SOL']
    currencies.forEach(c => this.balances.set(c, 0))
  }

  // ==================== EXCHANGE RATES ====================

  /**
   * Fetch latest exchange rates
   */
  async refreshRates(): Promise<void> {
    try {
      // Fiat rates from exchangerate-api
      const fiatResponse = await axios.get('https://api.exchangerate-api.com/v4/latest/USD', {
        timeout: 10000,
      })

      const fiatRates = fiatResponse.data?.rates || {}
      Object.entries(fiatRates).forEach(([currency, rate]) => {
        if (['EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'INR'].includes(currency)) {
          this.rates.set(`USD-${currency}`, {
            from: 'USD',
            to: currency as FiatCurrency,
            rate: rate as number,
            timestamp: new Date(),
          })
          this.rates.set(`${currency}-USD`, {
            from: currency as FiatCurrency,
            to: 'USD',
            rate: 1 / (rate as number),
            timestamp: new Date(),
          })
        }
      })

      // Crypto rates from CoinGecko
      const cryptoResponse = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
        params: {
          ids: 'bitcoin,ethereum,usd-coin,tether,solana,matic-network',
          vs_currencies: 'usd',
        },
        timeout: 10000,
      })

      const cryptoMapping: Record<string, CryptoCurrency> = {
        bitcoin: 'BTC',
        ethereum: 'ETH',
        'usd-coin': 'USDC',
        tether: 'USDT',
        solana: 'SOL',
        'matic-network': 'MATIC',
      }

      Object.entries(cryptoResponse.data).forEach(([id, data]) => {
        const crypto = cryptoMapping[id]
        const usdRate = (data as any).usd

        this.rates.set(`${crypto}-USD`, {
          from: crypto,
          to: 'USD',
          rate: usdRate,
          timestamp: new Date(),
        })
        this.rates.set(`USD-${crypto}`, {
          from: 'USD',
          to: crypto,
          rate: 1 / usdRate,
          timestamp: new Date(),
        })
      })

    } catch (error) {
      console.warn('Rate refresh error:', error)
    }

    // Schedule next refresh
    setTimeout(() => this.refreshRates(), this.RATE_CACHE_TTL)
  }

  /**
   * Get exchange rate between two currencies
   */
  getRate(from: Currency, to: Currency): number {
    if (from === to) return 1

    const direct = this.rates.get(`${from}-${to}`)
    if (direct) return direct.rate

    // Try via USD
    const fromUSD = this.rates.get(`${from}-USD`)
    const toFromUSD = this.rates.get(`USD-${to}`)
    if (fromUSD && toFromUSD) {
      return fromUSD.rate * toFromUSD.rate
    }

    return 0
  }

  /**
   * Convert amount between currencies
   */
  convert(amount: number, from: Currency, to: Currency): number {
    const rate = this.getRate(from, to)
    return amount * rate
  }

  /**
   * Format currency with symbol
   */
  formatCurrency(amount: number, currency: Currency): string {
    const symbols: Record<Currency, string> = {
      USD: '$', EUR: '€', GBP: '£', JPY: '¥', AUD: 'A$', CAD: 'C$', 
      CHF: 'CHF', CNY: '¥', INR: '₹',
      BTC: '₿', ETH: 'Ξ', USDC: '$', USDT: '$', SOL: '◎', MATIC: 'MATIC'
    }

    const symbol = symbols[currency] || currency
    const isCrypto = ['BTC', 'ETH', 'SOL', 'MATIC'].includes(currency)
    
    if (isCrypto) {
      return `${amount.toFixed(6)} ${symbol}`
    }
    
    return `${symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  // ==================== BALANCE MANAGEMENT ====================

  /**
   * Add to balance
   */
  addBalance(currency: Currency, amount: number): void {
    const current = this.balances.get(currency) || 0
    this.balances.set(currency, current + amount)
  }

  /**
   * Subtract from balance
   */
  subtractBalance(currency: Currency, amount: number): boolean {
    const current = this.balances.get(currency) || 0
    if (current < amount) return false
    this.balances.set(currency, current - amount)
    return true
  }

  /**
   * Get balance in specific currency
   */
  getBalance(currency: Currency): number {
    return this.balances.get(currency) || 0
  }

  /**
   * Get all balances with USD equivalent
   */
  getAllBalances(): Balance[] {
    return Array.from(this.balances.entries()).map(([currency, amount]) => ({
      currency,
      amount,
      usdValue: this.convert(amount, currency, 'USD'),
    }))
  }

  /**
   * Get total portfolio value in USD
   */
  getTotalUSDValue(): number {
    return this.getAllBalances().reduce((sum, b) => sum + b.usdValue, 0)
  }

  // ==================== TRANSACTION TRACKING ====================

  /**
   * Record a transaction
   */
  recordTransaction(params: {
    type: Transaction['type']
    amount: number
    currency: Currency
    description: string
    category: string
    domain?: string
    taxRelevant?: boolean
  }): Transaction {
    const tx: Transaction = {
      id: `tx-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      ...params,
      usdAmount: this.convert(params.amount, params.currency, 'USD'),
      timestamp: new Date(),
      taxRelevant: params.taxRelevant ?? true,
    }

    this.transactions.push(tx)

    // Update balance
    if (params.type === 'income') {
      this.addBalance(params.currency, params.amount)
    } else if (params.type === 'expense') {
      this.subtractBalance(params.currency, params.amount)
    }

    return tx
  }

  /**
   * Get transactions for date range
   */
  getTransactions(startDate?: Date, endDate?: Date): Transaction[] {
    let filtered = [...this.transactions]
    
    if (startDate) {
      filtered = filtered.filter(tx => tx.timestamp >= startDate)
    }
    if (endDate) {
      filtered = filtered.filter(tx => tx.timestamp <= endDate)
    }

    return filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }

  // ==================== AI TAX ADVISOR ====================

  /**
   * Generate comprehensive tax summary
   */
  generateTaxSummary(year: number): TaxSummary {
    const yearStart = new Date(year, 0, 1)
    const yearEnd = new Date(year, 11, 31)
    const transactions = this.getTransactions(yearStart, yearEnd).filter(tx => tx.taxRelevant)

    // Calculate totals
    const income = transactions.filter(tx => tx.type === 'income')
    const expenses = transactions.filter(tx => tx.type === 'expense')
    
    const totalIncome = income.reduce((sum, tx) => sum + tx.usdAmount, 0)
    const totalExpenses = expenses.reduce((sum, tx) => sum + tx.usdAmount, 0)
    const netProfit = totalIncome - totalExpenses

    // Calculate capital gains (simplified - domains held < 1 year = short-term)
    const domainSales = income.filter(tx => tx.category === 'domain-sale')
    const shortTermGains = domainSales.reduce((sum, tx) => sum + tx.usdAmount, 0) * 0.7 // Assume 70% profit
    const longTermGains = 0 // Would need purchase date tracking

    // Quarterly estimates
    const quarterlyProfit = netProfit / 4
    const estimatedQuarterlyTax = quarterlyProfit * 0.30 // Assume 30% effective rate
    const quarterlyEstimates = [
      estimatedQuarterlyTax,
      estimatedQuarterlyTax,
      estimatedQuarterlyTax,
      estimatedQuarterlyTax,
    ]

    // Standard deductions
    const deductions = [
      { name: 'Home Office', amount: Math.min(1500, netProfit * 0.1) },
      { name: 'Software & Tools', amount: 500 },
      { name: 'Domain Renewals', amount: Math.min(2000, totalExpenses * 0.2) },
      { name: 'API Subscriptions', amount: 1200 },
      { name: 'Professional Development', amount: 500 },
    ]
    const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0)

    // Calculate estimated tax
    const taxableIncome = Math.max(0, netProfit - totalDeductions)
    const estimatedTax = this.calculateEstimatedTax(taxableIncome, shortTermGains, longTermGains)

    // Entity recommendation
    const entityRecommendation = this.recommendEntity(netProfit)

    return {
      year,
      totalIncome,
      totalExpenses,
      netProfit,
      shortTermGains,
      longTermGains,
      estimatedTax,
      quarterlyEstimates,
      deductions,
      entityRecommendation,
    }
  }

  /**
   * Calculate estimated tax
   */
  private calculateEstimatedTax(ordinaryIncome: number, shortTermGains: number, longTermGains: number): number {
    // 2024 Tax Brackets (simplified)
    let tax = 0

    // Ordinary income + short-term gains (taxed as ordinary)
    const ordinaryTotal = ordinaryIncome + shortTermGains
    if (ordinaryTotal > 578125) {
      tax += (ordinaryTotal - 578125) * 0.37
      tax += (578125 - 231250) * 0.35
      tax += (231250 - 182100) * 0.32
      tax += (182100 - 95375) * 0.24
      tax += (95375 - 44725) * 0.22
      tax += (44725 - 11000) * 0.12
      tax += 11000 * 0.10
    } else if (ordinaryTotal > 231250) {
      tax += (ordinaryTotal - 231250) * 0.35
      tax += (231250 - 182100) * 0.32
      tax += (182100 - 95375) * 0.24
      tax += (95375 - 44725) * 0.22
      tax += (44725 - 11000) * 0.12
      tax += 11000 * 0.10
    } else if (ordinaryTotal > 95375) {
      tax += (ordinaryTotal - 95375) * 0.24
      tax += (95375 - 44725) * 0.22
      tax += (44725 - 11000) * 0.12
      tax += 11000 * 0.10
    } else if (ordinaryTotal > 44725) {
      tax += (ordinaryTotal - 44725) * 0.22
      tax += (44725 - 11000) * 0.12
      tax += 11000 * 0.10
    } else if (ordinaryTotal > 11000) {
      tax += (ordinaryTotal - 11000) * 0.12
      tax += 11000 * 0.10
    } else {
      tax += ordinaryTotal * 0.10
    }

    // Long-term capital gains (0%, 15%, or 20%)
    if (longTermGains > 0) {
      if (ordinaryTotal + longTermGains > 492300) {
        tax += longTermGains * 0.20
      } else if (ordinaryTotal > 44625) {
        tax += longTermGains * 0.15
      }
      // else 0%
    }

    // Self-employment tax (15.3% on 92.35% of profit)
    const selfEmploymentTax = (ordinaryTotal * 0.9235) * 0.153
    tax += selfEmploymentTax

    return Math.round(tax)
  }

  /**
   * Recommend optimal entity structure
   */
  private recommendEntity(annualProfit: number): TaxRecommendation {
    if (annualProfit < 50000) {
      return {
        entityType: 'sole-proprietor',
        estimatedTaxRate: 30,
        annualSavings: 0,
        reasoning: 'At your current income level, a sole proprietorship is simplest with minimal overhead.',
        steps: [
          'File Schedule C with your 1040',
          'Pay quarterly estimated taxes',
          'Track all business expenses',
        ],
      }
    } else if (annualProfit < 150000) {
      const llcSavings = Math.round(annualProfit * 0.02)
      return {
        entityType: 'llc',
        estimatedTaxRate: 28,
        annualSavings: llcSavings,
        reasoning: 'An LLC provides liability protection and flexible tax treatment at your income level.',
        steps: [
          'Form LLC in your state ($100-$500)',
          'Get EIN from IRS (free)',
          'Open business bank account',
          'Consider S-Corp election if profit exceeds $80k',
        ],
      }
    } else if (annualProfit < 500000) {
      const scorpSavings = Math.round(annualProfit * 0.10) // Save on self-employment tax
      return {
        entityType: 's-corp',
        estimatedTaxRate: 24,
        annualSavings: scorpSavings,
        reasoning: `S-Corp election saves ~$${scorpSavings.toLocaleString()}/year by reducing self-employment tax. Pay yourself a "reasonable salary" and take rest as distributions.`,
        steps: [
          'Form LLC and file Form 2553 for S-Corp election',
          'Set up payroll for yourself (use Gusto)',
          'Pay yourself reasonable salary (~$80-120k)',
          'Take remaining profit as distributions (no SE tax)',
          'File Form 1120-S annually',
        ],
      }
    } else {
      const ccorpSavings = Math.round((annualProfit - 200000) * 0.16)
      return {
        entityType: 'c-corp',
        estimatedTaxRate: 21,
        annualSavings: ccorpSavings,
        reasoning: `At $${annualProfit.toLocaleString()}/year, a C-Corp provides maximum flexibility for reinvestment, benefits, and potential exit strategies.`,
        steps: [
          'Form C-Corporation',
          'Hire a CPA specializing in small business',
          'Set up qualified retirement plans (401k, defined benefit)',
          'Structure compensation to minimize overall tax',
          'Consider state tax implications',
          'Explore qualified small business stock (QSBS) exclusion',
        ],
      }
    }
  }

  /**
   * Get tax optimization tips
   */
  getTaxOptimizationTips(summary: TaxSummary): string[] {
    const tips: string[] = []

    if (summary.shortTermGains > 10000) {
      tips.push('Consider holding domains longer than 1 year to qualify for lower long-term capital gains rates.')
    }

    if (summary.netProfit > 100000 && summary.entityRecommendation.entityType === 'sole-proprietor') {
      tips.push(`Switch to S-Corp to save ~$${summary.entityRecommendation.annualSavings.toLocaleString()}/year on self-employment tax.`)
    }

    if (summary.deductions.reduce((sum, d) => sum + d.amount, 0) < summary.netProfit * 0.1) {
      tips.push('You may be under-deducting. Review home office, equipment, and education expenses.')
    }

    tips.push('Maximize retirement contributions: Solo 401(k) allows up to $66,000/year in deductions.')
    tips.push('Consider a Health Savings Account (HSA) for triple tax advantage.')
    tips.push('Track all domain-related expenses: renewals, tools, courses, conferences.')

    return tips
  }

  // ==================== CRYPTO PAYMENTS ====================

  /**
   * Generate crypto payment address/invoice
   */
  async generateCryptoInvoice(amount: number, currency: CryptoCurrency = 'USDC'): Promise<{
    address: string
    amount: number
    currency: CryptoCurrency
    usdAmount: number
    qrCode: string
    expiresAt: Date
  }> {
    const usdAmount = currency === 'USDC' || currency === 'USDT' 
      ? amount 
      : this.convert(amount, currency, 'USD')

    // Would integrate with Coinbase Commerce or similar
    const address = `0x${Math.random().toString(16).slice(2, 42)}` // Placeholder

    return {
      address,
      amount: currency === 'USDC' || currency === 'USDT' ? amount : this.convert(amount, 'USD', currency),
      currency,
      usdAmount,
      qrCode: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${address}`,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
    }
  }

  /**
   * Check crypto payment status
   */
  async checkPaymentStatus(address: string): Promise<'pending' | 'confirmed' | 'expired'> {
    // Would check blockchain in production
    return 'pending'
  }

  // ==================== STATS ====================

  /**
   * Get currency stats
   */
  getStats(): {
    baseCurrency: FiatCurrency
    totalUSD: number
    currencies: number
    ratesUpdated: Date | null
    transactionCount: number
  } {
    const latestRate = Array.from(this.rates.values())[0]
    
    return {
      baseCurrency: this.baseCurrency,
      totalUSD: this.getTotalUSDValue(),
      currencies: this.balances.size,
      ratesUpdated: latestRate?.timestamp || null,
      transactionCount: this.transactions.length,
    }
  }
}

// Export singleton
export const multiCurrencyEngine = new MultiCurrencyEngine()

