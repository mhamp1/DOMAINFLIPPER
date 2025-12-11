/**
 * Advanced Analytics System
 * Real-time charts and reporting for domain trading
 * December 2025
 */

import { logger } from '@/lib/utils/logger'

export interface AnalyticsData {
  timestamp: Date
  metric: string
  value: number
  category: string
  metadata?: Record<string, any>
}

export interface ChartData {
  labels: string[]
  datasets: {
    label: string
    data: number[]
    backgroundColor?: string
    borderColor?: string
    borderWidth?: number
  }[]
}

export interface AnalyticsConfig {
  enabled: boolean
  retentionDays: number
  realTimeUpdates: boolean
  exportEnabled: boolean
}

export class AdvancedAnalytics {
  private data: AnalyticsData[] = []
  private config: AnalyticsConfig = {
    enabled: true,
    retentionDays: 90,
    realTimeUpdates: true,
    exportEnabled: true,
  }

  constructor() {
    this.loadFromStorage()
    this.startCleanupTask()
  }

  /**
   * Record analytics data point
   */
  record(metric: string, value: number, category: string = 'general', metadata?: Record<string, any>): void {
    if (!this.config.enabled) return

    const dataPoint: AnalyticsData = {
      timestamp: new Date(),
      metric,
      value,
      category,
      metadata,
    }

    this.data.push(dataPoint)
    this.saveToStorage()

    logger.debug('ANALYTICS', `Recorded ${metric}: ${value}`, { category, metadata })
  }

  /**
   * Get chart data for a specific metric over time
   */
  getChartData(metric: string, timeframe: '1h' | '24h' | '7d' | '30d' | '90d' = '7d'): ChartData {
    const now = new Date()
    const timeframeMs = this.getTimeframeMs(timeframe)

    const filteredData = this.data.filter(d =>
      d.metric === metric &&
      (now.getTime() - d.timestamp.getTime()) <= timeframeMs
    )

    // Group by hour/day depending on timeframe
    const grouped = this.groupDataByTime(filteredData, timeframe)

    return {
      labels: Object.keys(grouped),
      datasets: [{
        label: metric,
        data: Object.values(grouped),
        borderColor: '#D4AF37',
        backgroundColor: 'rgba(212, 175, 55, 0.1)',
        borderWidth: 2,
      }]
    }
  }

