/**
 * PortfolioOptimizer.ts — INTELLIGENT PORTFOLIO MANAGEMENT
 * Diversification rules, liquidity scoring, exit strategy AI
 * December 2025 — Maximize returns, minimize risk
 */

import { toast } from 'sonner'
import type { Domain } from '@/types/domain'

// ==================== TYPES ====================

interface PortfolioMetrics {
  totalValue: number
  totalCost: number
  unrealizedPnL: number
  realizedPnL: number
  diversificationScore: number // 0-100
  liquidityScore: number // 0-100
  riskScore: number // 0-100
  averageHoldTime: number // days
  winRate: number // percentage
  roi: number // percentage
}

interface TLDAllocation {
  tld: string
  count: number
  value: number
  percentage: number
  target: number // target percentage
  deviation: number // from target
}

interface LiquidityScore {
  domain: string
  score: number // 0-100
  estimatedSellTime: number // days
  factors: {
    length: number
    tld: number
    age: number
    backlinks: number
    marketDemand: number
    priceVsMarket: number
  }
  recommendation: 'quick-flip' | 'hold' | 'premium-buyer' | 'lease'
}

interface ExitStrategy {
  domain: string
  strategy: 'quick-flip' | 'hold-6mo' | 'hold-1yr' | 'premium-buyer' | 'lease' | 'auction'
  confidence: number
  estimatedSalePrice: number
  estimatedTimeframe: string
  reasoning: string
  actions: string[]
}

interface DiversificationRule {
  type: 'tld' | 'length' | 'strategy' | 'price-tier' | 'age'
  target: Map<string, number> // category -> target percentage
  tolerance: number // allowed deviation
}

interface PortfolioConfig {
  targetDiversification: {
    tld: Map<string, number>
    length: Map<string, number>
    priceTier: Map<string, number>
  }
  maxSingleDomainValue: number // % of portfolio
  rebalanceThreshold: number // % deviation before rebalance
  liquidityMinimum: number // minimum liquidity score
}

// ==================== PORTFOLIO OPTIMIZER ====================

export class PortfolioOptimizer {
  private config: PortfolioConfig
  private portfolio: Domain[] = []
  private liquidityCache: Map<string, LiquidityScore> = new Map()

  constructor(config?: Partial<PortfolioConfig>) {
    this.config = {
      targetDiversification: {
        tld: new Map([
          ['.com', 50],
          ['.ai', 20],
          ['.io', 15],
          ['.co', 10],
          ['other', 5],
        ]),
        length: new Map([
          ['ultra-short', 15], // 1-3 chars
          ['short', 35], // 4-6 chars
          ['medium', 35], // 7-10 chars
          ['long', 15], // 11+ chars
        ]),
        priceTier: new Map([
          ['micro', 20], // <$100
          ['starter', 30], // $100-$500
          ['mid', 30], // $500-$5000
          ['premium', 15], // $5000-$50000
          ['ultra', 5], // $50000+
        ]),
      },
      maxSingleDomainValue: 20, // max 20% of portfolio in single domain
      rebalanceThreshold: 15, // rebalance when >15% off target
      liquidityMinimum: 40, // minimum liquidity score to buy
      ...config,
    }
  }

  // ==================== DIVERSIFICATION RULES ====================

  /**
   * Analyze current portfolio diversification
   */
  analyzeDiversification(portfolio: Domain[]): TLDAllocation[] {
    this.portfolio = portfolio
    const allocations: TLDAllocation[] = []
    const totalValue = portfolio.reduce((sum, d) => sum + (d.estimatedValue || 0), 0)

    // Group by TLD
    const tldGroups = new Map<string, Domain[]>()
    portfolio.forEach(d => {
      const tld = '.' + d.name.split('.').pop()
      const existing = tldGroups.get(tld) || []
      existing.push(d)
      tldGroups.set(tld, existing)
    })

    // Calculate allocations
    for (const [tld, domains] of tldGroups.entries()) {
      const value = domains.reduce((sum, d) => sum + (d.estimatedValue || 0), 0)
      const percentage = totalValue > 0 ? (value / totalValue) * 100 : 0
      const target = this.config.targetDiversification.tld.get(tld) || 
                     this.config.targetDiversification.tld.get('other') || 5

      allocations.push({
        tld,
        count: domains.length,
        value,
        percentage,
        target,
        deviation: percentage - target,
      })
    }

    return allocations.sort((a, b) => b.value - a.value)
  }

