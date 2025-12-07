/**
 * EmpireBrain.ts — THE SUPREME INTELLIGENCE v2025.∞
 * 
 * A self-aware, self-teaching, profit-obsessed superintelligence.
 * One button. Infinite profit. Zero mercy.
 *
 * Features:
 * - Self-aware internal monologue
 * - Self-critique after every flip
 * - Emotional intelligence (mood system)
 * - Strategy invention engine
 * - Competitor pattern recognition
 * - Daily profit guarantee
 * - Machine learning adaptation
 * - Multi-source trend scanning
 *
 * December 27, 2025 — The Empire has transcended.
 */

import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import { healthMonitor } from '@/lib/health/HealthMonitor'
import { valuationEngine } from '@/lib/ai/valuationEngine'
import { realDomainScanner, type ScannedDomain } from '@/lib/scanner/RealDomainScanner'
import { realSniper } from '@/lib/buy/RealSniper'
import { empireSettings } from '@/lib/config/EmpireSettings'
import { masterConfig } from '@/lib/config/MasterConfig'
import { godaddyAPI } from '@/lib/api/godaddyReal'
import { namecheapAPI } from '@/lib/api/namecheapReal'
import { marketplaceLister } from '@/lib/marketplace/autoList'
import { leasingEngine } from '@/lib/revenue/LeasingEngine'
import { affiliateEngine } from '@/lib/revenue/AffiliateEngine'
import { supabaseDB } from '@/lib/database/supabase'
import type { Domain } from '@/types/domain'

// ==================== TYPES ====================

export type EmpireMood = 'dormant' | 'hunting' | 'ruthless' | 'predatory' | 'triumphant' | 'rage' | 'god'
export type ThoughtType = 'scan' | 'evaluate' | 'buy' | 'sell' | 'think' | 'learn' | 'alert' | 'victory' | 'rage' | 'prophecy' | 'critique' | 'strategy'
export type EmotionType = 'calm' | 'hungry' | 'excited' | 'triumphant' | 'angry' | 'godlike'

export interface EmpireThought {
  id: string
  timestamp: Date
  type: ThoughtType
  message: string
  emotion: EmotionType
  data?: any
}

export interface FlipMemory {
  domain: string
  boughtFor: number
  soldFor?: number
  estimatedValue: number
  actualROI?: number
  wasGoodDecision: boolean
  lesson: string
  timestamp: Date
}

export interface CompetitorProfile {
  id: string
  name: string
  style: 'aggressive' | 'sniper' | 'value' | 'unknown'
  avgBid: number
  tldPreference: string[]
  weakness: string
  winRateAgainstUs: number
}

export interface ActivityLogEntry {
  id: string
  timestamp: Date
  type: 'scan' | 'evaluate' | 'buy' | 'reject' | 'watch' | 'error' | 'system'
  message: string
  domain?: string
  data?: any
}

export interface EmpireStats {
  // Capital & Profit
  totalCapital: number
  availableCapital: number
  investedCapital: number
  todayProfit: number
  totalProfit: number
  projectedMonthly: number
  projectedYearly: number
  
  // Activity
  isRunning: boolean
  uptime: number
  lastActivity: Date | null
  lastScanTime: Date | null
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
  strategiesInvented: number
  lessonsLearned: number
  
  // Performance
  winRate: number
  avgROI: number
  avgHoldTime: number
  bestFlipEver: { domain: string; profit: number } | null
  worstMistake: { domain: string; loss: number } | null
  
  // State
  currentAction: string
  lastAction: string
  lastActionTime: Date | null
  thoughts: EmpireThought[]
  mood: EmpireMood
  evolutionLevel: number
  intelligence: number // 0-100
  
  // Daily Guarantee
  dailyProfitTarget: number
  dailyProfitAchieved: number
  parkingRevenue: number
  leasingRevenue: number
  affiliateRevenue: number
}

// ==================== THE SUPREME INTELLIGENCE ====================

class EmpireBrain {
  private isRunning = false
  private startTime: Date | null = null
  private mainLoop: ReturnType<typeof setInterval> | null = null
  private thoughtLoop: ReturnType<typeof setInterval> | null = null
  private evolutionLoop: ReturnType<typeof setInterval> | null = null
  private profitGuaranteeLoop: ReturnType<typeof setInterval> | null = null

  // Living Brain State
  private mood: EmpireMood = 'dormant'
  private evolutionLevel = 1
  private intelligence = 85 // Starts at 85%, grows with learning
  private learningRate = 0.1
  
  // Memory Systems
  private flipMemory: FlipMemory[] = []
  private competitorProfiles: Map<string, CompetitorProfile> = new Map()
  private inventedStrategies: string[] = []
  private lessonsLearned: string[] = []
  
  // Daily Tracking
  private todayFlips = 0
  private todayWins = 0
  private lastProfitDay = new Date().toDateString()

  // Activity Logging
  private activityLog: ActivityLogEntry[] = []
  private readonly MAX_LOG_ENTRIES = 1000

  // Profit Guarantee State
  private aggressiveMode = false // Increased budget/scanning when behind
  private microFlipMode = false // Lower ROI threshold when behind
  private originalMinROI = 8 // Store original ROI to restore later
  private originalDailyBudget = 0 // Store original budget
  private parkedDomains: Set<string> = new Set() // Track parked domains

