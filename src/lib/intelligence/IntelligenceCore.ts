/**
 * IntelligenceCore.ts — THE UNIFIED BRAIN INTELLIGENCE LAYER
 * 
 * Combines the best features from EmpireBrain and CEOBrain into
 * a single, cohesive intelligence system that enhances ProductionBrain.
 * 
 * Features:
 * - Flip Memory: Learn from every acquisition/sale
 * - Self-Critique: Analyze decisions for improvement
 * - Market Analysis: Detect bull/bear/volatile conditions
 * - Dynamic Risk: Adjust tolerance based on performance
 * - Strategic Priorities: Weight strategies dynamically
 * - Competitor Intelligence: Track other bidders
 * - Evolution System: Self-improve over time
 * 
 * December 2025 — The brain that learns and evolves
 */

import { logger } from '@/lib/utils/logger'
import { thoughtStream } from '@/lib/autonomy/ThoughtStream'
import { masterConfig } from '@/lib/config/MasterConfig'
import { empireSettings } from '@/lib/config/EmpireSettings'
import { toast } from 'sonner'

// ==================== TYPES ====================

export type MarketPhase = 'bull' | 'bear' | 'neutral' | 'volatile'
export type MoodType = 'cautious' | 'balanced' | 'aggressive' | 'godlike'
export type EvolutionLevel = 1 | 2 | 3 | 4 | 5

export interface FlipMemory {
  id: string
  domain: string
  purchasePrice: number
  purchaseDate: Date
  estimatedValue: number
  actualSalePrice?: number
  saleDate?: Date
  profit?: number
  roi?: number
  holdDays?: number
  wasGoodDecision: boolean
  lesson: string
  strategy: string
  godScore: number
  marketCondition: MarketPhase
}

export interface CompetitorProfile {
  id: string
  identifier: string  // Could be username, bidding pattern, etc.
  style: 'aggressive' | 'sniper' | 'value' | 'passive' | 'unknown'
  avgBidAmount: number
  preferredTLDs: string[]
  activityLevel: 'high' | 'medium' | 'low'
  winRateAgainstUs: number
  lastSeen: Date
  totalEncounters: number
}

export interface MarketCondition {
  phase: MarketPhase
  confidence: number       // 0-100: How confident in this assessment
  volatility: number       // 0-100: Market volatility
  opportunity: number      // 0-100: Opportunity level
  risk: number             // 0-100: Overall risk level
  trend: 'up' | 'down' | 'sideways'
  avgDomainPrices: number  // Average domain prices we're seeing
  competitorActivity: 'high' | 'medium' | 'low'
  lastUpdated: Date
}

export interface StrategicPriority {
  id: string
  name: string
  weight: number           // 0-100: How much to prioritize
  enabled: boolean
  performanceScore: number // How well this strategy is performing
  adjustedWeight: number   // Weight after performance adjustment
}

export interface ResourceAllocation {
  acquisitionBudget: number      // % of capital for buying
  renewalReserve: number         // % reserved for renewals
  emergencyFund: number          // % emergency reserve
  reinvestmentRate: number       // % of profits to reinvest
}

export interface PortfolioStrategy {
  targetSize: number
  maxSingleDomainPercent: number // Max % of portfolio in one domain
  diversificationTarget: number  // Target diversification score
  riskProfile: 'conservative' | 'moderate' | 'aggressive'
  tldTargets: Record<string, number>  // Target % for each TLD
}

export interface SelfCritique {
  id: string
  domain: string
  decision: 'buy' | 'skip' | 'sell'
  timestamp: Date
  expectedOutcome: string
  actualOutcome?: string
  wasCorrect?: boolean
  lessonLearned?: string
  improvementSuggestion?: string
}

export interface IntelligenceState {
  // Core metrics
  intelligence: number     // 0-100: Overall intelligence score
  evolutionLevel: EvolutionLevel
  mood: MoodType
  confidence: number       // 0-100: Decision confidence
  
  // Market awareness
  marketCondition: MarketCondition
  
