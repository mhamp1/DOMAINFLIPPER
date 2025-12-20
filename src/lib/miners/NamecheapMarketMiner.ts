/**
 * NamecheapMarketMiner.ts — $2-$8 Stealth Goldmine
 * Mines Namecheap Marketplace for ultra-low-cost high-value domains
 * December 2025 — The Hidden Empire Builder
 */

import { BaseMiner } from './BaseMiner'
import type { CloseoutDomain } from './types'
import { masterConfig } from '@/lib/config/MasterConfig'
import { logger } from '@/lib/utils/logger'

export class NamecheapMarketMiner extends BaseMiner {
  private readonly MARKET_URL = 'https://www.namecheap.com/domains/marketplace/buy-domains/'
  
  constructor() {
    super('namecheap_market', {
      intervalMs: 40 * 60 * 1000, // Every 40 minutes
      minValue: 1000,
      maxPrice: 10,
      minRoi: 80,
    })
  }

  /**
   * Mine Namecheap Marketplace
   */
  protected async mineSource(): Promise<CloseoutDomain[]> {
    const domains: CloseoutDomain[] = []
    
    try {
      const ncConfig = masterConfig.getNamecheap()
      if (!ncConfig.apiUser || !ncConfig.apiKey) {
        console.warn('Namecheap credentials not configured, using demo mode')
        return this.getDemoMarketDomains()
      }

      // Fetch market listings page by page
      for (let page = 1; page <= 15; page++) {
        const pageDomains = await this.fetchMarketPage(page)
        if (pageDomains.length === 0) break
        
        for (const item of pageDomains) {
          // Only process $10 or less
          if (item.price > 10) continue
          
          const estValue = await this.estimateMarketValue(
            item.domain, 
            item.traffic, 
            item.backlinks
          )
          
          domains.push({
            domain: item.domain,
            price: item.price,
            estValue,
            traffic: item.traffic,
            backlinks: item.backlinks,
            age: item.age,
          })
        }
      }
      
    } catch (error: any) {
      console.error('Namecheap Market mining error:', error.message)
      return this.getDemoMarketDomains()
    }

    return domains
  }

  /**
   * Fetch a page of market listings — Uses Vercel proxy to bypass CORS
   */
  private async fetchMarketPage(page: number): Promise<Array<{
    domain: string
    price: number
    traffic: number
    backlinks: number
    age: number
  }>> {
    try {
      // Use Vercel serverless proxy to bypass CORS
      const proxyUrl = `/api/namecheap/marketplace?page=${page}&pageSize=50&maxPrice=10`
      
      const response = await fetch(proxyUrl, { method: 'GET' })

      if (!response.ok) {
        console.warn(`Namecheap marketplace proxy returned ${response.status}`)
        return []
      }

      const text = await response.text()
      
      // Parse XML response (simplified)
      const domains: Array<{
        domain: string
        price: number
        traffic: number
        backlinks: number
        age: number
      }> = []
      
      // Extract domain data from XML
      const domainMatches = text.matchAll(/<Domain\s+([^>]+)>/g)
      for (const match of domainMatches) {
        const attrs = match[1]
        const domain = attrs.match(/Name="([^"]+)"/)?.[1] || ''
        const price = parseFloat(attrs.match(/Price="([^"]+)"/)?.[1] || '999')
        const traffic = parseInt(attrs.match(/Traffic="([^"]+)"/)?.[1] || '0')
        const backlinks = parseInt(attrs.match(/Backlinks="([^"]+)"/)?.[1] || '0')
        const age = parseInt(attrs.match(/Age="([^"]+)"/)?.[1] || '0')
        
        if (domain && price <= 10) {
          domains.push({ domain, price, traffic, backlinks, age })
        }
      }
      
      return domains
      
    } catch (error) {
      return []
    }
  }

  /**
   * Estimate market value based on metrics
   */
  private async estimateMarketValue(
    domain: string, 
    traffic: number, 
    backlinks: number
  ): Promise<number> {
    let value = 800 // Base value
    
    const name = domain.split('.')[0]
    const tld = '.' + domain.split('.').pop()
    
    // Traffic value ($0.80 per monthly visitor)
    if (traffic > 5000) value += traffic * 0.8
    else if (traffic > 1000) value += traffic * 0.5
    else if (traffic > 100) value += traffic * 0.3
    
    // Backlink value ($12 per quality backlink)
    if (backlinks > 100) value += backlinks * 12
    else if (backlinks > 50) value += backlinks * 8
    else if (backlinks > 10) value += backlinks * 5
    
    // TLD multipliers
    if (tld === '.io' || tld === '.ai' || tld === '.co') value *= 1.8
    else if (tld === '.com') value *= 1.5
    
    // Length bonus
    if (name.length <= 10) value *= 1.4
    else if (name.length <= 15) value *= 1.2
    
    // Brandable bonus
    if (/^[a-z]+$/.test(name.toLowerCase())) value *= 1.3
    
    return Math.round(value)
  }

  /**
   * NO MOCK DATA — Returns empty when real API unavailable
   */
  private getDemoMarketDomains(): CloseoutDomain[] {
    // NO MOCK DATA — Real API required
    logger.warn('NAMECHEAP_MARKET', 'Real API unavailable, no mock data returned')
    return []
  }
}

export const namecheapMarketMiner = new NamecheapMarketMiner()

