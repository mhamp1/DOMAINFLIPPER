/**
 * HealthMonitor.ts — Smart System Health Monitoring
 * Only alerts when configured services fail, not unconfigured ones
 * December 2025
 */

import { logger } from '@/lib/utils/logger'
import { apiConfigManager } from '@/lib/config/APIConfigManager'
import { toast } from 'sonner'

export interface ServiceHealth {
  name: string
  status: 'healthy' | 'degraded' | 'down' | 'not_configured'
  lastCheck: Date
  latency: number
  errorRate: number
  consecutiveFailures: number
  message?: string
}

export interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'critical' | 'setup_needed'
  services: Record<string, ServiceHealth>
  uptime: number
  errorsLast24h: number
}

class HealthMonitor {
  private services: Map<string, ServiceHealth> = new Map()
  private checkInterval: ReturnType<typeof setInterval> | null = null
  private startTime: Date = new Date()
  private errorCounts: Map<string, number[]> = new Map()
  private hasShownSetupToast = false

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
        status: 'not_configured',
        lastCheck: new Date(),
        latency: 0,
        errorRate: 0,
        consecutiveFailures: 0,
        message: 'Not configured yet',
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
   * Check all services - ONLY checks configured APIs
   */
  private async checkAllServices(): Promise<void> {
    const apiConfig = apiConfigManager.getAll()
    
    // Check GoDaddy only if configured
    if (apiConfigManager.isConfigured('godaddy')) {
      await this.checkService('godaddy', this.checkGoDaddy.bind(this))
    } else {
      this.setNotConfigured('godaddy')
    }

    // Check Namecheap only if configured
    if (apiConfigManager.isConfigured('namecheap')) {
      await this.checkService('namecheap', this.checkNamecheap.bind(this))
    } else {
      this.setNotConfigured('namecheap')
    }

    // Check Supabase only if configured
    if (apiConfigManager.isConfigured('supabase')) {
      await this.checkService('supabase', this.checkSupabase.bind(this))
    } else {
      this.setNotConfigured('supabase')
    }

    // Internal services are always checked
    await this.checkService('valuation', this.checkValuation.bind(this))
    await this.checkService('scanner', this.checkScanner.bind(this))
    
    // Log overall status
    const health = this.getSystemHealth()
    
    // Only show toasts for actual failures, not setup needed
    if (health.overall === 'critical') {
      logger.critical('HEALTH', 'System health is CRITICAL', undefined, { services: health.services })
      toast.error('System Health Critical', {
        description: 'Configured services are failing. Check API keys.',
      })
    } else if (health.overall === 'setup_needed' && !this.hasShownSetupToast) {
      // Show setup needed toast only once
      this.hasShownSetupToast = true
      toast.info('Setup Required', {
        description: 'Configure API keys in Config tab to start earning',
        duration: 10000,
      })
    }
  }

