/**
 * Intelligent Scheduler
 * AI-powered timing optimization for all trading activities
 * December 2025 - The Time Lord
 */

import { logger } from '@/lib/utils/logger'
import { advancedAnalytics } from '@/lib/analytics/advancedAnalytics'
import { masterConfig } from '@/lib/config/MasterConfig'

export interface ScheduledTask {
  id: string
  name: string
  type: 'mining' | 'scanning' | 'bidding' | 'valuation' | 'listing' | 'sales' | 'maintenance'
  priority: number
  interval: number // base interval in milliseconds
  lastRun: Date
  nextRun: Date
  successRate: number
  optimalTimeSlots: TimeSlot[]
  marketConditions: MarketCondition[]
  enabled: boolean
}

export interface TimeSlot {
  startHour: number // 0-23
  endHour: number
  multiplier: number // performance multiplier for this time
  reason: string
}

export interface MarketCondition {
  condition: string
  impact: number // -1 to 1, negative = avoid, positive = prefer
  active: boolean
}

export class IntelligentScheduler {
  private tasks: Map<string, ScheduledTask> = new Map()
  private marketData: MarketData = {
    peakHours: [9, 10, 11, 14, 15, 16], // US business hours
    lowActivityHours: [2, 3, 4, 5, 6],
    weekendMultiplier: 0.7,
    holidayMultiplier: 0.5,
    currentHour: new Date().getHours(),
    isWeekend: false,
    isHoliday: false,
  }

  constructor() {
    this.initializeTasks()
    this.startMarketDataUpdates()
  }

  /**
   * Get next optimal run time for a task
   */
  getNextRunTime(taskId: string): Date {
    const task = this.tasks.get(taskId)
    if (!task || !task.enabled) {
      return new Date(Date.now() + 60000) // Default 1 minute
    }

    const now = new Date()
    let optimalTime = new Date(now.getTime() + task.interval)

    // Apply market-based adjustments
    optimalTime = this.adjustForMarketConditions(optimalTime, task)

    // Apply time slot optimization
    optimalTime = this.optimizeForTimeSlots(optimalTime, task)

    // Apply performance-based adjustments
    optimalTime = this.adjustForPerformance(optimalTime, task)

    // Ensure minimum interval
    const minTime = new Date(task.lastRun.getTime() + task.interval * 0.5)
    if (optimalTime < minTime) {
      optimalTime = minTime
    }

    return optimalTime
  }

  /**
   * Update task performance after execution
   */
  updateTaskPerformance(taskId: string, success: boolean, duration: number): void {
    const task = this.tasks.get(taskId)
    if (!task) return

    task.lastRun = new Date()

    // Update success rate (exponential moving average)
    const alpha = 0.1 // Learning rate
    task.successRate = task.successRate * (1 - alpha) + (success ? 100 : 0) * alpha

    // Adjust interval based on performance
    if (success && duration < task.interval * 0.5) {
      // Fast success - can run more frequently
      task.interval = Math.max(task.interval * 0.9, 5000) // Min 5 seconds
    } else if (!success) {
      // Failed - increase interval
      task.interval = Math.min(task.interval * 1.2, 3600000) // Max 1 hour
    }

    // Learn optimal time slots
    this.updateTimeSlotLearning(task, success, duration)

    this.tasks.set(taskId, task)
  }

  /**
   * Get all active tasks
   */
  getActiveTasks(): ScheduledTask[] {
    return Array.from(this.tasks.values()).filter(task => task.enabled)
  }

  /**
   * Enable/disable task
   */
  setTaskEnabled(taskId: string, enabled: boolean): void {
    const task = this.tasks.get(taskId)
    if (task) {
      task.enabled = enabled
      this.tasks.set(taskId, task)
      logger.info('SCHEDULER', `${enabled ? 'Enabled' : 'Disabled'} task: ${task.name}`)
    }
  }

  /**
   * Get current market conditions
   */
  getMarketConditions(): MarketData {
    return { ...this.marketData }
  }

  // Private methods

