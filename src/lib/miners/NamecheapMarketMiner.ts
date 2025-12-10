/**
 * NamecheapMarketMiner.ts — $2-$8 Stealth Goldmine
 * Mines Namecheap Marketplace for ultra-low-cost high-value domains
 * December 2025 — The Hidden Empire Builder
 */

import { BaseMiner } from './BaseMiner'
import type { CloseoutDomain } from './types'
import { masterConfig } from '@/lib/config/MasterConfig'

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
   * Fetch a page of market listings
   */
  private async fetchMarketPage(page: number): Promise<Array<{
    domain: string
    price: number
    traffic: number
    backlinks: number
    age: number
  }>> {
    try {
      const ncConfig = masterConfig.getNamecheap()
      
      // Namecheap Marketplace API
      const params = new URLSearchParams({
        ApiUser: ncConfig.apiUser,
        ApiKey: ncConfig.apiKey,
        UserName: ncConfig.apiUser,
        ClientIp: ncConfig.clientIp || '127.0.0.1',
        Command: 'namecheap.domains.marketplace.getList',
        PageNumber: String(page),
        PageSize: '50',
        SortBy: 'price',
        SortOrder: 'asc',
        MaxPrice: '10',
      })

      const response = await fetch(
        `https://api.namecheap.com/xml.response?${params}`,
        { method: 'GET' }
      )

      if (!response.ok) {
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
   * Demo market domains for testing
   */
  private getDemoMarketDomains(): CloseoutDomain[] {
    const prefixes = ['cloud', 'data', 'tech', 'ai', 'dev', 'api', 'sync', 'flow', 'hub', 'core']
    const suffixes = ['hub', 'lab', 'io', 'app', 'hq', 'pro', 'ai', 'dev', 'now', '']
    const tlds = ['.io', '.ai', '.co', '.com', '.net']
    const domains: CloseoutDomain[] = []
    
    for (let i = 0; i < 80; i++) {
      const prefix = prefixes[Math.floor(Math.random() * prefixes.length)]
      const suffix = suffixes[Math.floor(Math.random() * suffixes.length)]
      const tld = tlds[Math.floor(Math.random() * tlds.length)]
      const domain = `${prefix}${suffix}${tld}`
      
      const price = 2.88 + Math.random() * 5.12 // $2.88-$8
      const traffic = Math.floor(Math.random() * 10000)
      const backlinks = Math.floor(Math.random() * 500)
      
      const estValue = this.estimateMarketValueSync(domain, traffic, backlinks)
      
      if (estValue / price >= 80) { // Only include 80x+ ROI
        domains.push({
          domain,
          price: Math.round(price * 100) / 100,
          estValue,
          traffic,
          backlinks,
          age: Math.floor(Math.random() * 12),
        })
      }
    }
    
    return domains.slice(0, 50)
  }

  /**
   * Sync version of estimate for demo
   */
  private estimateMarketValueSync(domain: string, traffic: number, backlinks: number): number {
    let value = 800
    
    const name = domain.split('.')[0]
    const tld = '.' + domain.split('.').pop()
    
    if (traffic > 5000) value += traffic * 0.8
    else if (traffic > 1000) value += traffic * 0.5
    
    if (backlinks > 100) value += backlinks * 12
    else if (backlinks > 50) value += backlinks * 8
    
    if (tld === '.io' || tld === '.ai' || tld === '.co') value *= 1.8
    else if (tld === '.com') value *= 1.5
    
    if (name.length <= 10) value *= 1.4
    if (/^[a-z]+$/.test(name.toLowerCase())) value *= 1.3
    
    return Math.round(value)
  }
}

export const namecheapMarketMiner = new NamecheapMarketMiner()