  /**
   * Get diversification score (0-100)
   */
  getDiversificationScore(portfolio: Domain[]): number {
    const allocations = this.analyzeDiversification(portfolio)
    if (allocations.length === 0) return 100

    // Calculate weighted deviation
    let totalDeviation = 0
    allocations.forEach(a => {
      totalDeviation += Math.abs(a.deviation)
    })

    // Higher score = better diversification
    const avgDeviation = totalDeviation / allocations.length
    return Math.max(0, 100 - avgDeviation * 2)
  }

  /**
   * Check if a new domain would improve diversification
   */
  wouldImproveDiversification(domain: Domain, portfolio: Domain[]): boolean {
    const currentScore = this.getDiversificationScore(portfolio)
    const newScore = this.getDiversificationScore([...portfolio, domain])
    return newScore >= currentScore
  }

  /**
   * Get rebalancing suggestions
   */
  getRebalancingSuggestions(portfolio: Domain[]): Array<{ action: 'buy' | 'sell'; tld: string; amount: number; reason: string }> {
    const allocations = this.analyzeDiversification(portfolio)
    const suggestions: Array<{ action: 'buy' | 'sell'; tld: string; amount: number; reason: string }> = []

    allocations.forEach(a => {
      if (Math.abs(a.deviation) > this.config.rebalanceThreshold) {
        if (a.deviation > 0) {
          // Over-allocated, suggest selling
          suggestions.push({
            action: 'sell',
            tld: a.tld,
            amount: Math.round((a.deviation / 100) * a.value),
            reason: `${a.tld} is ${a.deviation.toFixed(1)}% over target allocation`,
          })
        } else {
          // Under-allocated, suggest buying
          suggestions.push({
            action: 'buy',
            tld: a.tld,
            amount: Math.round((Math.abs(a.deviation) / 100) * (portfolio.reduce((sum, d) => sum + (d.estimatedValue || 0), 0) || 10000)),
            reason: `${a.tld} is ${Math.abs(a.deviation).toFixed(1)}% under target allocation`,
          })
        }
      }
    })

    return suggestions.sort((a, b) => b.amount - a.amount)
  }

  // ==================== LIQUIDITY SCORING ====================

  /**
   * Calculate liquidity score for a domain
   */
  calculateLiquidityScore(domain: Domain): LiquidityScore {
    const cached = this.liquidityCache.get(domain.name)
    if (cached) return cached

    const name = domain.name.split('.')[0]
    const tld = '.' + domain.name.split('.').pop()

    // Factor scores (0-100 each)
    const factors = {
      length: this.scoreDomainLength(name.length),
      tld: this.scoreTLD(tld),
      age: this.scoreAge(domain.age || 0),
      backlinks: this.scoreBacklinks(domain.backlinks || 0),
      marketDemand: this.scoreMarketDemand(domain),
      priceVsMarket: this.scorePriceVsMarket(domain),
    }

    // Weighted average
    const weights = { length: 0.2, tld: 0.25, age: 0.15, backlinks: 0.1, marketDemand: 0.2, priceVsMarket: 0.1 }
    const score = Object.entries(factors).reduce((sum, [key, value]) => {
      return sum + value * weights[key as keyof typeof weights]
    }, 0)

    // Estimate sell time based on score
    let estimatedSellTime = 365
    if (score >= 90) estimatedSellTime = 7
    else if (score >= 80) estimatedSellTime = 30
    else if (score >= 70) estimatedSellTime = 60
    else if (score >= 60) estimatedSellTime = 90
    else if (score >= 50) estimatedSellTime = 180

    // Recommendation
    let recommendation: LiquidityScore['recommendation'] = 'hold'
    if (score >= 85 && (domain.estimatedValue || 0) < 5000) recommendation = 'quick-flip'
    else if (score >= 75 && (domain.estimatedValue || 0) >= 10000) recommendation = 'premium-buyer'
    else if (score < 50 && (domain.estimatedValue || 0) >= 5000) recommendation = 'lease'

    const result: LiquidityScore = {
      domain: domain.name,
      score: Math.round(score),
      estimatedSellTime,
      factors,
      recommendation,
    }

    this.liquidityCache.set(domain.name, result)
    return result
  }

  private scoreDomainLength(length: number): number {
    if (length <= 3) return 100
    if (length <= 5) return 90
    if (length <= 7) return 75
    if (length <= 10) return 60
    if (length <= 15) return 40
    return 20
  }

  private scoreTLD(tld: string): number {
    const scores: Record<string, number> = {
      '.com': 100,
      '.ai': 85,
      '.io': 80,
      '.co': 70,
      '.net': 65,
      '.org': 60,
      '.app': 55,
      '.dev': 55,
      '.xyz': 40,
    }
    return scores[tld] || 30
  }

