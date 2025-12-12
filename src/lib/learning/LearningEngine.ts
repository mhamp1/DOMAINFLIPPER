/**
 * LearningEngine.ts — CONTINUOUS AI LEARNING & IMPROVEMENT
 * Learns from every flip to improve decision-making — December 27, 2025
 * 
 * Tracks all purchases and sales, retrains model daily
 */

import { toast } from 'sonner'

interface PurchaseRecord {
  domain: string
  purchasePrice: number
  estimatedValue: number
  aiScore: number
  listingPrice: number
  timestamp: Date
  strategyId?: string
}

interface SaleRecord {
  domain: string
  purchasePrice: number
  salePrice: number
  profit: number
  daysToSell: number
  timestamp: Date
  strategyId?: string
}

interface FlipPerformance {
  domain: string
  purchase: PurchaseRecord
  sale?: SaleRecord
  roi?: number
  success: boolean
  aiAccuracy?: number // How close was AI valuation to sale price
}

interface LearningMetrics {
  totalFlips: number
  successfulFlips: number
  failedFlips: number
  avgROI: number
  avgDaysToSell: number
  aiAccuracy: number
  profitability: number
  bestStrategy: string
  worstStrategy: string
}

interface ModelWeights {
  brandScore: number
  seoScore: number
  trendScore: number
  lengthScore: number
  tldScore: number
  ageScore: number
  trafficScore: number
}

export class LearningEngine {
  private purchases: Map<string, PurchaseRecord> = new Map()
  private sales: Map<string, SaleRecord> = new Map()
  private flips: FlipPerformance[] = []
  private modelWeights: ModelWeights = {
    brandScore: 0.25,
    seoScore: 0.20,
    trendScore: 0.25,
    lengthScore: 0.15,
    tldScore: 0.15,
    ageScore: 0.00,
    trafficScore: 0.00,
  }
  private trainingCount: number = 0

  /**
   * Record a domain purchase
   */
  async recordPurchase(purchase: PurchaseRecord): Promise<void> {
    this.purchases.set(purchase.domain, purchase)

    // Create flip record
    const flip: FlipPerformance = {
      domain: purchase.domain,
      purchase,
      success: false, // Unknown until sold
    }

    this.flips.push(flip)
  }

  /**
   * Record a domain sale
   */
  async recordSale(sale: SaleRecord): Promise<void> {
    this.sales.set(sale.domain, sale)

    // Update flip record
    const flip = this.flips.find(f => f.domain === sale.domain)
    if (flip) {
      flip.sale = sale
      flip.roi = ((sale.profit / sale.purchasePrice) * 100)
      flip.success = sale.profit > 0

      // Calculate AI accuracy
      const purchase = this.purchases.get(sale.domain)
      if (purchase) {
        const estimatedValue = purchase.estimatedValue
        const actualValue = sale.salePrice
        const accuracy = 100 - Math.abs((estimatedValue - actualValue) / actualValue) * 100
        flip.aiAccuracy = Math.max(0, Math.min(100, accuracy))
      }
    }

    // Trigger learning if we have enough data
    if (this.sales.size % 10 === 0) {
      await this.learnFromRecentFlips()
    }
  }

  /**
   * Get recent flips for analysis
   */
  async getRecentFlips(since: Date): Promise<FlipPerformance[]> {
    return this.flips.filter(
      f => f.sale && f.sale.timestamp >= since
    )
  }

  /**
   * Learn from recent flips and adjust model
   */
  private async learnFromRecentFlips(): Promise<void> {
    const completedFlips = this.flips.filter(f => f.sale)
    if (completedFlips.length < 5) return

    // Analyze what made successful flips successful
    const successful = completedFlips.filter(f => f.success && f.roi! > 200)
    const failed = completedFlips.filter(f => !f.success || f.roi! < 50)

    // Adjust weights based on patterns
    if (successful.length > 0 && failed.length > 0) {
      // Analyze which factors correlate with success
      // In production: use proper ML algorithms
      
      // Simple heuristic: increase weight of factors that appear in successful flips
      const avgSuccessfulScore = successful.reduce((sum, f) => sum + f.purchase.aiScore, 0) / successful.length
      const avgFailedScore = failed.reduce((sum, f) => sum + f.purchase.aiScore, 0) / failed.length

      if (avgSuccessfulScore > avgFailedScore + 5) {
        // Model is working - slightly increase confidence
        this.modelWeights.trendScore = Math.min(0.30, this.modelWeights.trendScore + 0.01)
      }
    }
  }

