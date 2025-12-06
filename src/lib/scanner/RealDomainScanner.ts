/**
 * RealDomainScanner.ts — PRODUCTION Domain Scanner
 * Scans REAL auctions from GoDaddy + Namecheap
 * December 2025
 */

import { godaddyAPI, type GoDaddyAuction } from '@/lib/api/godaddyReal'
import { namecheapAPI } from '@/lib/api/namecheapReal'
import { logger } from '@/lib/utils/logger'
import { empireSettings } from '@/lib/config/EmpireSettings'
import { toast } from 'sonner'

export interface ScannedDomain {
  domain: string
  source: 'godaddy' | 'namecheap' | 'dropcatch'
  price: number
  currentBid?: number
  auctionId?: string
  auctionEndTime?: string
  bidCount?: number
  type: 'auction' | 'registration' | 'backorder'
  available: boolean
}

export interface ScanResult {
  domains: ScannedDomain[]
  totalScanned: number
  sources: string[]
  errors: string[]
}

class RealDomainScanner {
  private isScanning = false
  private lastScanTime: Date | null = null
  private scanCount = 0

  constructor() {
    logger.info('SCANNER', 'Real Domain Scanner initialized')
  }

  /**
   * Scan all configured sources for domains
   */
  async scan(options: {
    maxResults?: number
    minPrice?: number
    maxPrice?: number
    tlds?: string[]
  } = {}): Promise<ScanResult> {
    if (this.isScanning) {
      logger.warn('SCANNER', 'Scan already in progress')
      return { domains: [], totalScanned: 0, sources: [], errors: ['Scan in progress'] }
    }

    this.isScanning = true
    this.lastScanTime = new Date()
    this.scanCount++

    const result: ScanResult = {
      domains: [],
      totalScanned: 0,
      sources: [],
      errors: [],
    }

    const maxPrice = options.maxPrice || empireSettings.get('dailyBudget')
    const minROI = empireSettings.get('minROI')

    logger.info('SCANNER', `Starting scan #${this.scanCount}`, { 
      maxPrice, 
      minROI,
      tlds: options.tlds 
    })

    // Scan GoDaddy if configured
    if (godaddyAPI.isReady()) {
      try {
        const auctions = await godaddyAPI.searchAuctions({
          limit: options.maxResults || 100,
          minPrice: options.minPrice || 1,
          maxPrice,
          tlds: options.tlds,
        })

        auctions.forEach(auction => {
          result.domains.push({
            domain: auction.domain,
            source: 'godaddy',
            price: auction.price,
            currentBid: auction.price,
            auctionId: auction.auctionId,
            auctionEndTime: auction.auctionEndTime,
            bidCount: auction.bidCount,
            type: 'auction',
            available: true,
          })
        })

        result.sources.push('godaddy')
        result.totalScanned += auctions.length
        logger.info('SCANNER', `GoDaddy: ${auctions.length} domains found`)

      } catch (error: any) {
        result.errors.push(`GoDaddy: ${error.message}`)
        logger.error('SCANNER', 'GoDaddy scan failed', error)
      }
    } else {
      result.errors.push('GoDaddy: Not configured')
    }

    // Scan Namecheap for available domains
    if (namecheapAPI.isReady()) {
      try {
        // Generate some keyword-based domain checks
        const keywords = this.generateKeywords()
        const tlds = options.tlds || ['com', 'io', 'ai', 'net']
        const domainsToCheck: string[] = []

        keywords.forEach(keyword => {
          tlds.forEach(tld => {
            domainsToCheck.push(`${keyword}.${tld}`)
          })
        })

        // Check in batches of 50
        for (let i = 0; i < domainsToCheck.length; i += 50) {
          const batch = domainsToCheck.slice(i, i + 50)
          const results = await namecheapAPI.checkAvailability(batch)

          results.filter(r => r.available && r.price <= maxPrice).forEach(r => {
            result.domains.push({
              domain: r.domain,
              source: 'namecheap',
              price: r.price,
              type: 'registration',
              available: true,
            })
          })

          result.totalScanned += batch.length
        }

        result.sources.push('namecheap')
        logger.info('SCANNER', `Namecheap: ${result.domains.filter(d => d.source === 'namecheap').length} available domains`)

      } catch (error: any) {
        result.errors.push(`Namecheap: ${error.message}`)
        logger.error('SCANNER', 'Namecheap scan failed', error)
      }
    } else {
      result.errors.push('Namecheap: Not configured')
    }

    this.isScanning = false

    // Sort by price (lowest first for better ROI)
    result.domains.sort((a, b) => a.price - b.price)

    logger.info('SCANNER', `Scan complete: ${result.domains.length} opportunities from ${result.sources.join(', ')}`)

    if (result.domains.length > 0) {
      toast.success(`Scan Complete`, {
        description: `Found ${result.domains.length} domains from ${result.sources.join(', ')}`,
      })
    }

    return result
  }

  /**
   * Generate keywords for domain checks
   */
  private generateKeywords(): string[] {
    const prefixes = ['get', 'my', 'the', 'go', 'try', 'use', 'buy', 'app', 'pro']
    const keywords = [
      'ai', 'ml', 'gpt', 'crypto', 'defi', 'nft', 'web3', 'cloud', 'saas',
      'fintech', 'health', 'tech', 'data', 'smart', 'auto', 'cyber', 'meta',
      'neural', 'quantum', 'block', 'chain', 'token', 'vault', 'pay', 'cash',
    ]
    const suffixes = ['ai', 'io', 'app', 'pro', 'hub', 'lab', 'dev', 'hq', 'now']

    const result: string[] = []

    // Keyword + suffix
    keywords.forEach(k => {
      suffixes.forEach(s => {
        result.push(`${k}${s}`)
      })
    })

    // Prefix + keyword
    prefixes.forEach(p => {
      keywords.forEach(k => {
        result.push(`${p}${k}`)
      })
    })

    // Shuffle and limit
    return result.sort(() => Math.random() - 0.5).slice(0, 100)
  }

  /**
   * Quick check for a specific domain
   */
  async checkDomain(domain: string): Promise<ScannedDomain | null> {
    // Try GoDaddy first
    if (godaddyAPI.isReady()) {
      try {
        const result = await godaddyAPI.checkAvailability(domain)
        if (result.available) {
          return {
            domain,
            source: 'godaddy',
            price: result.price || 10,
            type: 'registration',
            available: true,
          }
        }
      } catch {
        // Continue to Namecheap
      }
    }

    // Try Namecheap
    if (namecheapAPI.isReady()) {
      try {
        const results = await namecheapAPI.checkAvailability([domain])
        if (results[0]?.available) {
          return {
            domain,
            source: 'namecheap',
            price: results[0].price,
            type: 'registration',
            available: true,
          }
        }
      } catch {
        // Domain not available
      }
    }

    return null
  }

  /**
   * Get scanner stats
   */
  getStats(): { 
    isScanning: boolean
    lastScanTime: Date | null
    scanCount: number
    configuredSources: string[]
  } {
    const sources: string[] = []
    if (godaddyAPI.isReady()) sources.push('GoDaddy')
    if (namecheapAPI.isReady()) sources.push('Namecheap')

    return {
      isScanning: this.isScanning,
      lastScanTime: this.lastScanTime,
      scanCount: this.scanCount,
      configuredSources: sources,
    }
  }

  /**
   * Reinitialize APIs (call after config changes)
   */
  reinit(): void {
    godaddyAPI.reinit()
    namecheapAPI.reinit()
    logger.info('SCANNER', 'APIs reinitialized')
  }
}

export const realDomainScanner = new RealDomainScanner()

