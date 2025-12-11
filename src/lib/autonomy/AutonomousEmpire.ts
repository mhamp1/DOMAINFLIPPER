/**
 * Autonomous Empire
 * The complete self-sufficient domain trading empire
 * December 2025 - The Final Evolution
 */

import { logger } from '@/lib/utils/logger'
import { masterConfig } from '@/lib/config/MasterConfig'
import { masterAutonomousController } from '@/lib/autonomy/MasterAutonomousController'
import { selfHealingSystem } from '@/lib/autonomy/SelfHealingSystem'
import { riskManagementSystem } from '@/lib/autonomy/RiskManagementSystem'
import { performanceOptimizer } from '@/lib/autonomy/PerformanceOptimizer'
import { intelligentScheduler } from '@/lib/autonomy/IntelligentScheduler'
import { soundEngine } from '@/lib/sounds/soundEffects'
import { toast } from 'sonner'

export interface EmpireStatus {
  isActive: boolean
  mode: 'standby' | 'conservative' | 'balanced' | 'aggressive' | 'god_mode'
  healthScore: number
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  performanceScore: number
  activeWorkflows: number
  totalDecisions: number
  successRate: number
  uptime: number
  lastActivity: Date
}

export interface EmpireStats {
  domainsAcquired: number
  domainsSold: number
  totalRevenue: number
  totalProfit: number
  successRate: number
  avgROI: number
  uptime: number
  optimizationsApplied: number
  riskEvents: number
  healingActions: number
}

export class AutonomousEmpire {
  private isActive = false
  private startTime: Date | null = null
  private status: EmpireStatus
  private stats: EmpireStats
  private emergencyMode = false

  constructor() {
    this.status = {
      isActive: false,
      mode: 'standby',
      healthScore: 100,
      riskLevel: 'low',
      performanceScore: 100,
      activeWorkflows: 0,
      totalDecisions: 0,
      successRate: 0,
      uptime: 0,
      lastActivity: new Date(),
    }

    this.stats = {
      domainsAcquired: 0,
      domainsSold: 0,
      totalRevenue: 0,
      totalProfit: 0,
      successRate: 0,
      avgROI: 0,
      uptime: 0,
      optimizationsApplied: 0,
      riskEvents: 0,
      healingActions: 0,
    }
  }

  /**
   * Launch the autonomous empire
   */
  async launch(): Promise<boolean> {
    if (this.isActive) return true

    try {
      logger.info('EMPIRE', '🚀 AUTONOMOUS EMPIRE LAUNCH SEQUENCE INITIATED')

      // Pre-flight checks
      if (!await this.performPreFlightChecks()) {
        toast.error('❌ Launch Failed', {
          description: 'Pre-flight checks failed',
        })
        return false
      }

      // Start the master autonomous controller
      await masterAutonomousController.start()

      // Start basic health monitoring
      selfHealingSystem.start()

      // Start the empire
      this.isActive = true
      this.startTime = new Date()
      this.status.isActive = true
      this.status.lastActivity = new Date()

      // Set initial mode
      this.setMode('balanced')

      // Announce launch
      soundEngine.vaultOpen()
      toast.success('🎯 AUTONOMOUS EMPIRE LAUNCHED', {
        description: 'The bot is now completely self-sufficient',
        duration: 10000,
      })

      logger.info('EMPIRE', '🎯 AUTONOMOUS EMPIRE SUCCESSFULLY LAUNCHED')

      return true

    } catch (error) {
      logger.error('EMPIRE', 'Failed to launch autonomous empire', error as Error)
      await this.emergencyShutdown()
      return false
    }
  }

  /**
   * Shutdown the autonomous empire
   */
  async shutdown(): Promise<void> {
    if (!this.isActive) return

    logger.info('EMPIRE', '🛑 AUTONOMOUS EMPIRE SHUTDOWN INITIATED')

    this.isActive = false
    this.status.isActive = false

    // Shutdown all systems
    await masterAutonomousController.stop()
    selfHealingSystem.stop()

    // Calculate final stats
    if (this.startTime) {
      this.stats.uptime = Date.now() - this.startTime.getTime()
    }

    toast.info('🤖 Autonomous Empire Shutdown Complete')
    logger.info('EMPIRE', '🛑 AUTONOMOUS EMPIRE SHUTDOWN COMPLETE')
  }

