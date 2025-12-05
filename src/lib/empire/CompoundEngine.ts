/**
 * CompoundEngine.ts — $100 → $100M FOREVER
 * Profit compounding with Kelly Criterion
 * December 27, 2025
 */

import { toast } from 'sonner'
import { autoFundEngine } from '@/lib/funding/AutoFundEngine'

interface CompoundConfig {
  reinvestmentRate: number   // % of profits to reinvest (0-1)
  dailyBudgetPercent: number // Daily budget as % of capital
  kellyFraction: number      // Kelly criterion fraction (conservative)
  minReserve: number         // Always keep this much in reserve
  compoundInterval: number   // How often to compound (ms)
}

interface CompoundStats {
  totalProfit: number
  todayProfit: number
  compoundedAmount: number
  currentCapital: number
  dailyBudget: number
  growthRate: number
  daysSinceStart: number
  projectedMonthly: number
  projectedYearly: number
}

interface DailyRecord {
  date: string
  profit: number
  capital: number
  domainsAcquired: number
  domainsSold: number
}

export class CompoundEngine {
  private config: CompoundConfig
  private stats: CompoundStats
  private dailyHistory: DailyRecord[] = []
  private compoundInterval: number | null = null
  private startDate: Date

  constructor(config?: Partial<CompoundConfig>) {
    this.config = {
      reinvestmentRate: config?.reinvestmentRate || 1.0, // 100% reinvest
      dailyBudgetPercent: config?.dailyBudgetPercent || 0.1, // 10%
      kellyFraction: config?.kellyFraction || 0.25, // Conservative Kelly
      minReserve: config?.minReserve || 20, // Always keep $20
      compoundInterval: config?.compoundInterval || 24 * 60 * 60 * 1000, // Daily
    }

    this.stats = {
      totalProfit: 0,
      todayProfit: 0,
      compoundedAmount: 0,
      currentCapital: autoFundEngine.getCapital(),
      dailyBudget: autoFundEngine.getDailyBudget(),
      growthRate: 0,
      daysSinceStart: 0,
      projectedMonthly: 0,
      projectedYearly: 0,
    }

    this.startDate = new Date()
  }

  /**
   * Record a sale and compound profits
   */
  recordSale(salePrice: number, purchasePrice: number): void {
    const profit = salePrice - purchasePrice

    if (profit > 0) {
      this.stats.todayProfit += profit
      this.stats.totalProfit += profit

      // Compound immediately
      this.compoundProfit(profit)
    }

    this.updateProjections()
  }

  /**
   * Compound profit into capital
   */
  private compoundProfit(profit: number): void {
    // Calculate reinvestment amount
    const reinvestAmount = profit * this.config.reinvestmentRate

    // Add to capital
    const currentCapital = autoFundEngine.getCapital()
    const newCapital = currentCapital + reinvestAmount

    autoFundEngine.setCapital(newCapital)

    this.stats.currentCapital = newCapital
    this.stats.compoundedAmount += reinvestAmount
    this.stats.dailyBudget = newCapital * this.config.dailyBudgetPercent

    // Update growth rate
    this.updateGrowthRate()
  }

  /**
   * Daily compounding routine (run at 4 AM)
   */
  async dailyCompound(): Promise<void> {
    // Record today's stats
    this.dailyHistory.push({
      date: new Date().toISOString().split('T')[0],
      profit: this.stats.todayProfit,
      capital: this.stats.currentCapital,
      domainsAcquired: 0, // Updated by empire engine
      domainsSold: 0,
    })

    // Reset today's profit counter
    const todayProfit = this.stats.todayProfit

    if (todayProfit > 0) {
      toast.success('Daily Compound Complete', {
        description: `+$${todayProfit.toLocaleString()} profit compounded → Capital: $${this.stats.currentCapital.toLocaleString()}`,
      })
    }

    this.stats.todayProfit = 0
    this.stats.daysSinceStart++

    // Update projections
    this.updateProjections()
  }

  /**
   * Calculate Kelly Criterion position size
   */
  getKellyPositionSize(winRate: number, avgWin: number, avgLoss: number): number {
    // Kelly formula: f* = (bp - q) / b
    // where b = avg win / avg loss, p = win rate, q = 1 - p
    const b = avgWin / Math.max(avgLoss, 1)
    const p = winRate
    const q = 1 - p

    const kellyFraction = (b * p - q) / b

    // Apply conservative fraction
    const conservativeKelly = Math.max(0, kellyFraction * this.config.kellyFraction)

    // Cap at 5% of capital
    const maxPosition = this.stats.currentCapital * 0.05

    return Math.min(conservativeKelly * this.stats.currentCapital, maxPosition)
  }

