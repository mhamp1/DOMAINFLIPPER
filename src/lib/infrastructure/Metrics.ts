/**
 * Metrics.ts — OBSERVABILITY & KPI TRACKING
 * Core metrics, dashboards, and alerting for the empire
 * December 2025 — What gets measured gets managed
 */

import { logger } from '@/lib/utils/logger'
import { toast } from 'sonner'

// ==================== TYPES ====================

export interface MetricValue {
  value: number
  timestamp: Date
  labels?: Record<string, string>
}

export interface MetricDefinition {
  name: string
  type: 'counter' | 'gauge' | 'histogram' | 'summary'
  description: string
  unit?: string
  labels?: string[]
}

export interface AlertRule {
  id: string
  name: string
  metric: string
  condition: 'above' | 'below' | 'equals' | 'anomaly'
  threshold: number
  windowMinutes: number
  severity: 'info' | 'warning' | 'critical'
  enabled: boolean
  cooldownMinutes: number
  lastTriggered?: Date
  action?: 'notify' | 'kill_switch' | 'email'
}

export interface Alert {
  id: string
  ruleId: string
  ruleName: string
  metric: string
  value: number
  threshold: number
  severity: 'info' | 'warning' | 'critical'
  triggeredAt: Date
  acknowledged: boolean
  resolvedAt?: Date
  message: string
}

export interface KPIs {
  // Acquisition metrics
  scanRate: number           // Domains scanned per hour
  hitRate: number            // % of scanned domains that pass filters
  acquisitionRate: number    // Domains acquired per day
  avgAcquisitionCost: number
  
  // Performance metrics
  winRate: number            // % of bids won
  snipeSuccessRate: number   // % of snipes successful
  avgTimeToSale: number      // Days from buy to sell
  
  // Financial metrics
  totalROI: number           // Overall ROI %
  avgFlipROI: number         // Average ROI per flip
  profitPerDomain: number    // Average profit per domain
  totalProfit: number
  totalRevenue: number
  totalSpent: number
  
  // Valuation metrics
  valuationAccuracy: number  // MAE of predictions
  valuationBias: number      // Systematic over/under prediction
  
  // Operational metrics
  apiSuccessRate: number     // % of API calls successful
  avgApiLatency: number      // Average API response time
  queueDepth: number         // Jobs waiting in queue
  activeNegotiations: number
  
  // Risk metrics
  portfolioExposure: number  // % of capital at risk
  maxDrawdown: number        // Largest peak-to-trough decline
  sharpeRatio: number        // Risk-adjusted returns
}

// ==================== METRICS SERVICE ====================

class MetricsService {
  private metrics: Map<string, MetricValue[]> = new Map()
  private definitions: Map<string, MetricDefinition> = new Map()
  private alertRules: Map<string, AlertRule> = new Map()
  private activeAlerts: Map<string, Alert> = new Map()
  private alertHistory: Alert[] = []
  private listeners: Array<(kpis: KPIs) => void> = []
  private alertListeners: Array<(alert: Alert) => void> = []
  private checkInterval: ReturnType<typeof setInterval> | null = null

  private readonly MAX_HISTORY = 10000
  private readonly MAX_ALERT_HISTORY = 500

  constructor() {
    this.initializeMetrics()
    this.initializeDefaultAlerts()
    this.loadState()

    // Start periodic alert checks
    this.checkInterval = setInterval(() => this.checkAlerts(), 60000) // Every minute
  }

  // ==================== METRIC RECORDING ====================

  /**
   * Increment a counter metric
   */
  increment(name: string, value: number = 1, labels?: Record<string, string>): void {
    this.record(name, value, labels, 'add')
  }

  /**
   * Set a gauge metric
   */
  gauge(name: string, value: number, labels?: Record<string, string>): void {
    this.record(name, value, labels, 'set')
  }

  /**
   * Record a histogram value (e.g., latency)
   */
  histogram(name: string, value: number, labels?: Record<string, string>): void {
    this.record(name, value, labels, 'append')
  }

  /**
   * Record timing (auto-converted to ms)
   */
  timing(name: string, startTime: number, labels?: Record<string, string>): void {
    const duration = Date.now() - startTime
    this.histogram(name, duration, labels)
  }