  /**
   * Emergency shutdown
   */
  public async emergencyShutdown(): Promise<void> {
    logger.error('EMPIRE', '🚨 EMERGENCY SHUTDOWN ACTIVATED')
    this.emergencyMode = true

    try {
      await this.shutdownAllSystems()
      this.isActive = false
      this.status.isActive = false

      toast.error('🚨 Emergency Shutdown', {
        description: 'System encountered critical error',
        duration: 0,
      })

    } catch (error) {
      logger.error('EMPIRE', 'Emergency shutdown failed', error as Error)
    }
  }

  /**
   * Set empire operating mode
   */
  setMode(mode: EmpireStatus['mode']): void {
    if (!this.isActive) return

    this.status.mode = mode

    // Propagate to autonomous controller
    masterAutonomousController.setMode(mode as any)

    logger.info('EMPIRE', `Mode changed to: ${mode}`)
    toast.info(`🎮 Mode: ${mode.toUpperCase()}`)
  }

  /**
   * Get current empire status
   */
  getStatus(): EmpireStatus {
    const controllerState = masterAutonomousController.getState()
    this.status.isActive = controllerState.isRunning
    this.status.mode = controllerState.mode
    this.status.lastActivity = controllerState.lastActivity
    this.status.totalDecisions = controllerState.totalDecisions
    this.status.successRate = controllerState.successRate
    this.status.activeWorkflows = controllerState.activeWorkflows
    this.status.healthScore = controllerState.healthScore

    return { ...this.status }
  }

  /**
   * Get empire statistics
   */
  getStats(): EmpireStats {
    this.updateStats()
    return { ...this.stats }
  }

  /**
   * Force system health check
   */
  async forceHealthCheck(): Promise<void> {
    await selfHealingSystem.performHealthChecks()
    this.updateStatus()
  }

  /**
   * Force performance optimization
   */
  async forceOptimization(): Promise<void> {
    await performanceOptimizer.performOptimization()
    this.updateStatus()
  }

  // Private methods

  private async performPreFlightChecks(): Promise<boolean> {
    logger.info('EMPIRE', 'Performing pre-flight checks...')

    // Check API configurations
    const gdConfigured = masterConfig.getGoDaddy().apiKey && masterConfig.getGoDaddy().apiSecret
    const ncConfigured = masterConfig.getNamecheap().apiUser && masterConfig.getNamecheap().apiKey
    const sbConfigured = masterConfig.getSupabase().url && masterConfig.getSupabase().anonKey

    if (!gdConfigured || !ncConfigured || !sbConfigured) {
      logger.error('EMPIRE', `API configuration incomplete - GoDaddy: ${gdConfigured}, Namecheap: ${ncConfigured}, Supabase: ${sbConfigured}`)
      return false
    }

    // Check system health
    const healthStatus = selfHealingSystem.getHealthStatus()
    if (healthStatus.overall < 70) {
      logger.warn('EMPIRE', `System health suboptimal: ${healthStatus.overall}%`)
      // Allow launch but log warning
    }

    // Check risk assessment
    const riskAssessment = riskManagementSystem.getCurrentAssessment()
    if (riskAssessment.level === 'critical') {
      logger.error('EMPIRE', 'Critical risk level detected, cannot launch')
      return false
    }

    logger.info('EMPIRE', '✅ Pre-flight checks passed')
    return true
  }

  private async initializeAllSystems(): Promise<void> {
    logger.info('EMPIRE', 'Initializing all autonomous systems...')

    // Start in order of dependency
    selfHealingSystem.start()
    riskManagementSystem.start()
    performanceOptimizer.start()

    await masterAutonomousController.start()

    // Set up system monitoring
    this.setupSystemMonitoring()

    logger.info('EMPIRE', '✅ All systems initialized')
  }

  private async shutdownAllSystems(): Promise<void> {
    logger.info('EMPIRE', 'Shutting down all systems...')

    await masterAutonomousController.stop()
    performanceOptimizer.stop()
    riskManagementSystem.stop()
    selfHealingSystem.stop()

    logger.info('EMPIRE', '✅ All systems shutdown')
  }

