/**
 * RealSniper.ts — PRODUCTION Domain Sniper
 * Actually purchases/bids on domains
 * December 2025
 */

import { godaddyAPI } from '@/lib/api/godaddyReal'
import { namecheapAPI } from '@/lib/api/namecheapReal'
import { empireSettings } from '@/lib/config/EmpireSettings'
import { pipelineSettings } from '@/lib/config/settingsService'
import { logger } from '@/lib/utils/logger'
import { toast } from 'sonner'
import type { ScannedDomain } from '@/lib/scanner/RealDomainScanner'

export interface SnipeResult {
  success: boolean
  domain: string
  source: string
  price: number
  orderId?: string
  message: string
  type: 'purchase' | 'bid'
}

class RealSniper {
  private pendingSnipes: Map<string, { domain: string; maxBid: number; startTime: Date }> = new Map()
  private completedSnipes: SnipeResult[] = []

  constructor() {
    logger.info('SNIPER', 'Real Sniper initialized')
  }

  /**
   * Snipe a domain — REAL PURCHASE (respects DRY_RUN and settings)
   */
  async snipe(domain: ScannedDomain, maxBid?: number, estimatedValue?: number): Promise<SnipeResult> {
    // Check DRY_RUN mode first
    const isDryRun = pipelineSettings.isDryRun()
    if (isDryRun) {
      logger.info('SNIPER', `[DRY_RUN] Would snipe ${domain.domain} for $${domain.price}`)
      return {
        success: true,
        domain: domain.domain,
        source: domain.source,
        price: domain.price,
        message: '[DRY_RUN] Simulated purchase',
        type: domain.type === 'auction' ? 'bid' : 'purchase',
      }
    }

    // Check against pipeline settings
    if (estimatedValue) {
      const purchaseCheck = pipelineSettings.canPurchase(domain.domain, domain.price, estimatedValue)
      if (!purchaseCheck.allowed) {
        return {
          success: false,
          domain: domain.domain,
          source: domain.source,
          price: domain.price,
          message: purchaseCheck.reason || 'Blocked by settings',
          type: domain.type === 'auction' ? 'bid' : 'purchase',
        }
      }
    }

    const budget = maxBid || empireSettings.get('dailyBudget')
    const dailyLimit = pipelineSettings.getDailySpendLimit()
    
    // Check if we have enough capital
    const available = empireSettings.getAvailableCapital()
    if (domain.price > available) {
      return {
        success: false,
        domain: domain.domain,
        source: domain.source,
        price: domain.price,
        message: `Insufficient funds: $${domain.price} > $${available} available`,
        type: domain.type === 'auction' ? 'bid' : 'purchase',
      }
    }

    // Check daily budget from settings
    if (domain.price > dailyLimit) {
      return {
        success: false,
        domain: domain.domain,
        source: domain.source,
        price: domain.price,
        message: `Exceeds daily limit: $${domain.price} > $${dailyLimit}`,
        type: domain.type === 'auction' ? 'bid' : 'purchase',
      }
    }

    // Check daily budget from empire settings
    if (domain.price > budget) {
      return {
        success: false,
        domain: domain.domain,
        source: domain.source,
        price: domain.price,
        message: `Exceeds daily budget: $${domain.price} > $${budget}`,
        type: domain.type === 'auction' ? 'bid' : 'purchase',
      }
    }

    logger.info('SNIPER', `Attempting to snipe ${domain.domain} for $${domain.price}`, domain)

    try {
      let result: SnipeResult

      if (domain.source === 'godaddy') {
        result = await this.snipeGoDaddy(domain, maxBid)
      } else if (domain.source === 'namecheap') {
        result = await this.snipeNamecheap(domain)
      } else {
        result = {
          success: false,
          domain: domain.domain,
          source: domain.source,
          price: domain.price,
          message: `Unknown source: ${domain.source}`,
          type: 'purchase',
        }
      }

      // Track completed snipes
      this.completedSnipes.unshift(result)
      if (this.completedSnipes.length > 100) this.completedSnipes.pop()

      // Update empire settings on success
      if (result.success) {
        empireSettings.recordPurchase(result.price)
        toast.success('🎯 DOMAIN ACQUIRED!', {
          description: `${result.domain} for $${result.price.toFixed(2)}`,
          duration: 10000,
        })
      }

      return result

    } catch (error: any) {
      logger.error('SNIPER', `Snipe failed for ${domain.domain}`, error)
      return {
        success: false,
        domain: domain.domain,
        source: domain.source,
        price: domain.price,
        message: error.message || 'Snipe failed',
        type: domain.type === 'auction' ? 'bid' : 'purchase',
      }
    }
  }

