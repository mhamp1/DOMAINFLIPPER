/**
 * Seasonal Trend Analyzer — Recency-weighted trend scoring with persistence
 * December 2025
 * 
 * Features:
 * - Recency-weighted trend scores (recent data matters more)
 * - Momentum and persistence calculation over sliding windows
 * - One-off spike filtering
 * - Configurable thresholds
 */

export interface SeasonalConfig {
  windowDays: number              // Days to look back for trend analysis
  recencyDecayRate: number        // How quickly old data loses weight (0-1)
  minPersistenceDays: number      // Minimum days a trend must persist
  spikeFilterThreshold: number    // Z-score threshold to filter spikes
  momentumWeight: number          // Weight for momentum in final score (0-1)
  enableSpikeFilter: boolean      // Whether to filter one-off spikes
}

export interface TrendDataPoint {
  timestamp: Date
  value: number                   // Volume, mentions, searches, etc.
  source: string                  // Where the data came from
}

export interface TrendAnalysis {
  keyword: string
  currentScore: number            // 0-100 weighted score
  momentum: number                // -100 to +100 (negative = declining)
  persistence: number             // 0-100 (how long trend has lasted)
  isSpike: boolean                // True if likely one-off spike
  recencyWeight: number           // How much recent data influenced score
  dataPoints: number              // Number of data points analyzed
  daysActive: number              // Days the trend has been active
  trend: 'rising' | 'stable' | 'declining'
  confidence: number              // 0-100 confidence in the analysis
  breakdown: string               // Human-readable explanation
}

export const DEFAULT_SEASONAL_CONFIG: SeasonalConfig = {
  windowDays: 30,
  recencyDecayRate: 0.1,          // 10% decay per day
  minPersistenceDays: 3,
  spikeFilterThreshold: 2.5,      // 2.5 standard deviations
  momentumWeight: 0.4,
  enableSpikeFilter: true,
}

export class SeasonalTrendAnalyzer {
  private config: SeasonalConfig
  
  constructor(config?: SeasonalConfig) {
    this.config = config || DEFAULT_SEASONAL_CONFIG
  }

  /**
   * Analyze trend data with recency weighting and persistence
   */
  analyzeTrend(keyword: string, dataPoints: TrendDataPoint[]): TrendAnalysis {
    if (dataPoints.length === 0) {
      return this.getEmptyAnalysis(keyword)
    }

    // Sort by timestamp (oldest first)
    const sorted = [...dataPoints].sort((a, b) => 
      a.timestamp.getTime() - b.timestamp.getTime()
    )

    // Calculate time span
    const oldest = sorted[0].timestamp.getTime()
    const newest = sorted[sorted.length - 1].timestamp.getTime()
    const daysActive = Math.max(1, (newest - oldest) / (1000 * 60 * 60 * 24))

    // Filter to window
    const cutoffDate = new Date(newest - this.config.windowDays * 24 * 60 * 60 * 1000)
    const windowData = sorted.filter(d => d.timestamp >= cutoffDate)

    if (windowData.length === 0) {
      return this.getEmptyAnalysis(keyword)
    }

    // 1. Calculate recency-weighted score
    const { weightedScore, totalWeight } = this.calculateRecencyWeightedScore(windowData, newest)

    // 2. Calculate momentum (rate of change)
    const momentum = this.calculateMomentum(windowData, newest)

    // 3. Calculate persistence (how long trend has lasted)
    const persistence = this.calculatePersistence(windowData)

    // 4. Check for spikes (one-off anomalies)
    const isSpike = this.config.enableSpikeFilter 
      ? this.detectSpike(windowData) 
      : false

    // 5. Determine trend direction
    let trend: 'rising' | 'stable' | 'declining'
    if (momentum > 20) trend = 'rising'
    else if (momentum < -20) trend = 'declining'
    else trend = 'stable'

    // 6. Calculate confidence based on data quality
    const confidence = this.calculateConfidence(
      windowData.length,
      persistence,
      daysActive
    )

    // 7. Combine into final score
    const momentumBonus = this.config.momentumWeight * (momentum / 100) * 100
    let finalScore = weightedScore + momentumBonus

    // Penalize spikes
    if (isSpike) {
      finalScore *= 0.5
    }

    // Penalize low persistence
    if (persistence < 50) {
      finalScore *= (0.5 + persistence / 200)
    }

    // Cap at 0-100
    finalScore = Math.max(0, Math.min(100, finalScore))

    const breakdown = this.generateBreakdown({
      score: finalScore,
      momentum,
      persistence,
      isSpike,
      trend,
      daysActive,
    })

    return {
      keyword,
      currentScore: Math.round(finalScore),
      momentum: Math.round(momentum),
      persistence: Math.round(persistence),
      isSpike,
      recencyWeight: totalWeight,
      dataPoints: windowData.length,
      daysActive: Math.round(daysActive),
      trend,
      confidence: Math.round(confidence),
      breakdown,
    }
  }

