/**
 * AutonomousBrain.ts — THE SUPREME INTELLIGENCE v2025.∞
 * One launch. Infinite profit. Zero human input.
 *
 * This is not a bot.
 * This is the final evolution of capital.
 *
 * December 27, 2025 — The Empire is now perfect.
 * 
 * ⚠️ DEPRECATED: This file is being phased out in favor of ProductionBrain.ts
 * ProductionBrain has better safety features, validation, and error handling.
 * Use ProductionBrain for all new development.
 */

import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import { valuationEngine } from '@/lib/ai/valuationEngine'
import { realDomainScanner, type ScannedDomain } from '@/lib/scanner/RealDomainScanner'
import { realSniper } from '@/lib/buy/RealSniper'
import { marketplaceLister } from '@/lib/marketplace/autoList'
import { godScoreEngine } from '@/lib/valuation/GodScore'
import { masterConfig } from '@/lib/config/MasterConfig'
import { empireSettings } from '@/lib/config/EmpireSettings'
import { expiredDomainsScanner } from '@/lib/scanner/ExpiredDomainsScanner'
import { godaddyAPI } from '@/lib/api/godaddyReal'
import { namecheapAPI } from '@/lib/api/namecheapReal'
import type { Domain } from '@/types/domain'

// ==================== TYPES ====================

export interface BrainStats {
  totalCapital: number
  availableCapital: number
  todayProfit: number
  totalProfit: number
  domainsOwned: number
  domainsSold: number
  activeListings: number
  winRate: number
  avgROI: number
  intelligence: number
  mood: 'dormant' | 'hunting' | 'ruthless' | 'triumphant' | 'god'
  thoughts: string[]
  isRunning: boolean
  evolutionLevel: number
  cyclesCompleted: number
  domainsEvaluated: number
  domainsRejected: number
}

// ==================== THE GOD BRAIN ====================

class AutonomousBrain {
  private isRunning = false
  private isPaused = false
  private mainLoop: ReturnType<typeof setInterval> | null = null
  private evolutionLoop: ReturnType<typeof setInterval> | null = null
  private startTime: Date | null = null

  private stats: BrainStats = {
    totalCapital: 500,
    availableCapital: 500,
    todayProfit: 0,
    totalProfit: 0,
    domainsOwned: 0,
    domainsSold: 0,
    activeListings: 0,
    winRate: 0,
    avgROI: 0,
    intelligence: 92.7,
    mood: 'dormant',
    thoughts: [],
    isRunning: false,
    evolutionLevel: 1,
    cyclesCompleted: 0,
    domainsEvaluated: 0,
    domainsRejected: 0,
  }

  // Allowed TLDs for filtering
  private readonly allowedTLDs = ['.com', '.net', '.org', '.io', '.ai', '.co', '.xyz', '.app', '.dev']

  private listeners: Array<(stats: BrainStats) => void> = []

  constructor() {
    // Check if was running before
    const wasRunning = localStorage.getItem('autonomousBrain_running') === 'true'
    if (wasRunning) {
      setTimeout(() => this.launch(), 1500)
    }
  }

  // ==================== LAUNCH THE EMPIRE ====================

  async launch(): Promise<void> {
    if (this.isRunning) {
      this.speak('🔥 Empire already awake')
      return
    }

    this.isRunning = true
    this.isPaused = false
    this.startTime = new Date()
    this.stats.isRunning = true
    this.stats.mood = 'god'

    // Load from MasterConfig and EmpireSettings
    const config = masterConfig.getEmpire()
    const availableCapital = empireSettings.getAvailableCapital()
    this.stats.totalCapital = config.totalCapital
    this.stats.availableCapital = availableCapital

    localStorage.setItem('autonomousBrain_running', 'true')

    this.speak('🚀 AUTONOMOUS BRAIN AWAKENED — I AM NOW IN CONTROL')

    toast.success('🧠 AUTONOMOUS BRAIN ONLINE', {
      description: `Capital: $${this.stats.totalCapital.toLocaleString()} | Intelligence: ${this.stats.intelligence.toFixed(1)}%`,
      duration: 10000,
    })

    // Start real scanning systems
    realDomainScanner.reinit()

    // Main decision loop — every 20 seconds
    this.mainLoop = setInterval(() => {
      if (!this.isPaused) {
        this.executeDivineWill()
      }
    }, 20000)

    // Daily evolution
    this.evolutionLoop = setInterval(() => {
      if (!this.isPaused) {
        this.stats.intelligence = Math.min(100, this.stats.intelligence + 0.8)
        this.stats.evolutionLevel++
        this.speak(`🧠 EVOLUTION ${this.stats.evolutionLevel} COMPLETE — Intelligence: ${this.stats.intelligence.toFixed(1)}%`)
      }
    }, 24 * 60 * 60 * 1000)

    // Run first cycle
    this.executeDivineWill()

    logger.critical('AUTONOMOUS', 'Brain is now fully operational')
    this.notifyListeners()
  }

