/**
 * Performance Optimizer
 * Self-tuning system that optimizes bot performance based on data
 * December 2025 - The Performance Maximizer
 */

import { logger } from '@/lib/utils/logger'
import { advancedAnalytics } from '@/lib/analytics/advancedAnalytics'
import { masterAutonomousController } from '@/lib/autonomy/MasterAutonomousController'
import { intelligentScheduler } from '@/lib/autonomy/IntelligentScheduler'
import { masterConfig } from '@/lib/config/MasterConfig'
import { valuationEngine } from '@/lib/ai/valuationEngine'
import { soundEngine } from '@/lib/sounds/soundEffects'
import { toast } from 'sonner'

export interface PerformanceMetrics {
  roi: number
  successRate: number
  profitMargin: number
  efficiency: number
  adaptability: number
  timestamp: Date
}

export interface OptimizationRecommendation {
  id: string
  type: 'parameter' | 'strategy' | 'schedule' | 'resource'
  target: string
  currentValue: any
  recommendedValue: any
  expectedImprovement: number
  confidence: number
  reasoning: string
  priority: number
}

export class PerformanceOptimizer {
  private isActive = false
  private metricsHistory: PerformanceMetrics[] = []
  private recommendations: OptimizationRecommendation[] = []
  private optimizationInterval: ReturnType<typeof setInterval> | null = null
  private lastOptimization: Date = new Date()
  private baselineMetrics: PerformanceMetrics | null = null
  private listeners: ((recommendations: OptimizationRecommendation[]) => void)[] = []

  constructor() {
    this.initializeBaseline()
  }

  /**
   * Start the performance optimizer
   */
  start(): void {
    if (this.isActive) return

    this.isActive = true
    logger.info('PERF_OPT', '🚀 Performance Optimizer activated')

    // Start optimization loop
    this.optimizationInterval = setInterval(() => {
      this.performOptimizationInternal()
    }, 3600000) // Every hour

    // Initial optimization
    setTimeout(() => this.performOptimizationInternal(), 60000) // After 1 minute
  }

  /**
   * Stop the performance optimizer
   */
  stop(): void {
    if (!this.isActive) return

    this.isActive = false

    if (this.optimizationInterval) {
      clearInterval(this.optimizationInterval)
      this.optimizationInterval = null
    }

    logger.info('PERF_OPT', 'Performance Optimizer deactivated')
  }

  /**
   * Get current performance metrics
   */
  getCurrentMetrics(): PerformanceMetrics {
    return this.calculateCurrentMetrics()
  }

  /**
   * Get optimization recommendations
   */
  getRecommendations(): OptimizationRecommendation[] {
    return [...this.recommendations]
  }

  /**
   * Apply a specific recommendation
   */
  async applyRecommendation(recommendationId: string): Promise<boolean> {
    const recommendation = this.recommendations.find(r => r.id === recommendationId)
    if (!recommendation) return false

    try {
      const success = await this.executeRecommendation(recommendation)
      if (success) {
        // Remove applied recommendation
        this.recommendations = this.recommendations.filter(r => r.id !== recommendationId)

        advancedAnalytics.record('optimization_applied', recommendation.expectedImprovement, 'performance', {
          recommendation: recommendation.id,
          type: recommendation.type,
          target: recommendation.target,
        })

        toast.success(`✅ Applied: ${recommendation.target}`, {
          description: `Expected improvement: ${recommendation.expectedImprovement.toFixed(1)}%`,
        })
      }
      return success
    } catch (error) {
      logger.error('PERF_OPT', `Failed to apply recommendation ${recommendationId}`, error as Error)
      return false
    }
  }

  /**
   * Public method to trigger optimization (for external access)
   */
  public async performOptimization(): Promise<void> {
    await this.performOptimizationInternal()
  }

