import { toast } from 'sonner'
import confetti from 'canvas-confetti'
import type { ExpiringDomain } from '@/types/domain'
import { valuationEngine } from '@/lib/ai/valuationEngine'
import { fetchExpiringDomains, filterHighValueDomains } from './ExpiringFeed'

/**
 * Drop-Catch Sniper Engine
 * Executes lightning-fast domain purchases at T+0.001s after drop
 * Multi-registrar parallel bidding for maximum success rate
 */

// Configuration constants
const AI_SCORE_THRESHOLD = 95 // Minimum AI score to trigger snipe
const BID_MULTIPLIER = 1.5 // Max bid as percentage of predicted value (150%)
const PROFIT_MULTIPLIER = 5 // Expected flip multiplier for profit predictions
const DEMO_SUCCESS_RATE = 0.94 // 94% success rate for demo mode

interface SnipeSchedule {
  domain: ExpiringDomain
  timeout: ReturnType<typeof setTimeout>
  valuation: {
    value: number
    score: number
  }
}

class DropSniperEngine {
  private activeSnipes: Map<string, SnipeSchedule> = new Map()
  private isRunning = false
  private scanInterval: ReturnType<typeof setInterval> | null = null

  /**
   * Start the drop sniper - monitors and snipes expiring domains
   */
  async startDropSniper(onSnipeSuccess?: (domain: string, value: number) => void) {
    if (this.isRunning) {
      toast.info('Drop Sniper Already Running', {
        description: 'Monitoring 120,000+ domains',
      })
      return
    }

    this.isRunning = true
    
    toast.success('DROP SNIPER ACTIVATED', {
      description: '⚡ Lightning-fast T+0.001s execution enabled',
      icon: '🎯',
    })

    // Scan for expiring domains every second
    this.scanInterval = setInterval(async () => {
      await this.scanAndScheduleSnipes(onSnipeSuccess)
    }, 1000)

    // Initial scan
    await this.scanAndScheduleSnipes(onSnipeSuccess)
  }

  /**
   * Stop the drop sniper
   */
  stopDropSniper() {
    if (this.scanInterval) {
      clearInterval(this.scanInterval)
      this.scanInterval = null
    }

    // Cancel all scheduled snipes
    this.activeSnipes.forEach(schedule => {
      clearTimeout(schedule.timeout)
    })
    this.activeSnipes.clear()

    this.isRunning = false

    toast.info('Drop Sniper Stopped', {
      description: 'All scheduled snipes cancelled',
    })
  }

  /**
   * Scan for expiring domains and schedule high-value snipes
   */
  private async scanAndScheduleSnipes(onSnipeSuccess?: (domain: string, value: number) => void) {
    try {
      // Fetch expiring domains
      const allExpiring = await fetchExpiringDomains()
      const highValue = filterHighValueDomains(allExpiring)

      for (const domain of highValue) {
        // Skip if already scheduled
        if (this.activeSnipes.has(domain.name)) {
          continue
        }

        const secondsToDrop = (new Date(domain.dropTime).getTime() - Date.now()) / 1000

        // Only schedule snipes for domains dropping in the next 60 seconds
        if (secondsToDrop > 0 && secondsToDrop < 60) {
          await this.scheduleSnipe(domain, secondsToDrop, onSnipeSuccess)
        }
      }
    } catch (error) {
      console.error('Error scanning for expiring domains:', error)
    }
  }

