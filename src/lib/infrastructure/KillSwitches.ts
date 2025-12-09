/**
 * KillSwitches.ts — EMERGENCY CONTROL SYSTEM
 * Global and granular kill switches for safe operation
 * December 2025 — One click to pause everything
 */

import { logger } from '@/lib/utils/logger'
import { toast } from 'sonner'

// ==================== TYPES ====================

export type KillSwitchType = 
  | 'global'           // PAUSE EVERYTHING
  | 'acquisitions'     // Stop all buying
  | 'listings'         // Stop all listing
  | 'negotiations'     // Stop auto-negotiation
  | 'transfers'        // Stop transfers
  | 'registrar_godaddy'
  | 'registrar_namecheap'
  | 'registrar_dropcatch'
  | 'marketplace_sedo'
  | 'marketplace_afternic'
  | 'marketplace_flippa'
  | 'marketplace_dan'
  | 'marketplace_godaddy'
  | 'strategy_crypto'
  | 'strategy_ai'
  | 'strategy_trending'
  | 'strategy_premium'
  | 'high_value'       // Domains > $1000

export interface KillSwitchState {
  type: KillSwitchType
  enabled: boolean
  triggeredAt?: Date
  triggeredBy?: string
  reason?: string
  autoResetAt?: Date
  cooldownMinutes?: number
}

export interface KillSwitchConfig {
  requireConfirmation: boolean
  notifyOnTrigger: boolean
  autoLogout: boolean
  cooldownMinutes: number
}

// ==================== KILL SWITCH SERVICE ====================

class KillSwitchService {
  private switches: Map<KillSwitchType, KillSwitchState> = new Map()
  private listeners: Array<(switches: Map<KillSwitchType, KillSwitchState>) => void> = []
  private config: KillSwitchConfig = {
    requireConfirmation: true,
    notifyOnTrigger: true,
    autoLogout: false,
    cooldownMinutes: 5,
  }

  constructor() {
    // Initialize all switches as disabled (system running)
    const allSwitches: KillSwitchType[] = [
      'global', 'acquisitions', 'listings', 'negotiations', 'transfers',
      'registrar_godaddy', 'registrar_namecheap', 'registrar_dropcatch',
      'marketplace_sedo', 'marketplace_afternic', 'marketplace_flippa', 
      'marketplace_dan', 'marketplace_godaddy',
      'strategy_crypto', 'strategy_ai', 'strategy_trending', 'strategy_premium',
      'high_value'
    ]

    allSwitches.forEach(type => {
      this.switches.set(type, { type, enabled: false })
    })

    // Load persisted state
    this.loadState()

    // Check for expired auto-resets
    this.checkAutoResets()
    setInterval(() => this.checkAutoResets(), 60000) // Every minute
  }

  // ==================== KILL SWITCH OPERATIONS ====================

  /**
   * EMERGENCY STOP — Triggers global kill switch
   */
  emergencyStop(reason?: string, triggeredBy?: string): void {
    this.trigger('global', reason || 'EMERGENCY STOP ACTIVATED', triggeredBy)
    
    toast.error('🚨 EMERGENCY STOP', {
      description: 'All autonomous operations have been halted',
      duration: 10000,
    })

    logger.critical('KILLSWITCH', '🚨 EMERGENCY STOP ACTIVATED', undefined, { reason, triggeredBy })
  }

  /**
   * Trigger a specific kill switch
   */
  trigger(
    type: KillSwitchType, 
    reason?: string, 
    triggeredBy?: string,
    autoResetMinutes?: number
  ): void {
    const state: KillSwitchState = {
      type,
      enabled: true,
      triggeredAt: new Date(),
      triggeredBy: triggeredBy || 'system',
      reason,
      cooldownMinutes: this.config.cooldownMinutes,
    }

    if (autoResetMinutes) {
      state.autoResetAt = new Date(Date.now() + autoResetMinutes * 60 * 1000)
    }

    this.switches.set(type, state)
    this.saveState()
    this.notifyListeners()

    logger.warn('KILLSWITCH', `Kill switch triggered: ${type}`, { reason, triggeredBy })

    if (this.config.notifyOnTrigger) {
      toast.warning(`⚠️ ${type.toUpperCase()} PAUSED`, {
        description: reason || 'Kill switch activated',
      })
    }
  }

  /**
   * Reset (disable) a kill switch
   */
  reset(type: KillSwitchType, resetBy?: string): boolean {
    const state = this.switches.get(type)
    if (!state || !state.enabled) return false

    // Check cooldown
    if (state.triggeredAt && state.cooldownMinutes) {
      const cooldownEnd = new Date(state.triggeredAt.getTime() + state.cooldownMinutes * 60 * 1000)
      if (new Date() < cooldownEnd) {
        const remainingMinutes = Math.ceil((cooldownEnd.getTime() - Date.now()) / 60000)
        toast.warning('Cooldown Active', {
          description: `Wait ${remainingMinutes} minute(s) before resetting`,
        })
        return false
      }
    }

    this.switches.set(type, { type, enabled: false })
    this.saveState()
    this.notifyListeners()

    logger.info('KILLSWITCH', `Kill switch reset: ${type}`, { resetBy })
    toast.success(`✅ ${type.toUpperCase()} RESUMED`)

    return true
  }