  /**
   * Snipe via GoDaddy
   */
  private async snipeGoDaddy(domain: ScannedDomain, maxBid?: number): Promise<SnipeResult> {
    if (!godaddyAPI.isReady()) {
      return {
        success: false,
        domain: domain.domain,
        source: 'godaddy',
        price: domain.price,
        message: 'GoDaddy API not configured',
        type: domain.type === 'auction' ? 'bid' : 'purchase',
      }
    }

    // Auction bid
    if (domain.type === 'auction' && domain.auctionId) {
      const bidAmount = Math.min(maxBid || domain.price, empireSettings.get('dailyBudget'))
      const bidResult = await godaddyAPI.placeBid(domain.auctionId, bidAmount)
      
      return {
        success: bidResult.success,
        domain: domain.domain,
        source: 'godaddy',
        price: bidResult.newPrice || domain.price,
        orderId: bidResult.bidId,
        message: bidResult.message,
        type: 'bid',
      }
    }

    // Direct purchase
    const purchaseResult = await godaddyAPI.purchaseDomain(domain.domain)
    
    return {
      success: purchaseResult.success,
      domain: domain.domain,
      source: 'godaddy',
      price: domain.price,
      orderId: purchaseResult.orderId,
      message: purchaseResult.message,
      type: 'purchase',
    }
  }

  /**
   * Snipe via Namecheap
   */
  private async snipeNamecheap(domain: ScannedDomain): Promise<SnipeResult> {
    if (!namecheapAPI.isReady()) {
      return {
        success: false,
        domain: domain.domain,
        source: 'namecheap',
        price: domain.price,
        message: 'Namecheap API not configured',
        type: 'purchase',
      }
    }

    const purchaseResult = await namecheapAPI.registerDomain(domain.domain)
    
    return {
      success: purchaseResult.success,
      domain: domain.domain,
      source: 'namecheap',
      price: purchaseResult.charged || domain.price,
      orderId: purchaseResult.orderId,
      message: purchaseResult.message,
      type: 'purchase',
    }
  }

  /**
   * Batch snipe multiple domains
   */
  async snipeBatch(domains: ScannedDomain[], maxPerDomain?: number): Promise<SnipeResult[]> {
    const results: SnipeResult[] = []
    const maxBid = maxPerDomain || empireSettings.get('dailyBudget') / 5 // Max 20% of daily budget per domain

    for (const domain of domains) {
      // Check if we still have capital
      if (empireSettings.getAvailableCapital() < domain.price) {
        logger.warn('SNIPER', 'Stopping batch snipe - insufficient capital')
        break
      }

      const result = await this.snipe(domain, maxBid)
      results.push(result)

      // Small delay between snipes
      await new Promise(r => setTimeout(r, 500))
    }

    logger.info('SNIPER', `Batch snipe complete: ${results.filter(r => r.success).length}/${results.length} successful`)
    return results
  }

  /**
   * Get snipe history
   */
  getHistory(): SnipeResult[] {
    return [...this.completedSnipes]
  }

  /**
   * Get stats
   */
  getStats(): {
    totalSnipes: number
    successfulSnipes: number
    totalSpent: number
    lastSnipe: SnipeResult | null
  } {
    const successful = this.completedSnipes.filter(s => s.success)
    
    return {
      totalSnipes: this.completedSnipes.length,
      successfulSnipes: successful.length,
      totalSpent: successful.reduce((sum, s) => sum + s.price, 0),
      lastSnipe: this.completedSnipes[0] || null,
    }
  }
}

export const realSniper = new RealSniper()

