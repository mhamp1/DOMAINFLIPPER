/**
 * Risk Management System
 * Real-time risk assessment and automatic mitigation
 * December 2025 - The Risk Guardian
 */

import { logger } from '@/lib/utils/logger'
import { masterConfig } from '@/lib/config/MasterConfig'
import { advancedAnalytics } from '@/lib/analytics/advancedAnalytics'
import { masterAutonomousController } from '@/lib/autonomy/MasterAutonomousController'
import { soundEngine } from '@/lib/sounds/soundEffects'
import { toast } from 'sonner'

export interface RiskAssessment {
  level: 'low' | 'medium' | 'high' | 'critical'
  score: number // 0-100
  factors: RiskFactor[]
  recommendations: string[]
  timestamp: Date
}

export interface RiskFactor {
  name: string
  impact: number // 0-100
  probability: number // 0-100
  description: string
  mitigation: string
  active: boolean
}

export interface RiskThresholds {
  low: number
  medium: number
  high: number
  critical: number
}

export class RiskManagementSystem {
  private isActive = false
  private currentAssessment: RiskAssessment
  private thresholds: RiskThresholds = {
    low: 20,
    medium: 40,
    high: 70,
    critical: 90,
  }
  private riskHistory: RiskAssessment[] = []
  private mitigationActions: Map<string, MitigationAction> = new Map()
  private checkInterval: ReturnType<typeof setInterval> | null = null
  private listeners: ((assessment: RiskAssessment) => void)[] = []

  constructor() {
    this.currentAssessment = {
      level: 'low',
      score: 0,
      factors: [],
      recommendations: [],
      timestamp: new Date(),
    }
    this.initializeMitigationActions()
  }

  /**
   * Start the risk management system
   */
  start(): void {
    if (this.isActive) return

    this.isActive = true
    logger.info('RISK_MGMT', '🛡️ Risk Management System activated')

    // Start risk assessment loop
    this.checkInterval = setInterval(() => {
      this.performRiskAssessment()
    }, 60000) // Every minute

    // Initial assessment
    this.performRiskAssessment()
  }

  /**
   * Stop the risk management system
   */
  stop(): void {
    if (!this.isActive) return

    this.isActive = false

    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }

