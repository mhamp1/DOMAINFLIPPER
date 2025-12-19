/**
 * SpendGuards.ts — FINANCIAL SAFETY CONTROLS
 * Budget caps, Kelly sizing, stop-loss, and spend anomaly detection
 * December 2025 — Never lose the farm
 */

import { logger } from '@/lib/utils/logger'
import { toast } from 'sonner'
import { killSwitches } from './KillSwitches'

// ==================== TYPES ====================

export interface SpendLimits {
  dailyBudget: number
  perDomainCap: number
  maxPortfolioRisk: number  // Max % of capital at risk
  maxSingleBuyPercent: number  // Max % of capital per buy
  cumulativeLossCap: number  // Stop-loss threshold
  weeklyBudget: number
  monthlyBudget: number
}

export interface SpendRecord {
  date: string  // ISO date
  spent: number
  domains: string[]
  transactions: SpendTransaction[]
}

export interface SpendTransaction {
  id: string
  domain: string
  amount: number
  type: 'buy' | 'bid' | 'renewal' | 'transfer'
  timestamp: Date
  registrar: string
  approved: boolean
  reason?: string
}

export interface SpendCheckResult {
  allowed: boolean
  reason?: string
  adjustedAmount?: number
  warnings: string[]
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
}

export interface KellyResult {
  optimalBetSize: number
  recommendedBet: number
  edgePercent: number
  riskAdjustedROI: number
}

// ==================== SPEND GUARDS SERVICE ====================

class SpendGuardsService {
  private limits: SpendLimits
  private spendHistory: Map<string, SpendRecord> = new Map() // date -> record
  private totalCapital: number = 500
  private cumulativePnL: number = 0
  private listeners: Array<(limits: SpendLimits) => void> = []

  constructor() {
    this.limits = {
      dailyBudget: 100, // Increased from 50 to allow meaningful operations
      perDomainCap: 100,
      maxPortfolioRisk: 20, // 20% max at risk
      maxSingleBuyPercent: 10, // 10% max per buy
      cumulativeLossCap: -100, // Stop at $100 loss
      weeklyBudget: 350,
      monthlyBudget: 1000,
    }

    this.loadState()
  }

  // ==================== SPEND CHECKS ====================

  /**
   * Check if a purchase is allowed within all limits
   */
  checkSpend(
    domain: string,
    amount: number,
    type: 'buy' | 'bid' | 'renewal' | 'transfer' = 'buy'
  ): SpendCheckResult {
    const warnings: string[] = []
    let riskLevel: SpendCheckResult['riskLevel'] = 'low'

    // 1. Check kill switches first
    if (!killSwitches.canAcquire()) {
      return {
        allowed: false,
        reason: 'Acquisitions paused by kill switch',
        warnings,
        riskLevel: 'critical',
      }
    }

    // 2. Check high-value threshold
    if (amount > 1000 && !killSwitches.canProcessHighValue()) {
      return {
        allowed: false,
        reason: 'High-value operations paused',
        warnings,
        riskLevel: 'critical',
      }
    }

    // 3. Check per-domain cap
    if (amount > this.limits.perDomainCap) {
      return {
        allowed: false,
        reason: `Exceeds per-domain cap ($${this.limits.perDomainCap})`,
        adjustedAmount: this.limits.perDomainCap,
        warnings: [`Original: $${amount}, Cap: $${this.limits.perDomainCap}`],
        riskLevel: 'high',
      }
    }

    // 4. Check max single buy percent
    const maxSingleBuy = this.totalCapital * (this.limits.maxSingleBuyPercent / 100)
    if (amount > maxSingleBuy) {
      warnings.push(`Exceeds ${this.limits.maxSingleBuyPercent}% single buy limit`)
      riskLevel = 'medium'
    }

    // 5. Check daily budget
    const todaySpent = this.getTodaySpent()
    if (todaySpent + amount > this.limits.dailyBudget) {
      const remaining = this.limits.dailyBudget - todaySpent
      if (remaining <= 0) {
        return {
          allowed: false,
          reason: 'Daily budget exhausted',
          warnings: [`Spent today: $${todaySpent}`],
          riskLevel: 'high',
        }
      }
      return {
        allowed: true,
        adjustedAmount: remaining,
        warnings: [`Capped to remaining daily budget: $${remaining}`],
        riskLevel: 'medium',
      }
    }

    // 6. Check weekly budget
    const weekSpent = this.getWeekSpent()
    if (weekSpent + amount > this.limits.weeklyBudget) {
      warnings.push(`Approaching weekly limit: $${weekSpent}/$${this.limits.weeklyBudget}`)
      riskLevel = 'medium'
    }

    // 7. Check monthly budget
    const monthSpent = this.getMonthSpent()
    if (monthSpent + amount > this.limits.monthlyBudget) {
      return {
        allowed: false,
        reason: 'Monthly budget exhausted',
        warnings: [`Spent this month: $${monthSpent}`],
        riskLevel: 'critical',
      }
    }

    // 8. Check cumulative loss cap (stop-loss)
    if (this.cumulativePnL < this.limits.cumulativeLossCap) {
      // Trigger kill switch
      killSwitches.trigger(
        'acquisitions',
        `Stop-loss triggered: $${this.cumulativePnL}`,
        'spend_guards'
      )
      return {
        allowed: false,
        reason: `Stop-loss triggered at $${this.limits.cumulativeLossCap}`,
        warnings: [`Current P&L: $${this.cumulativePnL}`],
        riskLevel: 'critical',
      }
    }

    // 9. Check portfolio risk
    const currentRisk = this.calculatePortfolioRisk()
    if (currentRisk > this.limits.maxPortfolioRisk) {
      warnings.push(`Portfolio risk elevated: ${currentRisk.toFixed(1)}%`)
      riskLevel = 'medium'
    }

    return {
      allowed: true,
      warnings,
      riskLevel,
    }
  }

