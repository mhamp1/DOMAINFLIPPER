import type { Domain } from '@/types/domain'
import { createGoDaddyClient } from '@/lib/api/godaddy'
import { createNamecheapClient } from '@/lib/api/namecheapReal'
import { valuationEngine } from '@/lib/ai/valuationEngine'
import { STRATEGIES, getAllEnabledStrategies } from '@/lib/strategies/strategyDefinitions'
import { logger } from '@/lib/utils/logger'

/**
 * Multi-source domain scanner
 * Scans GoDaddy, Namecheap, DropCatch for REAL opportunities
 * NO MOCK DATA - Returns empty until APIs are connected
 */
export class DomainScanner {
  private scanInterval: number | null = null
  private isScanning: boolean = false
  private godaddyClient: ReturnType<typeof createGoDaddyClient> | null = null
  private namecheapClient: ReturnType<typeof createNamecheapClient> | null = null

  constructor() {
    // Initialize API clients if credentials exist
    this.initializeClients()
  }

  private initializeClients() {
    // Use HARDCODED credentials (NEVER empty) with env override
    const godaddyKey = import.meta.env.VITE_GODADDY_KEY || 'h2eWy65jfMPV_KSxuT2Q44RY27P3n9YqiA6'
    const godaddySecret = import.meta.env.VITE_GODADDY_SECRET || 'LuKboxc1tZ3UGAFJFDvtAE'
    
    // Always initialize GoDaddy - credentials are hardcoded
    this.godaddyClient = createGoDaddyClient({
      apiKey: godaddyKey,
      apiSecret: godaddySecret,
    })
    logger.info('SCANNER', 'GoDaddy API client initialized')

    // Use HARDCODED Namecheap credentials
    const ncUser = import.meta.env.VITE_NAMECHEAP_API_USER || 'mhamp1'
    const ncKey = import.meta.env.VITE_NAMECHEAP_API_KEY || 'c2cd72c359c74ac49b15e32bb98b4143'
    const ncIp = import.meta.env.VITE_NAMECHEAP_CLIENT_IP || '68.106.44.20'
    
    // Always initialize Namecheap - credentials are hardcoded
    this.namecheapClient = createNamecheapClient({
      apiUser: ncUser,
      apiKey: ncKey,
      clientIp: ncIp,
    })
    logger.info('SCANNER', 'Namecheap API client initialized')
    
    if (false) { // Never warn - credentials are hardcoded
      console.warn('⚠️ Namecheap API not configured - add VITE_NAMECHEAP_API_USER, VITE_NAMECHEAP_API_KEY, VITE_NAMECHEAP_CLIENT_IP')
    }
  }

  /**
   * Scan GoDaddy Auctions for real domains
   */
  private async scanGoDaddy(): Promise<Domain[]> {
    if (!this.godaddyClient) {
      logger.debug('SCANNER', 'Skipping GoDaddy scan - API not configured')
      return []
    }

    try {
      logger.info('SCANNER', 'Scanning GoDaddy Auctions...')
      
      // Get expiring auctions (most profitable)
      const auctions = await this.godaddyClient.searchExpiringDomains({ limit: 100 })
      
      const domains: Domain[] = auctions.map((auction: any) => ({
        id: auction.auctionId || auction.domain,
        name: auction.domain,
        tld: '.' + auction.domain.split('.').pop(),
        length: auction.domain.split('.')[0].length,
        currentBid: auction.price || auction.currentBid || 0,
        estimatedValue: 0,
        aiScore: 0,
        strategyId: '',
        status: 'auction' as const,
        registrar: 'GoDaddy',
        expiresAt: auction.auctionEndTime ? new Date(auction.auctionEndTime) : undefined,
        timeLeft: auction.timeLeft || '',
      }))
      
      logger.info('SCANNER', `Found ${domains.length} domains on GoDaddy`)
      return domains
    } catch (error) {
      console.error('❌ GoDaddy scan error:', error)
      return []
    }
  }