  /**
   * Get performance metrics summary
   */
  getPerformanceMetrics(): {
    totalDomains: number
    totalRevenue: number
    avgROI: number
    successRate: number
    topCategories: { category: string; count: number; revenue: number }[]
  } {
    const revenueData = this.data.filter(d => d.metric === 'revenue')
    const roiData = this.data.filter(d => d.metric === 'roi')
    const domainData = this.data.filter(d => d.metric === 'domain_acquired')

    const totalRevenue = revenueData.reduce((sum, d) => sum + d.value, 0)
    const avgROI = roiData.length > 0 ? roiData.reduce((sum, d) => sum + d.value, 0) / roiData.length : 0
    const totalDomains = domainData.length

    // Calculate success rate (assuming revenue > 0 means success)
    const successfulDomains = revenueData.filter(d => d.value > 0).length
    const successRate = totalDomains > 0 ? (successfulDomains / totalDomains) * 100 : 0

    // Top categories by revenue
    const categoryRevenue = new Map<string, number>()
    const categoryCount = new Map<string, number>()

    revenueData.forEach(d => {
      const category = d.metadata?.category || 'uncategorized'
      categoryRevenue.set(category, (categoryRevenue.get(category) || 0) + d.value)
      categoryCount.set(category, (categoryCount.get(category) || 0) + 1)
    })

    const topCategories = Array.from(categoryRevenue.entries())
      .map(([category, revenue]) => ({
        category,
        count: categoryCount.get(category) || 0,
        revenue,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)

    return {
      totalDomains,
      totalRevenue,
      avgROI,
      successRate,
      topCategories,
    }
  }

  /**
   * Get mining performance data
   */
  getMiningAnalytics(): {
    totalMined: number
    gemsFound: number
    legendaryFound: number
    avgRoi: number
    minerPerformance: { miner: string; domains: number; gems: number }[]
  } {
    const minedData = this.data.filter(d => d.category === 'mining')
    const gemData = this.data.filter(d => d.metric === 'gem_found')
    const legendaryData = this.data.filter(d => d.metric === 'legendary_found')
    const roiData = this.data.filter(d => d.metric === 'mining_roi')

    const totalMined = minedData.length
    const gemsFound = gemData.length
    const legendaryFound = legendaryData.length
    const avgRoi = roiData.length > 0 ? roiData.reduce((sum, d) => sum + d.value, 0) / roiData.length : 0

    // Miner performance
    const minerStats = new Map<string, { domains: number; gems: number }>()
    minedData.forEach(d => {
      const miner = d.metadata?.miner || 'unknown'
      const current = minerStats.get(miner) || { domains: 0, gems: 0 }
      current.domains++
      minerStats.set(miner, current)
    })

    gemData.forEach(d => {
      const miner = d.metadata?.miner || 'unknown'
      const current = minerStats.get(miner) || { domains: 0, gems: 0 }
      current.gems++
      minerStats.set(miner, current)
    })

    const minerPerformance = Array.from(minerStats.entries())
      .map(([miner, stats]) => ({ miner, ...stats }))
      .sort((a, b) => b.gems - a.gems)

    return {
      totalMined,
      gemsFound,
      legendaryFound,
      avgRoi,
      minerPerformance,
    }
  }

  /**
   * Export analytics data
   */
  exportData(format: 'json' | 'csv' = 'json'): string {
    if (!this.config.exportEnabled) {
      throw new Error('Analytics export is disabled')
    }

    if (format === 'csv') {
      const headers = 'timestamp,metric,value,category,metadata\n'
      const rows = this.data.map(d =>
        `${d.timestamp.toISOString()},${d.metric},${d.value},${d.category},${JSON.stringify(d.metadata || {})}`
      )
      return headers + rows.join('\n')
    }

    return JSON.stringify(this.data, null, 2)
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<AnalyticsConfig>): void {
    this.config = { ...this.config, ...config }
    logger.info('ANALYTICS', 'Configuration updated', this.config)
  }

  /**
   * Get current configuration
   */
  getConfig(): AnalyticsConfig {
    return { ...this.config }
  }

  /**
   * Clear all analytics data
   */
  clearData(): void {
    this.data = []
    this.saveToStorage()
    logger.info('ANALYTICS', 'All analytics data cleared')
  }

  // Private methods

  private getTimeframeMs(timeframe: string): number {
    const hour = 60 * 60 * 1000
    const day = 24 * hour

    switch (timeframe) {
      case '1h': return hour
      case '24h': return day
      case '7d': return 7 * day
      case '30d': return 30 * day
      case '90d': return 90 * day
      default: return 7 * day
    }
  }

  private groupDataByTime(data: AnalyticsData[], timeframe: string): Record<string, number> {
    const grouped: Record<string, number> = {}

    data.forEach(d => {
      let key: string

      if (timeframe === '1h') {
        key = d.timestamp.toISOString().slice(0, 13) // YYYY-MM-DDTHH
      } else {
        key = d.timestamp.toISOString().slice(0, 10) // YYYY-MM-DD
      }

      grouped[key] = (grouped[key] || 0) + d.value
    })

    return grouped
  }

  private startCleanupTask(): void {
    // Clean up old data daily
    setInterval(() => {
      this.cleanupOldData()
    }, 24 * 60 * 60 * 1000)
  }

  private cleanupOldData(): void {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - this.config.retentionDays)

    const originalLength = this.data.length
    this.data = this.data.filter(d => d.timestamp >= cutoff)

    if (this.data.length !== originalLength) {
      this.saveToStorage()
      logger.debug('ANALYTICS', `Cleaned up ${originalLength - this.data.length} old data points`)
    }
  }

  private saveToStorage(): void {
    try {
      // Keep only last 10k records to prevent storage bloat
      const recentData = this.data.slice(-10000)
      localStorage.setItem('domainFlipper_analytics', JSON.stringify(recentData))
    } catch (error) {
      logger.warn('ANALYTICS', 'Failed to save analytics to storage', error)
    }
  }

  private loadFromStorage(): void {
    try {
      const saved = localStorage.getItem('domainFlipper_analytics')
      if (saved) {
        this.data = JSON.parse(saved).map((d: any) => ({
          ...d,
          timestamp: new Date(d.timestamp),
        }))
      }
    } catch (error) {
      logger.warn('ANALYTICS', 'Failed to load analytics from storage', error)
    }
  }
}

export const advancedAnalytics = new AdvancedAnalytics()
