/**
 * USPTO Trademark Valuation Engine
 * Real API integration for trademark detection and value boosting
 * Trademark match = +500% domain value
 */

import axios from 'axios'

interface TrademarkResult {
  hasTrademark: boolean
  owner?: string
  status: string
  valueBoost: number
  serialNumber?: string
  markIdentification?: string
  liveCount?: number
  exactMatch?: boolean
  multiplier?: number
}

interface USPTOConfig {
  apiKey?: string
  baseUrl?: string
}

export class USPTOValuation {
  private config: USPTOConfig
  private cache: Map<string, TrademarkResult> = new Map()
  private cacheExpiry: Map<string, number> = new Map()
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours

  constructor(config: USPTOConfig = {}) {
    this.config = {
      // Use HARDCODED USPTO key (NEVER empty)
      apiKey: config.apiKey || import.meta.env.VITE_USPTO_API_KEY || 'xqdufhsmpwfxsmdtsmvlmzqmgyxukr',
      baseUrl: config.baseUrl || 'https://tsdrapi.uspto.gov/ts/cd/public/v1',
    }
  }

  /**
   * Check if domain has trademark value boost
   */
  async checkTrademarkValue(domain: string): Promise<TrademarkResult> {
    // Check cache first
    const cached = this.getCached(domain)
    if (cached) return cached

    const keyword = domain.replace(/\..+$/, '').toLowerCase() // Remove TLD

    try {
      // Search USPTO trademark database
      const response = await axios.get(`${this.config.baseUrl}/search`, {
        params: {
          q: keyword,
          f: '["serialNumber","markIdentification","status"]',
          fl: 'serialNumber,markIdentification,currentStatus,ownerName',
          api_key: this.config.apiKey,
          rows: 50, // Limit results
        },
        timeout: 10000, // 10s timeout
      })

      const results = response.data?.searchResponse?.results || []
      const liveMarks = results.filter((r: any) => 
        r.currentStatus?.some((s: string) => s.includes('LIVE'))
      )

      let result: TrademarkResult

      if (liveMarks.length > 0) {
        const firstMark = liveMarks[0]
        result = {
          hasTrademark: true,
          owner: firstMark.ownerName?.[0] || 'Unknown',
          status: firstMark.currentStatus?.[0] || 'LIVE',
          valueBoost: 5.0, // 500% value increase
          serialNumber: firstMark.serialNumber?.[0],
          markIdentification: firstMark.markIdentification?.[0],
          liveCount: liveMarks.length,
        }
      } else {
        result = {
          hasTrademark: false,
          status: 'NOT_FOUND',
          valueBoost: 1.0,
        }
      }

      // Cache result
      this.setCached(domain, result)

      return result
    } catch (error: any) {
      console.warn(`USPTO check failed for ${domain}:`, error.message)
      
      // Return safe default on error
      return {
        hasTrademark: false,
        status: 'ERROR',
        valueBoost: 1.0,
      }
    }
  }

  /**
   * Batch check multiple domains
   */
  async batchCheckTrademarks(domains: string[]): Promise<Map<string, TrademarkResult>> {
    const results = new Map<string, TrademarkResult>()

    // Process in parallel with rate limiting (10 at a time)
    const batchSize = 10
    for (let i = 0; i < domains.length; i += batchSize) {
      const batch = domains.slice(i, i + batchSize)
      const promises = batch.map(domain => 
        this.checkTrademarkValue(domain).then(result => ({ domain, result }))
      )
      
      const batchResults = await Promise.allSettled(promises)
      batchResults.forEach((settled, idx) => {
        if (settled.status === 'fulfilled') {
          results.set(settled.value.domain, settled.value.result)
        }
      })

      // Rate limit: wait 1 second between batches
      if (i + batchSize < domains.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    return results
  }

  /**
   * Get cached result if still valid
   */
  private getCached(domain: string): TrademarkResult | null {
    const cached = this.cache.get(domain)
    const expiry = this.cacheExpiry.get(domain)
    
    if (cached && expiry && Date.now() < expiry) {
      return cached
    }

    // Clean up expired cache
    if (expiry && Date.now() >= expiry) {
      this.cache.delete(domain)
      this.cacheExpiry.delete(domain)
    }

    return null
  }

  /**
   * Cache result with TTL
   */
  private setCached(domain: string, result: TrademarkResult) {
    this.cache.set(domain, result)
    this.cacheExpiry.set(domain, Date.now() + this.CACHE_TTL)
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear()
    this.cacheExpiry.clear()
  }
}

export const usptoValuation = new USPTOValuation()


// Export convenience function
export async function checkTrademarkValue(domain: string): Promise<TrademarkResult> {
  const client = new USPTOValuation()
  return client.checkTrademarkValue(domain)
}
