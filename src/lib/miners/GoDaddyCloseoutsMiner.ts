/**
 * GoDaddyCloseoutsMiner.ts — $5-$11 Closeout Gold Mining
 * Mines GoDaddy Closeouts section for undervalued domains
 * December 2025 — The Hidden Goldmine
 */

import { BaseMiner } from './BaseMiner'
import type { CloseoutDomain } from './types'
import { masterConfig } from '@/lib/config/MasterConfig'
import { logger } from '@/lib/utils/logger'

export class GoDaddyCloseoutsMiner extends BaseMiner {
  private readonly CLOSEOUT_URL = 'https://auctions.godaddy.com/trpItemListing.aspx'
  private readonly APPRAISAL_URL = 'https://www.godaddy.com/domain-value-appraisal'
  
  constructor() {
    super('godaddy_closeouts', {
      intervalMs: 30 * 60 * 1000, // Every 30 minutes
      minValue: 800,
      maxPrice: 11.99,
      minRoi: 50,
    })
  }

  /**
   * Mine GoDaddy Closeouts
   */
  protected async mineSource(): Promise<CloseoutDomain[]> {
    const domains: CloseoutDomain[] = []
    
    try {
      // Get GoDaddy credentials
      const gdConfig = masterConfig.getGoDaddy()
      if (!gdConfig.apiKey || !gdConfig.apiSecret) {
        console.warn('GoDaddy credentials not configured, using demo mode')
        return this.getDemoCloseouts()
      }

      // Fetch closeout listings
      const closeouts = await this.fetchCloseoutListings()
      
      for (const closeout of closeouts) {
        // Only process true closeouts ($11.99 or less)
        if (closeout.price > 11.99) continue
        
        // Get GoDaddy's own appraisal
        const appraisal = await this.getGoDaddyAppraisal(closeout.domain)
        
        domains.push({
          domain: closeout.domain,
          price: closeout.price,
          auctionEnds: closeout.endTime,
          bids: closeout.bids,
          estValue: appraisal,
          traffic: closeout.traffic || 0,
          backlinks: closeout.backlinks || 0,
          age: closeout.age || 0,
        })
      }
      
    } catch (error: any) {
      console.error('GoDaddy Closeouts mining error:', error.message)
      // Return demo data on error
      return this.getDemoCloseouts()
    }

    return domains
  }

  /**
   * Fetch closeout listings from GoDaddy — Uses Vercel proxy to bypass CORS
   */
  private async fetchCloseoutListings(): Promise<Array<{
    domain: string
    price: number
    endTime: string
    bids: number
    traffic?: number
    backlinks?: number
    age?: number
  }>> {
    try {
      // Use Vercel serverless proxy to bypass CORS
      const proxyUrl = '/api/godaddy/closeouts?limit=200'
      
      const response = await fetch(proxyUrl, {
        method: 'GET',
      })

      if (!response.ok) {
        console.warn(`GoDaddy closeouts proxy returned ${response.status}`)
        return []
      }

      const data = await response.json()
      
      return data.auctions?.map((auction: any) => ({
        domain: auction.domain || auction.domainName,
        price: parseFloat(auction.price || auction.currentBid || '11.99'),
        endTime: auction.endTime || auction.auctionEndTime,
        bids: auction.bidCount || 0,
        traffic: auction.traffic || 0,
        backlinks: auction.backlinks || 0,
        age: auction.domainAge || 0,
      })) || []
      
    } catch (error) {
      console.warn('Using fallback closeout data')
      return []
    }
  }

  /**
   * Get GoDaddy's domain appraisal — Uses Vercel proxy to bypass CORS
   */
  private async getGoDaddyAppraisal(domain: string): Promise<number> {
    try {
      // Use Vercel serverless proxy to bypass CORS
      const proxyUrl = `/api/godaddy/appraisal?domain=${encodeURIComponent(domain)}`
      
      const response = await fetch(proxyUrl, {
        method: 'GET',
      })

      if (!response.ok) {
        return this.estimateValue(domain)
      }

      const data = await response.json()
      return data.govalue || this.estimateValue(domain)
      
    } catch (error) {
      return this.estimateValue(domain)
    }
  }

  /**
   * Fallback value estimation
   */
  private estimateValue(domain: string): number {
    let value = 500 // Base value
    
    const name = domain.split('.')[0]
    const tld = '.' + domain.split('.').pop()
    
    // Length bonus
    if (name.length <= 4) value *= 5
    else if (name.length <= 6) value *= 3
    else if (name.length <= 8) value *= 2
    
    // TLD bonus
    if (tld === '.com') value *= 2
    else if (tld === '.io' || tld === '.ai') value *= 1.8
    else if (tld === '.co') value *= 1.5
    
    // Keyword bonuses
    const premiumKeywords = ['ai', 'tech', 'cloud', 'data', 'app', 'hub', 'pro', 'dev']
    for (const kw of premiumKeywords) {
      if (name.toLowerCase().includes(kw)) {
        value *= 1.5
        break
      }
    }
    
    // Brandable bonus
    if (/^[a-z]+$/.test(name.toLowerCase()) && name.length <= 10) {
      value *= 1.4
    }
    
    return Math.round(value)
  }

  /**
   * NO MOCK DATA — Returns empty when real API unavailable
   */
  private getDemoCloseouts(): CloseoutDomain[] {
    // NO MOCK DATA — Real API required
    logger.warn('GODADDY_CLOSEOUTS', 'Real API unavailable, no mock data returned')
    return []
  }
}

export const godaddyCloseoutsMiner = new GoDaddyCloseoutsMiner()

