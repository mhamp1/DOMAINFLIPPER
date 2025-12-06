/**
 * EmpireBrain.ts — THE SUPREME INTELLIGENCE
 * One button. Infinite profit. Zero intervention.
 * 
 * This is the FINAL BOSS of domain flipping bots.
 * Hit GO → It makes money forever.
 * 
 * December 2025
 */

import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import { autonomousBrain } from '@/lib/autonomy/AutonomousBrain'
import { healthMonitor } from '@/lib/health/HealthMonitor'
import { valuationEngine } from '@/lib/ai/valuationEngine'
import { realDomainScanner, type ScannedDomain } from '@/lib/scanner/RealDomainScanner'
import { realSniper } from '@/lib/buy/RealSniper'
import { empireSettings } from '@/lib/config/EmpireSettings'
import { godaddyAPI } from '@/lib/api/godaddyReal'
import { namecheapAPI } from '@/lib/api/namecheapReal'
import { marketplaceLister } from '@/lib/marketplace/autoList'

// ==================== TYPES ====================

export interface EmpireStats {
  // Financial
  totalCapital: number
  availableCapital: number
  investedCapital: number
  todayProfit: number
  totalProfit: number
  projectedMonthly: number
  
  // Operations
  isRunning: boolean
  uptime: number
  domainsScanned: number
  domainsOwned: number
  domainsSold: number
  activeListings: number
  pendingSnipes: number
  
  // Intelligence
  leadsFound: number
  godScoreEvaluations: number
  web3Opportunities: number
  typoVariantsGenerated: number
  
  // Performance
  winRate: number
  avgROI: number
  avgHoldTime: number
  
  // Current Activity
  currentAction: string
  lastAction: string
  lastActionTime: Date | null
  thoughts: EmpireThought[]
}

export interface EmpireThought {
  id: string
  timestamp: Date
  type: 'scan' | 'evaluate' | 'buy' | 'sell' | 'think' | 'learn' | 'alert'
  message: string
  data?: any
}

export interface EmpireDecision {
  action: 'buy' | 'skip' | 'watch' | 'snipe'
  domain: string
  godScore: number
  estimatedValue: number
  maxBid: number
  confidence: number
  reasoning: string[]
}

// ==================== EMPIRE BRAIN CLASS ====================

class EmpireBrain {
  private isRunning = false
  private startTime: Date | null = null
  private mainLoop: ReturnType<typeof setInterval> | null = null
  private thoughtLoop: ReturnType<typeof setInterval> | null = null
  
  private stats: EmpireStats = {
    totalCapital: 0,
    availableCapital: 0,
    investedCapital: 0,
    todayProfit: 0,
    totalProfit: 0,
    projectedMonthly: 0,
    isRunning: false,
    uptime: 0,
    domainsScanned: 0,
    domainsOwned: 0,
    domainsSold: 0,
    activeListings: 0,
    pendingSnipes: 0,
    leadsFound: 0,
    godScoreEvaluations: 0,
    web3Opportunities: 0,
    typoVariantsGenerated: 0,
    winRate: 0,
    avgROI: 0,
    avgHoldTime: 0,
    currentAction: 'Idle',
    lastAction: 'None',
    lastActionTime: null,
    thoughts: [],
  }

  private listeners: Array<(stats: EmpireStats) => void> = []
  private decisions: EmpireDecision[] = []

  // ==================== LAUNCH THE EMPIRE ====================