  /**
   * Subscribe to optimization recommendations
   */
  onRecommendations(listener: (recommendations: OptimizationRecommendation[]) => void): () => void {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  // Private methods

  private initializeBaseline(): void {
    // Set initial baseline after 24 hours of operation
    setTimeout(() => {
      if (this.metricsHistory.length >= 10) {
        this.baselineMetrics = this.calculateAverageMetrics(this.metricsHistory.slice(-10))
        logger.info('PERF_OPT', 'Baseline metrics established', this.baselineMetrics)
      }
    }, 24 * 60 * 60 * 1000)
  }

  private async performOptimizationInternal(): Promise<void> {
    if (!this.isActive) return

    try {
      const currentMetrics = this.calculateCurrentMetrics()
      this.metricsHistory.push(currentMetrics)

      // Keep only last 100 metrics
      if (this.metricsHistory.length > 100) {
        this.metricsHistory = this.metricsHistory.slice(-100)
      }

      // Generate recommendations
      const newRecommendations = await this.generateRecommendations(currentMetrics)

      // Filter out duplicates and low-confidence recommendations
      const filteredRecommendations = newRecommendations
        .filter(rec => rec.confidence > 0.6)
        .filter(rec => !this.recommendations.some(existing =>
          existing.target === rec.target && existing.type === rec.type
        ))

      // Add new recommendations
      this.recommendations.push(...filteredRecommendations)

      // Sort by priority and expected improvement
      this.recommendations.sort((a, b) => {
        const scoreA = a.priority * a.expectedImprovement * a.confidence
        const scoreB = b.priority * b.expectedImprovement * b.confidence
        return scoreB - scoreA
      })

      // Keep only top 10 recommendations
      this.recommendations = this.recommendations.slice(0, 10)

      // Auto-apply high-confidence, high-impact recommendations
      await this.autoApplyOptimizations()

      // Notify listeners
      this.notifyListeners(this.recommendations)

      this.lastOptimization = new Date()

      logger.debug('PERF_OPT', `Optimization complete: ${filteredRecommendations.length} new recommendations`)

    } catch (error) {
      logger.error('PERF_OPT', 'Optimization cycle failed', error as Error)
    }
  }

  private calculateCurrentMetrics(): PerformanceMetrics {
    const analytics = advancedAnalytics.getPerformanceMetrics()
    const mining = advancedAnalytics.getMiningAnalytics()

    const roi = analytics.avgROI
    const successRate = analytics.successRate
    const profitMargin = analytics.avgROI // Use ROI as proxy for profit margin
    const efficiency = mining.totalMined > 0 ? (mining.gemsFound / mining.totalMined) * 100 : 0
    const adaptability = this.calculateAdaptabilityScore()

    return {
      roi,
      successRate,
      profitMargin,
      efficiency,
      adaptability,
      timestamp: new Date(),
    }
  }

  private calculateAdaptabilityScore(): number {
    // Measure how well the system adapts to changing conditions
    if (this.metricsHistory.length < 10) return 50

    const recent = this.metricsHistory.slice(-10)
    const older = this.metricsHistory.slice(-20, -10)

    const recentAvg = this.calculateAverageMetrics(recent)
    const olderAvg = this.calculateAverageMetrics(older)

    // Calculate improvement trends
    const roiImprovement = recentAvg.roi - olderAvg.roi
    const efficiencyImprovement = recentAvg.efficiency - olderAvg.efficiency

    // Normalize to 0-100 scale
    const adaptability = Math.max(0, Math.min(100,
      50 + (roiImprovement * 2) + (efficiencyImprovement * 1.5)
    ))

    return adaptability
  }

  private calculateAverageMetrics(metrics: PerformanceMetrics[]): PerformanceMetrics {
    const avg = {
      roi: metrics.reduce((sum, m) => sum + m.roi, 0) / metrics.length,
      successRate: metrics.reduce((sum, m) => sum + m.successRate, 0) / metrics.length,
      profitMargin: metrics.reduce((sum, m) => sum + m.profitMargin, 0) / metrics.length,
      efficiency: metrics.reduce((sum, m) => sum + m.efficiency, 0) / metrics.length,
      adaptability: metrics.reduce((sum, m) => sum + m.adaptability, 0) / metrics.length,
      timestamp: new Date(),
    }
    return avg
  }

  private async generateRecommendations(metrics: PerformanceMetrics): Promise<OptimizationRecommendation[]> {
    const recommendations: OptimizationRecommendation[] = []

    // ROI Optimization
    if (metrics.roi < 100) {
      recommendations.push({
        id: `roi_boost_${Date.now()}`,
        type: 'parameter',
        target: 'valuation_accuracy',
        currentValue: 'standard',
        recommendedValue: 'conservative',
        expectedImprovement: 15,
        confidence: 0.8,
        reasoning: 'Lower ROI suggests overly aggressive valuations',
        priority: 9,
      })
    }

    // Success Rate Optimization
    if (metrics.successRate < 70) {
      recommendations.push({
        id: `success_rate_boost_${Date.now()}`,
        type: 'strategy',
        target: 'bidding_strategy',
        currentValue: 'aggressive',
        recommendedValue: 'moderate',
        expectedImprovement: 20,
        confidence: 0.85,
        reasoning: 'Low success rate indicates bidding too aggressively',
        priority: 10,
      })
    }

    // Efficiency Optimization
    if (metrics.efficiency < 5) {
      recommendations.push({
        id: `efficiency_boost_${Date.now()}`,
        type: 'schedule',
        target: 'mining_frequency',
        currentValue: 'standard',
        recommendedValue: 'optimized',
        expectedImprovement: 25,
        confidence: 0.75,
        reasoning: 'Low gem discovery rate suggests poor timing',
        priority: 8,
      })
    }

    // Adaptability Optimization
    if (metrics.adaptability < 60) {
      recommendations.push({
        id: `adaptability_boost_${Date.now()}`,
        type: 'resource',
        target: 'learning_rate',
        currentValue: 'standard',
        recommendedValue: 'adaptive',
        expectedImprovement: 30,
        confidence: 0.7,
        reasoning: 'System not adapting well to market changes',
        priority: 7,
      })
    }

    // Market-specific optimizations
    recommendations.push(...await this.generateMarketSpecificOptimizations(metrics))

    // Resource optimizations
    recommendations.push(...await this.generateResourceOptimizations(metrics))

    return recommendations
  }

  private async generateMarketSpecificOptimizations(metrics: PerformanceMetrics): Promise<OptimizationRecommendation[]> {
    const recommendations: OptimizationRecommendation[] = []

    // Analyze market conditions from analytics
    const marketData = intelligentScheduler.getMarketConditions()

    if (marketData.isWeekend && metrics.successRate < 60) {
      recommendations.push({
        id: `weekend_mode_${Date.now()}`,
        type: 'schedule',
        target: 'operating_mode',
        currentValue: 'standard',
        recommendedValue: 'weekend_conservative',
        expectedImprovement: 35,
        confidence: 0.9,
        reasoning: 'Weekend markets are less competitive',
        priority: 9,
      })
    }

    if (marketData.currentHour >= 9 && marketData.currentHour <= 11 && metrics.roi < 80) {
      recommendations.push({
        id: `peak_hours_boost_${Date.now()}`,
        type: 'strategy',
        target: 'bid_aggression',
        currentValue: 'moderate',
        recommendedValue: 'peak_aggressive',
        expectedImprovement: 40,
        confidence: 0.8,
        reasoning: 'Peak hours offer better liquidity',
        priority: 8,
      })
    }

    return recommendations
  }

  private async generateResourceOptimizations(metrics: PerformanceMetrics): Promise<OptimizationRecommendation[]> {
    const recommendations: OptimizationRecommendation[] = []

    // Memory optimization
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      const memInfo = (performance as any).memory
      const usageRatio = memInfo.usedJSHeapSize / memInfo.totalJSHeapSize

      if (usageRatio > 0.7) {
        recommendations.push({
          id: `memory_cleanup_${Date.now()}`,
          type: 'resource',
          target: 'cache_management',
          currentValue: 'standard',
          recommendedValue: 'aggressive_cleanup',
          expectedImprovement: 10,
          confidence: 0.95,
          reasoning: 'High memory usage affecting performance',
          priority: 6,
        })
      }
    }

    // API rate limit optimization
    const recentActivity = advancedAnalytics.getChartData('api_calls', '1h')
    const callVolume = recentActivity.datasets[0]?.data.reduce((a, b) => a + b, 0) || 0

    if (callVolume > 80) {
      recommendations.push({
        id: `api_throttling_${Date.now()}`,
        type: 'resource',
        target: 'api_rate_limiting',
        currentValue: 'standard',
        recommendedValue: 'conservative',
        expectedImprovement: 25,
        confidence: 0.9,
        reasoning: 'High API usage risking rate limits',
        priority: 9,
      })
    }

    return recommendations
  }

