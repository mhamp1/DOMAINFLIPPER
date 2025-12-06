/**
 * TotalAutonomy.ts — ZERO HUMAN INTERACTION FOREVER
 * 
 * After first launch, you NEVER touch this bot again.
 * It runs, learns, funds, compounds, and profits — forever.
 *
 * December 27, 2025 — True freedom achieved.
 */

import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import { masterConfig } from '@/lib/config/MasterConfig'
import { empireBrain } from '@/lib/empire/EmpireBrain'

// ==================== TOTAL AUTONOMY ENGINE ====================

class TotalAutonomy {
  private hasLaunched = false
  private autoFundingLoop: ReturnType<typeof setInterval> | null = null
  private autoCompoundLoop: ReturnType<typeof setInterval> | null = null
  private autoAdjustLoop: ReturnType<typeof setInterval> | null = null
  private healthCheckLoop: ReturnType<typeof setInterval> | null = null

  constructor() {
    // Auto-restart on page load if was autonomous
    if (typeof window !== 'undefined') {
      window.addEventListener('load', () => {
        setTimeout(() => this.autoRestart(), 2000)
      })
    }
  }

  // ==================== ONE-TIME LAUNCH — THEN FOREVER ====================

  async launchAndForget(): Promise<boolean> {
    if (this.hasLaunched && empireBrain.isActive()) {
      logger.info('AUTONOMY', 'Empire already running autonomously')
      return true
    }

    // 1. Validate all required configs exist
    const config = masterConfig.getAll()
    const empire = masterConfig.getEmpire()

    // Check if primary APIs are configured
    if (!masterConfig.isGoDaddyConfigured() && !masterConfig.isNamecheapConfigured()) {
      toast.error('Missing API Keys', {
        description: 'Add GoDaddy or Namecheap API keys in Config tab first',
        duration: 10000,
      })
      return false
    }

    logger.critical('AUTONOMY', '🚀 LAUNCHING TOTAL AUTONOMY MODE')

    // 2. Launch the Empire Brain
    await empireBrain.launch({ initialCapital: empire.totalCapital })

    // 3. Start all autonomous systems
    this.startAutoFunding()
    this.startAutoCompounding()
    this.startAutoAdjusting()
    this.startHealthMonitoring()

    this.hasLaunched = true

    // 4. Mark as autonomous — will auto-restart forever
    localStorage.setItem('empire_autonomous', 'true')
    localStorage.setItem('empire_autonomous_since', new Date().toISOString())

    toast.success('👑 EMPIRE FULLY AUTONOMOUS', {
      description: 'You are now permanently retired. The bot runs forever.',
      duration: 15000,
    })

    logger.critical('AUTONOMY', '✅ ALL SYSTEMS AUTONOMOUS — ZERO HUMAN INPUT REQUIRED')

    return true
  }

  // ==================== AUTO-RESTART ON PAGE LOAD ====================

  autoRestart(): void {
    const wasAutonomous = localStorage.getItem('empire_autonomous') === 'true'
    const wasRunning = localStorage.getItem('empire_running') === 'true'

    if (wasAutonomous || wasRunning) {
      logger.info('AUTONOMY', '🔄 Auto-restarting autonomous empire...')
      
      toast.info('🔄 Empire Awakening...', {
        description: 'Auto-restarting autonomous mode',
        duration: 3000,
      })

      this.launchAndForget()
    }
  }

  // ==================== AUTO-FUNDING — NEVER RUN OUT ====================

  private startAutoFunding(): void {
    // Check every hour
    this.autoFundingLoop = setInterval(() => this.checkAndFund(), 60 * 60 * 1000)
    
    // Also check immediately
    this.checkAndFund()
  }

  private async checkAndFund(): Promise<void> {
    const stats = empireBrain.getStats()
    const config = masterConfig.getEmpire()
    
    const minBalance = config.dailyBudget * 2 // Keep 2 days of budget minimum
    
    if (stats.availableCapital < minBalance) {
      logger.warn('AUTONOMY', `⚠️ Low balance: $${stats.availableCapital} < $${minBalance} minimum`)
      
      // In production, this would trigger Stripe charge
      // For now, log the intent
      toast.warning('💳 Auto-Fund Triggered', {
        description: `Balance low ($${stats.availableCapital.toFixed(0)}). Would charge card for $${minBalance}.`,
        duration: 10000,
      })

      // Note: Actual card charging would require Stripe integration
      // masterConfig.recordPurchase would be called after successful charge
      
      logger.info('AUTONOMY', `Auto-fund check: Would add $${minBalance} to maintain operations`)
    }
  }

  // ==================== AUTO-COMPOUNDING — 100% REINVEST ====================

  private startAutoCompounding(): void {
    // Compound every hour
    this.autoCompoundLoop = setInterval(() => this.compoundProfits(), 60 * 60 * 1000)
  }

