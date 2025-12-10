/**
 * Alerts System
 * Sends alerts via webhook for critical events and monitoring
 * December 2025
 */

import { logger } from '@/lib/utils/logger'
import axios from 'axios'

export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical'

export interface Alert {
  severity: AlertSeverity
  title: string
  message: string
  timestamp: Date
  data?: any
}

export interface AlertConfig {
  webhookUrl?: string
  enabled: boolean
  minSeverity: AlertSeverity
}

const SEVERITY_PRIORITY: Record<AlertSeverity, number> = {
  info: 0,
  warning: 1,
  error: 2,
  critical: 3,
}

class AlertSystem {
  private config: AlertConfig
  private alertHistory: Alert[] = []
  private maxHistorySize = 100

  constructor(config?: Partial<AlertConfig>) {
    this.config = {
      webhookUrl: config?.webhookUrl,
      enabled: config?.enabled ?? true,
      minSeverity: config?.minSeverity || 'warning',
    }
  }

  /**
   * Configure alert system
   */
  configure(config: Partial<AlertConfig>): void {
    this.config = { ...this.config, ...config }
    logger.info('ALERTS', 'Alert system configured', {
      enabled: this.config.enabled,
      minSeverity: this.config.minSeverity,
      hasWebhook: !!this.config.webhookUrl,
    })
  }

  /**
   * Check if alert should be sent based on severity
   */
  private shouldSendAlert(severity: AlertSeverity): boolean {
    if (!this.config.enabled) return false
    return SEVERITY_PRIORITY[severity] >= SEVERITY_PRIORITY[this.config.minSeverity]
  }

  /**
   * Send alert
   */
  async sendAlert(
    severity: AlertSeverity,
    title: string,
    message: string,
    data?: any
  ): Promise<void> {
    const alert: Alert = {
      severity,
      title,
      message,
      timestamp: new Date(),
      data,
    }

    // Add to history
    this.alertHistory.push(alert)
    if (this.alertHistory.length > this.maxHistorySize) {
      this.alertHistory = this.alertHistory.slice(-this.maxHistorySize)
    }

    // Log the alert
    const logMethod = severity === 'critical' || severity === 'error' ? 'error' : 
                      severity === 'warning' ? 'warn' : 'info'
    logger[logMethod]('ALERT', `${title}: ${message}`, undefined, data)

    // Send webhook if configured and severity is high enough
    if (!this.shouldSendAlert(severity)) {
      return
    }

    if (this.config.webhookUrl) {
      await this.sendWebhook(alert)
    }
  }

  /**
   * Send alert to webhook
   */
  private async sendWebhook(alert: Alert): Promise<void> {
    try {
      const payload = {
        severity: alert.severity,
        title: alert.title,
        message: alert.message,
        timestamp: alert.timestamp.toISOString(),
        data: alert.data,
      }

      await axios.post(this.config.webhookUrl!, payload, {
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json',
        },
      })

      logger.debug('ALERTS', 'Webhook sent successfully', { title: alert.title })
    } catch (error) {
      // Don't throw - we don't want webhook failures to break the system
      logger.error('ALERTS', 'Failed to send webhook', error as Error, {
        title: alert.title,
      })
    }
  }

  /**
   * Convenience methods for different severities
   */
  async info(title: string, message: string, data?: any): Promise<void> {
    await this.sendAlert('info', title, message, data)
  }

  async warning(title: string, message: string, data?: any): Promise<void> {
    await this.sendAlert('warning', title, message, data)
  }

  async error(title: string, message: string, data?: any): Promise<void> {
    await this.sendAlert('error', title, message, data)
  }

  async critical(title: string, message: string, data?: any): Promise<void> {
    await this.sendAlert('critical', title, message, data)
  }

  /**
   * Domain-specific alert methods
   */
  async purchaseSuccess(domain: string, price: number, provider: string): Promise<void> {
    await this.info('Domain Purchased', `Successfully purchased ${domain} for $${price}`, {
      domain,
      price,
      provider,
    })
  }

  async purchaseFailed(domain: string, reason: string, data?: any): Promise<void> {
    await this.error('Purchase Failed', `Failed to purchase ${domain}: ${reason}`, {
      domain,
      reason,
      ...data,
    })
  }

  async spendingLimitReached(limit: string, amount: number): Promise<void> {
    await this.critical(
      'Spending Limit Reached',
      `${limit} limit reached: $${amount}`,
      { limit, amount }
    )
  }

  async listingCreated(domain: string, price: number, marketplace: string): Promise<void> {
    await this.info('Listing Created', `Listed ${domain} for $${price} on ${marketplace}`, {
      domain,
      price,
      marketplace,
    })
  }

  async saleCompleted(domain: string, price: number, profit: number): Promise<void> {
    await this.info('Sale Completed', `Sold ${domain} for $${price} (profit: $${profit})`, {
      domain,
      price,
      profit,
    })
  }

  async pipelineError(stage: string, error: string, data?: any): Promise<void> {
    await this.error('Pipeline Error', `Error in ${stage}: ${error}`, {
      stage,
      error,
      ...data,
    })
  }

  /**
   * Get alert history
   */
  getHistory(limit?: number): Alert[] {
    return limit ? this.alertHistory.slice(-limit) : [...this.alertHistory]
  }

  /**
   * Clear alert history
   */
  clearHistory(): void {
    this.alertHistory = []
  }

  /**
   * Get stats about alerts
   */
  getStats(): Record<AlertSeverity, number> {
    const stats: Record<AlertSeverity, number> = {
      info: 0,
      warning: 0,
      error: 0,
      critical: 0,
    }

    this.alertHistory.forEach(alert => {
      stats[alert.severity]++
    })

    return stats
  }
}