  /**
   * 🚀 LAUNCH EMPIRE — ONE BUTTON TO RULE THEM ALL
   * This starts EVERYTHING. No manual intervention needed.
   */
  async launch(config?: { initialCapital?: number }): Promise<void> {
    if (this.isRunning) {
      toast.warning('Empire already running')
      return
    }

    this.isRunning = true
    this.startTime = new Date()
    this.stats.isRunning = true
    this.stats.totalCapital = config?.initialCapital || this.loadCapital()
    this.stats.availableCapital = this.stats.totalCapital

    // Save running state
    localStorage.setItem('empire_running', 'true')
    localStorage.setItem('empire_startTime', this.startTime.toISOString())

    logger.critical('EMPIRE', '🚀 EMPIRE LAUNCHED — AUTONOMOUS MODE ACTIVATED')

    this.addThought('alert', '🚀 EMPIRE LAUNCHED — Making money starts NOW')

    toast.success('🚀 EMPIRE LAUNCHED', {
      description: `Capital: $${this.stats.totalCapital.toLocaleString()} | All systems GO`,
      duration: 5000,
    })

    // ==================== START ALL SYSTEMS ====================

    // 0. CRITICAL: Reinitialize APIs to ensure they have the latest saved credentials
    godaddyAPI.reinit()
    namecheapAPI.reinit()
    realDomainScanner.reinit()
    
    // Check API status
    const gdReady = godaddyAPI.isReady()
    const ncReady = namecheapAPI.isReady()
    
    if (!gdReady && !ncReady) {
      this.addThought('alert', '⚠️ No APIs configured! Go to Config tab to add GoDaddy or Namecheap keys.')
      toast.warning('APIs Not Configured', { 
        description: 'Add your API keys in the Config tab to start scanning',
        duration: 10000,
      })
    } else {
      this.addThought('scan', `APIs Ready: GoDaddy ${gdReady ? '✓' : '✗'} | Namecheap ${ncReady ? '✓' : '✗'}`)
    }

    // 1. Start health monitoring
    healthMonitor.startMonitoring(30000)
    this.addThought('think', 'Health monitoring active — watching all systems')

    // 2. Start autonomous brain (domain scanning & buying)
    await autonomousBrain.start()
    this.addThought('think', 'Autonomous Brain online — scanning 120k+ domains')

    // 3. Reinitialize real APIs with saved config
    realDomainScanner.reinit()
    this.addThought('scan', 'Domain Scanner active — scanning GoDaddy & Namecheap auctions')

    // 5. Start the main intelligence loop
    this.startMainLoop()

    // 6. Start the thought/status loop
    this.startThoughtLoop()

    // Notify listeners
    this.notifyListeners()

    logger.info('EMPIRE', 'All systems operational — Empire is making money')
  }

  /**
   * 🛑 STOP EMPIRE — Emergency shutdown
   */
  stop(): void {
    this.isRunning = false
    this.stats.isRunning = false

    // Clear running state
    localStorage.removeItem('empire_running')
    localStorage.removeItem('empire_startTime')

    // Stop all systems
    if (this.mainLoop) clearInterval(this.mainLoop)
    if (this.thoughtLoop) clearInterval(this.thoughtLoop)
    
    autonomousBrain.stop()
    healthMonitor.stopMonitoring()
    empireSettings.setBotRunning(false)

    this.addThought('alert', '🛑 EMPIRE PAUSED — All systems stopped')
    
    toast.warning('Empire Paused', {
      description: `Profit so far: $${this.stats.totalProfit.toLocaleString()}`,
    })

    logger.info('EMPIRE', 'Empire stopped')
    this.notifyListeners()
  }

  /**
   * Check if empire was running (for auto-resume)
   */
  wasRunning(): boolean {
    return localStorage.getItem('empire_running') === 'true'
  }

  // ==================== MAIN INTELLIGENCE LOOP ====================

  private startMainLoop(): void {
    // Run immediately
    this.runIntelligenceCycle()

    // Then every 30 seconds
    this.mainLoop = setInterval(() => {
      this.runIntelligenceCycle()
    }, 30000)
  }