  /**
   * Reset all kill switches
   */
  resetAll(force: boolean = false): void {
    if (!force && this.config.requireConfirmation) {
      logger.warn('KILLSWITCH', 'Reset all requires confirmation or force flag')
      return
    }

    for (const type of this.switches.keys()) {
      this.switches.set(type, { type, enabled: false })
    }

    this.saveState()
    this.notifyListeners()

    logger.info('KILLSWITCH', 'All kill switches reset')
    toast.success('✅ All Systems Resumed')
  }

  // ==================== STATUS CHECKS ====================

  /**
   * Check if a specific operation is allowed
   */
  isAllowed(type: KillSwitchType): boolean {
    // Global switch overrides everything
    const globalSwitch = this.switches.get('global')
    if (globalSwitch?.enabled) return false

    // Check specific switch
    const specificSwitch = this.switches.get(type)
    return !specificSwitch?.enabled
  }

  /**
   * Check if acquisitions are allowed
   */
  canAcquire(): boolean {
    return this.isAllowed('global') && this.isAllowed('acquisitions')
  }

  /**
   * Check if listings are allowed
   */
  canList(): boolean {
    return this.isAllowed('global') && this.isAllowed('listings')
  }

  /**
   * Check if negotiations are allowed
   */
  canNegotiate(): boolean {
    return this.isAllowed('global') && this.isAllowed('negotiations')
  }

  /**
   * Check if a specific registrar is allowed
   */
  isRegistrarAllowed(registrar: string): boolean {
    if (!this.isAllowed('global') || !this.isAllowed('acquisitions')) return false
    
    const registrarSwitch = `registrar_${registrar.toLowerCase()}` as KillSwitchType
    return this.isAllowed(registrarSwitch)
  }

  /**
   * Check if a specific marketplace is allowed
   */
  isMarketplaceAllowed(marketplace: string): boolean {
    if (!this.isAllowed('global') || !this.isAllowed('listings')) return false
    
    const marketplaceSwitch = `marketplace_${marketplace.toLowerCase()}` as KillSwitchType
    return this.isAllowed(marketplaceSwitch)
  }

  /**
   * Check if a strategy is allowed
   */
  isStrategyAllowed(strategy: string): boolean {
    if (!this.isAllowed('global')) return false
    
    const strategySwitch = `strategy_${strategy.toLowerCase()}` as KillSwitchType
    return this.isAllowed(strategySwitch)
  }

  /**
   * Check if high-value operations are allowed
   */
  canProcessHighValue(): boolean {
    return this.isAllowed('global') && this.isAllowed('high_value')
  }

  // ==================== STATE MANAGEMENT ====================

  /**
   * Get all switch states
   */
  getAllStates(): Map<KillSwitchType, KillSwitchState> {
    return new Map(this.switches)
  }

  /**
   * Get active (triggered) switches
   */
  getActiveSwitches(): KillSwitchState[] {
    return Array.from(this.switches.values()).filter(s => s.enabled)
  }

  /**
   * Check if system is fully operational
   */
  isFullyOperational(): boolean {
    return this.getActiveSwitches().length === 0
  }

  // ==================== AUTO RESET ====================

  private checkAutoResets(): void {
    const now = new Date()
    
    for (const [type, state] of this.switches) {
      if (state.enabled && state.autoResetAt && now >= state.autoResetAt) {
        this.switches.set(type, { type, enabled: false })
        logger.info('KILLSWITCH', `Auto-reset: ${type}`)
      }
    }

    this.saveState()
    this.notifyListeners()
  }

  // ==================== SUBSCRIPTIONS ====================

  subscribe(listener: (switches: Map<KillSwitchType, KillSwitchState>) => void): () => void {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(l => l(this.getAllStates()))
  }

  // ==================== PERSISTENCE ====================

  private saveState(): void {
    try {
      const state = Object.fromEntries(
        Array.from(this.switches.entries()).map(([type, s]) => [
          type,
          {
            ...s,
            triggeredAt: s.triggeredAt?.toISOString(),
            autoResetAt: s.autoResetAt?.toISOString(),
          }
        ])
      )
      localStorage.setItem('domainFlipper_killSwitches', JSON.stringify(state))
    } catch (e) {
      // Ignore
    }
  }

  private loadState(): void {
    try {
      const saved = localStorage.getItem('domainFlipper_killSwitches')
      if (saved) {
        const state = JSON.parse(saved)
        for (const [type, s] of Object.entries(state) as [KillSwitchType, any][]) {
          this.switches.set(type, {
            ...s,
            triggeredAt: s.triggeredAt ? new Date(s.triggeredAt) : undefined,
            autoResetAt: s.autoResetAt ? new Date(s.autoResetAt) : undefined,
          })
        }
      }
    } catch (e) {
      // Ignore
    }
  }

  // ==================== CONFIG ====================

  setConfig(config: Partial<KillSwitchConfig>): void {
    this.config = { ...this.config, ...config }
  }

  getConfig(): KillSwitchConfig {
    return { ...this.config }
  }
}

// ==================== SINGLETON ====================

export const killSwitches = new KillSwitchService()