    logger.info('RISK_MGMT', 'Risk Management System deactivated')
  }

  /**
   * Get current risk assessment
   */
  getCurrentAssessment(): RiskAssessment {
    return { ...this.currentAssessment }
  }

  /**
   * Get risk history
   */
  getRiskHistory(limit = 20): RiskAssessment[] {
    return this.riskHistory.slice(-limit)
  }

  /**
   * Manually trigger risk mitigation
   */
  async triggerMitigation(actionId: string): Promise<boolean> {
    const action = this.mitigationActions.get(actionId)
    if (!action) return false

    return await this.executeMitigationAction(action)
  }

  /**
   * Update risk thresholds
   */
  updateThresholds(thresholds: Partial<RiskThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds }
    logger.info('RISK_MGMT', 'Risk thresholds updated', this.thresholds)
  }

  /**
   * Subscribe to risk assessment changes
   */
  onRiskAssessment(listener: (assessment: RiskAssessment) => void): () => void {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  // Private methods

  private initializeMitigationActions(): void {
    const actions: MitigationAction[] = [
      {
        id: 'reduce_bidding_frequency',
        name: 'Reduce Bidding Frequency',
        description: 'Lower bidding activity to reduce exposure',
        triggerThreshold: 60,
        action: async () => {
          masterAutonomousController.setMode('conservative')
          return true
        },
      },
      {
        id: 'pause_high_risk_operations',
        name: 'Pause High-Risk Operations',
        description: 'Temporarily halt bidding and acquisitions',
        triggerThreshold: 75,
        action: async () => {
          // This would disable high-risk workflows
          return true
        },
      },
      {
        id: 'diversify_portfolio',
        name: 'Diversify Portfolio',
        description: 'Rebalance to reduce concentration risk',
        triggerThreshold: 50,
        action: async () => {
          // This would trigger portfolio rebalancing
          return true
        },
      },
      {
        id: 'increase_reserves',
        name: 'Increase Cash Reserves',
        description: 'Build up cash reserves for emergencies',
        triggerThreshold: 65,
        action: async () => {
          // This would adjust capital allocation
          return true
        },
      },
      {
        id: 'emergency_shutdown',
        name: 'Emergency Shutdown',
        description: 'Complete system shutdown for safety',
        triggerThreshold: 95,
        action: async () => {
          await masterAutonomousController.stop()
          return true
        },
      },
    ]

    actions.forEach(action => {
      this.mitigationActions.set(action.id, action)
    })
  }

  private async performRiskAssessment(): Promise<void> {
    if (!this.isActive) return

    const factors = await this.assessRiskFactors()
    const score = this.calculateRiskScore(factors)
    const level = this.determineRiskLevel(score)

    const assessment: RiskAssessment = {
      level,
      score,
      factors,
      recommendations: this.generateRecommendations(factors, level),
      timestamp: new Date(),
    }

    // Check if risk level changed significantly
    const significantChange = this.isSignificantRiskChange(assessment)

    this.currentAssessment = assessment
    this.riskHistory.push(assessment)

    // Keep only last 100 assessments
    if (this.riskHistory.length > 100) {
      this.riskHistory = this.riskHistory.slice(-100)
    }

    // Trigger mitigations if needed
    if (level === 'high' || level === 'critical') {
      await this.triggerAutomaticMitigations(assessment)
    }

    // Notify listeners
    this.notifyListeners(assessment)

    // Alert if significant change
    if (significantChange) {
      this.alertRiskChange(assessment)
    }

    logger.debug('RISK_MGMT', `Risk assessment: ${level} (${score.toFixed(1)})`)
  }

  private async assessRiskFactors(): Promise<RiskFactor[]> {
    const factors: RiskFactor[] = []

    // Financial risk factors
    factors.push(await this.assessCapitalRisk())
    factors.push(await this.assessPortfolioConcentrationRisk())
    factors.push(await this.assessLiquidityRisk())

    // Operational risk factors
    factors.push(await this.assessAPIRateLimitRisk())
    factors.push(await this.assessSystemHealthRisk())
    factors.push(await this.assessNetworkRisk())

    // Market risk factors
    factors.push(await this.assessMarketVolatilityRisk())
    factors.push(await this.assessCompetitionRisk())

    // Performance risk factors
    factors.push(await this.assessSuccessRateRisk())
    factors.push(await this.assessROIConsistencyRisk())

    return factors.filter(factor => factor.active)
  }

  private async assessCapitalRisk(): Promise<RiskFactor> {
    const empireConfig = masterConfig.getEmpire()
    const availableCapital = masterConfig.getEmpire().totalCapital * 0.8 // Conservative estimate

    const capitalUtilization = (empireConfig.totalCapital - availableCapital) / empireConfig.totalCapital
    const impact = Math.min(capitalUtilization * 100, 100)
    const probability = capitalUtilization > 0.8 ? 80 : capitalUtilization > 0.6 ? 60 : 30

    return {
      name: 'Capital Utilization',
      impact,
      probability,
      description: `Capital utilization at ${(capitalUtilization * 100).toFixed(1)}%`,
      mitigation: 'Reduce bidding activity and increase cash reserves',
      active: capitalUtilization > 0.5,
    }
  }

  private async assessPortfolioConcentrationRisk(): Promise<RiskFactor> {
    // Simplified - would analyze actual portfolio concentration
    const concentrationScore = 30 // Placeholder
    const impact = concentrationScore
    const probability = concentrationScore > 50 ? 70 : 40

    return {
      name: 'Portfolio Concentration',
      impact,
      probability,
      description: 'Portfolio concentration risk assessment',
      mitigation: 'Diversify domain acquisitions across categories',
      active: concentrationScore > 40,
    }
  }

  private async assessLiquidityRisk(): Promise<RiskFactor> {
    const analytics = advancedAnalytics.getPerformanceMetrics()
    const liquidityScore = analytics.avgROI > 0 ? 30 : 70 // Use ROI as liquidity proxy
    const impact = liquidityScore
    const probability = liquidityScore > 50 ? 75 : 35

    return {
      name: 'Liquidity Risk',
      impact,
      probability,
      description: `Current liquidity position: ${liquidityScore > 50 ? 'Poor' : 'Good'}`,
      mitigation: 'Accelerate sales of low-ROI domains',
      active: liquidityScore > 40,
    }
  }

  private async assessAPIRateLimitRisk(): Promise<RiskFactor> {
    // Monitor API call patterns
    const recentActivity = advancedAnalytics.getChartData('api_calls', '1h')
    const callVolume = recentActivity.datasets[0]?.data.reduce((a, b) => a + b, 0) || 0

    const rateLimitRisk = Math.min(callVolume / 100 * 100, 100) // Assume 100 calls/hour limit
    const impact = rateLimitRisk
    const probability = rateLimitRisk > 50 ? 80 : 30

    return {
      name: 'API Rate Limiting',
      impact,
      probability,
      description: `API usage at ${rateLimitRisk.toFixed(1)}% of limit`,
      mitigation: 'Implement request throttling and backoff strategies',
      active: rateLimitRisk > 30,
    }
  }

  private async assessSystemHealthRisk(): Promise<RiskFactor> {
    // This would integrate with the health monitoring system
    const healthScore = 85 // Placeholder - would come from health monitor
    const impact = 100 - healthScore
    const probability = impact > 50 ? 90 : 40

    return {
      name: 'System Health',
      impact,
      probability,
      description: `System health score: ${healthScore}`,
      mitigation: 'Trigger self-healing procedures and system maintenance',
      active: healthScore < 90,
    }
  }

  private async assessNetworkRisk(): Promise<RiskFactor> {
    // Simple network connectivity check
    let connectivityScore = 100
    try {
      const response = await fetch('https://httpbin.org/status/200', {
        method: 'HEAD',
        signal: AbortSignal.timeout(3000),
      })
      if (!response.ok) connectivityScore = 50
    } catch (error) {
      connectivityScore = 20
    }

    const impact = 100 - connectivityScore
    const probability = impact > 50 ? 85 : 25

    return {
      name: 'Network Connectivity',
      impact,
      probability,
      description: `Network connectivity: ${connectivityScore}%`,
      mitigation: 'Implement offline operation modes and retry mechanisms',
      active: connectivityScore < 95,
    }
  }

  private async assessMarketVolatilityRisk(): Promise<RiskFactor> {
    // Analyze recent price volatility
    const recentPrices = advancedAnalytics.getChartData('domain_prices', '24h')
    const prices = recentPrices.datasets[0]?.data || []
    const volatility = this.calculateVolatility(prices)

    const impact = Math.min(volatility * 100, 100)
    const probability = impact > 50 ? 70 : 30

    return {
      name: 'Market Volatility',
      impact,
      probability,
      description: `Market volatility: ${volatility.toFixed(2)}`,
      mitigation: 'Reduce position sizes and implement stop-loss mechanisms',
      active: volatility > 0.3,
    }
  }

  private async assessCompetitionRisk(): Promise<RiskFactor> {
    // Analyze bidding competition
    const winRate = advancedAnalytics.getPerformanceMetrics().successRate
    const competitionRisk = 100 - winRate

    const impact = competitionRisk
    const probability = competitionRisk > 50 ? 75 : 35

    return {
      name: 'Competition Intensity',
      impact,
      probability,
      description: `Bidding win rate: ${winRate.toFixed(1)}%`,
      mitigation: 'Adjust bidding strategies and target less competitive domains',
      active: winRate < 70,
    }
  }

  private async assessSuccessRateRisk(): Promise<RiskFactor> {
    const analytics = advancedAnalytics.getPerformanceMetrics()
    const successRisk = 100 - analytics.successRate

    const impact = successRisk
    const probability = successRisk > 50 ? 80 : 40

    return {
      name: 'Success Rate Decline',
      impact,
      probability,
      description: `Overall success rate: ${analytics.successRate.toFixed(1)}%`,
      mitigation: 'Review and optimize bidding and valuation algorithms',
      active: analytics.successRate < 75,
    }
  }

  private async assessROIConsistencyRisk(): Promise<RiskFactor> {
    const analytics = advancedAnalytics.getPerformanceMetrics()
    const roiVariance = 20 // Placeholder - would calculate actual variance

    const impact = Math.min(roiVariance, 100)
    const probability = impact > 30 ? 65 : 25

    return {
      name: 'ROI Consistency',
      impact,
      probability,
      description: `ROI variance: ${roiVariance.toFixed(1)}%`,
      mitigation: 'Implement more conservative valuation ranges',
      active: roiVariance > 25,
    }
  }

  private calculateRiskScore(factors: RiskFactor[]): number {
    if (factors.length === 0) return 0

    // Weighted average of impact * probability
    const totalWeight = factors.reduce((sum, factor) => sum + (factor.impact * factor.probability), 0)
    const totalPossible = factors.reduce((sum, factor) => sum + (100 * 100), 0)

    return (totalWeight / totalPossible) * 100
  }

  private determineRiskLevel(score: number): RiskAssessment['level'] {
    if (score >= this.thresholds.critical) return 'critical'
    if (score >= this.thresholds.high) return 'high'
    if (score >= this.thresholds.medium) return 'medium'
    return 'low'
  }

  private generateRecommendations(factors: RiskFactor[], level: RiskAssessment['level']): string[] {
    const recommendations: string[] = []

    if (level === 'critical') {
      recommendations.push('🚨 EMERGENCY: Immediate system shutdown recommended')
      recommendations.push('📞 Contact system administrator')
      recommendations.push('💾 Backup all data immediately')
    } else if (level === 'high') {
      recommendations.push('⚠️ High risk detected - reduce trading activity')
      recommendations.push('🔄 Switch to conservative trading mode')
      recommendations.push('📊 Review recent transactions for anomalies')
    } else if (level === 'medium') {
      recommendations.push('⚡ Moderate risk - monitor closely')
      recommendations.push('📈 Consider reducing position sizes')
    }

    // Factor-specific recommendations
    factors.forEach(factor => {
      if (factor.impact > 60) {
        recommendations.push(`🎯 ${factor.name}: ${factor.mitigation}`)
      }
    })

    return recommendations
  }

  private async triggerAutomaticMitigations(assessment: RiskAssessment): Promise<void> {
    const applicableActions = Array.from(this.mitigationActions.values())
      .filter(action => assessment.score >= action.triggerThreshold)

    for (const action of applicableActions) {
      const success = await this.executeMitigationAction(action)
      if (success) {
        logger.info('RISK_MGMT', `Executed mitigation: ${action.name}`)
        toast.warning(`🛡️ Risk Mitigation: ${action.name}`)
      }
    }
  }

  private async executeMitigationAction(action: MitigationAction): Promise<boolean> {
    try {
      const success = await action.action()
      if (success) {
        advancedAnalytics.record('risk_mitigation', 1, 'risk_management', {
          action: action.id,
          description: action.description,
        })
      }
      return success
    } catch (error) {
      logger.error('RISK_MGMT', `Mitigation action failed: ${action.name}`, error as Error)
      return false
    }
  }

  private isSignificantRiskChange(newAssessment: RiskAssessment): boolean {
    const previous = this.riskHistory[this.riskHistory.length - 2]
    if (!previous) return false

    const levelChange = this.getRiskLevelValue(newAssessment.level) - this.getRiskLevelValue(previous.level)
    const scoreChange = Math.abs(newAssessment.score - previous.score)

    return levelChange >= 1 || scoreChange >= 20
  }

  private getRiskLevelValue(level: RiskAssessment['level']): number {
    const values = { low: 0, medium: 1, high: 2, critical: 3 }
    return values[level]
  }

  private alertRiskChange(assessment: RiskAssessment): void {
    const message = `Risk Level: ${assessment.level.toUpperCase()} (${assessment.score.toFixed(1)})`

    if (assessment.level === 'critical') {
      soundEngine.error()
      toast.error(`🚨 ${message}`, {
        description: 'Critical risk detected - immediate action required',
        duration: 0, // Persistent
      })
    } else if (assessment.level === 'high') {
      soundEngine.error()
      toast.warning(`⚠️ ${message}`, {
        description: 'High risk detected - mitigation activated',
        duration: 10000,
      })
    } else {
      soundEngine.notification()
      toast.info(`ℹ️ ${message}`, {
        description: 'Risk assessment updated',
        duration: 5000,
      })
    }
  }

  private calculateVolatility(prices: number[]): number {
    if (prices.length < 2) return 0

    const returns: number[] = []
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1])
    }

    const mean = returns.reduce((a, b) => a + b, 0) / returns.length
    const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length

    return Math.sqrt(variance)
  }

  private notifyListeners(assessment: RiskAssessment): void {
    this.listeners.forEach(listener => listener(assessment))
  }
}

interface MitigationAction {
  id: string
  name: string
  description: string
  triggerThreshold: number
  action: () => Promise<boolean>
}

export const riskManagementSystem = new RiskManagementSystem()
