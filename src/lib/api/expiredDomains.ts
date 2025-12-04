/**
 * ExpiredDomains.net Integration via Apify
 * Real API for fetching 120k+ daily expired domains
 * December 27, 2025
 */

import axios from 'axios'
import { rateLimiter } from '@/lib/utils/rateLimiter'

interface ExpiredDomainsConfig {
  apifyToken: string
}

interface ExpiredDomain {
  domain: string
  tld: string
  backlinks?: number
  traffic?: number
  age?: number
  da?: number // Domain Authority
  pa?: number // Page Authority
  dropDate?: string
  status?: 'expired' | 'deleted' | 'pending'
}

interface ApifyRunResult {
  id: string
  status: string
  defaultDatasetId?: string
}

export class ExpiredDomainsAPI {
  private config: ExpiredDomainsConfig
  private baseUrl = 'https://api.apify.com/v2'

  constructor(config: ExpiredDomainsConfig) {
    this.config = config
  }

  /**
   * Fetch expired domains from Apify actor
   */
  async fetchExpiredDomains(options: {
    tld?: string
    minBacklinks?: number
    minTraffic?: number
    minDA?: number
    limit?: number
  } = {}): Promise<ExpiredDomain[]> {
    // Respect rate limit
    await rateLimiter.waitIfNeeded('expireddomains')

    try {
      // Start actor run
      const runResponse = await axios.post(
        `${this.baseUrl}/acts/easyapi~expireddomains-net-scraper/runs`,
        {
          input: {
            tld: options.tld || 'com',
            minBacklinks: options.minBacklinks || 0,
            minTraffic: options.minTraffic || 0,
            minDA: options.minDA || 0,
            limit: options.limit || 1000,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${this.config.apifyToken}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      )

      const runId = runResponse.data.data.id

      // Wait for run to complete (poll every 2 seconds, max 60 seconds)
      let attempts = 0
      let runStatus = 'RUNNING'
      
      while (runStatus === 'RUNNING' && attempts < 30) {
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        const statusResponse = await axios.get(
          `${this.baseUrl}/actor-runs/${runId}`,
          {
            headers: {
              Authorization: `Bearer ${this.config.apifyToken}`,
            },
          }
        )
        
        runStatus = statusResponse.data.data.status
        attempts++
      }

      if (runStatus !== 'SUCCEEDED') {
        throw new Error(`Apify run failed with status: ${runStatus}`)
      }

      // Get results
      const datasetId = runResponse.data.data.defaultDatasetId
      const resultsResponse = await axios.get(
        `${this.baseUrl}/datasets/${datasetId}/items`,
        {
          params: {
            token: this.config.apifyToken,
            format: 'json',
            limit: options.limit || 1000,
          },
          timeout: 30000,
        }
      )

      // Map to our format
      return resultsResponse.data.map((item: any) => ({
        domain: item.domain || item.name,
        tld: item.tld || '.' + (item.domain || item.name).split('.').pop(),
        backlinks: item.backlinks || item.backlinkCount || 0,
        traffic: item.traffic || item.visitors || 0,
        age: item.age || item.domainAge || 0,
        da: item.da || item.domainAuthority || 0,
        pa: item.pa || item.pageAuthority || 0,
        dropDate: item.dropDate || item.expiryDate,
        status: item.status || 'expired',
      }))
    } catch (error: any) {
      console.error('Failed to fetch expired domains:', error.message)
      throw new Error(`ExpiredDomains API Error: ${error.message}`)
    }
  }

  /**
   * Filter valuable expired domains
   */
  filterValuable(domains: ExpiredDomain[], minDA = 15, minBacklinks = 100, minTraffic = 1000): ExpiredDomain[] {
    return domains.filter(d => 
      (d.da || 0) >= minDA &&
      (d.backlinks || 0) >= minBacklinks &&
      (d.traffic || 0) >= minTraffic
    )
  }

  /**
   * Get domains dropping today
   */
  async getDroppingToday(tld = 'com'): Promise<ExpiredDomain[]> {
    const today = new Date().toISOString().split('T')[0]
    const domains = await this.fetchExpiredDomains({ tld, limit: 10000 })
    
    return domains.filter(d => {
      if (!d.dropDate) return false
      const dropDate = new Date(d.dropDate).toISOString().split('T')[0]
      return dropDate === today
    })
  }
}

export const createExpiredDomainsClient = (config: ExpiredDomainsConfig) => 
  new ExpiredDomainsAPI(config)