  private initializeTasks(): void {
    const tasks: ScheduledTask[] = [
      {
        id: 'domain_mining',
        name: 'Domain Mining',
        type: 'mining',
        priority: 8,
        interval: 1800000, // 30 minutes
        lastRun: new Date(Date.now() - 1800000),
        nextRun: new Date(),
        successRate: 85,
        optimalTimeSlots: this.getDefaultTimeSlots('mining'),
        marketConditions: this.getDefaultMarketConditions('mining'),
        enabled: true,
      },
      {
        id: 'domain_scanning',
        name: 'Domain Scanning',
        type: 'scanning',
        priority: 9,
        interval: 300000, // 5 minutes
        lastRun: new Date(Date.now() - 300000),
        nextRun: new Date(),
        successRate: 90,
        optimalTimeSlots: this.getDefaultTimeSlots('scanning'),
        marketConditions: this.getDefaultMarketConditions('scanning'),
        enabled: true,
      },
      {
        id: 'bidding_execution',
        name: 'Bidding Execution',
        type: 'bidding',
        priority: 10,
        interval: 60000, // 1 minute
        lastRun: new Date(Date.now() - 60000),
        nextRun: new Date(),
        successRate: 75,
        optimalTimeSlots: this.getDefaultTimeSlots('bidding'),
        marketConditions: this.getDefaultMarketConditions('bidding'),
        enabled: true,
      },
      {
        id: 'domain_valuation',
        name: 'Domain Valuation',
        type: 'valuation',
        priority: 7,
        interval: 600000, // 10 minutes
        lastRun: new Date(Date.now() - 600000),
        nextRun: new Date(),
        successRate: 95,
        optimalTimeSlots: this.getDefaultTimeSlots('valuation'),
        marketConditions: this.getDefaultMarketConditions('valuation'),
        enabled: true,
      },
      {
        id: 'marketplace_listing',
        name: 'Marketplace Listing',
        type: 'listing',
        priority: 6,
        interval: 1800000, // 30 minutes
        lastRun: new Date(Date.now() - 1800000),
        nextRun: new Date(),
        successRate: 80,
        optimalTimeSlots: this.getDefaultTimeSlots('listing'),
        marketConditions: this.getDefaultMarketConditions('listing'),
        enabled: true,
      },
      {
        id: 'sales_monitoring',
        name: 'Sales Monitoring',
        type: 'sales',
        priority: 9,
        interval: 300000, // 5 minutes
        lastRun: new Date(Date.now() - 300000),
        nextRun: new Date(),
        successRate: 85,
        optimalTimeSlots: this.getDefaultTimeSlots('sales'),
        marketConditions: this.getDefaultMarketConditions('sales'),
        enabled: true,
      },
      {
        id: 'system_maintenance',
        name: 'System Maintenance',
        type: 'maintenance',
        priority: 5,
        interval: 3600000, // 1 hour
        lastRun: new Date(Date.now() - 3600000),
        nextRun: new Date(),
        successRate: 100,
        optimalTimeSlots: this.getDefaultTimeSlots('maintenance'),
        marketConditions: this.getDefaultMarketConditions('maintenance'),
        enabled: true,
      },
    ]

    tasks.forEach(task => {
      this.tasks.set(task.id, task)
    })
  }

  private adjustForMarketConditions(time: Date, task: ScheduledTask): Date {
    let adjustedTime = new Date(time)

    // Weekend adjustment
    if (this.marketData.isWeekend && task.marketConditions.find(c => c.condition === 'weekend')?.active) {
      const weekendImpact = task.marketConditions.find(c => c.condition === 'weekend')?.impact || 0
      if (weekendImpact < 0) {
        // Delay for weekends
        adjustedTime.setTime(adjustedTime.getTime() + Math.abs(weekendImpact) * task.interval)
      }
    }

    // Holiday adjustment
    if (this.marketData.isHoliday && task.marketConditions.find(c => c.condition === 'holiday')?.active) {
      const holidayImpact = task.marketConditions.find(c => c.condition === 'holiday')?.impact || 0
      if (holidayImpact < 0) {
        adjustedTime.setTime(adjustedTime.getTime() + Math.abs(holidayImpact) * task.interval)
      }
    }

    // Peak hours adjustment for bidding
    if (task.type === 'bidding') {
      const currentHour = adjustedTime.getHours()
      const isPeakHour = this.marketData.peakHours.includes(currentHour)

      if (isPeakHour) {
        // Prefer peak hours for bidding
        // Time is already good
      } else {
        // Find next peak hour
        const nextPeakHour = this.marketData.peakHours.find(hour => hour > currentHour) || this.marketData.peakHours[0]
        if (nextPeakHour !== currentHour) {
          adjustedTime.setHours(nextPeakHour, 0, 0, 0)
          if (adjustedTime < time) {
            // Next peak hour is tomorrow
            adjustedTime.setDate(adjustedTime.getDate() + 1)
          }
        }
      }
    }

    return adjustedTime
  }