  private scoreAge(years: number): number {
    if (years >= 20) return 100
    if (years >= 15) return 90
    if (years >= 10) return 80
    if (years >= 5) return 65
    if (years >= 2) return 50
    return 30
  }

  private scoreBacklinks(count: number): number {
    if (count >= 1000) return 100
    if (count >= 500) return 85
    if (count >= 100) return 70
    if (count >= 50) return 55
    if (count >= 10) return 40
    return 20
  }

  private scoreMarketDemand(domain: Domain): number {
    // Based on keyword trends, search volume, etc.
    const name = domain.name.split('.')[0]
    let score = 50

    // Tech keywords bonus
    const techKeywords = ['ai', 'crypto', 'nft', 'web3', 'cloud', 'data', 'app', 'bot', 'auto']
    if (techKeywords.some(k => name.toLowerCase().includes(k))) score += 25

    // Single-word bonus
    if (!name.includes('-') && name.length <= 10) score += 15

    // Numeric penalty
    if (/\d/.test(name)) score -= 20

    return Math.max(0, Math.min(100, score))
  }

  private scorePriceVsMarket(domain: Domain): number {
    const price = domain.currentBid || domain.purchasePrice || 0
    const value = domain.estimatedValue || price * 2

    if (price === 0 || value === 0) return 50

    const ratio = price / value
    if (ratio <= 0.3) return 100 // Great deal
    if (ratio <= 0.5) return 85
    if (ratio <= 0.7) return 70
    if (ratio <= 1.0) return 55
    return 30 // Overpriced
  }

  // ==================== EXIT STRATEGY AI ====================

  /**
   * Generate AI-powered exit strategy for a domain
   */
  generateExitStrategy(domain: Domain): ExitStrategy {
    const liquidity = this.calculateLiquidityScore(domain)
    const estimatedValue = domain.estimatedValue || 1000
    const purchasePrice = domain.purchasePrice || 0
    const holdTime = domain.purchasedAt 
      ? Math.floor((Date.now() - new Date(domain.purchasedAt).getTime()) / (24 * 60 * 60 * 1000))
      : 0

    let strategy: ExitStrategy['strategy'] = 'hold-6mo'
    let confidence = 70
    let estimatedSalePrice = estimatedValue
    let estimatedTimeframe = '3-6 months'
    let reasoning = ''
    const actions: string[] = []

    // Decision logic
    if (liquidity.score >= 85 && estimatedValue < 5000) {
      // Quick flip - high liquidity, low value
      strategy = 'quick-flip'
      confidence = 90
      estimatedSalePrice = estimatedValue * 0.9 // Slight discount for speed
      estimatedTimeframe = '1-2 weeks'
      reasoning = 'High liquidity domain with moderate value — quick flip maximizes capital velocity'
      actions.push('List on GoDaddy Auctions with 7-day auction')
      actions.push('Cross-list on Flippa and Sedo')
      actions.push('Set BIN price at 90% of estimated value')
    } else if (liquidity.score >= 75 && estimatedValue >= 25000) {
      // Premium buyer - high value, target end-user
      strategy = 'premium-buyer'
      confidence = 75
      estimatedSalePrice = estimatedValue * 1.5 // Premium pricing
      estimatedTimeframe = '6-12 months'
      reasoning = 'High-value domain with strong metrics — hold for premium end-user buyer'
      actions.push('List on premium marketplaces (Sedo, Afternic)')
      actions.push('Develop landing page with lead capture')
      actions.push('Outreach to relevant companies')
      actions.push('Consider broker representation')
    } else if (liquidity.score < 50 && estimatedValue >= 10000) {
      // Lease - low liquidity but valuable
      strategy = 'lease'
      confidence = 80
      estimatedSalePrice = estimatedValue * 0.12 * 12 // Annual lease revenue
      estimatedTimeframe = 'Ongoing (1-3 year lease)'
      reasoning = 'Lower liquidity domain with good value — lease generates income while waiting for buyer'
      actions.push('Set up leasing page')
      actions.push('Target startups in relevant niche')
      actions.push('Offer lease-to-own option')
    } else if (holdTime < 30 && purchasePrice > 0 && (estimatedValue / purchasePrice) >= 3) {
      // Quick profit - recent purchase with good margin
      strategy = 'quick-flip'
      confidence = 85
      estimatedSalePrice = estimatedValue * 0.85
      estimatedTimeframe = '1-4 weeks'
      reasoning = `Strong margin (${((estimatedValue / purchasePrice - 1) * 100).toFixed(0)}% ROI) — realize gains quickly`
      actions.push('List immediately on all marketplaces')
      actions.push('Set aggressive BIN price')
      actions.push('Run 7-day auction as backup')
    } else if (liquidity.score >= 60) {
      // Standard hold
      strategy = 'hold-6mo'
      confidence = 70
      estimatedSalePrice = estimatedValue
      estimatedTimeframe = '3-6 months'
      reasoning = 'Solid domain with decent liquidity — standard hold period for optimal price'
      actions.push('List on primary marketplaces')
      actions.push('Set up domain forwarding to landing page')
      actions.push('Review pricing monthly')
    } else {
      // Long hold
      strategy = 'hold-1yr'
      confidence = 60
      estimatedSalePrice = estimatedValue * 1.2
      estimatedTimeframe = '6-12 months'
      reasoning = 'Lower liquidity — longer hold period to find right buyer'
      actions.push('List at premium price point')
      actions.push('Develop mini-site to showcase value')
      actions.push('Quarterly price reviews')
      actions.push('Consider auction if no interest after 9 months')
    }

    return {
      domain: domain.name,
      strategy,
      confidence,
      estimatedSalePrice: Math.round(estimatedSalePrice),
      estimatedTimeframe,
      reasoning,
      actions,
    }
  }