  private compoundProfits(): void {
    const stats = empireBrain.getStats()
    
    if (stats.todayProfit > 0) {
      const newCapital = stats.totalCapital + stats.todayProfit
      masterConfig.setCapital(newCapital)
      
      logger.info('AUTONOMY', `📈 Auto-compounded: +$${stats.todayProfit.toFixed(0)} → Total: $${newCapital.toFixed(0)}`)
      
      // Increase daily budget proportionally
      const newBudget = Math.round(newCapital * 0.1) // 10% of capital
      masterConfig.setDailyBudget(newBudget)
    }
  }

  // ==================== AUTO-ADJUSTING — OPTIMIZE SETTINGS ====================

  private startAutoAdjusting(): void {
    // Adjust every 6 hours
    this.autoAdjustLoop = setInterval(() => this.autoAdjustSettings(), 6 * 60 * 60 * 1000)
  }

  private autoAdjustSettings(): void {
    const stats = empireBrain.getStats()
    const config = masterConfig.getEmpire()

    // Adjust ROI threshold based on performance
    if (stats.winRate > 80 && stats.avgROI > 10) {
      // Doing well — can be more aggressive
      if (config.minROI > 3) {
        masterConfig.setMinROI(config.minROI - 0.5)
        logger.info('AUTONOMY', `📉 Lowered min ROI to ${config.minROI - 0.5}x — high win rate allows more aggression`)
      }
    } else if (stats.winRate < 50) {
      // Struggling — be more selective
      if (config.minROI < 10) {
        masterConfig.setMinROI(config.minROI + 0.5)
        logger.info('AUTONOMY', `📈 Raised min ROI to ${config.minROI + 0.5}x — low win rate requires selectivity`)
      }
    }

    // Adjust daily budget based on capital
    const optimalBudget = Math.round(stats.totalCapital * 0.1)
    if (Math.abs(config.dailyBudget - optimalBudget) > 50) {
      masterConfig.setDailyBudget(optimalBudget)
      logger.info('AUTONOMY', `💰 Adjusted daily budget to $${optimalBudget} (10% of capital)`)
    }
  }

  // ==================== HEALTH MONITORING — SELF-HEALING ====================

  private startHealthMonitoring(): void {
    // Check every 5 minutes
    this.healthCheckLoop = setInterval(() => this.healthCheck(), 5 * 60 * 1000)
  }

  private healthCheck(): void {
    // Check if empire is still running
    if (!empireBrain.isActive()) {
      logger.warn('AUTONOMY', '⚠️ Empire stopped unexpectedly — auto-restarting...')
      
      toast.warning('🔧 Self-Healing', {
        description: 'Empire stopped unexpectedly. Auto-restarting...',
        duration: 5000,
      })

      empireBrain.launch()
    }

    // Log uptime
    const uptime = empireBrain.getUptime()
    const hours = Math.floor(uptime / 3600)
    const mins = Math.floor((uptime % 3600) / 60)
    
    logger.debug('AUTONOMY', `✅ Health check passed — Uptime: ${hours}h ${mins}m`)
  }

  // ==================== CONTROL ====================

  stop(): void {
    this.hasLaunched = false
    
    if (this.autoFundingLoop) clearInterval(this.autoFundingLoop)
    if (this.autoCompoundLoop) clearInterval(this.autoCompoundLoop)
    if (this.autoAdjustLoop) clearInterval(this.autoAdjustLoop)
    if (this.healthCheckLoop) clearInterval(this.healthCheckLoop)
    
    this.autoFundingLoop = null
    this.autoCompoundLoop = null
    this.autoAdjustLoop = null
    this.healthCheckLoop = null

    localStorage.removeItem('empire_autonomous')
    
    empireBrain.stop()

    toast.info('Autonomy Disabled', {
      description: 'Empire will no longer auto-restart',
    })

    logger.info('AUTONOMY', 'Autonomous mode disabled')
  }

  isAutonomous(): boolean {
    return this.hasLaunched && empireBrain.isActive()
  }

  getAutonomySince(): Date | null {
    const since = localStorage.getItem('empire_autonomous_since')
    return since ? new Date(since) : null
  }

  getStatus(): {
    isAutonomous: boolean
    uptime: number
    autoFunding: boolean
    autoCompounding: boolean
    autoAdjusting: boolean
    healthMonitoring: boolean
  } {
    return {
      isAutonomous: this.isAutonomous(),
      uptime: empireBrain.getUptime(),
      autoFunding: !!this.autoFundingLoop,
      autoCompounding: !!this.autoCompoundLoop,
      autoAdjusting: !!this.autoAdjustLoop,
      healthMonitoring: !!this.healthCheckLoop,
    }
  }
}

// ==================== SINGLETON — THE EMPIRE NEVER DIES ====================

export const totalAutonomy = new TotalAutonomy()