  private record(
    name: string,
    value: number,
    labels?: Record<string, string>,
    mode: 'set' | 'add' | 'append' = 'append'
  ): void {
    const key = this.getKey(name, labels)
    const existing = this.metrics.get(key) || []

    const entry: MetricValue = {
      value,
      timestamp: new Date(),
      labels,
    }

    if (mode === 'set') {
      // Replace all values
      this.metrics.set(key, [entry])
    } else if (mode === 'add') {
      // Add to last value
      const lastValue = existing[existing.length - 1]?.value || 0
      entry.value = lastValue + value
      existing.push(entry)
      this.metrics.set(key, existing.slice(-this.MAX_HISTORY))
    } else {
      // Append
      existing.push(entry)
      this.metrics.set(key, existing.slice(-this.MAX_HISTORY))
    }
  }

  // ==================== METRIC QUERIES ====================

  /**
   * Get current value of a metric
   */
  getValue(name: string, labels?: Record<string, string>): number | undefined {
    const key = this.getKey(name, labels)
    const values = this.metrics.get(key)
    return values?.[values.length - 1]?.value
  }

  /**
   * Get metric history
   */
  getHistory(
    name: string,
    options?: {
      labels?: Record<string, string>
      since?: Date
      limit?: number
    }
  ): MetricValue[] {
    const key = this.getKey(name, options?.labels)
    let values = this.metrics.get(key) || []

    if (options?.since) {
      values = values.filter(v => v.timestamp >= options.since!)
    }

    if (options?.limit) {
      values = values.slice(-options.limit)
    }

    return values
  }

  /**
   * Get average value over a time window
   */
  getAverage(name: string, windowMinutes: number, labels?: Record<string, string>): number {
    const since = new Date(Date.now() - windowMinutes * 60 * 1000)
    const values = this.getHistory(name, { labels, since })
    
    if (values.length === 0) return 0
    return values.reduce((sum, v) => sum + v.value, 0) / values.length
  }

  /**
   * Get rate (change per minute)
   */
  getRate(name: string, windowMinutes: number = 5, labels?: Record<string, string>): number {
    const since = new Date(Date.now() - windowMinutes * 60 * 1000)
    const values = this.getHistory(name, { labels, since })
    
    if (values.length < 2) return 0
    
    const first = values[0]
    const last = values[values.length - 1]
    const timeDiff = (last.timestamp.getTime() - first.timestamp.getTime()) / 60000
    
    return timeDiff > 0 ? (last.value - first.value) / timeDiff : 0
  }

  /**
   * Get percentile (for histograms)
   */
  getPercentile(name: string, percentile: number, windowMinutes?: number, labels?: Record<string, string>): number {
    const since = windowMinutes ? new Date(Date.now() - windowMinutes * 60 * 1000) : undefined
    const values = this.getHistory(name, { labels, since })
      .map(v => v.value)
      .sort((a, b) => a - b)
    
    if (values.length === 0) return 0
    
    const index = Math.ceil((percentile / 100) * values.length) - 1
    return values[Math.max(0, index)]
  }

  // ==================== KPI CALCULATION ====================

  /**
   * Calculate all KPIs
   */
  calculateKPIs(): KPIs {
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000)
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