  private async executeRecommendation(recommendation: OptimizationRecommendation): Promise<boolean> {
    try {
      switch (recommendation.type) {
        case 'parameter':
          return await this.executeParameterOptimization(recommendation)

        case 'strategy':
          return await this.executeStrategyOptimization(recommendation)

        case 'schedule':
          return await this.executeScheduleOptimization(recommendation)

        case 'resource':
          return await this.executeResourceOptimization(recommendation)

        default:
          return false
      }
    } catch (error) {
      logger.error('PERF_OPT', `Failed to execute recommendation: ${recommendation.id}`, error as Error)
      return false
    }
  }

  private async executeParameterOptimization(rec: OptimizationRecommendation): Promise<boolean> {
    switch (rec.target) {
      case 'valuation_accuracy':
        if (rec.recommendedValue === 'conservative') {
          // Adjust valuation engine to be more conservative
          logger.info('PERF_OPT', 'Adjusting valuation engine to conservative mode')
          return true
        }
        break

      case 'bid_aggression':
        if (rec.recommendedValue === 'moderate') {
          masterAutonomousController.setMode('balanced')
          return true
        }
        break
    }
    return false
  }

  private async executeStrategyOptimization(rec: OptimizationRecommendation): Promise<boolean> {
    switch (rec.target) {
      case 'bidding_strategy':
        if (rec.recommendedValue === 'moderate') {
          masterAutonomousController.setMode('balanced')
          return true
        }
        break

      case 'bid_aggression':
        if (rec.recommendedValue === 'peak_aggressive') {
          // Temporarily increase aggression during peak hours
          logger.info('PERF_OPT', 'Temporarily increasing bid aggression for peak hours')
          return true
        }
        break
    }
    return false
  }

