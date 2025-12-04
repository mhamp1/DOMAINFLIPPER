/**
 * GoDaddy Auctions Sniper
 * Real-time auction monitoring and last-second bidding
 * Integrates with GoDaddy API for actual sniping
 * December 27, 2025
 */

import { createGoDaddyClient } from '@/lib/api/godaddy'
import { valuationEngine } from '@/lib/ai/valuationEngine'
import { soundEngine } from '@/lib/sounds/soundEffects'
import { generateId } from '@/lib/utils'
import { toast } from 'sonner'
import confetti from 'canvas-confetti'
import type { Domain } from '@/types/domain'

interface GoDaddySniperConfig {
  apiKey: string
  apiSecret: string
  sandbox?: boolean
  minROI?: number // Only snipe 10x+ domains
  maxBid?: number
}

interface ScheduledSnipe {
  domain: string
  auctionId: string
  endTime: Date
  maxBid: number
  estimatedValue: number
  timer?: ReturnType<typeof setTimeout>
}

export class GoDaddySniper {
  private config: GoDaddySniperConfig
  private godaddyClient: ReturnType<typeof createGoDaddyClient>
  private scheduledSnipes: Map<string, ScheduledSnipe> = new Map()
  private activeSnipes: Set<string> = new Set()

  constructor(config: GoDaddySniperConfig) {
    this.config = {
      minROI: 10,
      maxBid: 100000,
      ...config,
    }
    this.godaddyClient = createGoDaddyClient({
      apiKey: config.apiKey,
      apiSecret: config.apiSecret,
      sandbox: config.sandbox,
    })
  }

  /**
   * Monitor auction and schedule snipe if profitable
   */
  async monitorAuction(auctionId: string): Promise<boolean> {
    try {
      // Get auction details
      const auction = await this.godaddyClient.getAuction(auctionId)
      
      if (!auction.domain || !auction.endTime) {
        console.warn(`Invalid auction data for ${auctionId}`)
        return false
      }

      // Valuate domain
      const domainData: Partial<Domain> = {
        name: auction.domain,
        tld: '.' + auction.domain.split('.').pop(),
        length: auction.domain.split('.')[0].length,
        currentBid: auction.currentBid,
      }
      
      const valuation = await valuationEngine.predictValue(domainData)

      // Only snipe if ROI is 10x+
      const estimatedValue = valuation.value
      const currentBid = auction.currentBid || auction.minBid || 0
      
      if (currentBid <= 0) {
        console.log(`Skipping ${auction.domain}: No valid bid amount`)
        return false
      }

      const maxBid = Math.min(this.config.maxBid!, estimatedValue * 0.1) // Max 10% of value
      const roi = (estimatedValue - maxBid) / maxBid

      if (roi < this.config.minROI!) {
        console.log(`Skipping ${auction.domain}: ROI ${roi.toFixed(1)}x < ${this.config.minROI}x`)
        return false
      }

      // Schedule snipe for last 3 seconds
      const endTime = new Date(auction.endTime)
      this.scheduleSnipe(auction.domain, auctionId, endTime, maxBid, estimatedValue)

      console.log(`🎯 SNIPE SCHEDULED: ${auction.domain} at ${endTime.toISOString()}`)
      return true
    } catch (error) {
      console.error(`Failed to monitor auction ${auctionId}:`, error)
      return false
    }
  }

  /**
   * Schedule snipe for last 3 seconds before auction ends
   */
  private scheduleSnipe(
    domain: string,
    auctionId: string,
    endTime: Date,
    maxBid: number,
    estimatedValue: number
  ) {
    const now = new Date()
    const delay = Math.max(0, endTime.getTime() - now.getTime() - 3000) // 3 seconds before end

    if (delay <= 0) {
      // Auction ending soon, snipe immediately
      this.executeSnipe(domain, auctionId, maxBid)
      return
    }

    const timer = setTimeout(() => {
      this.executeSnipe(domain, auctionId, maxBid)
      this.scheduledSnipes.delete(auctionId)
    }, delay)

    this.scheduledSnipes.set(auctionId, {
      domain,
      auctionId,
      endTime,
      maxBid,
      estimatedValue,
      timer,
    })
  }

  /**
   * Execute snipe bid
   */
  private async executeSnipe(domain: string, auctionId: string, maxBid: number) {
    if (this.activeSnipes.has(auctionId)) {
      console.log(`Snipe already in progress for ${domain}`)
      return
    }

    this.activeSnipes.add(auctionId)
    soundEngine.snipeAlert()

    try {
      const result = await this.godaddyClient.placeBid(auctionId, maxBid)

      if (result.success) {
        console.log(`✅ SNIPE SUCCESS: ${domain} for $${maxBid}`)
        soundEngine.success()
        
        // Gold confetti
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#D4AF37', '#FFD700', '#F0E68C', '#B8941E']
        })

        toast.success(`SNIPED: ${domain}`, {
          description: `Acquired for $${maxBid.toLocaleString()}`,
          icon: '💎',
        })
      } else {
        console.log(`❌ SNIPE FAILED: ${domain}`)
        soundEngine.error()
        toast.error('Snipe Failed', {
          description: `Could not acquire ${domain}`,
        })
      }
    } catch (error) {
      console.error(`Snipe error for ${domain}:`, error)
      soundEngine.error()
      toast.error('Snipe Error', {
        description: `Failed to snipe ${domain}`,
      })
    } finally {
      this.activeSnipes.delete(auctionId)
    }
  }

  /**
   * Search for profitable auctions
   */
  async searchProfitableAuctions(keyword?: string, limit = 100): Promise<string[]> {
    try {
      const auctions = keyword
        ? await this.godaddyClient.searchAuctions(keyword)
        : await this.godaddyClient.searchExpiringDomains({ limit })

      const profitableAuctions: string[] = []

      // Check each auction for profitability
      for (const auction of auctions.slice(0, limit)) {
        if (auction.auctionId) {
          const shouldSnipe = await this.monitorAuction(auction.auctionId)
          if (shouldSnipe) {
            profitableAuctions.push(auction.auctionId)
          }
        }
      }

      return profitableAuctions
    } catch (error) {
      console.error('Failed to search auctions:', error)
      return []
    }
  }

  /**
   * Cancel scheduled snipe
   */
  cancelSnipe(auctionId: string) {
    const scheduled = this.scheduledSnipes.get(auctionId)
    if (scheduled?.timer) {
      clearTimeout(scheduled.timer)
      this.scheduledSnipes.delete(auctionId)
    }
  }

  /**
   * Get all scheduled snipes
   */
  getScheduledSnipes(): ScheduledSnipe[] {
    return Array.from(this.scheduledSnipes.values())
  }

  /**
   * Get active snipe count
   */
  getActiveSnipeCount(): number {
    return this.activeSnipes.size
  }
}

export const createGoDaddySniper = (config: GoDaddySniperConfig) => 
  new GoDaddySniper(config)