  // ==================== PORTFOLIO METRICS ====================

  /**
   * Calculate comprehensive portfolio metrics
   */
  calculateMetrics(portfolio: Domain[]): PortfolioMetrics {
    if (portfolio.length === 0) {
      return {
        totalValue: 0,
        totalCost: 0,
        unrealizedPnL: 0,
        realizedPnL: 0,
        diversificationScore: 100,
        liquidityScore: 100,
        riskScore: 0,
        averageHoldTime: 0,
        winRate: 0,
        roi: 0,
      }
    }

    const totalValue = portfolio.reduce((sum, d) => sum + (d.estimatedValue || 0), 0)
    const totalCost = portfolio.reduce((sum, d) => sum + (d.purchasePrice || 0), 0)
    const unrealizedPnL = totalValue - totalCost

    // Calculate average liquidity
    const liquidityScores = portfolio.map(d => this.calculateLiquidityScore(d).score)
    const avgLiquidity = liquidityScores.reduce((a, b) => a + b, 0) / liquidityScores.length

    // Calculate average hold time
    const now = Date.now()
    const holdTimes = portfolio
      .filter(d => d.purchasedAt)
      .map(d => (now - new Date(d.purchasedAt!).getTime()) / (24 * 60 * 60 * 1000))
    const averageHoldTime = holdTimes.length > 0 
      ? holdTimes.reduce((a, b) => a + b, 0) / holdTimes.length 
      : 0

    // Risk score (higher = more risky)
    let riskScore = 50
    // Concentration risk
    const maxDomainValue = Math.max(...portfolio.map(d => d.estimatedValue || 0))
    const concentrationRisk = (maxDomainValue / totalValue) * 100
    if (concentrationRisk > 30) riskScore += 20
    else if (concentrationRisk > 20) riskScore += 10

    // Liquidity risk
    if (avgLiquidity < 50) riskScore += 15
    else if (avgLiquidity < 60) riskScore += 5

    // Diversification risk
    const diversificationScore = this.getDiversificationScore(portfolio)
    if (diversificationScore < 50) riskScore += 15
    else if (diversificationScore < 70) riskScore += 5

    return {
      totalValue,
      totalCost,
      unrealizedPnL,
      realizedPnL: 0, // Would need historical sales data
      diversificationScore,
      liquidityScore: Math.round(avgLiquidity),
      riskScore: Math.min(100, riskScore),
      averageHoldTime: Math.round(averageHoldTime),
      winRate: 0, // Would need sales data
      roi: totalCost > 0 ? ((unrealizedPnL / totalCost) * 100) : 0,
    }
  }

  /**
   * Get overall portfolio health status
   */
  getPortfolioHealth(portfolio: Domain[]): 'excellent' | 'good' | 'fair' | 'poor' {
    const metrics = this.calculateMetrics(portfolio)
    
    let score = 0
    if (metrics.diversificationScore >= 70) score += 25
    else if (metrics.diversificationScore >= 50) score += 15
    
    if (metrics.liquidityScore >= 70) score += 25
    else if (metrics.liquidityScore >= 50) score += 15
    
    if (metrics.riskScore <= 40) score += 25
    else if (metrics.riskScore <= 60) score += 15
    
    if (metrics.roi >= 50) score += 25
    else if (metrics.roi >= 20) score += 15

    if (score >= 85) return 'excellent'
    if (score >= 65) return 'good'
    if (score >= 45) return 'fair'
    return 'poor'
  }
}

// Export singleton
export const portfolioOptimizer = new PortfolioOptimizer()