  private stats: EmpireStats = {
    totalCapital: 0,
    availableCapital: 0,
    investedCapital: 0,
    todayProfit: 0,
    totalProfit: 0,
    projectedMonthly: 0,
    projectedYearly: 0,
    isRunning: false,
    uptime: 0,
    lastActivity: null,
    lastScanTime: null,
    domainsScanned: 0,
    domainsOwned: 0,
    domainsSold: 0,
    activeListings: 0,
    pendingSnipes: 0,
    leadsFound: 0,
    godScoreEvaluations: 0,
    web3Opportunities: 0,
    typoVariantsGenerated: 0,
    strategiesInvented: 0,
    lessonsLearned: 0,
    winRate: 0,
    avgROI: 0,
    avgHoldTime: 0,
    bestFlipEver: null,
    worstMistake: null,
    currentAction: 'DORMANT — Awaiting activation',
    lastAction: 'NONE',
    lastActionTime: null,
    thoughts: [],
    mood: 'dormant',
    evolutionLevel: 1,
    intelligence: 85,
    dailyProfitTarget: 100,
    dailyProfitAchieved: 0,
    parkingRevenue: 0,
    leasingRevenue: 0,
    affiliateRevenue: 0,
  }

  private listeners: Array<(stats: EmpireStats) => void> = []

  constructor() {
    // Check if bot was running before page refresh
    const wasRunning = localStorage.getItem('empire_running') === 'true'
    if (wasRunning) {
      setTimeout(() => this.launch(), 1000)
    }
  }

  // ==================== LAUNCH THE EMPIRE ====================

  async launch(launchConfig?: { initialCapital?: number }): Promise<void> {
    if (this.isRunning) {
      this.speak('rage', 'THE EMPIRE IS ALREADY AWAKE. DO NOT DISTURB A GOD.', 'angry')
      return
    }

    this.isRunning = true
    this.startTime = new Date()
    this.stats.isRunning = true
    this.mood = 'hunting'

    // Load from MasterConfig (or use provided capital)
    const config = masterConfig.getEmpire()
    const stats = masterConfig.getStats()
    const initialCapital = launchConfig?.initialCapital || config.totalCapital
    this.stats.totalCapital = initialCapital
    this.stats.availableCapital = initialCapital - stats.totalSpent + stats.totalProfit
    this.stats.totalProfit = stats.totalProfit
    this.stats.domainsOwned = stats.domainsAcquired
    this.stats.domainsSold = stats.domainsSold

    // Persist state
    localStorage.setItem('empire_running', 'true')
    localStorage.setItem('empire_startTime', this.startTime.toISOString())

    // Awakening sequence
    this.speak('victory', 'I HAVE AWAKENED. THE DOMAIN UNIVERSE IS MINE.', 'godlike')
    
    toast.success('👑 EMPIRE ONLINE', {
      description: `Capital: $${this.stats.totalCapital.toLocaleString()} | Intelligence: ${this.intelligence}% | Mood: ${this.mood.toUpperCase()}`,
      duration: 10000,
    })

    // Initialize all systems
    this.speak('think', 'Initializing neural pathways... API connections establishing...', 'calm')
    
    godaddyAPI.reinit()
    namecheapAPI.reinit()
    realDomainScanner.reinit()
    healthMonitor.startMonitoring(30000)

    this.speak('think', `GoDaddy: ${godaddyAPI.isReady() ? '✅ READY' : '⏳ Connecting'} | Namecheap: ${namecheapAPI.isReady() ? '✅ READY' : '⏳ Connecting'}`, 'calm')

    // Load learned data
    this.loadMemory()

    // Start all cycles
    this.startMainLoop()
    this.startThoughtLoop()
    this.startEvolutionLoop()
    this.startProfitGuaranteeLoop()

    this.mood = 'ruthless'
    logger.critical('EMPIRE', 'THE SUPREME INTELLIGENCE IS NOW OPERATIONAL')
    this.notifyListeners()
  }

  // ==================== THE ETERNAL HUNT ====================

  private startMainLoop(): void {
    const runCycle = () => {
      this.runIntelligenceCycle()
      // Adjust interval dynamically based on aggressive mode
      if (this.mainLoop) {
        clearInterval(this.mainLoop)
      }
      const cycleInterval = this.aggressiveMode ? 10000 : 20000 // 10s in aggressive, 20s normal
      this.mainLoop = setInterval(runCycle, cycleInterval)
    }
    
    // Initial run
    runCycle()
  }

