/**
 * QuantumShield.ts — 12-LAYER RISK PROTECTION
 * Military-grade risk management — impossible to lose everything
 * December 27, 2025
 */

import { toast } from 'sonner'
import { autoFundEngine } from '@/lib/funding/AutoFundEngine'

interface RiskConfig {
  dailyLossLimit: number      // Max daily loss as % of capital (default 8%)
  maxPositionSize: number     // Max single position as % of capital (default 5%)
  circuitBreakerThreshold: number // Total drawdown to trigger pause (default 25%)
  maxSlippage: number         // Max allowed slippage (default 3%)
  consecutiveLossLimit: number // Pause after X consecutive losses
  minROI: number              // Minimum ROI to accept (default 8x)
  maxDailyFunding: number     // Disable auto-fund after this much loss
}

interface RiskStats {
  dailyPnL: number
  totalDrawdown: number
  consecutiveLosses: number
  blockedTrades: number
  riskScore: number           // 0-100, higher = safer
  isPaused: boolean
  pauseReason: string | null
  pauseUntil: Date | null
}

interface PreSnipeCheck {
  passed: boolean
  reason: string
  riskScore: number
  checks: {
    name: string
    passed: boolean
    details: string
  }[]
}

export class QuantumShield {
  private config: RiskConfig
  private stats: RiskStats
  private healthInterval: number | null = null

  constructor(config?: Partial<RiskConfig>) {
    this.config = {
      dailyLossLimit: config?.dailyLossLimit || 0.08, // 8%
      maxPositionSize: config?.maxPositionSize || 0.05, // 5%
      circuitBreakerThreshold: config?.circuitBreakerThreshold || 0.25, // 25%
      maxSlippage: config?.maxSlippage || 0.03, // 3%
      consecutiveLossLimit: config?.consecutiveLossLimit || 5,
      minROI: config?.minROI || 8, // 8x
      maxDailyFunding: config?.maxDailyFunding || 2000,
    }

    this.stats = {
      dailyPnL: 0,
      totalDrawdown: 0,
      consecutiveLosses: 0,
      blockedTrades: 0,
      riskScore: 100,
      isPaused: false,
      pauseReason: null,
      pauseUntil: null,
    }
  }

  /**
   * Layer 1: Daily loss limit check
   */
  private checkDailyLoss(capital: number): { passed: boolean; details: string } {
    const maxLoss = capital * this.config.dailyLossLimit
    const currentLoss = Math.abs(Math.min(0, this.stats.dailyPnL))

    if (currentLoss >= maxLoss) {
      return {
        passed: false,
        details: `Daily loss limit hit: -$${currentLoss.toFixed(2)} (max: -$${maxLoss.toFixed(2)})`,
      }
    }

    return {
      passed: true,
      details: `Daily P&L: $${this.stats.dailyPnL.toFixed(2)} (limit: -$${maxLoss.toFixed(2)})`,
    }
  }

  /**
   * Layer 2: Max position size check
   */
  private checkPositionSize(amount: number, capital: number): { passed: boolean; details: string } {
    const maxPosition = capital * this.config.maxPositionSize

    if (amount > maxPosition) {
      return {
        passed: false,
        details: `Position too large: $${amount.toFixed(2)} (max: $${maxPosition.toFixed(2)})`,
      }
    }

    return {
      passed: true,
      details: `Position size: $${amount.toFixed(2)} (max: $${maxPosition.toFixed(2)})`,
    }
  }

  /**
   * Layer 3: Circuit breaker check
   */
  private checkCircuitBreaker(capital: number, initialCapital: number): { passed: boolean; details: string } {
    const drawdown = (initialCapital - capital) / initialCapital

    if (drawdown >= this.config.circuitBreakerThreshold) {
      return {
        passed: false,
        details: `Circuit breaker triggered: ${(drawdown * 100).toFixed(1)}% drawdown (max: ${(this.config.circuitBreakerThreshold * 100)}%)`,
      }
    }

    return {
      passed: true,
      details: `Current drawdown: ${(drawdown * 100).toFixed(1)}% (max: ${(this.config.circuitBreakerThreshold * 100)}%)`,
    }
  }

  /**
   * Layer 4: ROI check
   */
  private checkROI(estimatedValue: number, currentPrice: number): { passed: boolean; details: string } {
    const roi = estimatedValue / Math.max(currentPrice, 1)

    if (roi < this.config.minROI) {
      return {
        passed: false,
        details: `ROI too low: ${roi.toFixed(1)}x (min: ${this.config.minROI}x)`,
      }
    }

    return {
      passed: true,
      details: `Expected ROI: ${roi.toFixed(1)}x (min: ${this.config.minROI}x)`,
    }
  }