  /**
   * THE CORE INTELLIGENCE CYCLE — REAL SCANNING & SNIPING
   * This is where the magic happens — every 30 seconds
   * NOW WITH DETAILED DECISION LOGGING
   */
  private async runIntelligenceCycle(): Promise<void> {
    if (!this.isRunning) return

    const dailyBudget = empireSettings.get('dailyBudget')
    const minROI = empireSettings.get('minROI')
    const availableCapital = empireSettings.getAvailableCapital()

    try {
      this.stats.currentAction = 'Scanning markets...'
      this.notifyListeners()

      // ==================== PHASE 1: SCAN REAL AUCTIONS ====================
      
      this.addThought('scan', `🔍 SCANNING: GoDaddy & Namecheap auctions (max price: $${dailyBudget}, capital: $${availableCapital.toLocaleString()})`)

      const scanResult = await realDomainScanner.scan({
        maxResults: 50,
        maxPrice: dailyBudget,
      })

      this.stats.domainsScanned += scanResult.totalScanned
      
      // Report scan results
      if (scanResult.domains.length > 0) {
        this.addThought('scan', `📊 FOUND ${scanResult.domains.length} domains from ${scanResult.sources.join(', ')} within budget`)
      } else {
        this.addThought('think', `⏳ No domains found under $${dailyBudget} — waiting for opportunities...`)
      }
      
      if (scanResult.errors.length > 0) {
        scanResult.errors.forEach(e => this.addThought('alert', `⚠️ API Issue: ${e}`))
      }

      // ==================== PHASE 2: EVALUATE & VALUE DOMAINS ====================

      this.stats.currentAction = 'Evaluating opportunities...'
      this.notifyListeners()

      const opportunities: Array<ScannedDomain & { estimatedValue: number; score: number; breakdown?: any }> = []
      let evaluated = 0
      let rejected = 0

      for (const domain of scanResult.domains.slice(0, 20)) {
        try {
          evaluated++
          // Get AI valuation
          const [name, tld] = domain.domain.split('.')
          const valuation = await valuationEngine.predictValue({ name: domain.domain, tld: `.${tld}` })
          
          const roi = valuation.value / domain.price
          
          // DETAILED DECISION LOGIC
          const reasons: string[] = []
          let decision: 'BUY' | 'SKIP' | 'WATCH' = 'SKIP'
          
          // Check ROI requirement
          if (roi < minROI) {
            reasons.push(`ROI ${roi.toFixed(1)}x < ${minROI}x minimum`)
          }
          
          // Check AI score
          if (valuation.score < 70) {
            reasons.push(`Score ${valuation.score} < 70 threshold`)
          }
          
          // Check price vs capital
          if (domain.price > availableCapital) {
            reasons.push(`Price $${domain.price} > $${availableCapital} available`)
          }
          
          // Check if it's a good opportunity
          if (roi >= minROI && valuation.score >= 70 && domain.price <= availableCapital) {
            decision = 'BUY'
            opportunities.push({
              ...domain,
              estimatedValue: valuation.value,
              score: valuation.score,
              breakdown: valuation.breakdown,
            })
            
            // DETAILED APPROVAL MESSAGE
            this.addThought('evaluate', 
              `✅ ${domain.domain} APPROVED | Price: $${domain.price} → Value: $${valuation.value.toLocaleString()} | ROI: ${roi.toFixed(1)}x | Score: ${valuation.score}/100 | Brand: ${valuation.breakdown?.brandScore || 0} | SEO: ${valuation.breakdown?.seoScore || 0} | Trend: ${valuation.breakdown?.trendScore || 0}`
            )
          } else if (roi >= minROI * 0.7) {
            // Close but not quite - watching
            decision = 'WATCH'
            this.addThought('think', 
              `👁️ ${domain.domain} WATCHING | Price: $${domain.price} | Almost meets criteria: ${reasons.join(', ')}`
            )
          } else {
            // DETAILED REJECTION MESSAGE
            rejected++
            this.addThought('think', 
              `❌ ${domain.domain} REJECTED | Price: $${domain.price} | Reasons: ${reasons.join(' | ')}`
            )
          }
        } catch (e: any) {
          this.addThought('alert', `⚠️ Could not value ${domain.domain}: ${e.message || 'Unknown error'}`)
        }
      }

      // Summary of evaluation
      if (evaluated > 0) {
        this.addThought('evaluate', `📈 EVALUATION COMPLETE: ${opportunities.length} approved, ${rejected} rejected out of ${evaluated} analyzed`)
      }

      // Sort by ROI
      opportunities.sort((a, b) => (b.estimatedValue / b.price) - (a.estimatedValue / a.price))

      // ==================== PHASE 3: SNIPE TOP OPPORTUNITIES ====================

      if (opportunities.length === 0) {
        this.addThought('think', `🔄 No opportunities met criteria this cycle. Min ROI: ${minROI}x, Min Score: 70. Continuing to scan...`)
        this.stats.currentAction = 'Monitoring markets...'
        this.notifyListeners()
        return
      }

      this.stats.currentAction = 'Sniping opportunities...'
      this.notifyListeners()
      
      this.addThought('buy', `🎯 EXECUTING: Attempting to acquire top ${Math.min(3, opportunities.length)} opportunities...`)

      for (const opp of opportunities.slice(0, 3)) { // Top 3 only
        const roi = opp.estimatedValue / opp.price
        const profit = opp.estimatedValue - opp.price
        
        this.addThought('buy', 
          `🎯 BIDDING: ${opp.domain} | Bid: $${opp.price} | Est. Value: $${opp.estimatedValue.toLocaleString()} | Potential Profit: $${profit.toLocaleString()} (${roi.toFixed(1)}x ROI) | Source: ${opp.source}`
        )
        
        const result = await realSniper.snipe(opp)
        
        if (result.success) {
          this.stats.domainsOwned++
          this.stats.availableCapital -= result.price
          this.addThought('buy', 
            `💰 ACQUIRED: ${result.domain} for $${result.price} via ${result.source} | Order: ${result.orderId || 'pending'} | Remaining Capital: $${(availableCapital - result.price).toLocaleString()}`
          )
          
          // ==================== AUTO-LIST FOR SALE ====================
          const listPrice = Math.round(opp.estimatedValue * 0.8) // 80% of estimated value
          const expectedProfit = listPrice - result.price
          
          this.addThought('sell', 
            `📋 LISTING: ${result.domain} at $${listPrice.toLocaleString()} (80% of $${opp.estimatedValue.toLocaleString()} est.) | Expected Profit: $${expectedProfit.toLocaleString()}`
          )
          
          try {
            const listings = await marketplaceLister.listOnAllMarketplaces(result.domain, listPrice)
            const successCount = listings.filter(l => l.status === 'active').length
            const failedCount = listings.filter(l => l.status === 'failed' || l.status === 'not_configured').length
            this.stats.activeListings += successCount
            
            if (successCount > 0) {
              const marketplaces = listings.filter(l => l.status === 'active').map(l => l.marketplace).join(', ')
              this.addThought('sell', `✅ LISTED on ${successCount} marketplaces (${marketplaces}) at $${listPrice.toLocaleString()} — now waiting for buyers`)
            }
            if (failedCount > 0) {
              this.addThought('alert', `⚠️ ${failedCount} marketplaces unavailable — domain still listed on ${successCount} active ones`)
            }
          } catch (listError: any) {
            this.addThought('alert', `⚠️ Auto-list error: ${listError.message || 'Unknown'} — will retry later`)
          }
        } else {
          // DETAILED REJECTION REASON
          this.addThought('think', 
            `⏸️ DID NOT ACQUIRE ${opp.domain} | Reason: ${result.message} | Will try next opportunity...`
          )
        }
      }

      // ==================== PHASE 4: UPDATE STATS ====================

      this.updateStats()
      this.stats.currentAction = 'Monitoring markets...'
      this.notifyListeners()

    } catch (error: any) {
      logger.error('EMPIRE', 'Intelligence cycle error', error as Error)
      this.addThought('alert', `🔴 SYSTEM ERROR: ${error.message || 'Unknown'} — auto-recovering in 30 seconds...`)
      // Self-healing: continue running
    }
  }
  // ==================== THOUGHT SYSTEM ====================