  /**
   * Pre-flight check with human approval option
   */
  async preflightCheck(
    domain: string,
    amount: number,
    requireApproval: boolean = false
  ): Promise<SpendCheckResult & { approved: boolean }> {
    const result = this.checkSpend(domain, amount)

    if (!result.allowed) {
      return { ...result, approved: false }
    }

    if (requireApproval || result.riskLevel === 'high') {
      // In production, this would trigger a human approval flow
      logger.info('SPEND', `Human approval required for ${domain} @ $${amount}`, {
        riskLevel: result.riskLevel,
        warnings: result.warnings,
      })
      
      // For now, auto-approve low-risk, reject high-risk
      const approved = result.riskLevel !== 'critical' && result.riskLevel !== 'high'
      return { ...result, approved }
    }

    return { ...result, approved: true }
  }

  // ==================== KELLY CRITERION ====================

  /**
   * Calculate optimal bet size using Kelly Criterion
   * f* = (p*b - q) / b
   * where: p = probability of win, q = probability of loss, b = win/loss ratio
   */
  calculateKellySize(
    estimatedValue: number,
    purchasePrice: number,
    winProbability: number = 0.6, // Historical success rate
    fractionKelly: number = 0.25 // Use quarter-Kelly for safety
  ): KellyResult {
    const b = (estimatedValue / purchasePrice) - 1 // Win/loss ratio
    const p = winProbability
    const q = 1 - p

    // Kelly formula
    const kellyFraction = (p * b - q) / b
    const optimalBetSize = Math.max(0, kellyFraction * this.totalCapital)

    // Apply fraction for safety
    const recommendedBet = Math.min(
      optimalBetSize * fractionKelly,
      this.limits.perDomainCap,
      purchasePrice
    )

    return {
      optimalBetSize,
      recommendedBet,
      edgePercent: kellyFraction * 100,
      riskAdjustedROI: (estimatedValue - purchasePrice) * p / purchasePrice * 100,
    }
  }

  // ==================== SPEND RECORDING ====================

  /**
   * Record a completed spend
   */
  recordSpend(transaction: Omit<SpendTransaction, 'id'>): void {
    const tx: SpendTransaction = {
      ...transaction,
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    }

    const dateKey = new Date().toISOString().split('T')[0]
    const record = this.spendHistory.get(dateKey) || {
      date: dateKey,
      spent: 0,
      domains: [],
      transactions: [],
    }

    record.spent += tx.amount
    record.domains.push(tx.domain)
    record.transactions.push(tx)
    
    this.spendHistory.set(dateKey, record)
    this.saveState()

    logger.info('SPEND', `Recorded: ${tx.type} ${tx.domain} @ $${tx.amount}`, {
      registrar: tx.registrar,
      dailyTotal: record.spent,
    })
  }

  /**
   * Record a sale (profit/loss)
   */
  recordSale(domain: string, salePrice: number, purchasePrice: number): void {
    const profit = salePrice - purchasePrice
    this.cumulativePnL += profit
    this.saveState()

    if (profit > 0) {
      logger.info('SPEND', `Profit recorded: ${domain} +$${profit}`, { cumulativePnL: this.cumulativePnL })
    } else {
      logger.warn('SPEND', `Loss recorded: ${domain} -$${Math.abs(profit)}`, { cumulativePnL: this.cumulativePnL })
    }
  }

  // ==================== SPEND QUERIES ====================

  getTodaySpent(): number {
    const today = new Date().toISOString().split('T')[0]
    return this.spendHistory.get(today)?.spent || 0
  }

  getWeekSpent(): number {
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    
    let total = 0
    for (const [date, record] of this.spendHistory) {
      if (new Date(date) >= weekAgo) {
        total += record.spent
      }
    }
    return total
  }

  getMonthSpent(): number {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    
    let total = 0
    for (const [date, record] of this.spendHistory) {
      if (new Date(date) >= monthStart) {
        total += record.spent
      }
    }
    return total
  }

  getRemainingBudget(): { daily: number; weekly: number; monthly: number } {
    return {
      daily: Math.max(0, this.limits.dailyBudget - this.getTodaySpent()),
      weekly: Math.max(0, this.limits.weeklyBudget - this.getWeekSpent()),
      monthly: Math.max(0, this.limits.monthlyBudget - this.getMonthSpent()),
    }
  }