  /**
   * Retrain model based on historical data
   */
  async retrainModel(flips: FlipPerformance[]): Promise<void> {
    if (flips.length < 10) {
      console.log('Not enough data for retraining (need 10+, have ' + flips.length + ')')
      return
    }

    try {
      // Analyze patterns in successful vs unsuccessful flips
      const successful = flips.filter(f => f.success && f.roi! > 200)
      const unsuccessful = flips.filter(f => !f.success || f.roi! < 100)

      // Calculate optimal weights
      // In production: use gradient descent or similar ML technique
      const newWeights = this.calculateOptimalWeights(successful, unsuccessful)

      // Update model weights
      this.modelWeights = newWeights
      this.trainingCount++

      // Calculate improvement metrics
      const avgROI = successful.reduce((sum, f) => sum + (f.roi || 0), 0) / successful.length
      const avgAccuracy = successful
        .filter(f => f.aiAccuracy !== undefined)
        .reduce((sum, f) => sum + (f.aiAccuracy || 0), 0) / successful.length

      toast.success('🎓 Model Retrained', {
        description: `Training #${this.trainingCount} • ${flips.length} flips analyzed • Avg ROI: ${avgROI.toFixed(0)}%`,
        duration: 5000,
      })

      console.log('Model retrained:', {
        flips: flips.length,
        successful: successful.length,
        avgROI: avgROI.toFixed(1),
        avgAccuracy: avgAccuracy.toFixed(1),
        newWeights: this.modelWeights,
      })

    } catch (error) {
      console.error('Model retraining error:', error)
      toast.error('Retraining Failed', {
        description: 'Will retry on next cycle',
      })
    }
  }

  /**
   * Calculate optimal weights based on successful patterns
   */
  private calculateOptimalWeights(
    successful: FlipPerformance[],
    _unsuccessful: FlipPerformance[] // eslint-disable-next-line @typescript-eslint/no-unused-vars
  ): ModelWeights {
    // Simple heuristic-based weight calculation
    // In production: use proper ML algorithms (gradient descent, neural nets, etc.)
    
    const weights = { ...this.modelWeights }

    // Analyze which factors correlate with high ROI
    if (successful.length > 0) {
      const avgSuccessScore = successful.reduce((sum, f) => sum + f.purchase.aiScore, 0) / successful.length
      
      // If high-score purchases are succeeding, increase trend/brand weights
      if (avgSuccessScore > 90) {
        weights.trendScore = Math.min(0.30, weights.trendScore + 0.02)
        weights.brandScore = Math.min(0.30, weights.brandScore + 0.01)
      }
    }

    // Normalize weights to sum to 1.0
    const total = Object.values(weights).reduce((a, b) => a + b, 0)
    Object.keys(weights).forEach(key => {
      weights[key as keyof ModelWeights] /= total
    })

    return weights
  }

  /**
   * Get learning metrics
   */
  getMetrics(): LearningMetrics {
    const completedFlips = this.flips.filter(f => f.sale)
    const successful = completedFlips.filter(f => f.success)
    const failed = completedFlips.filter(f => !f.success)

    // Calculate averages
    const avgROI = successful.length > 0
      ? successful.reduce((sum, f) => sum + (f.roi || 0), 0) / successful.length
      : 0

    const avgDaysToSell = completedFlips.length > 0
      ? completedFlips.reduce((sum, f) => sum + (f.sale?.daysToSell || 0), 0) / completedFlips.length
      : 0

    const avgAccuracy = completedFlips.filter(f => f.aiAccuracy).length > 0
      ? completedFlips
          .filter(f => f.aiAccuracy)
          .reduce((sum, f) => sum + (f.aiAccuracy || 0), 0) / 
          completedFlips.filter(f => f.aiAccuracy).length
      : 0

    const profitability = completedFlips.length > 0
      ? (successful.length / completedFlips.length) * 100
      : 0

    // Find best and worst strategies
    const strategyPerformance = new Map<string, { wins: number; total: number }>()
    completedFlips.forEach(f => {
      const strategy = f.purchase.strategyId || 'unknown'
      const current = strategyPerformance.get(strategy) || { wins: 0, total: 0 }
      current.total++
      if (f.success) current.wins++
      strategyPerformance.set(strategy, current)
    })

    let bestStrategy = 'unknown'
    let worstStrategy = 'unknown'
    let bestRate = 0
    let worstRate = 100

    strategyPerformance.forEach((perf, strategy) => {
      const rate = (perf.wins / perf.total) * 100
      if (rate > bestRate) {
        bestRate = rate
        bestStrategy = strategy
      }
      if (rate < worstRate && perf.total >= 3) {
        worstRate = rate
        worstStrategy = strategy
      }
    })

    return {
      totalFlips: completedFlips.length,
      successfulFlips: successful.length,
      failedFlips: failed.length,
      avgROI: Math.round(avgROI),
      avgDaysToSell: Math.round(avgDaysToSell),
      aiAccuracy: Math.round(avgAccuracy),
      profitability: Math.round(profitability),
      bestStrategy,
      worstStrategy,
    }
  }

