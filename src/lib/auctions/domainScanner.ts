import type { Domain } from '@/types/domain'
import { createGoDaddyClient } from '@/lib/api/godaddy'
import { createNamecheapClient } from '@/lib/api/namecheapReal'
import { valuationEngine } from '@/lib/ai/valuationEngine'
import { STRATEGIES, getAllEnabledStrategies } from '@/lib/strategies/strategyDefinitions'

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
    const godaddyKey = import.meta.env.VITE_GODADDY_KEY
    const godaddySecret = import.meta.env.VITE_GODADDY_SECRET
    
    if (godaddyKey && godaddySecret) {
      this.godaddyClient = createGoDaddyClient({
        apiKey: godaddyKey,
        apiSecret: godaddySecret,
      })
      console.log('✅ GoDaddy API client initialized')
    } else {
      console.warn('⚠️ GoDaddy API not configured - add VITE_GODADDY_KEY and VITE_GODADDY_SECRET')
    }

    const ncUser = import.meta.env.VITE_NAMECHEAP_API_USER
    const ncKey = import.meta.env.VITE_NAMECHEAP_API_KEY
    const ncIp = import.meta.env.VITE_NAMECHEAP_CLIENT_IP
    
    if (ncUser && ncKey && ncIp) {
      this.namecheapClient = createNamecheapClient({
        apiUser: ncUser,
        apiKey: ncKey,
        clientIp: ncIp,
      })
      console.log('✅ Namecheap API client initialized')
    } else {
      console.warn('⚠️ Namecheap API not configured - add VITE_NAMECHEAP_API_USER, VITE_NAMECHEAP_API_KEY, VITE_NAMECHEAP_CLIENT_IP')
    }
  }

  /**
   * Scan GoDaddy Auctions for real domains
   */
  private async scanGoDaddy(): Promise<Domain[]> {
    if (!this.godaddyClient) {
      console.log('⏭️ Skipping GoDaddy scan - API not configured')
      return []
    }

    try {
      console.log('🔍 Scanning GoDaddy Auctions...')
      
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
      
      console.log(`✅ Found ${domains.length} domains on GoDaddy`)
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
      console.log('⏭️ Skipping Namecheap scan - API not configured')
      return []
    }

    try {
      console.log('🔍 Scanning Namecheap...')
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
    console.log('🔍 Starting domain scan...')
    
    // Scan all sources in parallel
    const [godaddyDomains, namecheapDomains] = await Promise.all([
      this.scanGoDaddy(),
      this.scanNamecheap(),
    ])

    // Combine all domains
    const allDomains = [...godaddyDomains, ...namecheapDomains]

    if (allDomains.length === 0) {
      console.log('📭 No domains found - ensure APIs are configured in Setup Wizard')
      return []
    }

    // Valuate all domains with AI
    console.log(`🧠 Valuating ${allDomains.length} domains...`)
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

    console.log(`✅ Scan complete: ${filteredDomains.length} opportunities found`)
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
    console.log(`🔄 Starting continuous scanning every ${intervalMs / 1000}s`)

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
    console.log('⏹️ Domain scanning stopped')
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
