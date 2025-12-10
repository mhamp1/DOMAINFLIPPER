/**
 * BaseMiner.ts — Abstract Base Class for All Domain Miners
 * Provides common functionality for all mining operations
 * December 2025
 */

import { generateId } from '@/lib/utils'
import { valuationEngine } from '@/lib/ai/valuationEngine'
import { miningCache } from './MiningCache'
import type { 
  MinedDomain, 
  MinerSource, 
  MinerStats, 
  MiningConfig, 
  CloseoutDomain,
  MiningEvent
} from './types'

export abstract class BaseMiner {
  protected source: MinerSource
  protected config: MiningConfig
  protected stats: MinerStats
  protected isRunning = false
  protected intervalId: ReturnType<typeof setInterval> | null = null
  protected eventListeners: ((event: MiningEvent) => void)[] = []

  // Blocked keywords to avoid legal issues
  protected readonly DEFAULT_BLOCKED_KEYWORDS = [
    'disney', 'nike', 'apple', 'google', 'amazon', 'microsoft',
    'facebook', 'meta', 'twitter', 'instagram', 'tiktok',
    'porn', 'xxx', 'sex', 'casino', 'gambling', 'cbd', 'weed',
    'bitcoin', 'ethereum', 'crypto' // Often trademarked or scam-prone
  ]

  constructor(source: MinerSource, config?: Partial<MiningConfig>) {
    this.source = source
    this.config = {
      enabled: true,
      intervalMs: 30 * 60 * 1000, // 30 minutes default
      minValue: 800,
      maxPrice: 15,
      minRoi: 50,
      autoSnipe: false,
      autoPrioritize: true,
      trademarkFilter: true,
      blockedKeywords: this.DEFAULT_BLOCKED_KEYWORDS,
      ...config,
    }
    this.stats = {
      source,
      status: 'idle',
      lastRun: null,
      totalMined: 0,
      gemsFound: 0,
      legendaryFound: 0,
      avgRoi: 0,
      successRate: 100,
      errorCount: 0,
      nextRun: null,
    }
  }

  /**
   * Abstract method - each miner implements its own mining logic
   */
  protected abstract mineSource(): Promise<CloseoutDomain[]>

  /**
   * Start the miner
   */
  start(): void {
    if (this.isRunning) return

    this.isRunning = true
    this.stats.status = 'mining'
    console.log(`🚀 ${this.source} Miner STARTED`)

    // Run immediately
    this.runMiningCycle()

    // Schedule periodic runs
    this.intervalId = setInterval(() => {
      this.runMiningCycle()
    }, this.config.intervalMs)

    this.stats.nextRun = new Date(Date.now() + this.config.intervalMs)
  }

  /**
   * Stop the miner
   */
  stop(): void {
    if (!this.isRunning) return

    this.isRunning = false
    this.stats.status = 'paused'
    
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }

    console.log(`⏹️ ${this.source} Miner STOPPED`)
  }

  /**
   * Run a single mining cycle
   */
  async runMiningCycle(): Promise<MinedDomain[]> {
    if (!this.config.enabled) return []

    this.stats.status = 'mining'
    const startTime = Date.now()
    const results: MinedDomain[] = []

    try {
      // Fetch domains from source
      const rawDomains = await this.mineSource()
      
      // Process each domain
      for (const domain of rawDomains) {
        const processed = await this.processDomain(domain)
        if (processed) {
          results.push(processed)
        }
      }

      // Update stats
      this.stats.lastRun = new Date()
      this.stats.totalMined += rawDomains.length
      this.stats.gemsFound += results.filter(d => d.priority !== 'normal').length
      this.stats.legendaryFound += results.filter(d => d.priority === 'legendary').length
      this.stats.nextRun = new Date(Date.now() + this.config.intervalMs)
      this.stats.status = 'idle'

      // Calculate average ROI
      if (results.length > 0) {
        this.stats.avgRoi = results.reduce((sum, d) => sum + d.roi, 0) / results.length
      }

      const duration = Date.now() - startTime
      console.log(`✅ ${this.source}: Mined ${rawDomains.length} domains, found ${results.length} gems in ${duration}ms`)

      // Emit session complete event
      this.emitEvent({
        type: 'session_complete',
        message: `Mined ${rawDomains.length} domains, found ${results.length} gems`,
        source: this.source,
        timestamp: new Date(),
      })

    } catch (error: any) {
      this.stats.status = 'error'
      this.stats.errorCount++
      this.stats.successRate = Math.max(0, this.stats.successRate - 5)
      console.error(`❌ ${this.source} error:`, error.message)

      this.emitEvent({
        type: 'error',
        message: error.message,
        source: this.source,
        timestamp: new Date(),
      })
    }

    return results
  }

  /**
   * Process a single domain
   */
  protected async processDomain(domain: CloseoutDomain): Promise<MinedDomain | null> {
    const domainName = domain.domain.toLowerCase()

    // Skip if already mined
    if (miningCache.isDuplicate(domainName)) {
      return null
    }

    // Apply keyword filter
    if (this.isBlocked(domainName)) {
      return null
    }

    // Skip if price too high
    if (domain.price > this.config.maxPrice) {
      return null
    }

    // Get AI valuation
    const valuation = await valuationEngine.predictValue({
      name: domainName,
      tld: '.' + domainName.split('.').pop(),
      backlinks: domain.backlinks || 0,
      traffic: domain.traffic || 0,
      age: domain.age || 0,
    })

    const estValue = valuation.value
    const roi = domain.price > 0 ? estValue / domain.price : 0

    // Skip if below minimum value or ROI
    if (estValue < this.config.minValue || roi < this.config.minRoi) {
      return null
    }

    // Determine priority
    let priority: MinedDomain['priority'] = 'normal'
    if (estValue >= 10000) priority = 'legendary'
    else if (estValue >= 5000) priority = 'gem'
    else if (estValue >= 1500) priority = 'high'

    // Create mined domain record
    const minedDomain: MinedDomain = {
      id: generateId(),
      domain: domainName,
      tld: '.' + domainName.split('.').pop(),
      source: this.source,
      dropDate: domain.auctionEnds || new Date().toISOString(),
      backlinks: domain.backlinks || 0,
      dr: 0,
      traffic: domain.traffic || 0,
      ageYears: domain.age || 0,
      hasTrademark: false,
      estValue,
      price: domain.price,
      roi: Math.round(roi),
      minedAt: new Date(),
      status: 'pending',
      priority,
    }

    // Add to cache
    miningCache.addToCache(minedDomain)

    // Emit events for significant finds
    if (priority === 'legendary') {
      console.log(`🏆 LEGENDARY FOUND: ${domainName} → $${estValue.toLocaleString()} (${roi.toFixed(0)}x ROI)`)
      this.emitEvent({
        type: 'legendary_found',
        domain: domainName,
        value: estValue,
        price: domain.price,
        roi,
        source: this.source,
        message: `LEGENDARY: ${domainName} → $${estValue.toLocaleString()}`,
        timestamp: new Date(),
      })
    } else if (priority === 'gem') {
      console.log(`💎 GEM FOUND: ${domainName} → $${estValue.toLocaleString()} (${roi.toFixed(0)}x ROI)`)
      this.emitEvent({
        type: 'gem_found',
        domain: domainName,
        value: estValue,
        price: domain.price,
        roi,
        source: this.source,
        message: `GEM: ${domainName} → $${estValue.toLocaleString()}`,
        timestamp: new Date(),
      })
    }

    // Auto-snipe if enabled and high ROI
    if (this.config.autoSnipe && roi >= 100) {
      this.triggerAutoSnipe(minedDomain)
    }

    return minedDomain
  }

  /**
   * Check if domain contains blocked keywords
   */
  protected isBlocked(domain: string): boolean {
    const lowerDomain = domain.toLowerCase()
    
    // Check blocked keywords
    for (const keyword of this.config.blockedKeywords) {
      if (lowerDomain.includes(keyword.toLowerCase())) {
        return true
      }
    }

    // Additional filters
    if (lowerDomain.length > 25) return true
    if (lowerDomain.includes('--')) return true
    if (/^\d+\./.test(lowerDomain)) return true // Starts with numbers

    return false
  }

  /**
   * Trigger auto-snipe for high-value domain
   */
  protected triggerAutoSnipe(domain: MinedDomain): void {
    console.log(`🎯 AUTO-SNIPE TRIGGERED: ${domain.domain} @ $${domain.price}`)
    domain.status = 'sniped'
    
    this.emitEvent({
      type: 'auto_snipe',
      domain: domain.domain,
      value: domain.estValue,
      price: domain.price,
      roi: domain.roi,
      source: this.source,
      message: `Auto-sniped ${domain.domain} for $${domain.price}`,
      timestamp: new Date(),
    })

    // Add to priority watchlist
    this.addToWatchlist(domain.domain, domain.price, domain.estValue)
  }

  /**
   * Add domain to sniper watchlist
   */
  protected addToWatchlist(domain: string, price: number, estValue: number): void {
    // This integrates with the existing sniper system
    // For now, store in localStorage as priority list
    try {
      const watchlist = JSON.parse(localStorage.getItem('miner_watchlist') || '[]')
      watchlist.unshift({
        domain,
        price,
        estValue,
        source: this.source,
        addedAt: new Date().toISOString(),
      })
      localStorage.setItem('miner_watchlist', JSON.stringify(watchlist.slice(0, 500)))
    } catch (e) {
      console.error('Failed to add to watchlist:', e)
    }
  }

  /**
   * Subscribe to mining events
   */
  onEvent(listener: (event: MiningEvent) => void): () => void {
    this.eventListeners.push(listener)
    return () => {
      this.eventListeners = this.eventListeners.filter(l => l !== listener)
    }
  }

  /**
   * Emit event to all listeners
   */
  protected emitEvent(event: MiningEvent): void {
    this.eventListeners.forEach(listener => listener(event))
  }

  /**
   * Get current stats
   */
  getStats(): MinerStats {
    return { ...this.stats }
  }

  /**
   * Update config
   */
  updateConfig(config: Partial<MiningConfig>): void {
    this.config = { ...this.config, ...config }
    
    // Restart if interval changed
    if (config.intervalMs && this.isRunning) {
      this.stop()
      this.start()
    }
  }

  /**
   * Get config
   */
  getConfig(): MiningConfig {
    return { ...this.config }
  }

  /**
   * Check if miner is running
   */
  isActive(): boolean {
    return this.isRunning
  }
}