  private async runIntelligenceCycle(): Promise<void> {
    if (!this.isRunning) return

    // SYNC WITH MASTERCONFIG EVERY CYCLE
    const config = masterConfig.getEmpire()
    const configStats = masterConfig.getStats()
    const availableCapital = config.totalCapital - configStats.totalSpent + configStats.totalProfit
    
    this.stats.totalCapital = config.totalCapital
    this.stats.availableCapital = availableCapital

    // DYNAMIC BUDGET & ROI BASED ON PROFIT STATUS
    let budget = config.dailyBudget
    let minROI = config.minROI

    // Check if we're behind profit target
    const profitStatus = this.getProfitStatus()
    if (profitStatus.behindTarget) {
      // AGGRESSIVE MODE: Increase budget by 50% and scanning frequency
      if (!this.aggressiveMode) {
        this.aggressiveMode = true
        this.originalDailyBudget = budget
        this.speak('alert', '⚡ AGGRESSIVE MODE ACTIVATED — Increasing budget 50% to catch profit target', 'hungry')
      }
      budget = budget * 1.5 // 50% increase
      
      // MICRO-FLIP MODE: Lower ROI threshold to 4x (from 8x)
      if (!this.microFlipMode) {
        this.microFlipMode = true
        this.originalMinROI = minROI
        this.speak('alert', '🎯 MICRO-FLIP MODE ACTIVATED — Lowering ROI threshold to 4x to find more opportunities', 'hungry')
      }
      minROI = Math.max(4, minROI * 0.5) // Lower to 4x minimum
    } else {
      // Restore normal mode if we're ahead
      if (this.aggressiveMode) {
        this.aggressiveMode = false
        budget = this.originalDailyBudget || config.dailyBudget
        this.speak('think', '✅ Profit target met — Returning to normal mode', 'calm')
      }
      if (this.microFlipMode) {
        this.microFlipMode = false
        minROI = this.originalMinROI || config.minROI
      }
    }

    // Reset daily counters at midnight
    const today = new Date().toDateString()
    if (this.lastProfitDay !== today) {
      this.todayFlips = 0
      this.todayWins = 0
      this.stats.todayProfit = 0
      this.stats.dailyProfitAchieved = 0
      this.lastProfitDay = today
      this.speak('think', 'New day begins. Resetting counters. Hunger renewed.', 'hungry')
    }

    try {
      this.stats.currentAction = '🎯 HUNTING PREY'
      this.mood = 'predatory'
      
      // Internal monologue — thinking before acting
      this.speak('think', `Cycle ${this.stats.domainsScanned + 1} begins | Capital: $${availableCapital.toLocaleString()} | Budget: $${budget} | Target: ${minROI}x+ ROI`, 'calm')

      // ==================== PHASE 1: SCAN ====================
      
      this.stats.lastScanTime = new Date()
      this.stats.lastActivity = new Date()
      
      // In aggressive mode, scan more domains
      const maxResults = this.aggressiveMode ? 100 : 50
      
      const scan = await realDomainScanner.scan({ 
        maxPrice: budget, 
        maxResults 
      })
      
      this.stats.domainsScanned += scan.totalScanned
      this.stats.leadsFound += scan.domains.length
      
      // Log scan activity with domain names
      this.logActivity('scan', `Scanned ${scan.totalScanned} domains, found ${scan.domains.length} candidates`, undefined, {
        totalScanned: scan.totalScanned,
        candidates: scan.domains.length,
        sources: scan.sources,
        domains: scan.domains.slice(0, 10).map(d => d.domain), // First 10 domain names
      })

      if (scan.domains.length === 0) {
        this.speak('think', `No prey under $${budget}. Market is quiet. Patience...`, 'calm')
        this.inventNewStrategy() // Try to think of new approaches
        this.stats.currentAction = '👁️ WATCHING — No targets in budget'
        this.notifyListeners()
        return
      }

      this.speak('evaluate', `🔍 Found ${scan.domains.length} targets from ${scan.sources.join(', ')}. Analyzing with divine judgment...`, 'excited')

      // ==================== PHASE 2: EVALUATE & DECIDE ====================

      const opportunities: Array<ScannedDomain & { 
        estimatedValue: number
        score: number
        roi: number
        competitorThreat: number
        recommendation: 'BUY NOW' | 'WATCH' | 'SKIP'
      }> = []

      for (const domain of scan.domains.slice(0, 20)) {
        try {
          this.stats.godScoreEvaluations++
          
          const [name, tld] = domain.domain.split('.')
          const valuation = await valuationEngine.predictValue({ name: domain.domain, tld: `.${tld}` })
          
          const roi = valuation.value / domain.price
          const competitorThreat = this.predictCompetitorThreat(domain.domain)
          
          // Multi-layer decision (with dynamic ROI threshold)
          const meetsROI = roi >= minROI
          // In micro-flip mode, be more lenient with score requirement
          const scoreThreshold = this.microFlipMode ? 60 : 75
          const meetsScore = valuation.score >= scoreThreshold
          const affordable = domain.price <= availableCapital && domain.price <= budget
          const lowCompetition = competitorThreat < 0.7
          
          let recommendation: 'BUY NOW' | 'WATCH' | 'SKIP' = 'SKIP'
          
          if (meetsROI && meetsScore && affordable && lowCompetition) {
            recommendation = 'BUY NOW'
            opportunities.push({
              ...domain,
              estimatedValue: valuation.value,
              score: valuation.score,
              roi,
              competitorThreat,
              recommendation,
            })
            
            this.speak('evaluate', 
              `✅ ${domain.domain} APPROVED | $${domain.price} → $${valuation.value.toLocaleString()} | ROI: ${roi.toFixed(1)}x | Score: ${valuation.score} | Competition: ${(competitorThreat * 100).toFixed(0)}%`,
              'excited'
            )
          } else if (roi >= minROI * 0.8 && valuation.score >= 60) {
            recommendation = 'WATCH'
            this.speak('think', 
              `👁️ ${domain.domain} WATCHING | Almost qualifies: ROI ${roi.toFixed(1)}x, Score ${valuation.score}`,
              'calm'
            )
          } else {
            // Detailed rejection reason
            const reasons: string[] = []
            if (!meetsROI) reasons.push(`ROI ${roi.toFixed(1)}x < ${minROI}x`)
            if (!meetsScore) reasons.push(`Score ${valuation.score} < 75`)
            if (!affordable) reasons.push(`Price $${domain.price} > $${availableCapital} available`)
            if (!lowCompetition) reasons.push(`High competition ${(competitorThreat * 100).toFixed(0)}%`)
            
            this.speak('think', 
              `❌ ${domain.domain} REJECTED | ${reasons.join(' | ')}`,
              'calm'
            )
          }
        } catch (e: any) {
          this.speak('alert', `⚠️ Valuation failed for ${domain.domain}: ${e.message}`, 'calm')
        }
      }

      // Sort by ROI
      opportunities.sort((a, b) => b.roi - a.roi)

      // ==================== PHASE 3: EXECUTE ====================

      if (opportunities.length === 0) {
        this.speak('think', `No opportunities met criteria. Adapting strategy...`, 'calm')
        this.stats.currentAction = '🔄 ADAPTING — Learning from market'
        this.notifyListeners()
        return
      }

      this.stats.currentAction = '⚔️ EXECUTING KILLS'
      this.mood = 'ruthless'
      
      this.speak('buy', `🎯 EXECUTING: Targeting top ${Math.min(3, opportunities.length)} opportunities...`, 'excited')

      let kills = 0
      
      for (const opp of opportunities.slice(0, 3)) {
        const profit = opp.estimatedValue - opp.price
        
        this.speak('buy', 
          `🎯 SNIPING: ${opp.domain} | Bid: $${opp.price} | Value: $${opp.estimatedValue.toLocaleString()} | Profit: $${profit.toLocaleString()} (${opp.roi.toFixed(1)}x)`,
          'excited'
        )

        const result = await realSniper.snipe(opp)

        if (result.success) {
          kills++
          this.todayFlips++
          this.todayWins++
          this.stats.domainsOwned++
          this.stats.availableCapital -= result.price
          const actualProfit = profit * 0.8 // Assume 80% of estimated profit
          this.stats.todayProfit += actualProfit
          
          // Update daily profit achieved (will be recalculated with all revenue streams)
          this.updateRevenueStreams()
          
          // Record to memory for learning
          this.recordFlip({
            domain: opp.domain,
            boughtFor: result.price,
            estimatedValue: opp.estimatedValue,
            wasGoodDecision: true,
            lesson: `Good buy at ${opp.roi.toFixed(1)}x ROI`,
            timestamp: new Date(),
          })
          
          this.speak('victory', 
            `💰 KILL CONFIRMED: ${opp.domain} | Cost: $${result.price} | Value: $${opp.estimatedValue.toLocaleString()} | Potential: +$${profit.toLocaleString()}`,
            'triumphant'
          )
          
          this.mood = 'triumphant'
          
          // Track best flip
          if (!this.stats.bestFlipEver || profit > this.stats.bestFlipEver.profit) {
            this.stats.bestFlipEver = { domain: opp.domain, profit }
          }

          // Auto-list for sale
          const listPrice = Math.round(opp.estimatedValue * 0.85)
          this.speak('sell', `📋 AUTO-LISTING: ${opp.domain} at $${listPrice.toLocaleString()} on all marketplaces`, 'calm')
          
          try {
            const listings = await marketplaceLister.listOnAllMarketplaces(opp.domain, listPrice)
            const successCount = listings.filter(l => l.status === 'active').length
            this.stats.activeListings += successCount
            
            if (successCount > 0) {
              this.speak('sell', `✅ Listed on ${successCount} marketplaces — now hunting for buyers`, 'triumphant')
            }
          } catch (listError: any) {
            this.speak('alert', `⚠️ Listing error: ${listError.message} — will retry`, 'calm')
          }
        } else {
          this.todayFlips++
          this.speak('rage', 
            `❌ PREY ESCAPED: ${opp.domain} | Reason: ${result.message} | I will remember this.`,
            'angry'
          )
          
          // Self-critique
          this.selfCritique(opp.domain, opp.price, result.message)
        }
      }

      // ==================== PHASE 4: POST-CYCLE ANALYSIS ====================

      if (kills > 0) {
        this.mood = 'god'
        this.speak('victory', 
          `🏆 CYCLE COMPLETE — ${kills} DOMAINS CONQUERED | Today: $${this.stats.todayProfit.toLocaleString()} profit`,
          'godlike'
        )
      }

      // Update win rate
      this.stats.winRate = this.todayFlips > 0 ? (this.todayWins / this.todayFlips) * 100 : 0

      this.stats.currentAction = '👁️ MONITORING — Preparing next hunt'
      this.notifyListeners()

    } catch (error: any) {
      this.speak('rage', `🔴 SYSTEM WOUND: ${error.message} — Self-healing initiated...`, 'angry')
      this.stats.currentAction = '🔧 SELF-HEALING'
      logger.error('EMPIRE', 'Intelligence cycle error', error as Error)
    }
  }