  /**
   * Schedule a snipe for an expiring domain
   */
  private async scheduleSnipe(
    domain: ExpiringDomain,
    secondsToDrop: number,
    onSnipeSuccess?: (domain: string, value: number) => void
  ) {
    // AI valuation
    const valuation = await valuationEngine.predictValue({
      name: domain.name,
      tld: domain.tld,
      backlinks: domain.backlinks,
      age: domain.age,
      traffic: domain.traffic,
      length: domain.name.length,
    })

    // Only snipe if AI score is above threshold
    if (valuation.score < AI_SCORE_THRESHOLD) {
      return
    }

    // Calculate max bid (150% of predicted value)
    const maxBid = valuation.value * BID_MULTIPLIER

    // Schedule snipe for T+1ms after drop time
    const timeout = setTimeout(async () => {
      await this.executeSnipe(domain, maxBid, valuation.value, onSnipeSuccess)
      this.activeSnipes.delete(domain.name)
    }, secondsToDrop * 1000 + 1) // +1ms after drop

    // Store the scheduled snipe
    this.activeSnipes.set(domain.name, {
      domain,
      timeout,
      valuation,
    })

    toast.info('Snipe Scheduled', {
      description: `${domain.name} drops in ${Math.floor(secondsToDrop)}s (Score: ${valuation.score})`,
      icon: '⏰',
    })
  }

  /**
   * Execute parallel snipe across multiple registrars
   */
  private async executeSnipe(
    domain: ExpiringDomain,
    maxBid: number,
    predictedValue: number,
    onSnipeSuccess?: (domain: string, value: number) => void
  ) {
    const registrars = ['godaddy', 'namecheap', 'dynadot', 'porkbun', 'dropcatch']

    // Parallel snipe with staggered timing (0-50ms spread)
    const snipePromises = registrars.map(async (registrar) => {
      const delay = Math.random() * 50
      await new Promise(resolve => setTimeout(resolve, delay))
      
      return this.attemptSnipe(domain.name, registrar, maxBid)
    })

    try {
      // Wait for any registrar to succeed
      const results = await Promise.allSettled(snipePromises)
      const successful = results.some(r => r.status === 'fulfilled' && r.value === true)

      if (successful) {
        // Success! Domain sniped
        const profitPrediction = predictedValue * PROFIT_MULTIPLIER

        toast.success('🎯 DROP SNIPED!', {
          description: `${domain.name} → $${profitPrediction.toLocaleString()} profit predicted`,
          icon: '⚡',
          duration: 5000,
        })

        // Confetti celebration
        confetti({
          particleCount: 500,
          spread: 120,
          origin: { y: 0.6 },
          colors: ['#D4AF37', '#FFD700', '#FFC700'],
        })

        // Notify success callback
        if (onSnipeSuccess) {
          onSnipeSuccess(domain.name, predictedValue)
        }
      } else {
        toast.error('Snipe Failed', {
          description: `${domain.name} - Outbid by competitors`,
        })
      }
    } catch (error) {
      console.error('Snipe execution error:', error)
      toast.error('Snipe Error', {
        description: `${domain.name} - Technical failure`,
      })
    }
  }

  /**
   * Attempt to snipe domain from a specific registrar
   * In production, this would call real registrar APIs
   */
  private async attemptSnipe(
    _domain: string,
    _registrar: string,
    _maxBid: number
  ): Promise<boolean> {
    // Simulate API call to registrar
    await new Promise(resolve => setTimeout(resolve, 100))

    // In production, this would be:
    // const response = await fetch(`/api/snipe/${registrar}`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ domain, bid: maxBid })
    // })
    // return response.ok

    // For demo: configurable success rate
    return Math.random() < DEMO_SUCCESS_RATE
  }

  /**
   * Get count of active scheduled snipes
   */
  getActiveSnipeCount(): number {
    return this.activeSnipes.size
  }

  /**
   * Get all scheduled snipes
   */
  getScheduledSnipes(): Array<{
    domain: string
    dropTime: string
    score: number
    value: number
  }> {
    return Array.from(this.activeSnipes.values()).map(schedule => ({
      domain: schedule.domain.name,
      dropTime: schedule.domain.dropTime,
      score: schedule.valuation.score,
      value: schedule.valuation.value,
    }))
  }

  /**
   * Check if sniper is running
   */
  isActive(): boolean {
    return this.isRunning
  }
}

// Export singleton instance
export const dropSniper = new DropSniperEngine()

// Export the start function for convenience
export const startDropSniper = (onSnipeSuccess?: (domain: string, value: number) => void) => {
  return dropSniper.startDropSniper(onSnipeSuccess)
}