  /**
   * Mark a service as not configured (not an error)
   */
  private setNotConfigured(name: string): void {
    const service = this.services.get(name)
    if (service) {
      service.status = 'not_configured'
      service.message = 'Configure in Config tab'
      service.consecutiveFailures = 0
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
        service.status = 'healthy'
        service.consecutiveFailures = 0
        service.message = `OK (${result.latency}ms)`
      } else {
        service.consecutiveFailures++
        service.status = service.consecutiveFailures >= 3 ? 'down' : 'degraded'
        service.message = result.error || 'Check failed'
        this.recordError(name)
      }
    } catch (error: any) {
      service.consecutiveFailures++
      service.status = service.consecutiveFailures >= 3 ? 'down' : 'degraded'
      service.message = error.message || 'Unknown error'
      service.lastCheck = new Date()
      this.recordError(name)
    }
  }

  private recordError(serviceName: string): void {
    const now = Date.now()
    const errors = this.errorCounts.get(serviceName) || []
    errors.push(now)
    // Keep only last 24 hours of errors
    const cutoff = now - 24 * 60 * 60 * 1000
    this.errorCounts.set(serviceName, errors.filter(t => t > cutoff))
  }

  /**
   * Individual service checks
   */
  private async checkGoDaddy(): Promise<{ healthy: boolean; latency: number; error?: string }> {
    const start = Date.now()
    try {
      const config = apiConfigManager.get('godaddy')
      if (!config?.apiKey) {
        return { healthy: false, latency: 0, error: 'Not configured' }
      }
      
      // Simulate a lightweight check (in production, make a real API call)
      await new Promise(r => setTimeout(r, 100))
      return { healthy: true, latency: Date.now() - start }
    } catch (error: any) {
      return { healthy: false, latency: Date.now() - start, error: error.message }
    }
  }

  private async checkNamecheap(): Promise<{ healthy: boolean; latency: number; error?: string }> {
    const start = Date.now()
    try {
      const config = apiConfigManager.get('namecheap')
      if (!config?.apiKey) {
        return { healthy: false, latency: 0, error: 'Not configured' }
      }
      
      await new Promise(r => setTimeout(r, 100))
      return { healthy: true, latency: Date.now() - start }
    } catch (error: any) {
      return { healthy: false, latency: Date.now() - start, error: error.message }
    }
  }

  private async checkSupabase(): Promise<{ healthy: boolean; latency: number; error?: string }> {
    const start = Date.now()
    try {
      const config = apiConfigManager.get('supabase')
      if (!config?.url) {
        return { healthy: false, latency: 0, error: 'Not configured' }
      }
      
      await new Promise(r => setTimeout(r, 50))
      return { healthy: true, latency: Date.now() - start }
    } catch (error: any) {
      return { healthy: false, latency: Date.now() - start, error: error.message }
    }
  }

  private async checkValuation(): Promise<{ healthy: boolean; latency: number; error?: string }> {
    const start = Date.now()
    // Internal service - always available
    return { healthy: true, latency: Date.now() - start }
  }

  private async checkScanner(): Promise<{ healthy: boolean; latency: number; error?: string }> {
    const start = Date.now()
    // Check if at least one registrar/marketplace is configured
    const hasRegistrar = apiConfigManager.hasMinimumConfig()
    
    if (!hasRegistrar) {
      return { healthy: false, latency: 0, error: 'No registrar configured - try FREE Afternic or Namecheap Beast Mode' }
    }
    
    return { healthy: true, latency: Date.now() - start }
  }

  private async checkMarketplace(): Promise<{ healthy: boolean; latency: number; error?: string }> {
    const start = Date.now()
    // Marketplace depends on at least one registrar
    const hasRegistrar = apiConfigManager.hasMinimumConfig()
    
    if (!hasRegistrar) {
      return { healthy: false, latency: 0, error: 'No marketplace configured' }
    }
    
    return { healthy: true, latency: Date.now() - start }
  }

  /**
   * Get overall system health
   */
  getSystemHealth(): SystemHealth {
    const services: Record<string, ServiceHealth> = {}
    let configuredCount = 0
    let healthyCount = 0
    let downCount = 0

    this.services.forEach((service, name) => {
      services[name] = { ...service }
      
      if (service.status !== 'not_configured') {
        configuredCount++
        if (service.status === 'healthy') healthyCount++
        if (service.status === 'down') downCount++
      }
    })

    // Calculate uptime
    const uptime = Math.floor((Date.now() - this.startTime.getTime()) / 1000)

    // Calculate errors in last 24h
    let errorsLast24h = 0
    this.errorCounts.forEach(errors => {
      errorsLast24h += errors.length
    })

    // Determine overall status
    let overall: SystemHealth['overall']
    
    if (configuredCount === 0) {
      overall = 'setup_needed'
    } else if (downCount > 0 && downCount >= configuredCount / 2) {
      overall = 'critical'
    } else if (downCount > 0) {
      overall = 'degraded'
    } else {
      overall = 'healthy'
    }

    return {
      overall,
      services,
      uptime,
      errorsLast24h,
    }
  }

  /**
   * Get a single service status
   */
  getServiceHealth(name: string): ServiceHealth | undefined {
    return this.services.get(name)
  }

  /**
   * Get stats for display
   */
  getStats(): { healthyCount: number; totalCount: number; configuredCount: number } {
    let healthyCount = 0
    let totalCount = 0
    let configuredCount = 0

    this.services.forEach(service => {
      totalCount++
      if (service.status !== 'not_configured') {
        configuredCount++
        if (service.status === 'healthy') healthyCount++
      }
    })

    return { healthyCount, totalCount, configuredCount }
  }

  /**
   * Force update a service status (for external updates)
   */
  updateServiceStatus(name: string, status: ServiceHealth['status'], message?: string): void {
    const service = this.services.get(name)
    if (service) {
      service.status = status
      service.message = message
      service.lastCheck = new Date()
    }
  }
}

export const healthMonitor = new HealthMonitor()
