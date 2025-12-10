/**
 * Anomaly Alerts Module
 * Triggers alerts for spend spikes, repeated provider errors, listing mismatches
 */

import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'

export interface AnomalyThresholds {
  spendSpikePercent: number        // e.g., 200 = 200% increase triggers alert
  spendSpikeWindow: number          // Time window in hours
  providerErrorThreshold: number    // Number of consecutive errors
  providerErrorWindow: number       // Time window in minutes
  listingMismatchThreshold: number  // Number of mismatched listings
  budgetOverrunPercent: number      // e.g., 110 = 110% of budget triggers alert
}

export interface AnomalyAlert {
  id: string
  type: 'spend_spike' | 'provider_error' | 'listing_mismatch' | 'budget_overrun'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  details: Record<string, any>
  timestamp: Date
  acknowledged: boolean
}

export interface SpendData {
  timestamp: Date
  amount: number
  domain?: string
  provider?: string
}

export interface ProviderError {
  timestamp: Date
  provider: string
  error: string
  endpoint?: string
}

export interface ListingData {
  domain: string
  channels: Record<string, { price: number; status: string }>
}

// Default thresholds (configurable in settings)
export const DEFAULT_ANOMALY_THRESHOLDS: AnomalyThresholds = {
  spendSpikePercent: 200,      // 200% increase
  spendSpikeWindow: 1,         // 1 hour
  providerErrorThreshold: 5,   // 5 consecutive errors
  providerErrorWindow: 15,     // 15 minutes
  listingMismatchThreshold: 3, // 3 mismatched listings
  budgetOverrunPercent: 110,   // 110% of daily budget
}

/**
 * Anomaly detection and alerting system
 */
export class AnomalyDetector {
  private spendHistory: SpendData[] = []
  private errorHistory: Map<string, ProviderError[]> = new Map()
  private alerts: AnomalyAlert[] = []
  private thresholds: AnomalyThresholds
  private alertCallbacks: Array<(alert: AnomalyAlert) => void> = []
  
  constructor(thresholds: AnomalyThresholds = DEFAULT_ANOMALY_THRESHOLDS) {
    this.thresholds = thresholds
  }
  