  private setupSystemMonitoring(): void {
    // Monitor autonomous controller
    masterAutonomousController.onStateChange((state) => {
      this.status.activeWorkflows = state.activeWorkflows
      this.status.totalDecisions = state.totalDecisions
      this.status.lastActivity = state.lastActivity
    })

    // Monitor healing system
    selfHealingSystem.onHealingAction((action) => {
      this.stats.healingActions++
      this.updateStatus()
    })

    // Monitor risk system
    riskManagementSystem.onRiskAssessment((assessment) => {
      this.status.riskLevel = assessment.level
      this.stats.riskEvents++
      this.updateStatus()
    })

    // Monitor performance optimizer
    performanceOptimizer.onRecommendations((recommendations) => {
      // Auto-apply top recommendation if confidence > 0.8
      const topRec = recommendations[0]
      if (topRec && topRec.confidence > 0.8) {
        performanceOptimizer.applyRecommendation(topRec.id)
        this.stats.optimizationsApplied++
      }
    })
  }

  private updateStatus(): void {
    if (!this.isActive) return

    // Update health score from healing system
    const healthStatus = selfHealingSystem.getHealthStatus()
    this.status.healthScore = healthStatus.overall

    // Update performance score
    const metrics = performanceOptimizer.getCurrentMetrics()
    this.status.performanceScore = Math.min(100, Math.max(0,
      (metrics.roi / 2) + (metrics.successRate * 0.8) + (metrics.efficiency * 0.5)
    ))

    // Update uptime
    if (this.startTime) {
      this.status.uptime = Date.now() - this.startTime.getTime()
    }

    // Emergency shutdown check
    if (this.status.healthScore < 20 || this.status.riskLevel === 'critical') {
      logger.error('EMPIRE', 'Emergency shutdown triggered by system monitoring')
      this.emergencyShutdown()
    }
  }

  private updateStats(): void {
    // Aggregate stats from various systems
    const analytics = performanceOptimizer.getCurrentMetrics()
    const riskHistory = riskManagementSystem.getRiskHistory()
    const healingHistory = selfHealingSystem.getHealingHistory()

    this.stats.successRate = analytics.successRate
    this.stats.avgROI = analytics.roi
    this.stats.riskEvents = riskHistory.length
    this.stats.healingActions = healingHistory.length

    // Calculate uptime
    if (this.startTime) {
      this.stats.uptime = Date.now() - this.startTime.getTime()
    }
  }

  private mapEmpireModeToControllerMode(mode: EmpireStatus['mode']): 'conservative' | 'balanced' | 'aggressive' | 'god_mode' {
    switch (mode) {
      case 'standby': return 'conservative'
      case 'conservative': return 'conservative'
      case 'balanced': return 'balanced'
      case 'aggressive': return 'aggressive'
      case 'god_mode': return 'god_mode'
      default: return 'balanced'
    }
  }

  /**
   * Get empire status summary
   */
  getStatusSummary(): string {
    const status = this.getStatus()
    const stats = this.getStats()

    return `
🤖 AUTONOMOUS EMPIRE STATUS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Mode: ${status.mode.toUpperCase()}
Active: ${status.isActive ? '✅' : '❌'}
Health: ${status.healthScore.toFixed(1)}%
Risk: ${status.riskLevel.toUpperCase()}
Performance: ${status.performanceScore.toFixed(1)}%
Active Workflows: ${status.activeWorkflows}
Total Decisions: ${status.totalDecisions.toLocaleString()}
Uptime: ${this.formatUptime(status.uptime)}

📊 PERFORMANCE METRICS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Success Rate: ${stats.successRate.toFixed(1)}%
Average ROI: ${stats.avgROI.toFixed(1)}%
Domains Acquired: ${stats.domainsAcquired.toLocaleString()}
Domains Sold: ${stats.domainsSold.toLocaleString()}
Total Revenue: $${stats.totalRevenue.toLocaleString()}
Total Profit: $${stats.totalProfit.toLocaleString()}

🛡️ SYSTEM HEALTH
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Optimizations Applied: ${stats.optimizationsApplied}
Risk Events: ${stats.riskEvents}
Healing Actions: ${stats.healingActions}
Last Activity: ${status.lastActivity.toLocaleString()}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `.trim()
  }

  private formatUptime(ms: number): string {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`
    if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`
    return `${seconds}s`
  }
}

// Global autonomous empire instance
export const autonomousEmpire = new AutonomousEmpire()