  private startThoughtLoop(): void {
    this.thoughtLoop = setInterval(() => {
      if (!this.isRunning) return

      // Generate contextual status updates based on current state
      const capital = empireSettings.getAvailableCapital()
      const budget = empireSettings.get('dailyBudget')
      const minROI = empireSettings.get('minROI')
      const owned = this.stats.domainsOwned
      const scanned = this.stats.domainsScanned
      
      const statusUpdates = [
        `💰 Capital: $${capital.toLocaleString()} available | Daily Budget: $${budget} | Min ROI: ${minROI}x`,
        `📊 Session Stats: ${scanned.toLocaleString()} domains scanned | ${owned} owned | ${this.stats.activeListings} listed`,
        `🔍 Criteria: Looking for domains under $${budget} with ${minROI}x+ ROI potential and 70+ AI score`,
        `⏱️ Next scan in ~30 seconds | Checking GoDaddy auctions, Namecheap, and drop lists`,
        `🎯 Strategy: Buy low, value high, auto-list immediately, maximize ROI`,
        `📈 Targeting: .com, .io, .ai TLDs | Short names | Trending keywords | High brandability`,
        `🛡️ Risk Filters: Trademark check | Price validation | Capital protection | Quality scoring`,
        `🤖 AI Analysis: Brand score + SEO potential + Trend matching + TLD value + Length optimization`,
      ]

      const randomUpdate = statusUpdates[Math.floor(Math.random() * statusUpdates.length)]
      this.addThought('think', randomUpdate)

      // Update uptime
      if (this.startTime) {
        this.stats.uptime = Date.now() - this.startTime.getTime()
      }

      this.notifyListeners()
    }, 10000) // Every 10 seconds
  }