  /**
   * Calculate recency-weighted score
   * Recent data points have exponentially higher weight
   */
  private calculateRecencyWeightedScore(
    data: TrendDataPoint[],
    newestTimestamp: number
  ): { weightedScore: number; totalWeight: number } {
    let weightedSum = 0
    let totalWeight = 0

    for (const point of data) {
      const ageInDays = (newestTimestamp - point.timestamp.getTime()) / (1000 * 60 * 60 * 24)
      
      // Exponential decay: weight = e^(-decay * age)
      const weight = Math.exp(-this.config.recencyDecayRate * ageInDays)
      
      weightedSum += point.value * weight
      totalWeight += weight
    }

    const weightedScore = totalWeight > 0 ? (weightedSum / totalWeight) : 0

    // Normalize to 0-100 scale (assuming input values are normalized)
    return {
      weightedScore: Math.min(100, weightedScore),
      totalWeight,
    }
  }

  /**
   * Calculate momentum (rate of change)
   * Positive = increasing, negative = decreasing
   */
  private calculateMomentum(data: TrendDataPoint[], newestTimestamp: number): number {
    if (data.length < 2) return 0

    // Compare recent half vs older half
    const midpoint = Math.floor(data.length / 2)
    const older = data.slice(0, midpoint)
    const recent = data.slice(midpoint)

    const olderAvg = this.average(older.map(d => d.value))
    const recentAvg = this.average(recent.map(d => d.value))

    if (olderAvg === 0) return recentAvg > 0 ? 100 : 0

    // Calculate percent change
    const percentChange = ((recentAvg - olderAvg) / olderAvg) * 100

    // Cap at -100 to +100
    return Math.max(-100, Math.min(100, percentChange))
  }

  /**
   * Calculate persistence (how consistently trend appears)
   */
  private calculatePersistence(data: TrendDataPoint[]): number {
    if (data.length === 0) return 0

    // Count consecutive days with activity
    const daysSeen = new Set<string>()
    for (const point of data) {
      const day = point.timestamp.toISOString().split('T')[0]
      daysSeen.add(day)
    }

    const daysWithActivity = daysSeen.size

    // Score based on how many days in window had activity
    const persistenceRatio = daysWithActivity / this.config.windowDays

    // Bonus for meeting minimum persistence threshold
    const meetsMinimum = daysWithActivity >= this.config.minPersistenceDays

    let score = persistenceRatio * 100

    if (meetsMinimum) {
      score = Math.min(100, score * 1.2) // 20% bonus
    }

    return score
  }

  /**
   * Detect if trend is a one-off spike using z-score
   */
  private detectSpike(data: TrendDataPoint[]): boolean {
    if (data.length < 3) return false

    const values = data.map(d => d.value)
    const mean = this.average(values)
    const stdDev = this.standardDeviation(values, mean)

    if (stdDev === 0) return false

    // Check if latest value is a spike
    const latest = values[values.length - 1]
    const zScore = Math.abs((latest - mean) / stdDev)

    return zScore > this.config.spikeFilterThreshold
  }

  /**
   * Calculate confidence in analysis
   */
  private calculateConfidence(
    dataPointCount: number,
    persistence: number,
    daysActive: number
  ): number {
    let confidence = 50 // Base confidence

    // More data points = higher confidence
    if (dataPointCount >= 10) confidence += 20
    else if (dataPointCount >= 5) confidence += 10

    // Higher persistence = higher confidence
    if (persistence >= 80) confidence += 20
    else if (persistence >= 60) confidence += 10

    // Longer activity = higher confidence
    if (daysActive >= 14) confidence += 10
    else if (daysActive >= 7) confidence += 5

    return Math.min(100, confidence)
  }

  /**
   * Generate human-readable breakdown
   */
  private generateBreakdown(factors: any): string {
    const parts: string[] = []

    if (factors.trend === 'rising') {
      parts.push(`rising trend (+${factors.momentum}%)`)
    } else if (factors.trend === 'declining') {
      parts.push(`declining trend (${factors.momentum}%)`)
    } else {
      parts.push('stable trend')
    }

    if (factors.persistence >= 80) {
      parts.push('highly persistent')
    } else if (factors.persistence >= 50) {
      parts.push('moderately persistent')
    } else {
      parts.push('low persistence')
    }

    if (factors.isSpike) {
      parts.push('likely spike')
    }

    parts.push(`${Math.round(factors.daysActive)}d active`)

    return parts.join(', ')
  }

  /**
   * Helper: calculate average
   */
  private average(values: number[]): number {
    if (values.length === 0) return 0
    return values.reduce((sum, v) => sum + v, 0) / values.length
  }

  /**
   * Helper: calculate standard deviation
   */
  private standardDeviation(values: number[], mean?: number): number {
    if (values.length === 0) return 0
    
    const avg = mean ?? this.average(values)
    const squareDiffs = values.map(v => Math.pow(v - avg, 2))
    const avgSquareDiff = this.average(squareDiffs)
    
    return Math.sqrt(avgSquareDiff)
  }

  /**
   * Get empty analysis for no data case
   */
  private getEmptyAnalysis(keyword: string): TrendAnalysis {
    return {
      keyword,
      currentScore: 0,
      momentum: 0,
      persistence: 0,
      isSpike: false,
      recencyWeight: 0,
      dataPoints: 0,
      daysActive: 0,
      trend: 'stable',
      confidence: 0,
      breakdown: 'No data available',
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<SeasonalConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * Get current configuration
   */
  getConfig(): SeasonalConfig {
    return { ...this.config }
  }
}

// Singleton instance
export const seasonalTrendAnalyzer = new SeasonalTrendAnalyzer()