  /**
   * Get optimal daily budget based on capital and Kelly
   */
  getOptimalDailyBudget(): number {
    // Base: 10% of capital
    let budget = this.stats.currentCapital * this.config.dailyBudgetPercent

    // Ensure minimum reserve is maintained
    const maxBudget = this.stats.currentCapital - this.config.minReserve
    budget = Math.min(budget, maxBudget)

    // Never go negative
    return Math.max(0, budget)
  }

  /**
   * Update growth rate based on history
   */
  private updateGrowthRate(): void {
    if (this.dailyHistory.length < 2) {
      this.stats.growthRate = 0
      return
    }

    // Calculate average daily growth rate
    let totalGrowth = 0
    for (let i = 1; i < this.dailyHistory.length; i++) {
      const prev = this.dailyHistory[i - 1].capital
      const curr = this.dailyHistory[i].capital
      if (prev > 0) {
        totalGrowth += (curr - prev) / prev
      }
    }

    this.stats.growthRate = (totalGrowth / (this.dailyHistory.length - 1)) * 100
  }

  /**
   * Update monthly and yearly projections
   */
  private updateProjections(): void {
    // Use average daily profit for projections
    const avgDailyProfit = this.dailyHistory.length > 0
      ? this.stats.totalProfit / Math.max(this.dailyHistory.length, 1)
      : this.stats.todayProfit

    // Compound growth projection
    const dailyGrowthRate = 1 + (this.stats.growthRate / 100)

    // Monthly projection (30 days of compounding)
    this.stats.projectedMonthly = this.stats.currentCapital * Math.pow(dailyGrowthRate, 30) - this.stats.currentCapital

    // Yearly projection (365 days of compounding)
    this.stats.projectedYearly = this.stats.currentCapital * Math.pow(dailyGrowthRate, 365) - this.stats.currentCapital

    // Fallback to linear if growth rate is 0
    if (this.stats.growthRate === 0 && avgDailyProfit > 0) {
      this.stats.projectedMonthly = avgDailyProfit * 30
      this.stats.projectedYearly = avgDailyProfit * 365
    }
  }

  /**
   * Get capital growth projection
   */
  getGrowthProjection(days: number): { date: Date; capital: number }[] {
    const projection: { date: Date; capital: number }[] = []
    const dailyGrowthRate = 1 + (this.stats.growthRate / 100)
    let capital = this.stats.currentCapital

    for (let i = 0; i <= days; i++) {
      const date = new Date()
      date.setDate(date.getDate() + i)
      projection.push({ date, capital: Math.round(capital) })
      capital *= dailyGrowthRate
    }

    return projection
  }

  /**
   * Start daily compounding loop
   */
  startCompoundLoop(): void {
    if (this.compoundInterval) return

    // Run daily at 4 AM
    const now = new Date()
    const next4AM = new Date()
    next4AM.setHours(4, 0, 0, 0)
    if (next4AM <= now) {
      next4AM.setDate(next4AM.getDate() + 1)
    }

    const msUntil4AM = next4AM.getTime() - now.getTime()

    // First run at 4 AM
    setTimeout(() => {
      this.dailyCompound()

      // Then run every 24 hours
      this.compoundInterval = window.setInterval(() => {
        this.dailyCompound()
      }, 24 * 60 * 60 * 1000)
    }, msUntil4AM)
  }

  /**
   * Stop compounding loop
   */
  stopCompoundLoop(): void {
    if (this.compoundInterval) {
      clearInterval(this.compoundInterval)
      this.compoundInterval = null
    }
  }

  /**
   * Get current stats
   */
  getStats(): CompoundStats {
    return { ...this.stats }
  }

  /**
   * Get daily history
   */
  getDailyHistory(): DailyRecord[] {
    return [...this.dailyHistory]
  }

  /**
   * Update config
   */
  updateConfig(config: Partial<CompoundConfig>): void {
    this.config = { ...this.config, ...config }
  }
}

export const compoundEngine = new CompoundEngine()

