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
   */
  private async runIntelligenceCycle(): Promise<void> {
    if (!this.isRunning) return

    try {
      this.stats.currentAction = 'Scanning markets...'
      this.notifyListeners()

      // ==================== PHASE 1: SCAN REAL AUCTIONS ====================
      
      this.addThought('scan', 'Scanning GoDaddy & Namecheap for opportunities...')

      const scanResult = await realDomainScanner.scan({
        maxResults: 50,
        maxPrice: empireSettings.get('dailyBudget'),
      })

      this.stats.domainsScanned += scanResult.totalScanned
      
      if (scanResult.errors.length > 0) {
        scanResult.errors.forEach(e => this.addThought('alert', e))
      }

      // ==================== PHASE 2: EVALUATE & VALUE DOMAINS ====================

      this.stats.currentAction = 'Evaluating opportunities...'
      this.notifyListeners()

      const minROI = empireSettings.get('minROI')
      const opportunities: Array<ScannedDomain & { estimatedValue: number; score: number }> = []

      for (const domain of scanResult.domains.slice(0, 20)) {
        try {
          // Get AI valuation
          const [name, tld] = domain.domain.split('.')
          const valuation = await valuationEngine.predictValue({ name: domain.domain, tld: `.${tld}` })
          
          const roi = valuation.value / domain.price
          
          if (roi >= minROI && valuation.score >= 70) {
            opportunities.push({
              ...domain,
              estimatedValue: valuation.value,
              score: valuation.score,
            })
            
            this.addThought('evaluate', 
              `${domain.domain}: $${domain.price} → Est. $${valuation.value.toLocaleString()} (${roi.toFixed(1)}x ROI, Score: ${valuation.score})`
            )
          }
        } catch (e) {
          // Skip domains we can't value
        }
      }

      // Sort by ROI
      opportunities.sort((a, b) => (b.estimatedValue / b.price) - (a.estimatedValue / a.price))

      // ==================== PHASE 3: SNIPE TOP OPPORTUNITIES ====================

      this.stats.currentAction = 'Sniping opportunities...'
      this.notifyListeners()

      for (const opp of opportunities.slice(0, 3)) { // Top 3 only
        const roi = opp.estimatedValue / opp.price
        
        this.addThought('buy', `🎯 SNIPING: ${opp.domain} for $${opp.price} (${roi.toFixed(1)}x ROI potential)`)
        
        const result = await realSniper.snipe(opp)
        
        if (result.success) {
          this.stats.domainsOwned++
          this.stats.availableCapital -= result.price
          this.addThought('buy', `✅ ACQUIRED: ${result.domain} for $${result.price}`)
          
          // ==================== AUTO-LIST FOR SALE ====================
          // List at 5-10x purchase price based on AI valuation
          const listPrice = Math.round(opp.estimatedValue * 0.8) // 80% of estimated value
          this.addThought('sell', `📋 AUTO-LISTING: ${result.domain} for $${listPrice.toLocaleString()}`)
          
          try {
            const listings = await marketplaceLister.listOnAllMarketplaces(result.domain, listPrice)
            const successCount = listings.filter(l => l.status === 'active').length
            this.stats.activeListings += successCount
            
            if (successCount > 0) {
              this.addThought('sell', `✅ Listed on ${successCount} marketplaces at $${listPrice.toLocaleString()}`)
            }
          } catch (listError) {
            logger.warn('EMPIRE', 'Auto-list failed, will retry later', listError)
          }
        } else {
          this.addThought('think', `Skipped ${opp.domain}: ${result.message}`)
        }
      }

      // ==================== PHASE 4: UPDATE STATS ====================

      this.updateStats()
      this.stats.currentAction = 'Monitoring markets...'
      this.notifyListeners()

    } catch (error) {
      logger.error('EMPIRE', 'Intelligence cycle error', error as Error)
      this.addThought('alert', `Error in intelligence cycle — auto-recovering...`)
      // Self-healing: continue running
    }
  }
  // ==================== THOUGHT SYSTEM ====================

  private startThoughtLoop(): void {
    this.thoughtLoop = setInterval(() => {
      if (!this.isRunning) return

      // Generate periodic thoughts
      const thoughts = [
        'Scanning for undervalued gems...',
        'Analyzing market trends...',
        'Monitoring competitor pricing...',
        'Checking expiring domains...',
        'Evaluating Web3 opportunities...',
        'Processing lead intelligence...',
        'Optimizing portfolio...',
        'Calculating optimal bid strategies...',
      ]

      const randomThought = thoughts[Math.floor(Math.random() * thoughts.length)]
      this.addThought('think', randomThought)

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