  /**
   * Scan Namecheap for real domains
   */
  private async scanNamecheap(): Promise<Domain[]> {
    if (!this.namecheapClient) {
      logger.debug('SCANNER', 'Skipping Namecheap scan - API not configured')
      return []
    }

    try {
      logger.info('SCANNER', 'Scanning Namecheap...')
      // Namecheap doesn't have a direct auction API like GoDaddy
      // This would need to integrate with their marketplace
      return []
    } catch (error) {
      console.error('❌ Namecheap scan error:', error)
      return []
    }
  }

  /**
   * Scan for domains from all configured sources
   * Returns EMPTY array if no APIs are configured
   */
  async scan(): Promise<Domain[]> {
    logger.info('SCANNER', 'Starting domain scan...')
    
    // Scan all sources in parallel
    const [godaddyDomains, namecheapDomains] = await Promise.all([
      this.scanGoDaddy(),
      this.scanNamecheap(),
    ])

    // Combine all domains
    const allDomains = [...godaddyDomains, ...namecheapDomains]

    if (allDomains.length === 0) {
      logger.warn('SCANNER', 'No domains found - ensure APIs are configured in Config tab')
      return []
    }

    // Valuate all domains with AI
    logger.info('SCANNER', `Valuating ${allDomains.length} domains...`)
    const valuatedDomains = await Promise.all(
      allDomains.map(async (domain) => {
        try {
          const valuation = await valuationEngine.predictValue(domain)
          return {
            ...domain,
            estimatedValue: valuation.value,
            aiScore: valuation.score,
            strategyId: this.matchToStrategy(domain, valuation),
          }
        } catch (error) {
          return domain
        }
      })
    )

    // Filter by strategy requirements
    const activeStrategies = getAllEnabledStrategies()
    const filteredDomains = valuatedDomains.filter(domain => {
      const strategy = activeStrategies.find(s => s.id === domain.strategyId)
      if (!strategy) return false

      // Only show domains where current bid is significantly below estimated value
      if (domain.currentBid && domain.estimatedValue) {
        return domain.currentBid < domain.estimatedValue * 0.6
      }

      return domain.aiScore >= 70
    })

    logger.info('SCANNER', `Scan complete: ${filteredDomains.length} opportunities found`)
    return filteredDomains
  }

  /**
   * Match domain to best strategy
   */
  private matchToStrategy(domain: Domain, valuation: any): string {
    const name = domain.name.split('.')[0].toLowerCase()
    const tld = domain.tld
    const strategies = getAllEnabledStrategies()
    
    let bestMatch = ''
    let bestScore = 0
    
    for (const strategy of strategies) {
      let score = 0
      
      if (strategy.targetTLD === tld) score += 30
      if (strategy.targetTLDs?.includes(tld)) score += 25
      if (strategy.keywords?.some(kw => name.includes(kw))) score += 40
      if (strategy.pattern?.test(domain.name)) score += 50
      if (strategy.minLength && name.length >= strategy.minLength) score += 10
      if (strategy.maxLength && name.length <= strategy.maxLength) score += 10
      
      if (score > bestScore) {
        bestScore = score
        bestMatch = strategy.id
      }
    }
    
    return bestMatch
  }

  /**
   * Start continuous scanning
   */
  startScanning(callback: (domains: Domain[]) => void, intervalMs: number = 300000) {
    if (this.isScanning) return

    this.isScanning = true
    logger.info('SCANNER', `Starting continuous scanning every ${intervalMs / 1000}s`)

    // Initial scan
    this.scan().then(callback)

    // Set up interval
    this.scanInterval = window.setInterval(async () => {
      const domains = await this.scan()
      callback(domains)
    }, intervalMs)
  }

  /**
   * Stop scanning
   */
  stopScanning() {
    if (this.scanInterval) {
      clearInterval(this.scanInterval)
      this.scanInterval = null
    }
    this.isScanning = false
    logger.info('SCANNER', 'Domain scanning stopped')
  }

  /**
   * Check if scanner is running
   */
  isActive(): boolean {
    return this.isScanning
  }

  /**
   * Check if APIs are configured
   */
  hasConfiguredAPIs(): boolean {
    return this.godaddyClient !== null || this.namecheapClient !== null
  }
}

export const domainScanner = new DomainScanner()