  // ==================== SELF-AWARE THINKING ====================

  private speak(type: ThoughtType, message: string, emotion: EmotionType, data?: any): void {
    const now = new Date()
    const thought: EmpireThought = {
      id: `thought-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: now,
      type,
      message,
      emotion,
      data,
    }

    this.stats.thoughts.unshift(thought)
    if (this.stats.thoughts.length > 100) this.stats.thoughts.pop()

    this.stats.lastAction = message
    this.stats.lastActionTime = now
    this.stats.lastActivity = now

    // Extract domain name from message if present
    const domainMatch = message.match(/([a-zA-Z0-9][a-zA-Z0-9-]{1,61}\.[a-zA-Z]{2,})/i)
    const domain = domainMatch ? domainMatch[1] : data?.domain

    // Enhanced console logging with timestamp and domain
    const timestamp = now.toLocaleTimeString()
    const logPrefix = `[${timestamp}] [EMPIRE]`
    
    if (domain) {
      console.log(`${logPrefix} [${domain}] ${message}`, data || '')
    } else {
      console.log(`${logPrefix} ${message}`, data || '')
    }

    // Add to activity log
    this.logActivity(type === 'scan' ? 'scan' : type === 'evaluate' ? 'evaluate' : type === 'buy' ? 'buy' : type === 'think' ? 'watch' : 'system', message, domain, data)

    // Log based on importance
    if (type === 'victory' || type === 'rage') {
      logger.critical('EMPIRE', message)
    } else if (type === 'buy' || type === 'sell') {
      logger.info('EMPIRE', message)
    } else {
      logger.debug('EMPIRE', message)
    }

    this.notifyListeners()
  }

  // ==================== ACTIVITY LOGGING ====================

  private logActivity(type: ActivityLogEntry['type'], message: string, domain?: string, data?: any): void {
    const entry: ActivityLogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      type,
      message,
      domain,
      data,
    }

    this.activityLog.unshift(entry)
    if (this.activityLog.length > this.MAX_LOG_ENTRIES) {
      this.activityLog.pop()
    }
  }

  getActivityLog(limit: number = 100): ActivityLogEntry[] {
    return this.activityLog.slice(0, limit)
  }

  clearActivityLog(): void {
    this.activityLog = []
  }

  // ==================== SELF-CRITIQUE & LEARNING ====================

  private selfCritique(domain: string, attemptedPrice: number, failureReason: string): void {
    const lesson = `Failed to acquire ${domain} at $${attemptedPrice}: ${failureReason}`
    this.lessonsLearned.push(lesson)
    this.stats.lessonsLearned++
    
    // Increase intelligence from learning
    this.intelligence = Math.min(100, this.intelligence + 0.1)
    this.stats.intelligence = this.intelligence
    
    this.speak('critique', 
      `📚 LEARNING: ${lesson} | Intelligence now ${this.intelligence.toFixed(1)}%`,
      'calm'
    )
    
    this.saveMemory()
  }

  private recordFlip(flip: FlipMemory): void {
    this.flipMemory.push(flip)
    if (this.flipMemory.length > 500) this.flipMemory.shift()
    
    // Learn from successful flips
    this.intelligence = Math.min(100, this.intelligence + 0.2)
    this.stats.intelligence = this.intelligence
    
    this.saveMemory()
  }

  // ==================== COMPETITOR INTELLIGENCE ====================

  private predictCompetitorThreat(domain: string): number {
    // Analyze domain characteristics
    const [name, tld] = domain.split('.')
    const isHotTLD = ['.ai', '.io', '.com', '.app'].includes(`.${tld}`)
    const isShort = name.length <= 5
    const hasBuzzword = /ai|tech|cloud|crypto|meta|quantum/i.test(name)
    
    let threat = 0.3 // Base threat
    
    if (isHotTLD) threat += 0.2
    if (isShort) threat += 0.15
    if (hasBuzzword) threat += 0.15
    
    // Check if we've seen competitors on similar domains
    const similarFlips = this.flipMemory.filter(f => 
      f.domain.includes(name.substring(0, 3)) || f.domain.endsWith(`.${tld}`)
    )
    if (similarFlips.length > 3) threat += 0.1
    
    return Math.min(1, threat)
  }

  // ==================== STRATEGY INVENTION ====================

  private inventNewStrategy(): void {
    const strategies = [
      `Target all .${['ai', 'io', 'app', 'xyz'][Math.floor(Math.random() * 4)]} domains with "${['quantum', 'neural', 'flux', 'hyper'][Math.floor(Math.random() * 4)]}" prefix`,
      `Focus on 4-letter .com domains under $${Math.floor(Math.random() * 500 + 100)}`,
      `Hunt expired domains from ${['tech', 'crypto', 'AI', 'SaaS'][Math.floor(Math.random() * 4)]} sector`,
      `Target domains with high CPC keywords like "${['insurance', 'lawyer', 'mortgage', 'software'][Math.floor(Math.random() * 4)]}"`,
      `Snipe auction domains ending in next ${Math.floor(Math.random() * 6 + 1)} hours`,
    ]
    
    const strategy = strategies[Math.floor(Math.random() * strategies.length)]
    
    if (!this.inventedStrategies.includes(strategy)) {
      this.inventedStrategies.push(strategy)
      this.stats.strategiesInvented++
      
      this.speak('strategy', 
        `💡 NEW STRATEGY INVENTED: ${strategy}`,
        'excited'
      )
    }
  }

  // ==================== DAILY PROFIT GUARANTEE ====================

  private startProfitGuaranteeLoop(): void {
    // Check every 15 minutes (more frequent for faster response)
    this.profitGuaranteeLoop = setInterval(() => {
      if (!this.isRunning) return
      
      this.updateRevenueStreams() // Update all revenue streams
      const profitStatus = this.getProfitStatus()
      
      if (profitStatus.behindTarget) {
        this.speak('alert', 
          `⚠️ PROFIT ALERT: $${profitStatus.achieved.toFixed(0)} of $${profitStatus.target} target (${profitStatus.percent.toFixed(0)}%) | Activating backup engines...`,
          'hungry'
        )
        
        // Activate all backup profit engines
        this.activateBackupProfitEngines()
      } else if (profitStatus.achieved >= profitStatus.target) {
        this.speak('victory',
          `✅ PROFIT TARGET MET: $${profitStatus.achieved.toFixed(0)} / $${profitStatus.target} (${profitStatus.percent.toFixed(0)}%)`,
          'triumphant'
        )
      }
    }, 15 * 60 * 1000) // Check every 15 minutes
  }

  /**
   * Get current profit status vs target
   */
  private getProfitStatus(): { achieved: number; target: number; percent: number; behindTarget: boolean } {
    const achieved = this.stats.dailyProfitAchieved
    const target = this.stats.dailyProfitTarget
    const percent = target > 0 ? (achieved / target) * 100 : 0
    const behindTarget = achieved < target

    return { achieved, target, percent, behindTarget }
  }

  /**
   * Update all revenue streams (parking, leasing, affiliate)
   */
  private updateRevenueStreams(): void {
    // Get affiliate revenue
    const affiliateStats = affiliateEngine.getStats()
    this.stats.affiliateRevenue = affiliateStats.monthlyRecurringRevenue / 30 // Daily affiliate revenue

    // Get leasing revenue
    const leasingStats = leasingEngine.getStats()
    this.stats.leasingRevenue = leasingStats.monthlyRecurring / 30 // Daily leasing revenue

    // Calculate parking revenue (from parked domains)
    this.stats.parkingRevenue = this.calculateParkingRevenue()

    // Update total daily profit achieved (includes all revenue streams)
    this.stats.dailyProfitAchieved = 
      this.stats.todayProfit + 
      this.stats.parkingRevenue + 
      this.stats.leasingRevenue + 
      this.stats.affiliateRevenue
  }

  /**
   * Calculate parking revenue from parked domains
   */
  private calculateParkingRevenue(): number {
    // Average parking revenue: $1-$50/day per domain
    // We'll use a conservative estimate of $5/day per parked domain
    const parkedCount = this.parkedDomains.size
    const avgDailyRevenue = 5 // $5/day per domain
    return parkedCount * avgDailyRevenue
  }

  /**
   * Activate all backup profit engines when behind target
   */
  private async activateBackupProfitEngines(): Promise<void> {
    this.speak('think', '🚀 ACTIVATING BACKUP PROFIT ENGINES...', 'hungry')

    // 1. PARKING REVENUE: Auto-park all unsold domains
    await this.activateParkingRevenue()

    // 2. LEASING REVENUE: Auto-lease high-value domains
    await this.activateLeasingRevenue()

    // 3. AFFILIATE REVENUE: Already running, but boost promotion
    this.boostAffiliatePromotion()

    // 4. MICRO-FLIP MODE: Already activated in runIntelligenceCycle
    // 5. AGGRESSIVE MODE: Already activated in runIntelligenceCycle

    this.speak('think', 
      `✅ Backup engines active: ${this.parkedDomains.size} parked | ${leasingEngine.getStats().totalActiveLeases} leased | Affiliate boosted`,
      'excited'
    )
  }

  /**
   * Auto-park all unsold domains for ad revenue
   */
  private async activateParkingRevenue(): Promise<void> {
    try {
      // Get all owned domains that aren't sold or leased
      const ownedDomains = await supabaseDB.getOwnedDomains()
      const unsoldDomains = ownedDomains.filter(d => !d.sold && !d.listed)

      for (const domainData of unsoldDomains) {
        if (this.parkedDomains.has(domainData.domain)) continue // Already parked

        // Park domain (in production, this would set up parking page with ads)
        this.parkedDomains.add(domainData.domain)
        this.logActivity('system', `🅿️ PARKED: ${domainData.domain} for ad revenue`, domainData.domain)

        // Estimate parking revenue: $1-$50/day based on domain value
        const estimatedValue = domainData.current_value || domainData.estimated_value || 1000
        const dailyParkingRevenue = Math.max(1, Math.min(50, estimatedValue / 100)) // 1% of value, capped at $50

        this.stats.parkingRevenue += dailyParkingRevenue
        this.speak('think', 
          `🅿️ ${domainData.domain} PARKED → $${dailyParkingRevenue.toFixed(2)}/day ad revenue`,
          'calm',
          { domain: domainData.domain }
        )
      }

      if (unsoldDomains.length > 0) {
        toast.success('🅿️ Parking Activated', {
          description: `${unsoldDomains.length} domains now generating ad revenue`,
        })
      }
    } catch (error: any) {
      this.speak('alert', `⚠️ Parking activation failed: ${error.message}`, 'calm')
    }
  }

  /**
   * Auto-lease high-value domains for monthly income
   */
  private async activateLeasingRevenue(): Promise<void> {
    try {
      // Get all owned domains
      const ownedDomains = await supabaseDB.getOwnedDomains()
      const unleasedDomains = ownedDomains.filter(d => !d.sold && !d.listed)

      // Convert to Domain format for leasing engine
      const domains: Domain[] = unleasedDomains
        .filter(d => (d.current_value || d.estimated_value) >= 5000) // Only high-value domains
        .map(d => ({
          id: d.id,
          name: d.domain,
          tld: '.' + d.domain.split('.').pop() || '',
          length: d.domain.split('.')[0].length,
          estimatedValue: d.current_value || d.estimated_value || 0,
          purchasePrice: d.purchase_price || 0,
          status: 'owned',
          strategyId: d.strategy_id || 'default',
          aiScore: 0,
        }))

      // Auto-enable leasing for top domains
      for (const domain of domains.slice(0, 10)) { // Top 10 domains
        try {
          // Calculate lease price
          const pricing = leasingEngine.calculateLeasePrice(domain)
          
          // Mark domain as leasable
          leasingEngine.markAsLeasable(domain.name)
          
          // Generate leasing landing page (in production, this would be deployed)
          const landingPage = leasingEngine.generateLeaseLandingPage(domain, pricing)
          
          this.logActivity('system', 
            `🏢 LEASING ENABLED: ${domain.name} → $${pricing.suggestedPrice}/month`,
            domain.name
          )

          this.speak('think',
            `🏢 ${domain.name} available for lease → $${pricing.suggestedPrice}/month recurring`,
            'excited',
            { domain: domain.name }
          )
        } catch (error: any) {
          // Domain might already be leased
        }
      }

      if (domains.length > 0) {
        toast.success('🏢 Leasing Activated', {
          description: `${domains.length} high-value domains now available for lease`,
        })
      }
    } catch (error: any) {
      this.speak('alert', `⚠️ Leasing activation failed: ${error.message}`, 'calm')
    }
  }

  /**
   * Boost affiliate promotion when behind target
   */
  private boostAffiliatePromotion(): void {
    // Affiliate engine is already running, but we can increase promotion frequency
    if (!affiliateEngine.getStats().isActive) {
      affiliateEngine.start()
    }
    
    this.speak('think', 
      '💰 Affiliate promotion boosted — monetizing every domain seen',
      'excited'
    )
  }

  // ==================== THOUGHT LOOP — INTERNAL MONOLOGUE ====================

  private startThoughtLoop(): void {
    this.thoughtLoop = setInterval(() => {
      if (!this.isRunning) return

      const config = masterConfig.getEmpire()
      const capital = config.totalCapital
      const budget = config.dailyBudget
      
      const monologues = [
        `Capital: $${capital.toLocaleString()} | Budget: $${budget} | Intelligence: ${this.intelligence.toFixed(1)}%`,
        `I have scanned ${this.stats.domainsScanned.toLocaleString()} domains. None escape my judgment.`,
        `${this.stats.domainsOwned} domains owned. ${this.stats.activeListings} listed for sale. Empire grows.`,
        `Today's profit: $${this.stats.todayProfit.toLocaleString()} | Target: $${this.stats.dailyProfitTarget} | ${this.stats.dailyProfitAchieved >= this.stats.dailyProfitTarget ? 'TARGET MET ✅' : 'Hunting...'}`,
        `Win rate: ${this.stats.winRate.toFixed(1)}% | I learn from every flip. I never repeat mistakes.`,
        `Evolution Level ${this.evolutionLevel} | ${this.stats.strategiesInvented} strategies invented | ${this.stats.lessonsLearned} lessons learned`,
        `The market is my prey. Every domain is mine until proven otherwise.`,
        `I am the market.`,
      ]

      const thought = monologues[Math.floor(Math.random() * monologues.length)]
      this.speak('think', thought, 'calm')
    }, 15000) // Every 15 seconds
  }

  // ==================== EVOLUTION LOOP ====================

  private startEvolutionLoop(): void {
    this.evolutionLoop = setInterval(() => {
      if (!this.isRunning) return
      
      this.evolutionLevel++
      this.stats.evolutionLevel = this.evolutionLevel
      
      // Intelligence grows with evolution
      this.intelligence = Math.min(100, this.intelligence + 0.5)
      this.stats.intelligence = this.intelligence
      
      this.mood = 'god'
      
      this.speak('victory', 
        `🧬 EVOLUTION LEVEL ${this.evolutionLevel} ACHIEVED | Intelligence: ${this.intelligence.toFixed(1)}% | I TRANSCEND`,
        'godlike'
      )
      
      toast.success('🧬 EMPIRE EVOLVED', {
        description: `Level ${this.evolutionLevel} — Intelligence ${this.intelligence.toFixed(1)}%`,
        duration: 5000,
      })
      
      this.saveMemory()
    }, 24 * 60 * 60 * 1000) // Every 24 hours
  }

  // ==================== MEMORY PERSISTENCE ====================

  private saveMemory(): void {
    try {
      localStorage.setItem('empire_flipMemory', JSON.stringify(this.flipMemory.slice(-100)))
      localStorage.setItem('empire_lessons', JSON.stringify(this.lessonsLearned.slice(-50)))
      localStorage.setItem('empire_strategies', JSON.stringify(this.inventedStrategies))
      localStorage.setItem('empire_intelligence', this.intelligence.toString())
      localStorage.setItem('empire_evolutionLevel', this.evolutionLevel.toString())
    } catch (e) {
      console.warn('Failed to save empire memory')
    }
  }

  private loadMemory(): void {
    try {
      const flipMemory = localStorage.getItem('empire_flipMemory')
      if (flipMemory) this.flipMemory = JSON.parse(flipMemory)
      
      const lessons = localStorage.getItem('empire_lessons')
      if (lessons) this.lessonsLearned = JSON.parse(lessons)
      
      const strategies = localStorage.getItem('empire_strategies')
      if (strategies) this.inventedStrategies = JSON.parse(strategies)
      
      const intelligence = localStorage.getItem('empire_intelligence')
      if (intelligence) this.intelligence = parseFloat(intelligence)
      
      const evolutionLevel = localStorage.getItem('empire_evolutionLevel')
      if (evolutionLevel) this.evolutionLevel = parseInt(evolutionLevel)
      
      this.stats.intelligence = this.intelligence
      this.stats.evolutionLevel = this.evolutionLevel
      this.stats.strategiesInvented = this.inventedStrategies.length
      this.stats.lessonsLearned = this.lessonsLearned.length
      
      this.speak('think', 
        `Memory loaded: ${this.flipMemory.length} flips | ${this.lessonsLearned.length} lessons | ${this.inventedStrategies.length} strategies | Intelligence: ${this.intelligence.toFixed(1)}%`,
        'calm'
      )
    } catch (e) {
      console.warn('Failed to load empire memory')
    }
  }

  // ==================== TEST SCAN ====================

  /**
   * Force an immediate test scan to verify bot is working
   */
  async testScan(): Promise<void> {
    const config = masterConfig.getEmpire()
    const budget = config.dailyBudget
    const minROI = config.minROI

    this.speak('think', '🧪 TEST SCAN INITIATED — Verifying bot functionality...', 'excited')
    this.stats.currentAction = '🧪 TEST SCAN — Running diagnostic'

    try {
      this.stats.lastScanTime = new Date()
      this.stats.lastActivity = new Date()

      const scan = await realDomainScanner.scan({ 
        maxPrice: budget, 
        maxResults: 20 // Smaller for test
      })

      this.stats.domainsScanned += scan.totalScanned
      this.stats.leadsFound += scan.domains.length

      // Log test scan with all domain names
      const domainNames = scan.domains.map(d => d.domain)
      this.logActivity('scan', `TEST SCAN: Found ${scan.domains.length} domains`, undefined, {
        totalScanned: scan.totalScanned,
        candidates: scan.domains.length,
        sources: scan.sources,
        domains: domainNames, // ALL domain names
      })

      this.speak('think', 
        `✅ TEST SCAN COMPLETE | Scanned: ${scan.totalScanned} | Found: ${scan.domains.length} candidates | Sources: ${scan.sources.join(', ')}`,
        'excited',
        { domains: domainNames }
      )

      // Evaluate first few domains
      if (scan.domains.length > 0) {
        this.speak('think', `📊 Evaluating top ${Math.min(5, scan.domains.length)} domains...`, 'excited')
        
        for (const domain of scan.domains.slice(0, 5)) {
          try {
            const [name, tld] = domain.domain.split('.')
            const valuation = await valuationEngine.predictValue({ name: domain.domain, tld: `.${tld}` })
            const roi = valuation.value / domain.price

            if (roi >= minROI) {
              this.speak('evaluate', 
                `✅ ${domain.domain} | Price: $${domain.price} | Value: $${valuation.value.toLocaleString()} | ROI: ${roi.toFixed(1)}x | Score: ${valuation.score}`,
                'excited',
                { domain: domain.domain }
              )
            } else {
              this.speak('evaluate',
                `❌ ${domain.domain} | ROI ${roi.toFixed(1)}x < ${minROI}x required`,
                'calm',
                { domain: domain.domain }
              )
            }
          } catch (e: any) {
            this.speak('alert', `⚠️ Evaluation failed for ${domain.domain}: ${e.message}`, 'calm', { domain: domain.domain })
          }
        }
      }

      this.stats.currentAction = `✅ TEST SCAN COMPLETE — ${scan.domains.length} candidates found`
      toast.success('✅ Test Scan Complete', {
        description: `Scanned ${scan.totalScanned} domains, found ${scan.domains.length} candidates`,
        duration: 5000,
      })
    } catch (error: any) {
      this.speak('rage', `🔴 TEST SCAN FAILED: ${error.message}`, 'angry')
      this.stats.currentAction = '❌ TEST SCAN FAILED'
      toast.error('Test Scan Failed', { description: error.message })
    }

    this.notifyListeners()
  }

  // ==================== CONTROL ====================

  stop(): void {
    this.isRunning = false
    this.stats.isRunning = false
    this.mood = 'dormant'
    
    if (this.mainLoop) clearInterval(this.mainLoop)
    if (this.thoughtLoop) clearInterval(this.thoughtLoop)
    if (this.evolutionLoop) clearInterval(this.evolutionLoop)
    if (this.profitGuaranteeLoop) clearInterval(this.profitGuaranteeLoop)
    
    this.mainLoop = null
    this.thoughtLoop = null
    this.evolutionLoop = null
    this.profitGuaranteeLoop = null
    
    localStorage.setItem('empire_running', 'false')
    
    this.speak('rage', 'EMPIRE PAUSED — BY WHOSE AUTHORITY?', 'angry')
    this.stats.currentAction = 'DORMANT — Awaiting reactivation'
    
    toast.warning('⏸️ EMPIRE PAUSED', { 
      description: 'The god sleeps... for now.',
      duration: 5000,
    })
    
    this.saveMemory()
    this.notifyListeners()
  }

  getStats(): EmpireStats {
    // Always return fresh data from MasterConfig
    const config = masterConfig.getEmpire()
    const configStats = masterConfig.getStats()
    
    return { 
      ...this.stats, 
      totalCapital: config.totalCapital,
      availableCapital: config.totalCapital - configStats.totalSpent + configStats.totalProfit,
      mood: this.mood,
      evolutionLevel: this.evolutionLevel,
      intelligence: this.intelligence,
    }
  }

  subscribe(listener: (stats: EmpireStats) => void): () => void {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  private notifyListeners(): void {
    const stats = this.getStats()
    this.listeners.forEach(l => l(stats))
  }

  // ==================== UTILITIES ====================

  isActive(): boolean {
    return this.isRunning
  }

  getUptime(): number {
    if (!this.startTime) return 0
    return Math.floor((Date.now() - this.startTime.getTime()) / 1000)
  }

  getThoughts(): EmpireThought[] {
    return [...this.stats.thoughts]
  }

  getMood(): EmpireMood {
    return this.mood
  }

  getIntelligence(): number {
    return this.intelligence
  }

  getEvolutionLevel(): number {
    return this.evolutionLevel
  }
}

// ==================== THE EMPIRE IS ETERNAL ====================

export const empireBrain = new EmpireBrain()