// Export singleton instance
export const alertSystem = new AlertSystem()

/**
 * Health heartbeat system
 */
interface HeartbeatConfig {
  interval: number // milliseconds
  webhookUrl?: string
  enabled: boolean
}

class HealthHeartbeat {
  private config: HeartbeatConfig
  private intervalId: ReturnType<typeof setInterval> | null = null
  private lastBeat: Date | null = null
  private missedBeats = 0

  constructor(config?: Partial<HeartbeatConfig>) {
    this.config = {
      interval: config?.interval || 60000, // 1 minute default
      webhookUrl: config?.webhookUrl,
      enabled: config?.enabled ?? false,
    }
  }

  /**
   * Start sending heartbeats
   */
  start(): void {
    if (this.intervalId) {
      logger.warn('HEARTBEAT', 'Heartbeat already running')
      return
    }

    if (!this.config.enabled) {
      logger.info('HEARTBEAT', 'Heartbeat disabled')
      return
    }

    logger.info('HEARTBEAT', 'Starting health heartbeat', {
      interval: this.config.interval,
    })

    this.intervalId = setInterval(() => {
      this.sendHeartbeat()
    }, this.config.interval)

    // Send initial heartbeat
    this.sendHeartbeat()
  }

  /**
   * Stop sending heartbeats
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
      logger.info('HEARTBEAT', 'Health heartbeat stopped')
    }
  }

  /**
   * Send a single heartbeat
   */
  private async sendHeartbeat(): Promise<void> {
    try {
      const now = new Date()
      const payload = {
        timestamp: now.toISOString(),
        status: 'alive',
        uptime: process.uptime?.() || 0,
        missedBeats: this.missedBeats,
      }

      if (this.config.webhookUrl) {
        await axios.post(this.config.webhookUrl, payload, {
          timeout: 5000,
          headers: {
            'Content-Type': 'application/json',
          },
        })
      }

      this.lastBeat = now
      this.missedBeats = 0
      logger.debug('HEARTBEAT', 'Heartbeat sent', payload)
    } catch (error) {
      this.missedBeats++
      logger.error('HEARTBEAT', 'Failed to send heartbeat', error as Error, {
        missedBeats: this.missedBeats,
      })

      // Alert after 3 missed beats
      if (this.missedBeats >= 3) {
        await alertSystem.critical(
          'Heartbeat Missed',
          `Failed to send heartbeat ${this.missedBeats} times`,
          { missedBeats: this.missedBeats }
        )
      }
    }
  }

  /**
   * Get heartbeat status
   */
  getStatus(): {
    enabled: boolean
    running: boolean
    lastBeat: Date | null
    missedBeats: number
  } {
    return {
      enabled: this.config.enabled,
      running: this.intervalId !== null,
      lastBeat: this.lastBeat,
      missedBeats: this.missedBeats,
    }
  }

  /**
   * Configure heartbeat
   */
  configure(config: Partial<HeartbeatConfig>): void {
    const wasRunning = this.intervalId !== null
    
    if (wasRunning) {
      this.stop()
    }

    this.config = { ...this.config, ...config }

    if (wasRunning && this.config.enabled) {
      this.start()
    }
  }
}

// Export singleton instance
export const healthHeartbeat = new HealthHeartbeat()