  private optimizeForTimeSlots(time: Date, task: ScheduledTask): Date {
    if (task.optimalTimeSlots.length === 0) return time

    const currentHour = time.getHours()
    let bestSlot: TimeSlot | null = null
    let bestScore = 0

    // Find the best time slot
    for (const slot of task.optimalTimeSlots) {
      if (currentHour >= slot.startHour && currentHour <= slot.endHour) {
        // Already in optimal slot
        return time
      }

      const score = slot.multiplier
      if (score > bestScore) {
        bestScore = score
        bestSlot = slot
      }
    }

    if (bestSlot) {
      const adjustedTime = new Date(time)
      adjustedTime.setHours(bestSlot.startHour, 0, 0, 0)

      // If the best slot is tomorrow, use it
      if (adjustedTime < time) {
        adjustedTime.setDate(adjustedTime.getDate() + 1)
      }

      return adjustedTime
    }

    return time
  }

  private adjustForPerformance(time: Date, task: ScheduledTask): Date {
    let adjustedTime = new Date(time)

    // If success rate is low, increase interval
    if (task.successRate < 60) {
      adjustedTime.setTime(adjustedTime.getTime() + task.interval * 0.5)
    }

    // If success rate is high and priority is high, decrease interval
    if (task.successRate > 90 && task.priority > 7) {
      adjustedTime.setTime(Math.max(adjustedTime.getTime() - task.interval * 0.2, Date.now() + 5000))
    }

    return adjustedTime
  }

  private updateTimeSlotLearning(task: ScheduledTask, success: boolean, duration: number): void {
    const currentHour = new Date().getHours()
    const performance = success ? (duration < task.interval * 0.5 ? 1.5 : 1.0) : 0.5

    // Find or create time slot
    let slot = task.optimalTimeSlots.find(s => currentHour >= s.startHour && currentHour <= s.endHour)

    if (!slot) {
      slot = {
        startHour: Math.floor(currentHour / 3) * 3, // 3-hour blocks
        endHour: Math.floor(currentHour / 3) * 3 + 2,
        multiplier: 1.0,
        reason: 'Learned from performance data',
      }
      task.optimalTimeSlots.push(slot)
    }

    // Update multiplier using exponential moving average
    const alpha = 0.1
    slot.multiplier = slot.multiplier * (1 - alpha) + performance * alpha

    // Keep only top 5 slots
    task.optimalTimeSlots.sort((a, b) => b.multiplier - a.multiplier)
    task.optimalTimeSlots = task.optimalTimeSlots.slice(0, 5)
  }

  private getDefaultTimeSlots(taskType: string): TimeSlot[] {
    switch (taskType) {
      case 'bidding':
        return [
          { startHour: 9, endHour: 11, multiplier: 1.3, reason: 'Peak US business hours' },
          { startHour: 14, endHour: 16, multiplier: 1.2, reason: 'Afternoon trading session' },
        ]
      case 'mining':
        return [
          { startHour: 2, endHour: 6, multiplier: 1.2, reason: 'Low API load hours' },
          { startHour: 18, endHour: 22, multiplier: 1.1, reason: 'Evening maintenance window' },
        ]
      case 'valuation':
        return [
          { startHour: 10, endHour: 15, multiplier: 1.1, reason: 'Business hours for fresh data' },
        ]
      default:
        return []
    }
  }

  private getDefaultMarketConditions(taskType: string): MarketCondition[] {
    const conditions: MarketCondition[] = [
      { condition: 'weekend', impact: -0.3, active: true },
      { condition: 'holiday', impact: -0.5, active: true },
      { condition: 'high_volatility', impact: -0.2, active: true },
      { condition: 'market_crash', impact: -0.8, active: true },
    ]

    // Adjust based on task type
    if (taskType === 'bidding') {
      conditions.find(c => c.condition === 'high_volatility')!.impact = 0.2 // Good for bidding
    }

    return conditions
  }

  private startMarketDataUpdates(): void {
    // Update market data every hour
    setInterval(() => {
      this.updateMarketData()
    }, 3600000)

    // Initial update
    this.updateMarketData()
  }

  private updateMarketData(): void {
    const now = new Date()
    const dayOfWeek = now.getDay()
    const hour = now.getHours()

    this.marketData.currentHour = hour
    this.marketData.isWeekend = dayOfWeek === 0 || dayOfWeek === 6

    // Simple holiday detection (would need a proper calendar API)
    this.marketData.isHoliday = false // For now

    logger.debug('SCHEDULER', 'Updated market data', this.marketData)
  }
}

export interface MarketData {
  peakHours: number[]
  lowActivityHours: number[]
  weekendMultiplier: number
  holidayMultiplier: number
  currentHour: number
  isWeekend: boolean
  isHoliday: boolean
}

export const intelligentScheduler = new IntelligentScheduler()