  // Learning
  totalFlips: number
  successfulFlips: number
  lessonsLearned: number
  strategiesInvented: number
  
  // Risk adjustment
  riskMultiplier: number   // 0.5-2.0: Multiplies risk tolerance
  
  // Performance tracking
  avgROI: number
  winRate: number
  avgHoldTime: number
  bestFlip: FlipMemory | null
  worstFlip: FlipMemory | null
}

// ==================== INTELLIGENCE CORE ====================

class IntelligenceCore {
  private state: IntelligenceState
  private flipMemory: FlipMemory[] = []
  private competitors: Map<string, CompetitorProfile> = new Map()
  private critiques: SelfCritique[] = []
  private priorities: StrategicPriority[] = []
  private portfolioStrategy: PortfolioStrategy
  private resources: ResourceAllocation
  private lessonsLearned: string[] = []
  
  private updateInterval: ReturnType<typeof setInterval> | null = null
  private listeners: Array<(state: IntelligenceState) => void> = []

  constructor() {
    this.state = this.createInitialState()
    this.priorities = this.createDefaultPriorities()
    this.portfolioStrategy = this.createDefaultPortfolioStrategy()
    this.resources = this.createDefaultResources()
    this.loadFromStorage()
  }

  // ==================== INITIALIZATION ====================

  private createInitialState(): IntelligenceState {
    return {
      intelligence: 85,
      evolutionLevel: 1,
      mood: 'balanced',
      confidence: 70,
      marketCondition: {
        phase: 'neutral',
        confidence: 50,
        volatility: 30,
        opportunity: 50,
        risk: 30,
        trend: 'sideways',
        avgDomainPrices: 50,
        competitorActivity: 'medium',
        lastUpdated: new Date(),
      },
      totalFlips: 0,
      successfulFlips: 0,
      lessonsLearned: 0,
      strategiesInvented: 0,
      riskMultiplier: 1.0,
      avgROI: 0,
      winRate: 0,
      avgHoldTime: 0,
      bestFlip: null,
      worstFlip: null,
    }
  }

  private createDefaultPriorities(): StrategicPriority[] {
    return [
      { id: 'high_roi', name: 'High ROI Opportunities', weight: 40, enabled: true, performanceScore: 50, adjustedWeight: 40 },
      { id: 'quick_flip', name: 'Quick Flip Potential', weight: 25, enabled: true, performanceScore: 50, adjustedWeight: 25 },
      { id: 'trademark', name: 'Trademark Matches', weight: 15, enabled: true, performanceScore: 50, adjustedWeight: 15 },
      { id: 'trending', name: 'Trending Keywords', weight: 10, enabled: true, performanceScore: 50, adjustedWeight: 10 },
      { id: 'premium_tld', name: 'Premium TLDs', weight: 10, enabled: true, performanceScore: 50, adjustedWeight: 10 },
    ]
  }

  private createDefaultPortfolioStrategy(): PortfolioStrategy {
    return {
      targetSize: 50,
      maxSingleDomainPercent: 15,
      diversificationTarget: 70,
      riskProfile: 'moderate',
      tldTargets: {
        '.com': 50,
        '.io': 15,
        '.ai': 15,
        '.co': 10,
        '.net': 5,
        '.org': 5,
      },
    }
  }

  private createDefaultResources(): ResourceAllocation {
    return {
      acquisitionBudget: 70,
      renewalReserve: 15,
      emergencyFund: 15,
      reinvestmentRate: 70,
    }
  }

  // ==================== CORE INTELLIGENCE METHODS ====================

  /**
   * Start the intelligence monitoring
   */
  start(): void {
    if (this.updateInterval) return

    logger.info('INTELLIGENCE', '🧠 Intelligence Core activated')
    
    // Update market conditions every 5 minutes
    this.updateInterval = setInterval(() => {
      this.updateMarketConditions()
      this.adjustStrategicPriorities()
      this.checkEvolution()
    }, 300000)

    // Initial update
    this.updateMarketConditions()
    this.notifyListeners()
  }