  /**
   * Get model weights (for transparency)
   */
  getModelWeights(): ModelWeights {
    return { ...this.modelWeights }
  }

  /**
   * Get detailed flip history
   */
  getFlipHistory(limit: number = 50): FlipPerformance[] {
    return this.flips
      .filter(f => f.sale)
      .sort((a, b) => b.sale!.timestamp.getTime() - a.sale!.timestamp.getTime())
      .slice(0, limit)
  }

  /**
   * Predict success rate for a potential purchase
   */
  async predictSuccess(
    _domain: string,
    _purchasePrice: number,
    _estimatedValue: number,
    aiScore: number
  ): Promise<{
    successProbability: number
    expectedROI: number
    recommendation: string
  }> {
    // Analyze similar historical flips
    const similarFlips = this.flips.filter(f => {
      if (!f.sale) return false
      const scoreDiff = Math.abs(f.purchase.aiScore - aiScore)
      return scoreDiff < 10
    })

    if (similarFlips.length < 3) {
      return {
        successProbability: 0.75, // Default
        expectedROI: 250,
        recommendation: 'Limited data - proceed with caution',
      }
    }

    // Calculate success rate for similar domains
    const successfulSimilar = similarFlips.filter(f => f.success)
    const successRate = (successfulSimilar.length / similarFlips.length) * 100

    // Calculate average ROI for similar domains
    const avgROI = successfulSimilar.length > 0
      ? successfulSimilar.reduce((sum, f) => sum + (f.roi || 0), 0) / successfulSimilar.length
      : 0

    // Generate recommendation
    let recommendation = ''
    if (successRate > 80 && avgROI > 300) {
      recommendation = 'Strong buy - excellent track record'
    } else if (successRate > 60 && avgROI > 200) {
      recommendation = 'Good opportunity - solid performance expected'
    } else if (successRate > 40) {
      recommendation = 'Moderate risk - consider smaller position'
    } else {
      recommendation = 'High risk - avoid or need more research'
    }

    return {
      successProbability: successRate / 100,
      expectedROI: Math.round(avgROI),
      recommendation,
    }
  }

  /**
   * Export learning data (for backup or analysis)
   */
  exportData(): {
    purchases: PurchaseRecord[]
    sales: SaleRecord[]
    flips: FlipPerformance[]
    weights: ModelWeights
    metrics: LearningMetrics
  } {
    return {
      purchases: Array.from(this.purchases.values()),
      sales: Array.from(this.sales.values()),
      flips: this.flips,
      weights: this.modelWeights,
      metrics: this.getMetrics(),
    }
  }

  /**
   * Import learning data (restore from backup)
   */
  importData(data: {
    purchases?: PurchaseRecord[]
    sales?: SaleRecord[]
    flips?: FlipPerformance[]
    weights?: ModelWeights
  }): void {
    if (data.purchases) {
      this.purchases = new Map(data.purchases.map(p => [p.domain, p]))
    }
    if (data.sales) {
      this.sales = new Map(data.sales.map(s => [s.domain, s]))
    }
    if (data.flips) {
      this.flips = data.flips
    }
    if (data.weights) {
      this.modelWeights = data.weights
    }

    toast.success('Learning Data Imported', {
      description: `${this.flips.length} flips restored`,
    })
  }

  /**
   * Reset learning (clear all data)
   */
  reset(): void {
    this.purchases.clear()
    this.sales.clear()
    this.flips = []
    this.trainingCount = 0

    toast.info('Learning Data Reset', {
      description: 'Starting fresh',
    })
  }
}

// Export singleton
export const learningEngine = new LearningEngine()
