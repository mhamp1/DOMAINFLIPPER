/**
 * EmpireSettings.ts — Persistent Empire Configuration
 * STANDALONE VERSION - No MasterConfig dependency to avoid circular imports
 * December 2025
 * 
 * BUILD: 2025-12-19-v2.0.5-FORCE-REBUILD
 * CRITICAL: This file uses ONLY localStorage - NO require() statements
 */

import { toast } from 'sonner'

// NO MASTERCONFIG IMPORT - Breaks circular dependency
// This file now works independently using localStorage only

export interface EmpireSettingsData {
  // Capital & Budget
  totalCapital: number
  dailyBudget: number
  minBalanceTrigger: number
  autoFundAmount: number
  
  // ROI & Targets
  minROI: number
  targetROI: number
  maxBidPercent: number
  
  // Risk Settings
  dailyLossLimit: number
  maxPositionSize: number
  circuitBreakerThreshold: number
  
  // Strategy Settings
  enabledStrategies: string[]
  allStrategiesActive: boolean
  
  // Bot State
  botRunning: boolean
  lastStartTime: string | null
  
  // Stats (persisted)
  totalProfit: number
  totalSpent: number
  domainsAcquired: number
  domainsSold: number
  
  // Momentum & Filter Settings
  momentumThreshold: number
  persistenceThreshold: number
  enableProfanityFilter: boolean
  enableTMFilter: boolean
  enableScamFilter: boolean
  
  // Pricing Policy Settings
  liquidationDiscount: number
  floorDiscount: number
  autoRepriceEnabled: boolean
  
  // Anomaly Alert Thresholds
  spendSpikePercent: number
  spendSpikeWindow: number
  providerErrorThreshold: number
  providerErrorWindow: number
  listingMismatchThreshold: number
  budgetOverrunPercent: number
}

const DEFAULT_SETTINGS: EmpireSettingsData = {
  totalCapital: 500,
  dailyBudget: 100, // Increased to allow meaningful operations
  minBalanceTrigger: 100,
  autoFundAmount: 500,
  minROI: 5,
  targetROI: 10,
  maxBidPercent: 30,
  dailyLossLimit: 8,
  maxPositionSize: 5,
  circuitBreakerThreshold: 25,
  enabledStrategies: ['all'],
  allStrategiesActive: true,
  botRunning: false,
  lastStartTime: null,
  totalProfit: 0,
  totalSpent: 0,
  domainsAcquired: 0,
  domainsSold: 0,
  // Momentum & Filter Settings
  momentumThreshold: 50,
  persistenceThreshold: 3,
  enableProfanityFilter: true,
  enableTMFilter: true,
  enableScamFilter: true,
  // Pricing Policy Settings
  liquidationDiscount: 0.75,
  floorDiscount: 0.55,
  autoRepriceEnabled: true,
  // Anomaly Alert Thresholds
  spendSpikePercent: 200,
  spendSpikeWindow: 1,
  providerErrorThreshold: 5,
  providerErrorWindow: 15,
  listingMismatchThreshold: 3,
  budgetOverrunPercent: 110,
}

const STORAGE_KEY = 'domainFlipper_empireSettings'

class EmpireSettings {
  private settings: EmpireSettingsData
  private listeners: Array<(settings: EmpireSettingsData) => void> = []

  constructor() {
    this.settings = this.loadSettings()
  }

  private loadSettings(): EmpireSettingsData {
    try {
      // Load from localStorage only - no circular dependency issues
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        return { ...DEFAULT_SETTINGS, ...parsed }
      }
    } catch (e) {
      console.error('Failed to load empire settings:', e)
    }
    return { ...DEFAULT_SETTINGS }
  }

  private saveSettings(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings))
      this.notifyListeners()
    } catch (e) {
      console.error('Failed to save empire settings:', e)
    }
  }

  // ==================== GETTERS ====================

  get<K extends keyof EmpireSettingsData>(key: K): EmpireSettingsData[K] {
    return this.settings[key]
  }

  getAll(): EmpireSettingsData {
    return { ...this.settings }
  }

  // ==================== SETTERS ====================

  set<K extends keyof EmpireSettingsData>(key: K, value: EmpireSettingsData[K]): void {
    this.settings[key] = value
    this.saveSettings()
  }

  setCapital(amount: number): void {
    if (amount < 0) return
    this.settings.totalCapital = amount
    this.settings.dailyBudget = Math.round(amount * 0.1) // 10% of capital
    this.saveSettings()
    toast.success('Capital Updated', { 
      description: `Capital: $${amount.toLocaleString()} | Daily Budget: $${this.settings.dailyBudget.toLocaleString()}`
    })
  }

  setMinROI(roi: number): void {
    if (roi < 1 || roi > 100) return
    this.settings.minROI = roi
    this.saveSettings()
    toast.success('Min ROI Updated', { description: `Only acquiring ${roi}x+ returns` })
  }

  setTargetROI(roi: number): void {
    if (roi < 1 || roi > 100) return
    this.settings.targetROI = roi
    this.saveSettings()
  }

  setBotRunning(running: boolean): void {
    this.settings.botRunning = running
    if (running) {
      this.settings.lastStartTime = new Date().toISOString()
    }
    this.saveSettings()
  }

  // ==================== STATS TRACKING ====================

  recordPurchase(amount: number): void {
    this.settings.totalSpent += amount
    this.settings.domainsAcquired++
    this.saveSettings()
  }

  recordSale(salePrice: number, purchasePrice: number): void {
    const profit = salePrice - purchasePrice
    this.settings.totalProfit += profit
    this.settings.domainsSold++
    this.saveSettings()
  }

  // ==================== STRATEGIES ====================

  enableAllStrategies(): void {
    this.settings.allStrategiesActive = true
    this.settings.enabledStrategies = ['all']
    this.saveSettings()
    toast.success('All Strategies Enabled', { description: 'All strategies now running simultaneously' })
  }

  setEnabledStrategies(strategies: string[]): void {
    this.settings.enabledStrategies = strategies
    this.settings.allStrategiesActive = strategies.includes('all') || strategies.length === 0
    this.saveSettings()
  }

  isStrategyEnabled(strategyId: string): boolean {
    return this.settings.allStrategiesActive || this.settings.enabledStrategies.includes(strategyId)
  }

  // ==================== CALCULATED VALUES ====================

  getAvailableCapital(): number {
    return this.settings.totalCapital - this.settings.totalSpent + this.settings.totalProfit
  }

  getROI(): number {
    if (this.settings.totalSpent === 0) return 0
    return ((this.settings.totalProfit / this.settings.totalSpent) * 100)
  }

  getWinRate(): number {
    const total = this.settings.domainsAcquired
    if (total === 0) return 0
    return (this.settings.domainsSold / total) * 100
  }

  // ==================== SUBSCRIPTIONS ====================

  subscribe(listener: (settings: EmpireSettingsData) => void): () => void {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(l => l({ ...this.settings }))
  }

  // ==================== RESET ====================

  reset(): void {
    this.settings = { ...DEFAULT_SETTINGS }
    this.saveSettings()
    toast.info('Settings Reset', { description: 'All settings restored to defaults' })
  }

  // ==================== BOT PERSISTENCE ====================

  wasBotRunning(): boolean {
    return this.settings.botRunning
  }

  getLastStartTime(): Date | null {
    return this.settings.lastStartTime ? new Date(this.settings.lastStartTime) : null
  }
}

export const empireSettings = new EmpireSettings()