  /**
   * Stop the intelligence monitoring
   */
  stop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval)
      this.updateInterval = null
    }
    this.saveToStorage()
    logger.info('INTELLIGENCE', '🧠 Intelligence Core deactivated')
  }

  // ==================== LEARNING SYSTEM ====================

  /**
   * Record a flip and learn from it
   */
  recordFlip(flip: Omit<FlipMemory, 'id' | 'wasGoodDecision' | 'lesson'>): void {
    const id = `flip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Calculate if it was a good decision
    const wasGoodDecision = this.evaluateDecision(flip)
    const lesson = this.extractLesson(flip, wasGoodDecision)

    const memory: FlipMemory = {
      ...flip,
      id,
      wasGoodDecision,
      lesson,
    }

    this.flipMemory.unshift(memory)
    
    // Keep last 500 flips
    if (this.flipMemory.length > 500) {
      this.flipMemory = this.flipMemory.slice(0, 500)
    }

    // Update state
    this.state.totalFlips++
    if (wasGoodDecision) {
      this.state.successfulFlips++
    }

    // Update win rate
    this.state.winRate = (this.state.successfulFlips / this.state.totalFlips) * 100

    // Update best/worst flips
    if (flip.profit !== undefined) {
      if (!this.state.bestFlip || (flip.profit > (this.state.bestFlip.profit || 0))) {
        this.state.bestFlip = memory
      }
      if (!this.state.worstFlip || (flip.profit < (this.state.worstFlip.profit || 0))) {
        this.state.worstFlip = memory
      }
    }

    // Calculate avg ROI
    const flipsWithROI = this.flipMemory.filter(f => f.roi !== undefined)
    if (flipsWithROI.length > 0) {
      this.state.avgROI = flipsWithROI.reduce((sum, f) => sum + (f.roi || 0), 0) / flipsWithROI.length
    }

    // Learn and record lesson
    if (lesson && !this.lessonsLearned.includes(lesson)) {
      this.lessonsLearned.push(lesson)
      this.state.lessonsLearned++
      
      thoughtStream.think('learning', `📚 Lesson learned: ${lesson}`, [
        `Domain: ${flip.domain}`,
        `Outcome: ${wasGoodDecision ? 'Success' : 'Needs improvement'}`,
        `Strategy: ${flip.strategy}`,
      ])
    }

    // Self-critique
    this.addCritique({
      domain: flip.domain,
      decision: flip.actualSalePrice ? 'sell' : 'buy',
      expectedOutcome: `Expected ${flip.roi?.toFixed(1) || 'unknown'}x ROI`,
      wasCorrect: wasGoodDecision,
      lessonLearned: lesson,
    })

    this.saveToStorage()
    this.notifyListeners()
  }

  private evaluateDecision(flip: Omit<FlipMemory, 'id' | 'wasGoodDecision' | 'lesson'>): boolean {
    // A decision was good if:
    // 1. Sold for profit (ROI > 1)
    // 2. Or still holding with good estimated value
    if (flip.roi !== undefined) {
      return flip.roi > 1
    }
    if (flip.estimatedValue > flip.purchasePrice * 2) {
      return true
    }
    return false
  }

  private extractLesson(flip: Omit<FlipMemory, 'id' | 'wasGoodDecision' | 'lesson'>, wasGood: boolean): string {
    const tld = '.' + flip.domain.split('.').pop()
    
    if (wasGood) {
      if (flip.roi && flip.roi > 5) {
        return `High ROI (${flip.roi.toFixed(1)}x) achieved with ${flip.strategy} strategy on ${tld} domain`
      }
      if (flip.holdDays && flip.holdDays < 7) {
        return `Quick flip (${flip.holdDays} days) success with ${flip.strategy} strategy`
      }
      return `Profitable flip using ${flip.strategy} strategy in ${flip.marketCondition} market`
    } else {
      if (flip.roi && flip.roi < 1) {
        return `Loss on ${tld} domain - ${flip.strategy} strategy underperformed in ${flip.marketCondition} market`
      }
      return `${flip.strategy} strategy needs refinement for ${tld} domains`
    }
  }

  // ==================== MARKET ANALYSIS ====================

  /**
   * Update market conditions based on recent data
   */
  updateMarketConditions(): void {
    const recentFlips = this.flipMemory.slice(0, 20)
    
    // Calculate market metrics
    let avgPrice = 0
    let priceVolatility = 0
    let successRate = 0

    if (recentFlips.length > 0) {
      avgPrice = recentFlips.reduce((sum, f) => sum + f.purchasePrice, 0) / recentFlips.length
      successRate = recentFlips.filter(f => f.wasGoodDecision).length / recentFlips.length

      // Calculate price volatility (standard deviation)
      const prices = recentFlips.map(f => f.purchasePrice)
      const mean = prices.reduce((a, b) => a + b, 0) / prices.length
      const squaredDiffs = prices.map(p => Math.pow(p - mean, 2))
      priceVolatility = Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / prices.length) / mean * 100
    }

    // Determine market phase
    let phase: MarketPhase = 'neutral'
    if (successRate > 0.7 && avgPrice < 100) {
      phase = 'bull'  // High success, low prices = buying opportunity
    } else if (successRate < 0.4) {
      phase = 'bear'  // Low success = tough market
    } else if (priceVolatility > 50) {
      phase = 'volatile'  // High price swings
    }

    // Update state
    this.state.marketCondition = {
      phase,
      confidence: Math.min(100, Math.max(0, successRate * 100)),
      volatility: Math.min(100, priceVolatility),
      opportunity: successRate > 0.5 ? 70 : 30,
      risk: phase === 'volatile' ? 70 : (phase === 'bear' ? 50 : 30),
      trend: successRate > 0.6 ? 'up' : (successRate < 0.4 ? 'down' : 'sideways'),
      avgDomainPrices: avgPrice,
      competitorActivity: this.assessCompetitorActivity(),
      lastUpdated: new Date(),
    }

    // Adjust mood based on market
    this.adjustMood()

    thoughtStream.think('observation', `📊 Market Analysis Complete`, [
      `Phase: ${phase.toUpperCase()}`,
      `Opportunity: ${this.state.marketCondition.opportunity}%`,
      `Risk: ${this.state.marketCondition.risk}%`,
      `Mood adjusted to: ${this.state.mood}`,
    ])

    this.notifyListeners()
  }

  private assessCompetitorActivity(): 'high' | 'medium' | 'low' {
    const recentEncounters = Array.from(this.competitors.values())
      .filter(c => Date.now() - c.lastSeen.getTime() < 86400000) // Last 24 hours
    
    if (recentEncounters.length > 10) return 'high'
    if (recentEncounters.length > 3) return 'medium'
    return 'low'
  }

  private adjustMood(): void {
    const { phase, opportunity, risk } = this.state.marketCondition
    
    if (phase === 'bull' && opportunity > 60) {
      this.state.mood = 'aggressive'
      this.state.riskMultiplier = 1.5
    } else if (phase === 'bear' || risk > 60) {
      this.state.mood = 'cautious'
      this.state.riskMultiplier = 0.7
    } else if (this.state.winRate > 80 && this.state.avgROI > 5) {
      this.state.mood = 'godlike'
      this.state.riskMultiplier = 2.0
    } else {
      this.state.mood = 'balanced'
      this.state.riskMultiplier = 1.0
    }
  }

  // ==================== STRATEGIC PRIORITIES ====================

  /**
   * Adjust strategic priorities based on performance
   */
  adjustStrategicPriorities(): void {
    // Group flips by strategy
    const strategyPerformance: Record<string, number[]> = {}
    
    this.flipMemory.slice(0, 100).forEach(flip => {
      if (!strategyPerformance[flip.strategy]) {
        strategyPerformance[flip.strategy] = []
      }
      strategyPerformance[flip.strategy].push(flip.wasGoodDecision ? 1 : 0)
    })

    // Update priority weights based on performance
    this.priorities.forEach(priority => {
      const performance = strategyPerformance[priority.id] || []
      if (performance.length > 0) {
        priority.performanceScore = (performance.reduce((a, b) => a + b, 0) / performance.length) * 100
        
        // Adjust weight: +20% for high performers, -20% for low performers
        const adjustment = priority.performanceScore > 60 ? 1.2 : 
                          priority.performanceScore < 40 ? 0.8 : 1.0
        priority.adjustedWeight = Math.min(60, Math.max(5, priority.weight * adjustment))
      }
    })

    // Normalize weights to sum to 100
    const totalWeight = this.priorities.reduce((sum, p) => sum + p.adjustedWeight, 0)
    this.priorities.forEach(p => {
      p.adjustedWeight = (p.adjustedWeight / totalWeight) * 100
    })

    logger.debug('INTELLIGENCE', 'Strategic priorities adjusted', { priorities: this.priorities })
  }

  /**
   * Get strategy weight for a given strategy type
   */
  getStrategyWeight(strategyId: string): number {
    const priority = this.priorities.find(p => p.id === strategyId)
    return priority?.adjustedWeight || 10
  }

  // ==================== COMPETITOR INTELLIGENCE ====================

  /**
   * Record competitor encounter
   */
  recordCompetitor(identifier: string, bidAmount: number, tld: string, won: boolean): void {
    let profile = this.competitors.get(identifier)
    
    if (!profile) {
      profile = {
        id: `comp_${Date.now()}`,
        identifier,
        style: 'unknown',
        avgBidAmount: bidAmount,
        preferredTLDs: [tld],
        activityLevel: 'low',
        winRateAgainstUs: won ? 100 : 0,
        lastSeen: new Date(),
        totalEncounters: 1,
      }
    } else {
      // Update profile
      profile.avgBidAmount = (profile.avgBidAmount * profile.totalEncounters + bidAmount) / (profile.totalEncounters + 1)
      profile.totalEncounters++
      profile.lastSeen = new Date()
      
      // Update win rate
      const prevWins = (profile.winRateAgainstUs / 100) * (profile.totalEncounters - 1)
      profile.winRateAgainstUs = ((prevWins + (won ? 1 : 0)) / profile.totalEncounters) * 100

      // Add TLD if new
      if (!profile.preferredTLDs.includes(tld)) {
        profile.preferredTLDs.push(tld)
      }

      // Determine style
      if (profile.avgBidAmount > 500) {
        profile.style = 'aggressive'
      } else if (profile.winRateAgainstUs > 70) {
        profile.style = 'sniper'
      } else if (profile.avgBidAmount < 100) {
        profile.style = 'value'
      }

      // Update activity level
      if (profile.totalEncounters > 20) {
        profile.activityLevel = 'high'
      } else if (profile.totalEncounters > 5) {
        profile.activityLevel = 'medium'
      }
    }

    this.competitors.set(identifier, profile)
    
    // If they beat us frequently, learn from it
    if (profile.winRateAgainstUs > 60) {
      thoughtStream.think('analysis', `⚔️ Competitor Analysis: ${identifier}`, [
        `Style: ${profile.style}`,
        `Win rate against us: ${profile.winRateAgainstUs.toFixed(0)}%`,
        `Avg bid: $${profile.avgBidAmount.toFixed(0)}`,
        `Suggestion: ${this.getCompetitorCounterStrategy(profile)}`,
      ])
    }

    this.saveToStorage()
  }

  private getCompetitorCounterStrategy(profile: CompetitorProfile): string {
    switch (profile.style) {
      case 'aggressive':
        return 'Avoid bidding wars, focus on value opportunities they miss'
      case 'sniper':
        return 'Bid earlier or find domains before they do'
      case 'value':
        return 'We can outbid on premium opportunities'
      default:
        return 'Continue monitoring their patterns'
    }
  }

  // ==================== SELF-CRITIQUE SYSTEM ====================

  private addCritique(critique: Omit<SelfCritique, 'id' | 'timestamp'>): void {
    const fullCritique: SelfCritique = {
      ...critique,
      id: `critique_${Date.now()}`,
      timestamp: new Date(),
    }

    this.critiques.unshift(fullCritique)
    
    // Keep last 200 critiques
    if (this.critiques.length > 200) {
      this.critiques = this.critiques.slice(0, 200)
    }
  }

  /**
   * Get improvement suggestions based on critiques
   */
  getImprovementSuggestions(): string[] {
    const suggestions: string[] = []
    const recentCritiques = this.critiques.slice(0, 50)
    
    const wrongDecisions = recentCritiques.filter(c => c.wasCorrect === false)
    
    if (wrongDecisions.length > recentCritiques.length * 0.3) {
      suggestions.push('Increase minimum God Score threshold - too many poor decisions')
    }

    // Analyze patterns
    const buyMistakes = wrongDecisions.filter(c => c.decision === 'buy').length
    const sellMistakes = wrongDecisions.filter(c => c.decision === 'sell').length

    if (buyMistakes > sellMistakes * 2) {
      suggestions.push('Be more selective on acquisitions - buying too aggressively')
    } else if (sellMistakes > buyMistakes * 2) {
      suggestions.push('Review pricing strategy - may be selling too cheaply')
    }

    return suggestions
  }

  // ==================== EVOLUTION SYSTEM ====================

  private checkEvolution(): void {
    const prevLevel = this.state.evolutionLevel
    
    // Calculate intelligence score
    const winRateScore = this.state.winRate / 2  // 0-50
    const roiScore = Math.min(25, this.state.avgROI * 5)  // 0-25
    const learningScore = Math.min(15, this.state.lessonsLearned / 10)  // 0-15
    const flipsScore = Math.min(10, this.state.totalFlips / 50)  // 0-10
    
    this.state.intelligence = Math.min(100, winRateScore + roiScore + learningScore + flipsScore + 50)

    // Determine evolution level
    if (this.state.intelligence >= 95 && this.state.totalFlips > 100) {
      this.state.evolutionLevel = 5
    } else if (this.state.intelligence >= 85 && this.state.totalFlips > 50) {
      this.state.evolutionLevel = 4
    } else if (this.state.intelligence >= 75 && this.state.totalFlips > 25) {
      this.state.evolutionLevel = 3
    } else if (this.state.intelligence >= 65 && this.state.totalFlips > 10) {
      this.state.evolutionLevel = 2
    }

    // Announce evolution
    if (this.state.evolutionLevel > prevLevel) {
      const levelNames = ['', 'Novice', 'Apprentice', 'Expert', 'Master', 'Legendary']
      
      toast.success(`🧬 EVOLUTION: Level ${this.state.evolutionLevel}`, {
        description: `Intelligence reached ${levelNames[this.state.evolutionLevel]} tier!`,
        duration: 10000,
      })

      thoughtStream.think('result', `🧬 Evolved to ${levelNames[this.state.evolutionLevel]}!`, [
        `Intelligence: ${this.state.intelligence.toFixed(0)}%`,
        `Win Rate: ${this.state.winRate.toFixed(0)}%`,
        `Lessons Learned: ${this.state.lessonsLearned}`,
      ])
    }

    this.notifyListeners()
  }

  // ==================== DECISION SUPPORT ====================

  /**
   * Get risk-adjusted maximum bid based on current intelligence
   */
  getAdjustedMaxBid(baseMaxBid: number): number {
    return baseMaxBid * this.state.riskMultiplier
  }

  /**
   * Get risk-adjusted minimum ROI based on market conditions
   */
  getAdjustedMinROI(baseMinROI: number): number {
    const { phase } = this.state.marketCondition
    
    switch (phase) {
      case 'bull':
        return baseMinROI * 0.8  // Lower threshold in bull market
      case 'bear':
        return baseMinROI * 1.3  // Higher threshold in bear market
      case 'volatile':
        return baseMinROI * 1.1  // Slightly higher in volatile
      default:
        return baseMinROI
    }
  }

  /**
   * Should we be aggressive right now?
   */
  shouldBeAggressive(): boolean {
    return this.state.mood === 'aggressive' || this.state.mood === 'godlike'
  }

  /**
   * Get market phase description for UI
   */
  getMarketDescription(): string {
    const { phase, opportunity, risk } = this.state.marketCondition
    
    switch (phase) {
      case 'bull':
        return `🐂 BULL MARKET — ${opportunity}% opportunity, favorable conditions`
      case 'bear':
        return `🐻 BEAR MARKET — ${risk}% risk, proceed with caution`
      case 'volatile':
        return `⚡ VOLATILE — High uncertainty, selective bidding recommended`
      default:
        return `📊 NEUTRAL — Balanced conditions, standard strategy`
    }
  }

  // ==================== PUBLIC GETTERS ====================

  getState(): IntelligenceState {
    return { ...this.state }
  }

  getFlipMemory(limit: number = 50): FlipMemory[] {
    return this.flipMemory.slice(0, limit)
  }

  getCompetitors(): CompetitorProfile[] {
    return Array.from(this.competitors.values())
  }

  getPriorities(): StrategicPriority[] {
    return [...this.priorities]
  }

  getPortfolioStrategy(): PortfolioStrategy {
    return { ...this.portfolioStrategy }
  }

  getResources(): ResourceAllocation {
    return { ...this.resources }
  }

  getLessonsLearned(): string[] {
    return [...this.lessonsLearned]
  }

  // ==================== CONFIGURATION ====================

  setPortfolioStrategy(strategy: Partial<PortfolioStrategy>): void {
    this.portfolioStrategy = { ...this.portfolioStrategy, ...strategy }
    this.saveToStorage()
    this.notifyListeners()
  }

  setResources(resources: Partial<ResourceAllocation>): void {
    this.resources = { ...this.resources, ...resources }
    this.saveToStorage()
    this.notifyListeners()
  }

  setPriorityWeight(priorityId: string, weight: number): void {
    const priority = this.priorities.find(p => p.id === priorityId)
    if (priority) {
      priority.weight = weight
      this.adjustStrategicPriorities()
      this.saveToStorage()
      this.notifyListeners()
    }
  }

  // ==================== SUBSCRIPTIONS ====================

  subscribe(listener: (state: IntelligenceState) => void): () => void {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(l => l(this.getState()))
  }

  // ==================== PERSISTENCE ====================

  private saveToStorage(): void {
    try {
      localStorage.setItem('intelligenceCore_state', JSON.stringify(this.state))
      localStorage.setItem('intelligenceCore_flipMemory', JSON.stringify(this.flipMemory.slice(0, 200)))
      localStorage.setItem('intelligenceCore_competitors', JSON.stringify(Array.from(this.competitors.entries())))
      localStorage.setItem('intelligenceCore_priorities', JSON.stringify(this.priorities))
      localStorage.setItem('intelligenceCore_lessons', JSON.stringify(this.lessonsLearned.slice(0, 100)))
    } catch (e) {
      logger.warn('INTELLIGENCE', 'Failed to save state')
    }
  }

  private loadFromStorage(): void {
    try {
      const state = localStorage.getItem('intelligenceCore_state')
      if (state) {
        this.state = { ...this.state, ...JSON.parse(state) }
      }

      const memory = localStorage.getItem('intelligenceCore_flipMemory')
      if (memory) {
        this.flipMemory = JSON.parse(memory)
      }

      const competitors = localStorage.getItem('intelligenceCore_competitors')
      if (competitors) {
        this.competitors = new Map(JSON.parse(competitors))
      }

      const priorities = localStorage.getItem('intelligenceCore_priorities')
      if (priorities) {
        this.priorities = JSON.parse(priorities)
      }

      const lessons = localStorage.getItem('intelligenceCore_lessons')
      if (lessons) {
        this.lessonsLearned = JSON.parse(lessons)
      }
    } catch (e) {
      logger.warn('INTELLIGENCE', 'Failed to load state')
    }
  }
}

// ==================== SINGLETON ====================

export const intelligenceCore = new IntelligenceCore()