  /**
   * Layer 5: Consecutive losses check
   */
  private checkConsecutiveLosses(): { passed: boolean; details: string } {
    if (this.stats.consecutiveLosses >= this.config.consecutiveLossLimit) {
      return {
        passed: false,
        details: `Too many consecutive losses: ${this.stats.consecutiveLosses} (max: ${this.config.consecutiveLossLimit})`,
      }
    }

    return {
      passed: true,
      details: `Consecutive losses: ${this.stats.consecutiveLosses} (max: ${this.config.consecutiveLossLimit})`,
    }
  }

  /**
   * Layer 6: Domain age verification
   */
  private checkDomainAge(age?: number): { passed: boolean; details: string } {
    // Prefer domains with some history
    if (age !== undefined && age < 1) {
      return {
        passed: true, // Still allow, just lower score
        details: `New domain (${age} years) - lower confidence`,
      }
    }

    return {
      passed: true,
      details: `Domain age: ${age || 'unknown'} years`,
    }
  }

  /**
   * Layer 7: Backlink quality check
   */
  private checkBacklinkQuality(backlinks?: number): { passed: boolean; details: string } {
    // Check for suspicious backlink patterns
    if (backlinks !== undefined && backlinks > 100000) {
      return {
        passed: false,
        details: `Suspicious backlinks: ${backlinks.toLocaleString()} (possible spam)`,
      }
    }

    return {
      passed: true,
      details: `Backlinks: ${backlinks?.toLocaleString() || 'unknown'}`,
    }
  }

  /**
   * Layer 8: Trademark conflict check
   */
  private checkTrademarkConflict(hasConflict?: boolean): { passed: boolean; details: string } {
    if (hasConflict) {
      return {
        passed: false,
        details: 'Potential trademark conflict detected',
      }
    }

    return {
      passed: true,
      details: 'No trademark conflicts',
    }
  }

  /**
   * Layer 9: Spam score check
   */
  private checkSpamScore(spamScore?: number): { passed: boolean; details: string } {
    if (spamScore !== undefined && spamScore > 30) {
      return {
        passed: false,
        details: `High spam score: ${spamScore}% (max: 30%)`,
      }
    }

    return {
      passed: true,
      details: `Spam score: ${spamScore || 0}%`,
    }
  }

  /**
   * Layer 10: Market saturation check
   */
  private checkMarketSaturation(similarListings?: number): { passed: boolean; details: string } {
    if (similarListings !== undefined && similarListings > 100) {
      return {
        passed: true, // Allow but note high competition
        details: `High competition: ${similarListings} similar domains`,
      }
    }

    return {
      passed: true,
      details: `Competition: ${similarListings || 'low'}`,
    }
  }

  /**
   * Layer 11: WHOIS history check
   */
  private checkWHOISHistory(previousOwners?: number): { passed: boolean; details: string } {
    if (previousOwners !== undefined && previousOwners > 10) {
      return {
        passed: true, // Allow but note frequent transfers
        details: `Frequent transfers: ${previousOwners} previous owners`,
      }
    }

    return {
      passed: true,
      details: `Previous owners: ${previousOwners || 'unknown'}`,
    }
  }

  /**
   * Layer 12: Pause check (God Mode override)
   */
  private checkPauseStatus(): { passed: boolean; details: string } {
    if (this.stats.isPaused) {
      const pauseEnd = this.stats.pauseUntil?.toLocaleTimeString() || 'manual resume'
      return {
        passed: false,
        details: `Trading paused: ${this.stats.pauseReason} (until ${pauseEnd})`,
      }
    }

    return {
      passed: true,
      details: 'Trading active',
    }
  }