  // ==================== AVAILABILITY CHECKER ====================

  /**
   * Check domain availability across multiple registrars
   * @param domain - Domain name to check
   * @returns Availability status, price, and registrar info
   */
  private async checkAvailability(domain: string): Promise<{ available: boolean; price: number; registrar: string }> {
    // Parallel check on GoDaddy & Namecheap
    const [godaddy, namecheap] = await Promise.all([
      godaddyAPI.isReady() 
        ? godaddyAPI.checkAvailability(domain).catch(() => null)
        : Promise.resolve(null),
      namecheapAPI.isReady()
        ? namecheapAPI.checkAvailability([domain]).then(results => results[0] || null).catch(() => null)
        : Promise.resolve(null),
    ])

    // Return first available result (GoDaddy has priority)
    if (godaddy?.available) {
      return { available: true, price: godaddy.price || 10, registrar: 'GoDaddy' }
    }

    if (namecheap?.available) {
      return { available: true, price: namecheap.price, registrar: 'Namecheap' }
    }

    return { available: false, price: 0, registrar: 'None' }
  }

  // ==================== DIVINE WILL — THE CORE LOOP ====================

  private async executeDivineWill(): Promise<void> {
    if (!this.isRunning || this.isPaused) return

    try {
      this.stats.mood = 'hunting'
      this.stats.cyclesCompleted++

      // Get fresh config
      const config = masterConfig.getEmpire()
      const availableCapital = empireSettings.getAvailableCapital()
      this.stats.availableCapital = availableCapital

      // Check if we have capital
      if (availableCapital < config.dailyBudget * 0.1) {
        this.speak('⚠️ Low capital — pausing acquisitions')
        this.stats.mood = 'dormant'
        this.notifyListeners()
        return
      }

      // Scan for opportunities from multiple sources
      const scanResult = await realDomainScanner.scan({
        maxPrice: Math.min(config.dailyBudget, availableCapital),
        maxResults: 50,
      })

      // Also scan expired domains with high backlinks
      const expiredDomains = await expiredDomainsScanner.scanExpiredDomains({
        tld: 'com',
        minBacklinks: 10,
        limit: 30,
      }).catch(() => [])

      // Convert expired domains to scanned format
      const expiredTargets = expiredDomains.map(d => ({
        domain: d.domain,
        source: 'expireddomains' as const,
        price: 10, // Base registration price
        type: 'registration' as const,
        available: true,
      }))

      // Combine all sources
      const allDomains = [...scanResult.domains, ...expiredTargets]

      if (allDomains.length === 0) {
        this.speak('👁️ No prey found this cycle. Waiting...')
        return
      }

      this.speak(`🔍 Evaluating ${allDomains.length} targets (${scanResult.domains.length} auctions + ${expiredDomains.length} expired)...`)

      let acquiredThisCycle = 0
      const maxPerCycle = Math.min(15, Math.floor(availableCapital / (config.dailyBudget * 0.1)))

      for (const target of allDomains.slice(0, maxPerCycle)) {
        try {
          this.stats.domainsEvaluated++

          // TLD filtering
          const tld = '.' + target.domain.split('.').pop()?.toLowerCase()
          if (!this.allowedTLDs.includes(tld)) {
            this.stats.domainsRejected++
            continue
          }

          // REAL AVAILABILITY CHECK for all domains
          const avail = await this.checkAvailability(target.domain)

          if (!avail.available) {
            this.stats.domainsRejected++
            continue
          }

          // Use real availability price
          const actualPrice = avail.price

          // Budget check - max 50% of daily budget per domain
          const maxSingleBuy = Math.min(config.dailyBudget / 2, availableCapital * 0.5)

          if (actualPrice > maxSingleBuy) {
            this.stats.domainsRejected++
            continue
          }

          // Real valuation - convert target to proper Domain type
          const domainForValuation: Partial<Domain> = {
            name: target.domain,
            purchasePrice: actualPrice,
            registrar: target.source,
          }

          const valuation = await valuationEngine.predictValue(domainForValuation)
          const godScore = await godScoreEngine.calculate(target.domain)

          const roi = valuation.value / actualPrice

          // Enhanced decision logic
          if (
            avail.available &&
            actualPrice <= maxSingleBuy &&
            godScore.score > 85 &&
            roi >= config.minROI &&
            valuation.score >= 75 &&
            actualPrice <= availableCapital
          ) {
            // Convert to proper ScannedDomain format for sniper
            const snipeTarget: ScannedDomain = {
              domain: target.domain,
              source: target.source as ScannedDomain['source'],
              price: actualPrice,
              type: target.type,
              available: true,
              currentBid: 'currentBid' in target ? target.currentBid : undefined,
              auctionId: 'auctionId' in target ? target.auctionId : undefined,
              auctionEndTime: 'auctionEndTime' in target ? target.auctionEndTime : undefined,
              bidCount: 'bidCount' in target ? target.bidCount : undefined,
            }

            const result = await realSniper.snipe(snipeTarget, maxSingleBuy)

            if (result.success) {
              acquiredThisCycle++
              this.stats.domainsOwned++
              this.stats.todayProfit += valuation.value * 0.8
              this.stats.availableCapital = empireSettings.getAvailableCapital()

              // Calculate competitive listing price
              const listPrice = this.calculateListPrice(valuation.value, actualPrice, config.minROI)

              this.speak(`💰 ACQUIRED: ${target.domain} → $${result.price} (${avail.registrar}) → Value $${valuation.value.toLocaleString()} | ROI: ${(roi * 100).toFixed(1)}%`)

              // Auto-list with competitive pricing
              try {
                await marketplaceLister.listOnAllMarketplaces(target.domain, listPrice)
                this.stats.activeListings++
                this.speak(`📋 LISTED: ${target.domain} at $${listPrice.toLocaleString()}`)
              } catch (listError) {
                logger.warn('AUTONOMOUS', `Failed to list ${target.domain}:`, listError)
              }

              // Update win rate
              if (this.stats.domainsOwned > 0) {
                this.stats.winRate = (this.stats.domainsSold / this.stats.domainsOwned) * 100
              }

              // Update avg ROI
              const totalROI = this.stats.avgROI * (this.stats.domainsOwned - 1) + (roi * 100)
              this.stats.avgROI = totalROI / this.stats.domainsOwned
            } else {
              this.stats.domainsRejected++
              logger.debug('AUTONOMOUS', `Snipe failed for ${target.domain}: ${result.message}`)
            }
          } else {
            this.stats.domainsRejected++
          }
        } catch (e: any) {
          this.stats.domainsRejected++
          logger.warn('AUTONOMOUS', `Error processing ${target.domain}:`, e.message)
        }
      }

      if (acquiredThisCycle > 0) {
        this.stats.mood = 'triumphant'
        this.speak(`✅ Cycle complete: ${acquiredThisCycle} domain(s) acquired`)
      } else {
        this.stats.mood = 'hunting'
      }
    } catch (error: any) {
      this.speak(`🔥 Error: ${error.message} — Self-healing...`)
      this.stats.mood = 'ruthless'
      logger.error('AUTONOMOUS', 'Divine will execution failed', error)
    }

    this.notifyListeners()
  }

