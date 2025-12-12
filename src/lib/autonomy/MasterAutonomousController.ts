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
import { ceoBrain } from '@/lib/intelligence/CEOBrain'
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

    // Start CEO Brain for strategic intelligence
    await ceoBrain.start()

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

    // Sync CEO Brain with our mode
    ceoBrain.setRiskProfile(
      this.state.mode === 'aggressive' || this.state.mode === 'god_mode' ? 'aggressive' :
      this.state.mode === 'conservative' ? 'conservative' : 'moderate'
    )

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
    ceoBrain.stop()
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
    
    // Sync CEO Brain risk profile with mode
    ceoBrain.setRiskProfile(
      mode === 'aggressive' || mode === 'god_mode' ? 'aggressive' :
      mode === 'conservative' ? 'conservative' : 'moderate'
    )
    
    logger.info('AUTONOMOUS', `Mode changed to: ${mode}`)
    toast.success(`🤖 Mode: ${mode.toUpperCase()}`)
  }

  /**
   * Get CEO Brain state for UI
   */
  getCEOBrainState() {
    return ceoBrain.getState()
  }

  /**
   * Evaluate acquisition through CEO Brain
   */
  async evaluateAcquisition(
    domainName: string,
    price: number,
    estimatedValue: number,
    metrics: Record<string, number>
  ) {
    return ceoBrain.evaluateAcquisition(domainName, price, estimatedValue, metrics)
  }

  /**
   * Evaluate sale offer through CEO Brain
   */
  evaluateSaleOffer(
    domainName: string,
    purchasePrice: number,
    currentValue: number,
    offerPrice: number,
    holdTime: number
  ) {
    return ceoBrain.evaluateSaleOffer(domainName, purchasePrice, currentValue, offerPrice, holdTime)
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

      // Get CEO Brain market assessment
      const marketCondition = ceoBrain.getMarketCondition()
      
      // Adjust behavior based on CEO intelligence
      if (marketCondition.phase === 'bear' && this.state.mode !== 'conservative') {
        logger.info('AUTONOMOUS', '📊 CEO Brain advises caution - market conditions unfavorable')
      } else if (marketCondition.phase === 'bull' && marketCondition.opportunity > 70) {
        logger.info('AUTONOMOUS', '🚀 CEO Brain sees strong opportunity - increasing activity')
      }

      // Simple autonomous actions
      await this.executeSimpleAutonomousActions()

      // Update success rate from CEO Brain confidence
      this.state.successRate = Math.round(
        (this.state.successRate * 0.9) + (ceoBrain.getConfidenceIndex() * 0.1)
      )

      this.state.lastActivity = now
      this.state.totalDecisions++
      this.notifyListeners()

    } catch (error: unknown) {
      logger.error('AUTONOMOUS', 'Decision cycle error', error as Error)
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
