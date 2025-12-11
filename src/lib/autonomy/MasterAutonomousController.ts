/**
 * Master Autonomous Controller
 * The Supreme Intelligence that orchestrates the entire domain trading empire
 * December 2025 - The Age of Autonomous Domain Trading
 */

import { logger } from '@/lib/utils/logger'
import { masterConfig } from '@/lib/config/MasterConfig'
import { miningEngine } from '@/lib/miners'
import { domainScanner } from '@/lib/auctions/domainScanner'
import { autonomousEngine } from '@/lib/autonomous/autonomousEngine'
import { advancedAnalytics } from '@/lib/analytics/advancedAnalytics'
import { soundEngine } from '@/lib/sounds/soundEffects'
import { toast } from 'sonner'

export interface AutonomousState {
  isRunning: boolean
  mode: 'conservative' | 'balanced' | 'aggressive' | 'god_mode'
  lastActivity: Date
  totalDecisions: number
  successRate: number
  capitalAllocated: number
  activeWorkflows: number
  healthScore: number
  nextMaintenance: Date
}

export class MasterAutonomousController {
  private isRunning = false
  private state: AutonomousState
  private decisionInterval: ReturnType<typeof setInterval> | null = null
  private listeners: ((state: AutonomousState) => void)[] = []

  constructor() {
    this.state = {
      isRunning: false,
      mode: 'balanced',
      lastActivity: new Date(),
      totalDecisions: 0,
      successRate: 85,
      capitalAllocated: 0,
      activeWorkflows: 4, // mining, scanning, autonomous, analytics
      healthScore: 100,
      nextMaintenance: new Date(Date.now() + 24 * 60 * 60 * 1000),
    }
  }

  /**
   * Start the autonomous empire
   */
  async start(): Promise<void> {
    if (this.isRunning) return

    logger.info('AUTONOMOUS', '🚀 MASTER AUTONOMOUS CONTROLLER ACTIVATING', {
      mode: this.state.mode,
      timestamp: new Date(),
    })

    // Validate API configuration
    if (!this.validateConfiguration()) {
      toast.error('❌ Autonomous Mode Failed', {
        description: 'API keys not properly configured',
      })
      return
    }

    this.isRunning = true
    this.state.isRunning = true
    this.state.lastActivity = new Date()

    // Start core autonomous engine
    autonomousEngine.start()

    // Start mining if not running
    if (!miningEngine.isActive()) {
      miningEngine.startAll()
    }

    // Start domain scanning if not running
    if (!domainScanner.isActive()) {
      domainScanner.startScanning(() => {}, 30000)
    }

    // Start decision loop
    this.startDecisionLoop()

    // Announce activation
    soundEngine.vaultOpen()
    toast.success('🤖 AUTONOMOUS EMPIRE ACTIVATED', {
      description: 'The bot is now fully self-sufficient',
      duration: 10000,
    })

    this.notifyListeners()
  }

  /**
   * Stop the autonomous empire
   */
  async stop(): Promise<void> {
    if (!this.isRunning) return

    logger.info('AUTONOMOUS', '🛑 MASTER AUTONOMOUS CONTROLLER DEACTIVATING')

    this.isRunning = false
    this.state.isRunning = false

    // Stop all loops
    if (this.decisionInterval) {
      clearInterval(this.decisionInterval)
      this.decisionInterval = null
    }

    // Stop core systems
    autonomousEngine.stop()
    miningEngine.stopAll()
    domainScanner.stopScanning()

    toast.info('🤖 Autonomous Mode Stopped')
    this.notifyListeners()
  }

  /**
   * Set operational mode
   */
  setMode(mode: AutonomousState['mode']): void {
    this.state.mode = mode
    logger.info('AUTONOMOUS', `Mode changed to: ${mode}`)
    toast.success(`🤖 Mode: ${mode.toUpperCase()}`)
  }

  /**
   * Get current state
   */
  getState(): AutonomousState {
    return { ...this.state }
  }

  /**
   * Subscribe to state changes
   */
  onStateChange(listener: (state: AutonomousState) => void): () => void {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  // Private methods

  private startDecisionLoop(): void {
    this.decisionInterval = setInterval(() => {
      if (!this.isRunning) return

      this.executeDecisionCycle()
    }, 30000) // Every 30 seconds
  }

  private async executeDecisionCycle(): Promise<void> {
    try {
      const now = new Date()

      // Simple autonomous actions
      await this.executeSimpleAutonomousActions()

      this.state.lastActivity = now
      this.state.totalDecisions++
      this.notifyListeners()

    } catch (error: any) {
      logger.error('AUTONOMOUS', 'Decision cycle error', error)
      this.state.healthScore = Math.max(0, this.state.healthScore - 5)
    }
  }

  private async executeSimpleAutonomousActions(): Promise<void> {
    // Ensure mining is running
    if (!miningEngine.isActive()) {
      miningEngine.startAll()
    }

    // Ensure scanning is running
    if (!domainScanner.isActive()) {
      domainScanner.startScanning(() => {}, 30000)
    }

    // Record basic analytics
    advancedAnalytics.record('autonomous_cycle', 1, 'system', {
      timestamp: new Date(),
      healthScore: this.state.healthScore,
    })
  }

  private validateConfiguration(): boolean {
    const gdConfig = masterConfig.getGoDaddy()
    const ncConfig = masterConfig.getNamecheap()
    const sbConfig = masterConfig.getSupabase()

    return !!(
      gdConfig.apiKey && gdConfig.apiSecret &&
      ncConfig.apiUser && ncConfig.apiKey &&
      sbConfig.url && sbConfig.anonKey
    )
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.getState()))
  }
}

export const masterAutonomousController = new MasterAutonomousController()