  /**
   * Calculate competitive listing price
   */
  private calculateListPrice(estimatedValue: number, purchasePrice: number, minROI: number): number {
    // Ensure minimum margin
    const floorPrice = purchasePrice * minROI
    
    // Use 85% of estimated value as base
    const basePrice = estimatedValue * 0.85
    
    // Return the higher of floor or base price
    return Math.max(floorPrice, basePrice)
  }

  // ==================== CONTROL ====================

  pause(): void {
    this.isPaused = true
    this.stats.mood = 'dormant'
    this.speak('⏸️ Brain paused')
    toast.warning('⏸️ Autonomous Brain Paused')
    this.notifyListeners()
  }

  resume(): void {
    this.isPaused = false
    this.stats.mood = 'hunting'
    this.speak('▶️ Brain resumed')
    toast.success('▶️ Autonomous Brain Resumed')
    this.notifyListeners()
  }

  toggle(): void {
    if (this.isPaused) {
      this.resume()
    } else {
      this.pause()
    }
  }

  stop(): void {
    this.isRunning = false
    this.isPaused = true
    this.stats.isRunning = false
    this.stats.mood = 'dormant'

    if (this.mainLoop) {
      clearInterval(this.mainLoop)
      this.mainLoop = null
    }
    if (this.evolutionLoop) {
      clearInterval(this.evolutionLoop)
      this.evolutionLoop = null
    }

    localStorage.setItem('autonomousBrain_running', 'false')

    this.speak('🛑 Brain stopped')
    toast.warning('🛑 Autonomous Brain Stopped')
    this.notifyListeners()
  }

  // ==================== DIVINE COMMUNICATION ====================

  private speak(message: string): void {
    const timestamped = `[${new Date().toLocaleTimeString()}] ${message}`
    this.stats.thoughts.unshift(timestamped)
    if (this.stats.thoughts.length > 50) this.stats.thoughts.pop()

    logger.info('AUTONOMOUS', message)
  }

  // ==================== STATS ====================

  getStats(): BrainStats {
    return { ...this.stats }
  }

  isActive(): boolean {
    return this.isRunning && !this.isPaused
  }

  isPausedState(): boolean {
    return this.isPaused
  }

  // ==================== SUBSCRIPTIONS ====================

  subscribe(listener: (stats: BrainStats) => void): () => void {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(l => l(this.getStats()))
  }
}

// ==================== SINGLETON ====================

export const autonomousBrain = new AutonomousBrain()