    return {
      // Acquisition
      scanRate: this.getRate('domains_scanned', 60),
      hitRate: this.calculateRatio('domains_filtered', 'domains_scanned', 60),
      acquisitionRate: this.getHistory('domains_acquired', { since: dayAgo }).length,
      avgAcquisitionCost: this.getAverage('acquisition_cost', 24 * 60),

      // Performance
      winRate: this.calculateRatio('bids_won', 'bids_placed', 24 * 60) * 100,
      snipeSuccessRate: this.calculateRatio('snipes_successful', 'snipes_attempted', 24 * 60) * 100,
      avgTimeToSale: this.getAverage('time_to_sale_days', 30 * 24 * 60),

      // Financial
      totalROI: this.calculateROI(),
      avgFlipROI: this.getAverage('flip_roi', 30 * 24 * 60),
      profitPerDomain: this.getAverage('profit_per_domain', 30 * 24 * 60),
      totalProfit: this.getValue('total_profit') || 0,
      totalRevenue: this.getValue('total_revenue') || 0,
      totalSpent: this.getValue('total_spent') || 0,

      // Valuation
      valuationAccuracy: 100 - (this.getAverage('valuation_mae', 7 * 24 * 60) || 20),
      valuationBias: this.getAverage('valuation_bias', 7 * 24 * 60),

      // Operational
      apiSuccessRate: this.calculateRatio('api_success', 'api_calls', 60) * 100,
      avgApiLatency: this.getAverage('api_latency_ms', 60),
      queueDepth: this.getValue('queue_depth') || 0,
      activeNegotiations: this.getValue('active_negotiations') || 0,

      // Risk
      portfolioExposure: this.getValue('portfolio_exposure') || 0,
      maxDrawdown: this.getValue('max_drawdown') || 0,
      sharpeRatio: this.calculateSharpeRatio(),
    }
  }

  private calculateRatio(numerator: string, denominator: string, windowMinutes: number): number {
    const numHistory = this.getHistory(numerator, { since: new Date(Date.now() - windowMinutes * 60 * 1000) })
    const denomHistory = this.getHistory(denominator, { since: new Date(Date.now() - windowMinutes * 60 * 1000) })
    
    const numSum = numHistory.reduce((sum, v) => sum + v.value, 0)
    const denomSum = denomHistory.reduce((sum, v) => sum + v.value, 0)
    
    return denomSum > 0 ? numSum / denomSum : 0
  }

  private calculateROI(): number {
    const revenue = this.getValue('total_revenue') || 0
    const spent = this.getValue('total_spent') || 1
    return ((revenue - spent) / spent) * 100
  }

  private calculateSharpeRatio(): number {
    const returns = this.getHistory('daily_return', { limit: 30 }).map(v => v.value)
    if (returns.length < 2) return 0

    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
    const stdDev = Math.sqrt(variance)

    const riskFreeRate = 0.04 / 365 // Daily risk-free rate
    return stdDev > 0 ? (avgReturn - riskFreeRate) / stdDev : 0
  }

  // ==================== ALERTING ====================

  /**
   * Add an alert rule
   */
  addAlert(rule: Omit<AlertRule, 'id'>): AlertRule {
    const alertRule: AlertRule = {
      ...rule,
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    }
    this.alertRules.set(alertRule.id, alertRule)
    this.saveState()
    return alertRule
  }

  /**
   * Check all alert rules
   */
  private checkAlerts(): void {
    for (const [id, rule] of this.alertRules) {
      if (!rule.enabled) continue

      // Check cooldown
      if (rule.lastTriggered) {
        const cooldownEnd = new Date(rule.lastTriggered.getTime() + rule.cooldownMinutes * 60 * 1000)
        if (new Date() < cooldownEnd) continue
      }

      const value = this.getAverage(rule.metric, rule.windowMinutes)
      let triggered = false

      switch (rule.condition) {
        case 'above':
          triggered = value > rule.threshold
          break
        case 'below':
          triggered = value < rule.threshold
          break
        case 'equals':
          triggered = Math.abs(value - rule.threshold) < 0.01
          break
        case 'anomaly':
          triggered = this.detectAnomaly(rule.metric, rule.windowMinutes, rule.threshold)
          break
      }

      if (triggered) {
        this.triggerAlert(rule, value)
      } else {
        // Resolve if previously active
        this.resolveAlert(rule.id)
      }
    }
  }

  private triggerAlert(rule: AlertRule, value: number): void {
    rule.lastTriggered = new Date()

    const alert: Alert = {
      id: `alert_${Date.now()}`,
      ruleId: rule.id,
      ruleName: rule.name,
      metric: rule.metric,
      value,
      threshold: rule.threshold,
      severity: rule.severity,
      triggeredAt: new Date(),
      acknowledged: false,
      message: `${rule.name}: ${rule.metric} is ${value.toFixed(2)} (threshold: ${rule.threshold})`,
    }

    this.activeAlerts.set(rule.id, alert)
    this.alertHistory.push(alert)

    // Trim history
    if (this.alertHistory.length > this.MAX_ALERT_HISTORY) {
      this.alertHistory = this.alertHistory.slice(-this.MAX_ALERT_HISTORY)
    }

    // Notify
    this.notifyAlertListeners(alert)

    logger.warn('ALERT', alert.message, { severity: rule.severity, value, threshold: rule.threshold })

    if (rule.severity === 'critical') {
      toast.error(`🚨 ${rule.name}`, { description: alert.message, duration: 10000 })
    } else if (rule.severity === 'warning') {
      toast.warning(`⚠️ ${rule.name}`, { description: alert.message })
    }

    this.saveState()
  }

  private resolveAlert(ruleId: string): void {
    const alert = this.activeAlerts.get(ruleId)
    if (alert && !alert.resolvedAt) {
      alert.resolvedAt = new Date()
      this.activeAlerts.delete(ruleId)
      logger.info('ALERT', `Resolved: ${alert.ruleName}`)
    }
  }

  private detectAnomaly(metric: string, windowMinutes: number, stdDevMultiplier: number): boolean {
    const history = this.getHistory(metric, { 
      since: new Date(Date.now() - windowMinutes * 60 * 1000) 
    })
    
    if (history.length < 10) return false

    const values = history.map(v => v.value)
    const avg = values.reduce((a, b) => a + b, 0) / values.length
    const variance = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length
    const stdDev = Math.sqrt(variance)

    const current = values[values.length - 1]
    return Math.abs(current - avg) > stdDev * stdDevMultiplier
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string): void {
    for (const alert of this.activeAlerts.values()) {
      if (alert.id === alertId) {
        alert.acknowledged = true
        this.saveState()
        return
      }
    }
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values())
  }

  /**
   * Get alert history
   */
  getAlertHistory(limit?: number): Alert[] {
    const history = [...this.alertHistory].reverse()
    return limit ? history.slice(0, limit) : history
  }

  // ==================== INITIALIZATION ====================

  private initializeMetrics(): void {
    const defs: MetricDefinition[] = [
      { name: 'domains_scanned', type: 'counter', description: 'Total domains scanned' },
      { name: 'domains_filtered', type: 'counter', description: 'Domains passing filters' },
      { name: 'domains_acquired', type: 'counter', description: 'Domains acquired' },
      { name: 'domains_sold', type: 'counter', description: 'Domains sold' },
      { name: 'bids_placed', type: 'counter', description: 'Total bids placed' },
      { name: 'bids_won', type: 'counter', description: 'Bids won' },
      { name: 'snipes_attempted', type: 'counter', description: 'Snipe attempts' },
      { name: 'snipes_successful', type: 'counter', description: 'Successful snipes' },
      { name: 'api_calls', type: 'counter', description: 'Total API calls' },
      { name: 'api_success', type: 'counter', description: 'Successful API calls' },
      { name: 'api_latency_ms', type: 'histogram', description: 'API latency', unit: 'ms' },
      { name: 'acquisition_cost', type: 'histogram', description: 'Cost per acquisition', unit: 'USD' },
      { name: 'flip_roi', type: 'histogram', description: 'ROI per flip', unit: '%' },
      { name: 'profit_per_domain', type: 'histogram', description: 'Profit per domain', unit: 'USD' },
      { name: 'time_to_sale_days', type: 'histogram', description: 'Days to sell', unit: 'days' },
      { name: 'valuation_mae', type: 'gauge', description: 'Valuation MAE', unit: '%' },
      { name: 'valuation_bias', type: 'gauge', description: 'Valuation bias', unit: '%' },
      { name: 'total_profit', type: 'gauge', description: 'Total profit', unit: 'USD' },
      { name: 'total_revenue', type: 'gauge', description: 'Total revenue', unit: 'USD' },
      { name: 'total_spent', type: 'gauge', description: 'Total spent', unit: 'USD' },
      { name: 'queue_depth', type: 'gauge', description: 'Jobs in queue' },
      { name: 'active_negotiations', type: 'gauge', description: 'Active negotiations' },
      { name: 'portfolio_exposure', type: 'gauge', description: 'Portfolio exposure', unit: '%' },
      { name: 'max_drawdown', type: 'gauge', description: 'Maximum drawdown', unit: '%' },
      { name: 'daily_return', type: 'histogram', description: 'Daily return', unit: '%' },
    ]

    defs.forEach(def => this.definitions.set(def.name, def))
  }

  private initializeDefaultAlerts(): void {
    const defaults: Omit<AlertRule, 'id'>[] = [
      {
        name: 'High API Error Rate',
        metric: 'api_success',
        condition: 'below',
        threshold: 0, // Disabled - CORS failures are expected in browser environment
        windowMinutes: 5,
        severity: 'warning',
        enabled: false, // DISABLED - Browser CORS limitations make this alert misleading
        cooldownMinutes: 15,
      },
      {
        name: 'Queue Backlog',
        metric: 'queue_depth',
        condition: 'above',
        threshold: 100,
        windowMinutes: 5,
        severity: 'warning',
        enabled: true,
        cooldownMinutes: 10,
      },
      {
        name: 'Spend Anomaly',
        metric: 'acquisition_cost',
        condition: 'anomaly',
        threshold: 3, // 3 std devs
        windowMinutes: 60,
        severity: 'critical',
        enabled: true,
        cooldownMinutes: 30,
        action: 'kill_switch',
      },
      {
        name: 'Low Win Rate',
        metric: 'bids_won',
        condition: 'below',
        threshold: 10,
        windowMinutes: 60,
        severity: 'info',
        enabled: true,
        cooldownMinutes: 60,
      },
      {
        name: 'API Latency Spike',
        metric: 'api_latency_ms',
        condition: 'above',
        threshold: 5000,
        windowMinutes: 5,
        severity: 'warning',
        enabled: true,
        cooldownMinutes: 10,
      },
    ]

    // Only add if not already loaded
    if (this.alertRules.size === 0) {
      defaults.forEach(rule => this.addAlert(rule))
    }
  }

  // ==================== SUBSCRIPTIONS ====================

  subscribe(listener: (kpis: KPIs) => void): () => void {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  subscribeAlerts(listener: (alert: Alert) => void): () => void {
    this.alertListeners.push(listener)
    return () => {
      this.alertListeners = this.alertListeners.filter(l => l !== listener)
    }
  }

  private notifyAlertListeners(alert: Alert): void {
    this.alertListeners.forEach(l => l(alert))
  }

  // ==================== HELPERS ====================

  private getKey(name: string, labels?: Record<string, string>): string {
    if (!labels || Object.keys(labels).length === 0) return name
    const labelStr = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join(',')
    return `${name}{${labelStr}}`
  }

  // ==================== PERSISTENCE ====================

  private saveState(): void {
    try {
      const state = {
        metrics: Object.fromEntries(
          Array.from(this.metrics.entries()).map(([k, values]) => [
            k,
            values.slice(-100).map(v => ({ ...v, timestamp: v.timestamp.toISOString() }))
          ])
        ),
        alertRules: Object.fromEntries(
          Array.from(this.alertRules.entries()).map(([k, v]) => [
            k,
            { ...v, lastTriggered: v.lastTriggered?.toISOString() }
          ])
        ),
      }
      localStorage.setItem('domainFlipper_metrics', JSON.stringify(state))
    } catch (e) {
      // Ignore
    }
  }

  private loadState(): void {
    try {
      const saved = localStorage.getItem('domainFlipper_metrics')
      if (saved) {
        const state = JSON.parse(saved)
        
        if (state.metrics) {
          for (const [key, values] of Object.entries(state.metrics) as [string, any[]][]) {
            this.metrics.set(key, values.map(v => ({
              ...v,
              timestamp: new Date(v.timestamp),
            })))
          }
        }

        if (state.alertRules) {
          for (const [key, rule] of Object.entries(state.alertRules) as [string, any][]) {
            this.alertRules.set(key, {
              ...rule,
              lastTriggered: rule.lastTriggered ? new Date(rule.lastTriggered) : undefined,
            })
          }
        }
      }
    } catch (e) {
      // Ignore
    }
  }

  /**
   * Clean up
   */
  destroy(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
    }
  }
}

// ==================== SINGLETON ====================

export const metrics = new MetricsService()