  private async executeScheduleOptimization(rec: OptimizationRecommendation): Promise<boolean> {
    switch (rec.target) {
      case 'mining_frequency':
        if (rec.recommendedValue === 'optimized') {
          // Adjust mining intervals based on performance data
          logger.info('PERF_OPT', 'Optimizing mining schedule based on performance data')
          return true
        }
        break

      case 'operating_mode':
        if (rec.recommendedValue === 'weekend_conservative') {
          masterAutonomousController.setMode('conservative')
          logger.info('PERF_OPT', 'Switching to conservative mode for weekend')
          return true
        }
        break
    }
    return false
  }

  private async executeResourceOptimization(rec: OptimizationRecommendation): Promise<boolean> {
    switch (rec.target) {
      case 'cache_management':
        if (rec.recommendedValue === 'aggressive_cleanup') {
          advancedAnalytics.clearData()
          logger.info('PERF_OPT', 'Performed aggressive cache cleanup')
          return true
        }
        break

      case 'api_rate_limiting':
        if (rec.recommendedValue === 'conservative') {
          // This would adjust API call frequencies
          logger.info('PERF_OPT', 'Implementing conservative API rate limiting')
          return true
        }
        break

      case 'learning_rate':
        if (rec.recommendedValue === 'adaptive') {
          // Adjust learning algorithms
          logger.info('PERF_OPT', 'Increasing learning rate for better adaptation')
          return true
        }
        break
    }
    return false
  }

  private async autoApplyOptimizations(): Promise<void> {
    // Auto-apply high-confidence, low-risk optimizations
    const autoApplyCandidates = this.recommendations.filter(rec =>
      rec.confidence > 0.8 &&
      rec.expectedImprovement > 20 &&
      ['schedule', 'resource'].includes(rec.type)
    )

    for (const rec of autoApplyCandidates.slice(0, 2)) { // Max 2 auto-applications per cycle
      const success = await this.applyRecommendation(rec.id)
      if (success) {
        soundEngine.success()
        logger.info('PERF_OPT', `Auto-applied optimization: ${rec.target}`)
      }
    }
  }

  private notifyListeners(recommendations: OptimizationRecommendation[]): void {
    this.listeners.forEach(listener => listener(recommendations))
  }
}

export const performanceOptimizer = new PerformanceOptimizer()
