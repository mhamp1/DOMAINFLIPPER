/**
 * ExpiredDomainsScanner.ts — Direct scraper for expireddomains.net
 * Scans 120k+ daily expired domains with backlinks, traffic, and value filters
 * December 2025
 */

import axios from 'axios'
import * as cheerio from 'cheerio'
import { logger } from '@/lib/utils/logger'
import { rateLimiter } from '@/lib/utils/rateLimiter'

export interface ExpiredDomain {
  name: string
  domain: string
  backlinks: number
  traffic: number
  age?: number
  da?: number // Domain Authority
  pa?: number // Page Authority
  price?: number
  tld: string
}

class ExpiredDomainsScanner {
  private baseUrl = 'https://www.expireddomains.net'

  /**
   * Scan expired .com domains from expireddomains.net
   */
  async scanExpiredDomains(options: {
    tld?: string
    minBacklinks?: number
    minTraffic?: number
    minDA?: number
    limit?: number
  } = {}): Promise<ExpiredDomain[]> {
    const tld = options.tld || 'com'
    const minBacklinks = options.minBacklinks || 10
    const minTraffic = options.minTraffic || 0
    const minDA = options.minDA || 0
    const limit = options.limit || 100

    // Respect rate limit
    await rateLimiter.waitIfNeeded('expireddomains')

    try {
      logger.info('EXPIRED_SCANNER', `Scanning expired ${tld} domains...`)

      const url = `${this.baseUrl}/deleted-${tld}-domains/`
      const response = await axios.get(url, {
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      })

      const $ = cheerio.load(response.data)
      const domains: ExpiredDomain[] = []

      // Find the main table with domains
      $('table.base1 tr, table.base tr').each((i, row) => {
        if (i <= 1) return // Skip header rows

        const cells = $(row).find('td')
        if (cells.length === 0) return

        try {
          // Extract domain name (usually first or second column)
          const domainText = cells.eq(0).text().trim() || cells.eq(1).text().trim()
          if (!domainText || !domainText.includes('.')) return

          // Safely parse domain parts
          const domainParts = domainText.split('.')
          if (domainParts.length < 2) return // Invalid domain

          const tldPart = domainParts[domainParts.length - 1]
          const namePart = domainParts.slice(0, -1).join('.')

          // Extract metrics from cells - use text matching for robustness
          let backlinks = 0
          let traffic = 0
          let da = 0
          let age = 0

          cells.each((idx, cell) => {
            const text = $(cell).text().trim()
            const num = parseInt(text.replace(/,/g, ''))
            
            // More robust: look for patterns in cell content
            if (!isNaN(num) && num > 0) {
              // Backlinks are typically in earlier columns and larger numbers
              if (idx >= 2 && idx <= 4 && num > backlinks) backlinks = num
              // Traffic typically follows backlinks
              if (idx >= 4 && idx <= 6 && num > traffic && num !== backlinks) traffic = num
              // DA/PA are typically smaller numbers (0-100 range)
              if (idx >= 6 && idx <= 8 && num <= 100 && num > da) da = num
              // Age is typically in years (0-30 range usually)
              if (idx >= 8 && idx <= 10 && num <= 50 && num > age) age = num
            }
          })

          const domain: ExpiredDomain = {
            name: namePart,
            domain: domainText,
            backlinks,
            traffic,
            age,
            da,
            tld: '.' + tldPart,
          }

          // Apply filters
          if (domain.backlinks >= minBacklinks &&
              domain.traffic >= minTraffic &&
              (domain.da || 0) >= minDA) {
            domains.push(domain)
          }
        } catch (e) {
          // Skip this row
        }
      })

      // Sort by backlinks (highest value first)
      domains.sort((a, b) => b.backlinks - a.backlinks)

      const result = domains.slice(0, limit)
      logger.info('EXPIRED_SCANNER', `Found ${result.length} high-value expired domains`)

      return result
    } catch (error: any) {
      logger.error('EXPIRED_SCANNER', `Failed to scan expired domains: ${error.message}`)
      
      // Return empty array instead of throwing
      return []
    }
  }

  /**
   * Filter for high-value domains
   */
  filterHighValue(domains: ExpiredDomain[]): ExpiredDomain[] {
    return domains.filter(d => 
      d.backlinks > 100 || 
      d.traffic > 1000 || 
      (d.da && d.da > 20)
    )
  }

  /**
   * Get domains with specific keywords
   */
  filterByKeywords(domains: ExpiredDomain[], keywords: string[]): ExpiredDomain[] {
    return domains.filter(d => 
      keywords.some(keyword => 
        d.name.toLowerCase().includes(keyword.toLowerCase())
      )
    )
  }
}

export const expiredDomainsScanner = new ExpiredDomainsScanner()
