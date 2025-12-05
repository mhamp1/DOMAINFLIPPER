/**
 * AutoFundEngine.ts — NEVER RUN OUT OF MONEY
 * Auto-charges credit card when balance low
 * December 27, 2025
 */

import { toast } from 'sonner'

interface FundingConfig {
  minBalance: number        // Auto-fund when below this
  autoFundAmount: number    // Amount to charge
  maxDailyFunding: number   // Safety cap per day
  enableAutoFund: boolean   // Toggle
  stripeCustomerId?: string // Stripe customer ID
  defaultPaymentMethod?: string // Stripe payment method ID
}

interface FundingStats {
  capital: number
  dailyBudget: number
  totalFunded: number
  fundingToday: number
  lastFundDate: Date | null
  isLowBalance: boolean
}

export class AutoFundEngine {
  private config: FundingConfig
  private stats: FundingStats
  private fundingInterval: number | null = null

  constructor(config?: Partial<FundingConfig>) {
    this.config = {
      minBalance: config?.minBalance || 500,
      autoFundAmount: config?.autoFundAmount || 1000,
      maxDailyFunding: config?.maxDailyFunding || 5000,
      enableAutoFund: config?.enableAutoFund || false,
      stripeCustomerId: config?.stripeCustomerId,
      defaultPaymentMethod: config?.defaultPaymentMethod,
    }

    this.stats = {
      capital: 100, // Start with $100
      dailyBudget: 10, // 10% of capital
      totalFunded: 0,
      fundingToday: 0,
      lastFundDate: null,
      isLowBalance: false,
    }

    // Check for daily reset
    this.checkDailyReset()
  }

  /**
   * Check and auto-fund if balance is low
   */
  async checkAndAutoFund(): Promise<boolean> {
    // Reset daily funding counter if new day
    this.checkDailyReset()

    this.stats.isLowBalance = this.stats.capital < this.config.minBalance

    if (!this.stats.isLowBalance) {
      return false
    }

    if (!this.config.enableAutoFund) {
      toast.warning('Low Balance', {
        description: `Capital is $${this.stats.capital.toFixed(2)}. Enable auto-funding or add funds manually.`,
      })
      return false
    }

    // Check daily funding cap
    if (this.stats.fundingToday >= this.config.maxDailyFunding) {
      toast.error('Daily Funding Cap Reached', {
        description: `Already funded $${this.stats.fundingToday.toLocaleString()} today. Cap: $${this.config.maxDailyFunding.toLocaleString()}`,
      })
      return false
    }

    // Calculate amount to charge (respect daily cap)
    const amountToCharge = Math.min(
      this.config.autoFundAmount,
      this.config.maxDailyFunding - this.stats.fundingToday
    )

    try {
      const success = await this.chargeCreditCard(amountToCharge)

      if (success) {
        this.stats.capital += amountToCharge
        this.stats.dailyBudget = this.stats.capital * 0.1
        this.stats.totalFunded += amountToCharge
        this.stats.fundingToday += amountToCharge
        this.stats.lastFundDate = new Date()
        this.stats.isLowBalance = false

        toast.success('Empire Funded', {
          description: `+$${amountToCharge.toLocaleString()} → Capital: $${this.stats.capital.toLocaleString()}`,
        })

        return true
      }
    } catch (error) {
      console.error('Auto-fund failed:', error)
      toast.error('Funding Failed', {
        description: 'Could not charge card. Check payment method.',
      })
    }

    return false
  }

  /**
   * Charge credit card via Stripe
   */
  private async chargeCreditCard(amount: number): Promise<boolean> {
    if (!this.config.stripeCustomerId || !this.config.defaultPaymentMethod) {
      console.warn('Stripe not configured for auto-funding')
      return false
    }

    try {
      // In production, this calls your backend which calls Stripe
      const response = await fetch('/api/stripe/charge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Math.round(amount * 100), // Stripe uses cents
          currency: 'usd',
          customer: this.config.stripeCustomerId,
          payment_method: this.config.defaultPaymentMethod,
          description: `DomainFlipper Empire Auto-Fund`,
        }),
      })

      if (!response.ok) {
        throw new Error(`Stripe charge failed: ${response.status}`)
      }

      const data = await response.json()
      return data.success === true
    } catch (error) {
      console.error('Stripe charge error:', error)
      toast.error('Stripe Not Configured', {
        description: 'Set up Stripe in the Config tab to enable auto-funding',
      })
      return false
    }
  }

  /**
   * Add funds manually (from credit card charge or other source)
   */
  addFunds(amount: number, source: string = 'manual'): void {
    this.stats.capital += amount
    this.stats.dailyBudget = this.stats.capital * 0.1
    this.stats.totalFunded += amount
    this.stats.isLowBalance = this.stats.capital < this.config.minBalance

    toast.success('Funds Added', {
      description: `+$${amount.toLocaleString()} (${source}) → Capital: $${this.stats.capital.toLocaleString()}`,
    })
  }

  /**
   * Deduct capital for domain purchase
   */
  deductCapital(amount: number): boolean {
    if (amount > this.stats.capital) {
      return false
    }

    this.stats.capital -= amount
    this.stats.dailyBudget = this.stats.capital * 0.1
    this.stats.isLowBalance = this.stats.capital < this.config.minBalance

    // Trigger auto-fund check
    if (this.stats.isLowBalance) {
      this.checkAndAutoFund()
    }

    return true
  }

  /**
   * Check for daily reset (midnight)
   */
  private checkDailyReset(): void {
    const now = new Date()
    const today = now.toDateString()

    if (this.stats.lastFundDate) {
      const lastFundDay = this.stats.lastFundDate.toDateString()
      if (lastFundDay !== today) {
        this.stats.fundingToday = 0
      }
    }
  }

  /**
   * Start auto-funding check loop
   */
  startAutoFundLoop(): void {
    if (this.fundingInterval) return

    // Check every hour
    this.fundingInterval = window.setInterval(() => {
      this.checkAndAutoFund()
    }, 60 * 60 * 1000)

    // Initial check
    this.checkAndAutoFund()
  }

  /**
   * Stop auto-funding loop
   */
  stopAutoFundLoop(): void {
    if (this.fundingInterval) {
      clearInterval(this.fundingInterval)
      this.fundingInterval = null
    }
  }

  /**
   * Configure Stripe payment method
   */
  setPaymentMethod(customerId: string, paymentMethodId: string): void {
    this.config.stripeCustomerId = customerId
    this.config.defaultPaymentMethod = paymentMethodId
  }

  /**
   * Enable/disable auto-funding
   */
  setAutoFundEnabled(enabled: boolean): void {
    this.config.enableAutoFund = enabled
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<FundingConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * Get current stats
   */
  getStats(): FundingStats {
    return { ...this.stats }
  }

  /**
   * Get capital
   */
  getCapital(): number {
    return this.stats.capital
  }

  /**
   * Get daily budget
   */
  getDailyBudget(): number {
    return this.stats.dailyBudget
  }

  /**
   * Set capital (for compounding)
   */
  setCapital(amount: number): void {
    this.stats.capital = amount
    this.stats.dailyBudget = amount * 0.1
    this.stats.isLowBalance = amount < this.config.minBalance
  }
}

export const autoFundEngine = new AutoFundEngine()