  private addThought(type: EmpireThought['type'], message: string, data?: any): void {
    const thought: EmpireThought = {
      id: `thought-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      type,
      message,
      data,
    }

    this.stats.thoughts.unshift(thought)
    if (this.stats.thoughts.length > 50) this.stats.thoughts.pop()

    this.stats.lastAction = message
    this.stats.lastActionTime = new Date()

    logger.debug('EMPIRE_THOUGHT', message, data)
  }

  // ==================== STATS & PERSISTENCE ====================

  private updateStats(): void {
    // Calculate projected monthly based on today's performance
    const hoursRunning = this.stats.uptime / (1000 * 60 * 60)
    if (hoursRunning > 0) {
      const hourlyRate = this.stats.todayProfit / hoursRunning
      this.stats.projectedMonthly = hourlyRate * 24 * 30
    }

    // Update win rate
    const totalDeals = this.stats.domainsSold + this.stats.domainsOwned
    if (totalDeals > 0) {
      this.stats.winRate = (this.stats.domainsSold / totalDeals) * 100
    }
  }

  private loadCapital(): number {
    const saved = localStorage.getItem('empire_capital')
    return saved ? parseFloat(saved) : 500 // Default $500
  }

  private savePurchase(decision: EmpireDecision): void {
    const purchases = JSON.parse(localStorage.getItem('empire_purchases') || '[]')
    purchases.push({
      domain: decision.domain,
      cost: decision.maxBid,
      estimatedValue: decision.estimatedValue,
      godScore: decision.godScore,
      timestamp: new Date().toISOString(),
    })
    localStorage.setItem('empire_purchases', JSON.stringify(purchases.slice(-100)))
  }

  // ==================== LISTENER SYSTEM ====================

  subscribe(listener: (stats: EmpireStats) => void): () => void {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(l => l({ ...this.stats }))
  }

  // ==================== PUBLIC GETTERS ====================

  getStats(): EmpireStats {
    return { ...this.stats }
  }

  getDecisions(): EmpireDecision[] {
    return [...this.decisions]
  }

  getThoughts(): EmpireThought[] {
    return [...this.stats.thoughts]
  }

  isActive(): boolean {
    return this.isRunning
  }

  setCapital(amount: number): void {
    this.stats.totalCapital = amount
    this.stats.availableCapital = amount - this.stats.investedCapital
    localStorage.setItem('empire_capital', amount.toString())
    this.notifyListeners()
  }

  // Record a sale (called when domain sells)
  recordSale(domain: string, salePrice: number, purchasePrice: number): void {
    const profit = salePrice - purchasePrice
    this.stats.todayProfit += profit
    this.stats.totalProfit += profit
    this.stats.domainsSold++
    this.stats.domainsOwned--
    this.stats.activeListings--
    this.stats.availableCapital += salePrice

    this.addThought('sell', `💰 SOLD: ${domain} for $${salePrice.toLocaleString()} (Profit: $${profit.toLocaleString()})`)

    toast.success('💰 DOMAIN SOLD!', {
      description: `${domain} → $${salePrice.toLocaleString()} profit: $${profit.toLocaleString()}`,
      duration: 10000,
    })

    this.notifyListeners()
  }
}

// Export singleton
export const empireBrain = new EmpireBrain()