  /**
   * Update thresholds
   */
  updateThresholds(newThresholds: Partial<AnomalyThresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds }
    logger.info('ANOMALY', 'Updated anomaly thresholds', this.thresholds)
  }
  
  /**
   * Register alert callback
   */
  onAlert(callback: (alert: AnomalyAlert) => void): void {
    this.alertCallbacks.push(callback)
  }
  
  /**
   * Record spend and check for anomalies
   */
  recordSpend(amount: number, domain?: string, provider?: string): void {
    const spendData: SpendData = {
      timestamp: new Date(),
      amount,
      domain,
      provider,
    }
    
    this.spendHistory.push(spendData)
    
    // Cleanup old data (keep last 7 days)
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000
    this.spendHistory = this.spendHistory.filter(s => s.timestamp.getTime() > cutoff)
    
    // Check for spend spike
    this.checkSpendSpike()
  }
  
  /**
   * Record provider error
   */
  recordProviderError(provider: string, error: string, endpoint?: string): void {
    const errorData: ProviderError = {
      timestamp: new Date(),
      provider,
      error,
      endpoint,
    }
    
    const history = this.errorHistory.get(provider) || []
    history.push(errorData)
    
    // Keep only recent errors (last 24 hours)
    const cutoff = Date.now() - 24 * 60 * 60 * 1000
    const filtered = history.filter(e => e.timestamp.getTime() > cutoff)
    
    this.errorHistory.set(provider, filtered)
    
    // Check for repeated errors
    this.checkProviderErrors(provider)
  }
  
  /**
   * Check for spend spike anomalies
   */
  private checkSpendSpike(): void {
    const windowMs = this.thresholds.spendSpikeWindow * 60 * 60 * 1000
    const now = Date.now()
    
    // Get spend in current window
    const currentWindowSpend = this.spendHistory
      .filter(s => now - s.timestamp.getTime() < windowMs)
      .reduce((sum, s) => sum + s.amount, 0)
    
    // Get spend in previous window (for comparison)
    const previousWindowStart = now - 2 * windowMs
    const previousWindowEnd = now - windowMs
    const previousWindowSpend = this.spendHistory
      .filter(s => {
        const time = s.timestamp.getTime()
        return time >= previousWindowStart && time < previousWindowEnd
      })
      .reduce((sum, s) => sum + s.amount, 0)
    
    // Check for spike
    if (previousWindowSpend > 0) {
      const increasePercent = ((currentWindowSpend - previousWindowSpend) / previousWindowSpend) * 100
      
      if (increasePercent >= this.thresholds.spendSpikePercent) {
        this.createAlert({
          type: 'spend_spike',
          severity: increasePercent >= 400 ? 'critical' : increasePercent >= 300 ? 'high' : 'medium',
          message: `Spend spike detected: ${increasePercent.toFixed(0)}% increase`,
          details: {
            currentSpend: currentWindowSpend,
            previousSpend: previousWindowSpend,
            increasePercent: Math.round(increasePercent),
            windowHours: this.thresholds.spendSpikeWindow,
          },
        })
      }
    }
  }
  
  /**
   * Check for repeated provider errors
   */
  private checkProviderErrors(provider: string): void {
    const errors = this.errorHistory.get(provider) || []
    const windowMs = this.thresholds.providerErrorWindow * 60 * 1000
    const now = Date.now()
    
    // Get errors in window
    const recentErrors = errors.filter(e => now - e.timestamp.getTime() < windowMs)
    
    if (recentErrors.length >= this.thresholds.providerErrorThreshold) {
      // Check if we already alerted recently (within last 30 min)
      const recentAlerts = this.alerts.filter(a => 
        a.type === 'provider_error' &&
        a.details.provider === provider &&
        now - a.timestamp.getTime() < 30 * 60 * 1000
      )
      
      if (recentAlerts.length === 0) {
        this.createAlert({
          type: 'provider_error',
          severity: recentErrors.length >= 10 ? 'critical' : 'high',
          message: `${provider} experiencing repeated errors`,
          details: {
            provider,
            errorCount: recentErrors.length,
            windowMinutes: this.thresholds.providerErrorWindow,
            recentErrors: recentErrors.slice(-3).map(e => e.error),
          },
        })
      }
    }
  }
  
  /**
   * Check for listing mismatches across channels
   */
  checkListingMismatches(listings: ListingData[]): void {
    const mismatches: string[] = []
    
    for (const listing of listings) {
      const channels = Object.keys(listing.channels)
      
      if (channels.length < 2) continue
      
      // Check price consistency
      const prices = channels.map(ch => listing.channels[ch].price)
      const uniquePrices = [...new Set(prices)]
      
      if (uniquePrices.length > 1) {
        mismatches.push(
          `${listing.domain}: Price mismatch across channels (${uniquePrices.join(', ')})`
        )
      }
      
      // Check status consistency
      const statuses = channels.map(ch => listing.channels[ch].status)
      const uniqueStatuses = [...new Set(statuses)]
      
      if (uniqueStatuses.length > 1) {
        mismatches.push(
          `${listing.domain}: Status mismatch (${uniqueStatuses.join(', ')})`
        )
      }
    }
    
    if (mismatches.length >= this.thresholds.listingMismatchThreshold) {
      this.createAlert({
        type: 'listing_mismatch',
        severity: mismatches.length >= 10 ? 'high' : 'medium',
        message: `${mismatches.length} listing mismatches detected`,
        details: {
          mismatchCount: mismatches.length,
          examples: mismatches.slice(0, 5),
        },
      })
    }
  }
  
  /**
   * Check for budget overrun
   */
  checkBudgetOverrun(dailyBudget: number, spentToday: number): void {
    const percentUsed = (spentToday / dailyBudget) * 100
    
    if (percentUsed >= this.thresholds.budgetOverrunPercent) {
      // Check if already alerted today
      const today = new Date().toDateString()
      const alertedToday = this.alerts.some(a =>
        a.type === 'budget_overrun' &&
        a.timestamp.toDateString() === today
      )
      
      if (!alertedToday) {
        this.createAlert({
          type: 'budget_overrun',
          severity: percentUsed >= 150 ? 'critical' : percentUsed >= 120 ? 'high' : 'medium',
          message: `Daily budget exceeded: ${percentUsed.toFixed(0)}% used`,
          details: {
            dailyBudget,
            spentToday,
            percentUsed: Math.round(percentUsed),
          },
        })
      }
    }
  }
  
  /**
   * Create and dispatch alert
   */
  private createAlert(data: {
    type: AnomalyAlert['type']
    severity: AnomalyAlert['severity']
    message: string
    details: Record<string, any>
  }): void {
    // Generate unique ID (use crypto.randomUUID if available, fallback to timestamp+random)
    const id = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const alert: AnomalyAlert = {
      id,
      ...data,
      timestamp: new Date(),
      acknowledged: false,
    }
    
    this.alerts.push(alert)
    
    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100)
    }
    
    // Log alert
    logger.warn('ANOMALY', alert.message, alert.details)
    
    // Show toast notification
    const toastFn = alert.severity === 'critical' ? toast.error :
                     alert.severity === 'high' ? toast.error :
                     alert.severity === 'medium' ? toast.warning :
                     toast.info
    
    toastFn(`⚠️ ${alert.message}`, {
      description: this.formatAlertDetails(alert),
      duration: alert.severity === 'critical' ? 0 : 10000, // Critical alerts don't auto-dismiss
    })
    
    // Call registered callbacks
    this.alertCallbacks.forEach(callback => {
      try {
        callback(alert)
      } catch (error) {
        logger.error('ANOMALY', 'Alert callback error', error as Error)
      }
    })
  }
  
  /**
   * Format alert details for display
   */
  private formatAlertDetails(alert: AnomalyAlert): string {
    switch (alert.type) {
      case 'spend_spike':
        return `$${alert.details.currentSpend} vs $${alert.details.previousSpend} (${alert.details.increasePercent}% increase)`
      
      case 'provider_error':
        return `${alert.details.errorCount} errors in ${alert.details.windowMinutes}m`
      
      case 'listing_mismatch':
        return `${alert.details.mismatchCount} listings need attention`
      
      case 'budget_overrun':
        return `$${alert.details.spentToday} of $${alert.details.dailyBudget} (${alert.details.percentUsed}%)`
      
      default:
        return JSON.stringify(alert.details)
    }
  }
  
  /**
   * Get all alerts
   */
  getAlerts(options?: {
    unacknowledgedOnly?: boolean
    type?: AnomalyAlert['type']
    severity?: AnomalyAlert['severity']
    since?: Date
  }): AnomalyAlert[] {
    let filtered = [...this.alerts]
    
    if (options?.unacknowledgedOnly) {
      filtered = filtered.filter(a => !a.acknowledged)
    }
    
    if (options?.type) {
      filtered = filtered.filter(a => a.type === options.type)
    }
    
    if (options?.severity) {
      filtered = filtered.filter(a => a.severity === options.severity)
    }
    
    if (options?.since) {
      filtered = filtered.filter(a => a.timestamp >= options.since!)
    }
    
    return filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }
  
  /**
   * Acknowledge alert
   */
  acknowledgeAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId)
    if (alert) {
      alert.acknowledged = true
      logger.info('ANOMALY', `Alert acknowledged: ${alertId}`)
    }
  }
  
  /**
   * Clear old alerts
   */
  clearOldAlerts(olderThanDays: number = 7): void {
    const cutoff = Date.now() - olderThanDays * 24 * 60 * 60 * 1000
    const beforeCount = this.alerts.length
    
    this.alerts = this.alerts.filter(a => a.timestamp.getTime() > cutoff)
    
    const removed = beforeCount - this.alerts.length
    if (removed > 0) {
      logger.info('ANOMALY', `Cleared ${removed} old alerts`)
    }
  }
  
  /**
   * Get statistics
   */
  getStats(): {
    totalAlerts: number
    unacknowledged: number
    bySeverity: Record<string, number>
    byType: Record<string, number>
  } {
    const bySeverity: Record<string, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    }
    
    const byType: Record<string, number> = {
      spend_spike: 0,
      provider_error: 0,
      listing_mismatch: 0,
      budget_overrun: 0,
    }
    
    let unacknowledged = 0
    
    this.alerts.forEach(alert => {
      bySeverity[alert.severity]++
      byType[alert.type]++
      if (!alert.acknowledged) unacknowledged++
    })
    
    return {
      totalAlerts: this.alerts.length,
      unacknowledged,
      bySeverity,
      byType,
    }
  }
}

// Export singleton instance
export const anomalyDetector = new AnomalyDetector()
