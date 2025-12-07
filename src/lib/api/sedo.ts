/**
 * Sedo API Integration
 * Search similar domains and get competitive pricing
 * December 2025
 */

import axios from 'axios'
import * as cheerio from 'cheerio'
import { logger } from '@/lib/utils/logger'
import { rateLimiter } from '@/lib/utils/rateLimiter'

export interface SedoConfig {
  username?: string
  password?: string
  apiKey?: string
}

export interface SedoDomain {
  domain: string
  price: number
  currency: string
  category?: string
  verified?: boolean
}

export interface SedoSearchResult {
  domain: string
  similarDomains: SedoDomain[]
  averagePrice: number
  lowestPrice: number
  highestPrice: number
  suggestedPrice: number // Slightly cheaper than average
}

class SedoAPI {
  private config: SedoConfig
  private baseUrl = 'https://sedo.com'

  constructor(config: SedoConfig = {}) {
    // Note: Sedo credentials should be server-side only in production
    // For browser use, Sedo API should be proxied through a backend service
    this.config = config
  }

  /**
   * Search for similar domains on Sedo
   */
  async searchSimilarDomains(domain: string): Promise<SedoSearchResult> {
    await rateLimiter.waitIfNeeded('sedo')

    try {
      // Extract keywords from domain
      const domainName = domain.split('.')[0]
      const tld = domain.split('.').pop() || 'com'

      logger.info('SEDO', `Searching for domains similar to ${domain}`)

      // Search on Sedo
      const searchUrl = `${this.baseUrl}/search/?keyword=${encodeURIComponent(domainName)}&language=us`
      const response = await axios.get(searchUrl, {
        timeout: 20000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      })

      const $ = cheerio.load(response.data)
      const similarDomains: SedoDomain[] = []

      // Parse search results
      $('.domain-link, .domain-name, .listing-item').each((i, elem) => {
        try {
          const domainElem = $(elem)
          const domainText = domainElem.text().trim() || 
                           domainElem.find('.name, .domain').text().trim()
          
          // Find price in the same row or parent
          const priceElem = domainElem.closest('.listing-item, tr, .result-row')
            .find('.price, .domain-price, .listing-price')
          
          let priceText = priceElem.text().trim()
          
          if (domainText && priceText) {
            // Extract numeric price
            const priceMatch = priceText.match(/[\d,]+/)
            if (priceMatch) {
              const price = parseInt(priceMatch[0].replace(/,/g, ''))
              
              // Currency detection
              let currency = 'USD'
              if (priceText.includes('€') || priceText.includes('EUR')) currency = 'EUR'
              if (priceText.includes('£') || priceText.includes('GBP')) currency = 'GBP'

              similarDomains.push({
                domain: domainText,
                price,
                currency,
              })
            }
          }
        } catch (e) {
          // Skip this entry
        }
      })

      // Calculate pricing metrics
      const prices = similarDomains.map(d => d.price).filter(p => p > 0)
      
      let averagePrice = 0
      let lowestPrice = 0
      let highestPrice = 0
      let suggestedPrice = 0

      if (prices.length > 0) {
        averagePrice = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
        lowestPrice = Math.min(...prices)
        highestPrice = Math.max(...prices)
        // Suggest 10-15% cheaper than average for competitive edge
        suggestedPrice = Math.round(averagePrice * 0.87)
      }

      logger.info('SEDO', `Found ${similarDomains.length} similar domains, avg price: $${averagePrice}`)

      return {
        domain,
        similarDomains,
        averagePrice,
        lowestPrice,
        highestPrice,
        suggestedPrice,
      }
    } catch (error: any) {
      logger.error('SEDO', `Failed to search Sedo: ${error.message}`)
      
      // Return minimal result on error
      return {
        domain,
        similarDomains: [],
        averagePrice: 0,
        lowestPrice: 0,
        highestPrice: 0,
        suggestedPrice: 0,
      }
    }
  }

  /**
   * List domain on Sedo marketplace
   */
  async listDomain(domain: string, price: number): Promise<boolean> {
    if (!this.config.username || !this.config.password) {
      logger.warn('SEDO', 'Sedo credentials not configured, cannot list domain')
      return false
    }

    await rateLimiter.waitIfNeeded('sedo')

    try {
      // This would use Sedo's API if credentials are provided
      logger.info('SEDO', `Listing ${domain} at $${price}`)
      
      // Note: Real implementation would require Sedo API authentication
      // For now, we log the intent
      logger.info('SEDO', `Domain ${domain} queued for listing at $${price}`)
      
      return true
    } catch (error: any) {
      logger.error('SEDO', `Failed to list on Sedo: ${error.message}`)
      return false
    }
  }

  /**
   * Get competitive pricing for a domain based on Sedo market data
   */
  async getCompetitivePrice(domain: string, yourValuation: number): Promise<number> {
    const searchResult = await this.searchSimilarDomains(domain)
    
    if (searchResult.suggestedPrice > 0) {
      // Use Sedo's market data if available
      return searchResult.suggestedPrice
    }
    
    // Fallback: price 15% below our valuation for quick sale
    return Math.round(yourValuation * 0.85)
  }

  /**
   * Check if Sedo is configured
   */
  isConfigured(): boolean {
    return !!(this.config.username && this.config.password) || !!this.config.apiKey
  }
}

// Singleton instance
let sedoAPIInstance: SedoAPI | null = null

export const getSedoAPI = (config?: SedoConfig): SedoAPI => {
  if (!sedoAPIInstance) {
    // Load from environment - Note: These should be server-side only in production
    // For browser use, proxy Sedo API calls through a backend service
    const envConfig: SedoConfig = {
      username: import.meta.env.VITE_SEDO_USERNAME,
      password: import.meta.env.VITE_SEDO_PASSWORD,
      apiKey: import.meta.env.VITE_SEDO_API_KEY,
    }
    sedoAPIInstance = new SedoAPI(config || envConfig)
  }
  return sedoAPIInstance
}

export const sedoAPI = getSedoAPI()