  calculatePortfolioRisk(): number {
    // Calculate percentage of capital currently at risk
    const monthSpent = this.getMonthSpent()
    return (monthSpent / this.totalCapital) * 100
  }

  // ==================== ANOMALY DETECTION ====================

  /**
   * Check for spending anomalies
   */
  detectAnomalies(): { anomalies: string[]; severity: 'none' | 'warning' | 'critical' } {
    const anomalies: string[] = []
    let severity: 'none' | 'warning' | 'critical' = 'none'

    // Check for sudden spike in spending
    const today = this.getTodaySpent()
    const avgDaily = this.getAverageDailySpend(7)
    if (today > avgDaily * 3) {
      anomalies.push(`Spending spike: $${today} (3x average)`)
      severity = 'warning'
    }

    // Check for unusual transaction patterns
    const todayTx = this.spendHistory.get(new Date().toISOString().split('T')[0])?.transactions || []
    if (todayTx.length > 20) {
      anomalies.push(`High transaction count: ${todayTx.length} today`)
      severity = 'warning'
    }

    // Check for rapid consecutive buys
    const recentTx = todayTx.slice(-5)
    if (recentTx.length >= 5) {
      const timeSpan = recentTx[4].timestamp.getTime() - recentTx[0].timestamp.getTime()
      if (timeSpan < 60000) { // 5 buys in 1 minute
        anomalies.push('Rapid consecutive purchases detected')
        severity = 'critical'
        
        // Auto-trigger kill switch
        killSwitches.trigger(
          'acquisitions',
          'Anomaly: Rapid consecutive purchases',
          'spend_guards',
          15 // Auto-reset in 15 minutes
        )
      }
    }

    // Check cumulative losses
    if (this.cumulativePnL < this.limits.cumulativeLossCap * 0.8) {
      anomalies.push(`Approaching stop-loss: $${this.cumulativePnL}`)
      severity = severity === 'critical' ? 'critical' : 'warning'
    }

    if (anomalies.length > 0) {
      logger.warn('SPEND', 'Anomalies detected', { anomalies, severity })
    }

    return { anomalies, severity }
  }

  private getAverageDailySpend(days: number): number {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    let total = 0
    let count = 0

    for (const [date, record] of this.spendHistory) {
      if (new Date(date) >= cutoff) {
        total += record.spent
        count++
      }
    }

    return count > 0 ? total / count : this.limits.dailyBudget
  }

  // ==================== CONFIGURATION ====================

  setLimits(limits: Partial<SpendLimits>): void {
    this.limits = { ...this.limits, ...limits }
    this.saveState()
    this.notifyListeners()
    logger.info('SPEND', 'Limits updated', this.limits)
  }

  getLimits(): SpendLimits {
    return { ...this.limits }
  }

  setCapital(amount: number): void {
    this.totalCapital = amount
    this.saveState()
    logger.info('SPEND', `Capital set to $${amount}`)
  }

  getCapital(): number {
    return this.totalCapital
  }

  getCumulativePnL(): number {
    return this.cumulativePnL
  }

  // ==================== SUBSCRIPTIONS ====================

  subscribe(listener: (limits: SpendLimits) => void): () => void {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(l => l(this.getLimits()))
  }

  // ==================== PERSISTENCE ====================

  private saveState(): void {
    try {
      const state = {
        limits: this.limits,
        totalCapital: this.totalCapital,
        cumulativePnL: this.cumulativePnL,
        spendHistory: Object.fromEntries(
          Array.from(this.spendHistory.entries()).map(([k, v]) => [
            k,
            { ...v, transactions: v.transactions.map(t => ({ ...t, timestamp: t.timestamp.toISOString() })) }
          ])
        ),
      }
      localStorage.setItem('domainFlipper_spendGuards', JSON.stringify(state))
    } catch (e) {
      // Ignore
    }
  }

  private loadState(): void {
    try {
      const saved = localStorage.getItem('domainFlipper_spendGuards')
      if (saved) {
        const state = JSON.parse(saved)
        this.limits = { ...this.limits, ...state.limits }
        this.totalCapital = state.totalCapital || 500
        this.cumulativePnL = state.cumulativePnL || 0
        
        if (state.spendHistory) {
          for (const [date, record] of Object.entries(state.spendHistory) as [string, any][]) {
            this.spendHistory.set(date, {
              ...record,
              transactions: record.transactions.map((t: any) => ({
                ...t,
                timestamp: new Date(t.timestamp),
              })),
            })
          }
        }
      }
    } catch (e) {
      // Ignore
    }
  }

  /**
   * Reset daily spend (called at midnight)
   */
  resetDaily(): void {
    // Clean up old history (keep 90 days)
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    for (const [date] of this.spendHistory) {
      if (new Date(date) < cutoff) {
        this.spendHistory.delete(date)
      }
    }
    this.saveState()
    logger.info('SPEND', 'Daily reset completed')
  }
}

// ==================== SINGLETON ====================

export const spendGuards = new SpendGuardsService()
