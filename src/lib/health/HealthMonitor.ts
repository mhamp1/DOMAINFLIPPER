/**
 * HealthMonitor.ts — System Health & Status Monitoring
 * Tracks API health, performance, and system status
 * December 2025
 */

import { logger } from '@/lib/utils/logger'
import { toast } from 'sonner'

export interface ServiceHealth {
  name: string
  status: 'healthy' | 'degraded' | 'down' | 'unknown'
  lastCheck: Date
  latency: number
  errorRate: number
  lastError?: string
  consecutiveFailures: number
}

export interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'critical'
  services: Record<string, ServiceHealth>
  uptime: number
  lastUpdate: Date
  botRunning: boolean
  domainsProcessed: number
  errorsLast24h: number
}

class HealthMonitor {
  private services: Map<string, ServiceHealth> = new Map()
  private checkInterval: ReturnType<typeof setInterval> | null = null
  private startTime: Date = new Date()
  private errorCounts: Map<string, number[]> = new Map() // timestamps of errors

  constructor() {
    this.initializeServices()
  }

  private initializeServices(): void {
    const serviceNames = [
      'godaddy',
      'namecheap',
      'supabase',
      'valuation',
      'scanner',
      'marketplace',
    ]

    serviceNames.forEach(name => {
      this.services.set(name, {
        name,
        status: 'unknown',
        lastCheck: new Date(),
        latency: 0,
        errorRate: 0,
        consecutiveFailures: 0,
      })
    })
  }

  /**
   * Start periodic health checks
   */
  startMonitoring(intervalMs: number = 60000): void {
    if (this.checkInterval) return

    logger.info('HEALTH', 'Starting health monitoring', { interval: `${intervalMs}ms` })

    // Initial check
    this.checkAllServices()

    this.checkInterval = setInterval(() => {
      this.checkAllServices()
    }, intervalMs)
  }