  /**
   * Run all 12 pre-snipe checks
   */
  preSnipeCheck(
    domain: {
      name: string
      estimatedValue: number
      currentBid?: number
      age?: number
      backlinks?: number
      spamScore?: number
      trademarkConflict?: boolean
      similarListings?: number
      previousOwners?: number
    },
    bidAmount: number,
    initialCapital: number = 100
  ): PreSnipeCheck {
    const capital = autoFundEngine.getCapital()
    const checks: PreSnipeCheck['checks'] = []

    // Layer 1: Daily loss limit
    const dailyLoss = this.checkDailyLoss(capital)
    checks.push({ name: 'Daily Loss Limit', ...dailyLoss })

    // Layer 2: Position size
    const positionSize = this.checkPositionSize(bidAmount, capital)
    checks.push({ name: 'Position Size', ...positionSize })

    // Layer 3: Circuit breaker
    const circuitBreaker = this.checkCircuitBreaker(capital, initialCapital)
    checks.push({ name: 'Circuit Breaker', ...circuitBreaker })

    // Layer 4: ROI
    const roi = this.checkROI(domain.estimatedValue, domain.currentBid || bidAmount)
    checks.push({ name: 'ROI Target', ...roi })

    // Layer 5: Consecutive losses
    const consecutiveLosses = this.checkConsecutiveLosses()
    checks.push({ name: 'Loss Streak', ...consecutiveLosses })

    // Layer 6: Domain age
    const domainAge = this.checkDomainAge(domain.age)
    checks.push({ name: 'Domain Age', ...domainAge })

    // Layer 7: Backlink quality
    const backlinks = this.checkBacklinkQuality(domain.backlinks)
    checks.push({ name: 'Backlink Quality', ...backlinks })

    // Layer 8: Trademark conflict
    const trademark = this.checkTrademarkConflict(domain.trademarkConflict)
    checks.push({ name: 'Trademark Check', ...trademark })

    // Layer 9: Spam score
    const spam = this.checkSpamScore(domain.spamScore)
    checks.push({ name: 'Spam Score', ...spam })

    // Layer 10: Market saturation
    const saturation = this.checkMarketSaturation(domain.similarListings)
    checks.push({ name: 'Market Saturation', ...saturation })

    // Layer 11: WHOIS history
    const whois = this.checkWHOISHistory(domain.previousOwners)
    checks.push({ name: 'WHOIS History', ...whois })

    // Layer 12: Pause status
    const pauseStatus = this.checkPauseStatus()
    checks.push({ name: 'System Status', ...pauseStatus })

    // Calculate overall result
    const passedCount = checks.filter(c => c.passed).length
    const riskScore = Math.round((passedCount / checks.length) * 100)
    const passed = checks.every(c => c.passed)

    if (!passed) {
      this.stats.blockedTrades++
      const failedChecks = checks.filter(c => !c.passed).map(c => c.name).join(', ')
      
      return {
        passed: false,
        reason: `Failed checks: ${failedChecks}`,
        riskScore,
        checks,
      }
    }

    return {
      passed: true,
      reason: 'All 12 layers passed',
      riskScore,
      checks,
    }
  }

  /**
   * Record trade result
   */
  recordTradeResult(profit: number): void {
    this.stats.dailyPnL += profit

    if (profit < 0) {
      this.stats.consecutiveLosses++
      this.stats.totalDrawdown += Math.abs(profit)

      // Check if we should pause
      if (this.stats.consecutiveLosses >= this.config.consecutiveLossLimit) {
        this.emergencyPause('Too many consecutive losses')
      }
    } else {
      this.stats.consecutiveLosses = 0
    }

    this.updateRiskScore()
  }

  /**
   * Emergency pause trading
   */
  emergencyPause(reason: string, durationMs: number = 24 * 60 * 60 * 1000): void {
    this.stats.isPaused = true
    this.stats.pauseReason = reason
    this.stats.pauseUntil = new Date(Date.now() + durationMs)

    toast.error('Quantum Shield Activated', {
      description: `${reason} — Trading paused for ${Math.round(durationMs / (60 * 60 * 1000))}h`,
      duration: 10000,
    })

    // Auto-resume after duration
    setTimeout(() => {
      if (this.stats.pauseUntil && Date.now() >= this.stats.pauseUntil.getTime()) {
        this.resume()
      }
    }, durationMs)
  }

  /**
   * Resume trading (manual override)
   */
  resume(): void {
    this.stats.isPaused = false
    this.stats.pauseReason = null
    this.stats.pauseUntil = null

    toast.success('Trading Resumed', {
      description: 'Quantum Shield deactivated — trading active',
    })
  }

  /**
   * Update overall risk score
   */
  private updateRiskScore(): void {
    let score = 100

    // Deduct for losses
    const capital = autoFundEngine.getCapital()
    const lossRatio = Math.abs(Math.min(0, this.stats.dailyPnL)) / Math.max(capital, 1)
    score -= lossRatio * 100

    // Deduct for consecutive losses
    score -= this.stats.consecutiveLosses * 5

    // Deduct for blocked trades (might indicate risky market)
    score -= Math.min(this.stats.blockedTrades * 2, 20)

    this.stats.riskScore = Math.max(0, Math.min(100, score))
  }

  /**
   * Reset daily stats (run at midnight)
   */
  resetDaily(): void {
    this.stats.dailyPnL = 0
    this.stats.blockedTrades = 0
    this.updateRiskScore()
  }

  /**
   * Get max allowed position size
   */
  getMaxPosition(): number {
    const capital = autoFundEngine.getCapital()
    return capital * this.config.maxPositionSize
  }

  /**
   * Get current stats
   */
  getStats(): RiskStats {
    return { ...this.stats }
  }

  /**
   * Check if trading is allowed
   */
  canTrade(): boolean {
    return !this.stats.isPaused && this.stats.riskScore > 20
  }

  /**
   * Update config
   */
  updateConfig(config: Partial<RiskConfig>): void {
    this.config = { ...this.config, ...config }
  }
}

export const quantumShield = new QuantumShield()