  /**
   * Stop health monitoring
   */
  stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }
  }

  /**
   * Check all services
   */
  private async checkAllServices(): Promise<void> {
    const checks = [
      this.checkService('godaddy', this.checkGoDaddy.bind(this)),
      this.checkService('namecheap', this.checkNamecheap.bind(this)),
      this.checkService('supabase', this.checkSupabase.bind(this)),
      this.checkService('valuation', this.checkValuation.bind(this)),
      this.checkService('scanner', this.checkScanner.bind(this)),
      this.checkService('marketplace', this.checkMarketplace.bind(this)),
    ]

    await Promise.allSettled(checks)

    // Log overall status
    const health = this.getSystemHealth()
    if (health.overall === 'critical') {
      logger.critical('HEALTH', 'System health is CRITICAL', undefined, { services: health.services })
      toast.error('System Health Critical', {
        description: 'Multiple services are down. Check logs for details.',
      })
    } else if (health.overall === 'degraded') {
      logger.warn('HEALTH', 'System health is DEGRADED', { services: health.services })
    }
  }

  /**
   * Check a single service
   */
  private async checkService(
    name: string,
    checkFn: () => Promise<{ healthy: boolean; latency: number; error?: string }>
  ): Promise<void> {
    const service = this.services.get(name)
    if (!service) return

    try {
      const result = await checkFn()

      service.lastCheck = new Date()
      service.latency = result.latency

      if (result.healthy) {
        service.status = result.latency > 5000 ? 'degraded' : 'healthy'
        service.consecutiveFailures = 0
        service.lastError = undefined
      } else {
        service.consecutiveFailures++
        service.lastError = result.error
        service.status = service.consecutiveFailures >= 3 ? 'down' : 'degraded'
        this.recordError(name)
      }

      // Calculate error rate (errors in last hour)
      service.errorRate = this.getErrorRate(name)

    } catch (error: any) {
      service.lastCheck = new Date()
      service.status = 'down'
      service.consecutiveFailures++
      service.lastError = error.message
      this.recordError(name)
    }
  }

  /**
   * Record an error for a service
   */
  private recordError(service: string): void {
    const errors = this.errorCounts.get(service) || []
    errors.push(Date.now())
    
    // Keep only last 24 hours of errors
    const cutoff = Date.now() - 24 * 60 * 60 * 1000
    const filtered = errors.filter(t => t > cutoff)
    
    this.errorCounts.set(service, filtered)
  }

  /**
   * Get error rate for a service (errors per hour)
   */
  private getErrorRate(service: string): number {
    const errors = this.errorCounts.get(service) || []
    const oneHourAgo = Date.now() - 60 * 60 * 1000
    const recentErrors = errors.filter(t => t > oneHourAgo)
    return recentErrors.length
  }

  // Service health check implementations
  private async checkGoDaddy(): Promise<{ healthy: boolean; latency: number; error?: string }> {
    const start = Date.now()
    try {
      const hasKey = !!import.meta.env.VITE_GODADDY_KEY
      return { healthy: hasKey, latency: Date.now() - start, error: hasKey ? undefined : 'API key not configured' }
    } catch (error: any) {
      return { healthy: false, latency: Date.now() - start, error: error.message }
    }
  }

  private async checkNamecheap(): Promise<{ healthy: boolean; latency: number; error?: string }> {
    const start = Date.now()
    try {
      const hasKey = !!import.meta.env.VITE_NAMECHEAP_API_KEY
      return { healthy: hasKey, latency: Date.now() - start, error: hasKey ? undefined : 'API key not configured' }
    } catch (error: any) {
      return { healthy: false, latency: Date.now() - start, error: error.message }
    }
  }

  private async checkSupabase(): Promise<{ healthy: boolean; latency: number; error?: string }> {
    const start = Date.now()
    try {
      const hasUrl = !!import.meta.env.VITE_SUPABASE_URL
      const hasKey = !!import.meta.env.VITE_SUPABASE_ANON_KEY
      return { healthy: hasUrl && hasKey, latency: Date.now() - start, error: (hasUrl && hasKey) ? undefined : 'Not configured' }
    } catch (error: any) {
      return { healthy: false, latency: Date.now() - start, error: error.message }
    }
  }

  private async checkValuation(): Promise<{ healthy: boolean; latency: number; error?: string }> {
    const start = Date.now()
    try {
      // Valuation engine is local, always healthy
      return { healthy: true, latency: Date.now() - start }
    } catch (error: any) {
      return { healthy: false, latency: Date.now() - start, error: error.message }
    }
  }

  private async checkScanner(): Promise<{ healthy: boolean; latency: number; error?: string }> {
    const start = Date.now()
    try {
      // Scanner depends on APIs
      const hasGoDaddy = !!import.meta.env.VITE_GODADDY_KEY
      return { healthy: hasGoDaddy, latency: Date.now() - start, error: hasGoDaddy ? undefined : 'No APIs configured' }
    } catch (error: any) {
      return { healthy: false, latency: Date.now() - start, error: error.message }
    }
  }

  private async checkMarketplace(): Promise<{ healthy: boolean; latency: number; error?: string }> {
    const start = Date.now()
    try {
      // Check if any marketplace is configured
      const hasAny = !!(
        import.meta.env.VITE_GODADDY_KEY ||
        import.meta.env.VITE_SEDO_API_KEY ||
        import.meta.env.VITE_FLIPPA_API_KEY
      )
      return { healthy: hasAny, latency: Date.now() - start, error: hasAny ? undefined : 'No marketplaces configured' }
    } catch (error: any) {
      return { healthy: false, latency: Date.now() - start, error: error.message }
    }
  }

  /**
   * Get overall system health
   */
  getSystemHealth(): SystemHealth {
    const services: Record<string, ServiceHealth> = {}
    let downCount = 0
    let degradedCount = 0

    this.services.forEach((service, name) => {
      services[name] = { ...service }
      if (service.status === 'down') downCount++
      else if (service.status === 'degraded') degradedCount++
    })

    // Calculate overall status
    let overall: 'healthy' | 'degraded' | 'critical' = 'healthy'
    if (downCount >= 2) overall = 'critical'
    else if (downCount >= 1 || degradedCount >= 2) overall = 'degraded'

    // Calculate errors in last 24h
    let errorsLast24h = 0
    this.errorCounts.forEach(errors => {
      const cutoff = Date.now() - 24 * 60 * 60 * 1000
      errorsLast24h += errors.filter(t => t > cutoff).length
    })

    return {
      overall,
      services,
      uptime: Date.now() - this.startTime.getTime(),
      lastUpdate: new Date(),
      botRunning: localStorage.getItem('domainFlipper_botRunning') === 'true',
      domainsProcessed: parseInt(localStorage.getItem('domainFlipper_domainsProcessed') || '0'),
      errorsLast24h,
    }
  }

  /**
   * Get service status
   */
  getServiceStatus(name: string): ServiceHealth | undefined {
    return this.services.get(name)
  }

  /**
   * Manually report an error
   */
  reportError(service: string, error: string): void {
    const serviceHealth = this.services.get(service)
    if (serviceHealth) {
      serviceHealth.lastError = error
      serviceHealth.consecutiveFailures++
      if (serviceHealth.consecutiveFailures >= 3) {
        serviceHealth.status = 'down'
      } else {
        serviceHealth.status = 'degraded'
      }
    }
    this.recordError(service)
    logger.error('HEALTH', `${service} error reported`, new Error(error))
  }

  /**
   * Report service recovery
   */
  reportRecovery(service: string): void {
    const serviceHealth = this.services.get(service)
    if (serviceHealth) {
      serviceHealth.status = 'healthy'
      serviceHealth.consecutiveFailures = 0
      serviceHealth.lastError = undefined
    }
    logger.info('HEALTH', `${service} recovered`)
  }
}

// Export singleton
export const healthMonitor = new HealthMonitor()

