/**
 * CEO BRAIN - Executive Intelligence System
 * 
 * The supreme strategic decision-maker that thinks like a Fortune 500 CEO.
 * Handles high-level strategy, resource allocation, market timing, and
 * executive decisions that drive the entire domain empire.
 */

import { logger } from '../utils/logger'
import { masterConfig } from '../config/MasterConfig'
import { soundEngine } from '../sounds/soundEffects'
import { toast } from 'sonner'
import { strategicThinking } from './StrategicThinking'

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface MarketCondition {
  phase: 'bull' | 'bear' | 'neutral' | 'volatile'
  confidence: number
  volatility: number
  opportunity: number
  risk: number
  trend: 'up' | 'down' | 'sideways'
}

interface StrategicPriority {
  id: string
  name: string
  weight: number
  status: 'active' | 'paused' | 'completed'
  reason: string
  deadline?: Date
}

interface ResourceAllocation {
  acquisitionBudget: number
  renewalReserve: number
  marketingBudget: number
  emergencyFund: number
  reinvestmentRate: number
}

interface PortfolioStrategy {
  targetSize: number
  diversificationScore: number
  tldDistribution: Record<string, number>
  priceRangeDistribution: Record<string, number>
  ageDistribution: Record<string, number>
  riskProfile: 'conservative' | 'moderate' | 'aggressive'
}

interface ExecutiveDecision {
  id: string
  type: 'acquisition' | 'sale' | 'hold' | 'strategy' | 'resource' | 'risk'
  priority: 'critical' | 'high' | 'medium' | 'low'
  decision: string
  reasoning: string
  expectedOutcome: string
  riskLevel: number
  confidenceLevel: number
  timestamp: Date
  executed: boolean
  result?: string
}

interface PerformanceMetrics {
  totalROI: number
  monthlyROI: number
  winRate: number
  avgHoldTime: number
  bestPerformer: string
  worstPerformer: string
  portfolioValue: number
  liquidAssets: number
  totalInvested: number
}

interface CompetitorIntel {
  name: string
  estimatedSize: number
  focusAreas: string[]
  threatLevel: number
  opportunities: string[]
}

interface CEOState {
  isActive: boolean
  currentFocus: string
  marketCondition: MarketCondition
  priorities: StrategicPriority[]
  resources: ResourceAllocation
  portfolioStrategy: PortfolioStrategy
  recentDecisions: ExecutiveDecision[]
  performanceMetrics: PerformanceMetrics
  competitorIntel: CompetitorIntel[]
  lastStrategicReview: Date
  nextStrategicReview: Date
  moodIndex: number // 0-100, affects risk tolerance
  confidenceIndex: number // 0-100, affects decision speed
}

interface StrategicInsight {
  category: 'opportunity' | 'threat' | 'trend' | 'recommendation'
  title: string
  description: string
  actionItems: string[]
  urgency: number
  impact: number
}

// ============================================================================
// CEO BRAIN CLASS
// ============================================================================

class CEOBrain {
  private state: CEOState
  private decisionHistory: ExecutiveDecision[] = []
  private insightBuffer: StrategicInsight[] = []
  private thinkingInterval: NodeJS.Timeout | null = null
  private strategicReviewInterval: NodeJS.Timeout | null = null
  private listeners: ((state: CEOState) => void)[] = []

  constructor() {
    this.state = this.initializeState()
    logger.info('CEO_BRAIN', '🎯 CEO Brain initialized - Executive intelligence online')
  }

  private initializeState(): CEOState {
    return {
      isActive: false,
      currentFocus: 'Portfolio Analysis',
      marketCondition: {
        phase: 'neutral',
        confidence: 50,
        volatility: 30,
        opportunity: 50,
        risk: 30,
        trend: 'sideways',
      },
      priorities: [
        { id: 'growth', name: 'Portfolio Growth', weight: 40, status: 'active', reason: 'Primary objective' },
        { id: 'profit', name: 'Profit Maximization', weight: 30, status: 'active', reason: 'Sustain operations' },
        { id: 'risk', name: 'Risk Management', weight: 20, status: 'active', reason: 'Protect capital' },
        { id: 'efficiency', name: 'Operational Efficiency', weight: 10, status: 'active', reason: 'Reduce costs' },
      ],
      resources: {
        acquisitionBudget: 5000,
        renewalReserve: 1000,
        marketingBudget: 500,
        emergencyFund: 2000,
        reinvestmentRate: 0.7,
      },
      portfolioStrategy: {
        targetSize: 100,
        diversificationScore: 75,
        tldDistribution: { '.com': 60, '.io': 15, '.ai': 10, '.co': 10, '.net': 5 },
        priceRangeDistribution: { 'under100': 40, '100-500': 35, '500-2000': 20, 'over2000': 5 },
        ageDistribution: { 'new': 30, '1-5years': 40, '5-10years': 20, 'over10years': 10 },
        riskProfile: 'moderate',
      },
      recentDecisions: [],
      performanceMetrics: {
        totalROI: 0,
        monthlyROI: 0,
        winRate: 0,
        avgHoldTime: 0,
        bestPerformer: 'N/A',
        worstPerformer: 'N/A',
        portfolioValue: 0,
        liquidAssets: 0,
        totalInvested: 0,
      },
      competitorIntel: [],
      lastStrategicReview: new Date(),
      nextStrategicReview: new Date(Date.now() + 24 * 60 * 60 * 1000),
      moodIndex: 70,
      confidenceIndex: 75,
    }
  }

  // ============================================================================
  // CORE EXECUTIVE FUNCTIONS
  // ============================================================================

  async start(): Promise<void> {
    if (this.state.isActive) return

    this.state.isActive = true
    logger.info('CEO_BRAIN', '🚀 CEO Brain activated - Strategic thinking engaged')

    // Start continuous thinking loop
    this.thinkingInterval = setInterval(() => this.think(), 30000) // Think every 30 seconds

    // Start strategic review cycle
    this.strategicReviewInterval = setInterval(() => this.conductStrategicReview(), 3600000) // Review every hour

    // Initial market analysis
    await this.analyzeMarketConditions()

    // Initial strategic assessment
    await this.conductStrategicReview()

    toast.success('🎯 CEO BRAIN ACTIVATED', {
      description: 'Executive intelligence is now guiding all operations',
      duration: 5000,
    })

    this.notifyListeners()
  }

  stop(): void {
    if (!this.state.isActive) return

    this.state.isActive = false

    if (this.thinkingInterval) {
      clearInterval(this.thinkingInterval)
      this.thinkingInterval = null
    }

    if (this.strategicReviewInterval) {
      clearInterval(this.strategicReviewInterval)
      this.strategicReviewInterval = null
    }

    logger.info('CEO_BRAIN', '⏸️ CEO Brain deactivated')
    this.notifyListeners()
  }

  // ============================================================================
  // STRATEGIC THINKING
  // ============================================================================

  private async think(): Promise<void> {
    if (!this.state.isActive) return

    const thoughts = [
      () => this.evaluatePortfolioHealth(),
      () => this.assessOpportunities(),
      () => this.reviewRiskExposure(),
      () => this.optimizeResourceAllocation(),
      () => this.analyzeCompetitiveLandscape(),
      () => this.forecastMarketTrends(),
      () => this.evaluatePendingDecisions(),
      () => this.generateStrategicInsights(),
    ]

    // Randomly select a thinking process
    const randomThought = thoughts[Math.floor(Math.random() * thoughts.length)]
    await randomThought()

    this.notifyListeners()
  }

  private async evaluatePortfolioHealth(): Promise<void> {
    this.state.currentFocus = 'Portfolio Health Evaluation'
    logger.info('CEO_BRAIN', '📊 Evaluating portfolio health...')

    // Calculate health metrics
    const diversification = this.calculateDiversificationScore()
    const riskAdjustedReturn = this.calculateRiskAdjustedReturn()
    const liquidityRatio = this.calculateLiquidityRatio()

    // Update confidence based on health
    const healthScore = (diversification + riskAdjustedReturn + liquidityRatio) / 3
    this.state.confidenceIndex = Math.min(100, Math.max(0, healthScore))

    if (healthScore < 50) {
      this.makeDecision({
        type: 'strategy',
        priority: 'high',
        decision: 'Rebalance portfolio to improve health metrics',
        reasoning: `Portfolio health score (${healthScore.toFixed(1)}) is below acceptable threshold`,
        expectedOutcome: 'Improved diversification and reduced risk exposure',
        riskLevel: 30,
        confidenceLevel: 80,
      })
    }

    logger.info('CEO_BRAIN', `📊 Portfolio health: ${healthScore.toFixed(1)}/100`, {
      diversification,
      riskAdjustedReturn,
      liquidityRatio,
    })
  }

  private async assessOpportunities(): Promise<void> {
    this.state.currentFocus = 'Opportunity Assessment'
    logger.info('CEO_BRAIN', '🔍 Scanning for strategic opportunities...')

    const opportunities: StrategicInsight[] = []

    // Check for undervalued market segments
    if (this.state.marketCondition.phase === 'bear') {
      opportunities.push({
        category: 'opportunity',
        title: 'Bear Market Accumulation',
        description: 'Market downturn presents buying opportunities for premium domains at discount',
        actionItems: [
          'Increase acquisition budget by 20%',
          'Focus on .com premium names',
          'Target distressed sellers',
        ],
        urgency: 80,
        impact: 90,
      })
    }

    // Check for emerging TLD opportunities
    if (this.state.portfolioStrategy.tldDistribution['.ai'] < 15) {
      opportunities.push({
        category: 'opportunity',
        title: 'AI Domain Expansion',
        description: 'AI/ML trend suggests increasing .ai domain allocation',
        actionItems: [
          'Increase .ai target allocation to 15%',
          'Focus on AI-related keywords',
          'Monitor tech startup naming trends',
        ],
        urgency: 60,
        impact: 75,
      })
    }

    this.insightBuffer.push(...opportunities)
    
    if (opportunities.length > 0) {
      logger.info('CEO_BRAIN', `🎯 Identified ${opportunities.length} strategic opportunities`)
    }
  }

  private async reviewRiskExposure(): Promise<void> {
    this.state.currentFocus = 'Risk Exposure Review'
    logger.info('CEO_BRAIN', '⚠️ Reviewing risk exposure...')

    const risks: StrategicInsight[] = []

    // Check concentration risk
    const tldConcentration = Math.max(...Object.values(this.state.portfolioStrategy.tldDistribution))
    if (tldConcentration > 70) {
      risks.push({
        category: 'threat',
        title: 'TLD Concentration Risk',
        description: `Over ${tldConcentration}% concentration in single TLD`,
        actionItems: [
          'Diversify into alternative TLDs',
          'Set maximum allocation limits',
          'Review acquisition criteria',
        ],
        urgency: 75,
        impact: 70,
      })
    }

    // Check capital exposure
    const capitalAtRisk = this.state.resources.acquisitionBudget / 
      (this.state.resources.acquisitionBudget + this.state.resources.emergencyFund)
    
    if (capitalAtRisk > 0.8) {
      risks.push({
        category: 'threat',
        title: 'Capital Exposure Warning',
        description: 'Emergency fund ratio is dangerously low',
        actionItems: [
          'Reduce acquisition budget by 15%',
          'Increase emergency fund allocation',
          'Consider liquidating underperformers',
        ],
        urgency: 90,
        impact: 85,
      })

      // Automatically adjust mood
      this.state.moodIndex = Math.max(30, this.state.moodIndex - 20)
    }

    this.insightBuffer.push(...risks)

    // Update market condition risk
    this.state.marketCondition.risk = Math.min(100, risks.length * 20 + 20)
  }

  private async optimizeResourceAllocation(): Promise<void> {
    this.state.currentFocus = 'Resource Optimization'
    logger.info('CEO_BRAIN', '💰 Optimizing resource allocation...')

    const totalCapital = 
      this.state.resources.acquisitionBudget +
      this.state.resources.renewalReserve +
      this.state.resources.marketingBudget +
      this.state.resources.emergencyFund

    // Optimal allocation based on market conditions and mood
    let optimalAllocation: ResourceAllocation

    if (this.state.marketCondition.phase === 'bull' && this.state.moodIndex > 60) {
      // Aggressive allocation in bull market
      optimalAllocation = {
        acquisitionBudget: totalCapital * 0.6,
        renewalReserve: totalCapital * 0.1,
        marketingBudget: totalCapital * 0.15,
        emergencyFund: totalCapital * 0.15,
        reinvestmentRate: 0.8,
      }
    } else if (this.state.marketCondition.phase === 'bear') {
      // Defensive allocation in bear market
      optimalAllocation = {
        acquisitionBudget: totalCapital * 0.35,
        renewalReserve: totalCapital * 0.15,
        marketingBudget: totalCapital * 0.1,
        emergencyFund: totalCapital * 0.4,
        reinvestmentRate: 0.5,
      }
    } else {
      // Balanced allocation
      optimalAllocation = {
        acquisitionBudget: totalCapital * 0.5,
        renewalReserve: totalCapital * 0.12,
        marketingBudget: totalCapital * 0.13,
        emergencyFund: totalCapital * 0.25,
        reinvestmentRate: 0.65,
      }
    }

    // Calculate reallocation needed
    const reallocationDelta = Math.abs(
      this.state.resources.acquisitionBudget - optimalAllocation.acquisitionBudget
    )

    if (reallocationDelta > totalCapital * 0.1) {
      this.makeDecision({
        type: 'resource',
        priority: 'medium',
        decision: 'Rebalance resource allocation',
        reasoning: `Current allocation deviates ${((reallocationDelta / totalCapital) * 100).toFixed(1)}% from optimal`,
        expectedOutcome: 'Better risk-adjusted returns and improved capital efficiency',
        riskLevel: 20,
        confidenceLevel: 85,
      })

      this.state.resources = optimalAllocation
    }
  }

  private async analyzeCompetitiveLandscape(): Promise<void> {
    this.state.currentFocus = 'Competitive Analysis'
    logger.info('CEO_BRAIN', '🏆 Analyzing competitive landscape...')

    // Simulated competitor intelligence
    const competitors: CompetitorIntel[] = [
      {
        name: 'Major Domain Corp',
        estimatedSize: 50000,
        focusAreas: ['.com', '.net', 'premium generics'],
        threatLevel: 60,
        opportunities: ['Focus on niches they ignore', 'Faster execution on auctions'],
      },
      {
        name: 'AI Domain Specialists',
        estimatedSize: 5000,
        focusAreas: ['.ai', '.io', 'tech names'],
        threatLevel: 45,
        opportunities: ['Broader TLD coverage', 'Better valuation models'],
      },
      {
        name: 'Budget Flippers',
        estimatedSize: 20000,
        focusAreas: ['$10-50 domains', 'volume play'],
        threatLevel: 25,
        opportunities: ['Premium segment focus', 'Higher margin targets'],
      },
    ]

    this.state.competitorIntel = competitors

    // Identify competitive advantages
    const insights: StrategicInsight[] = []
    
    if (this.state.portfolioStrategy.riskProfile === 'moderate') {
      insights.push({
        category: 'recommendation',
        title: 'Competitive Positioning',
        description: 'Focus on mid-market premium domains to differentiate',
        actionItems: [
          'Target $500-$5000 domain range',
          'Build expertise in emerging TLDs',
          'Leverage AI valuation for faster decisions',
        ],
        urgency: 40,
        impact: 65,
      })
    }

    this.insightBuffer.push(...insights)
  }

  private async forecastMarketTrends(): Promise<void> {
    this.state.currentFocus = 'Market Forecasting'
    logger.info('CEO_BRAIN', '📈 Forecasting market trends...')

    // Analyze various signals
    const signals = {
      economicOutlook: this.assessEconomicOutlook(),
      techTrends: this.assessTechTrends(),
      seasonality: this.assessSeasonality(),
      auctionActivity: this.assessAuctionActivity(),
    }

    // Update market condition based on signals
    const avgSignal = (signals.economicOutlook + signals.techTrends + signals.seasonality + signals.auctionActivity) / 4

    if (avgSignal > 65) {
      this.state.marketCondition.phase = 'bull'
      this.state.marketCondition.trend = 'up'
      this.state.moodIndex = Math.min(90, this.state.moodIndex + 5)
    } else if (avgSignal < 35) {
      this.state.marketCondition.phase = 'bear'
      this.state.marketCondition.trend = 'down'
      this.state.moodIndex = Math.max(30, this.state.moodIndex - 5)
    } else if (Math.abs(avgSignal - 50) < 10) {
      this.state.marketCondition.phase = 'neutral'
      this.state.marketCondition.trend = 'sideways'
    } else {
      this.state.marketCondition.phase = 'volatile'
      this.state.marketCondition.volatility = Math.min(100, this.state.marketCondition.volatility + 10)
    }

    this.state.marketCondition.confidence = avgSignal
    this.state.marketCondition.opportunity = avgSignal * 0.8 + Math.random() * 20

    logger.info('CEO_BRAIN', `📈 Market forecast: ${this.state.marketCondition.phase}`, {
      trend: this.state.marketCondition.trend,
      confidence: this.state.marketCondition.confidence.toFixed(1),
    })
  }

  private assessEconomicOutlook(): number {
    // Simulate economic analysis
    return 50 + (Math.random() - 0.5) * 40
  }

  private assessTechTrends(): number {
    // AI and tech sectors are hot
    return 70 + (Math.random() - 0.5) * 20
  }

  private assessSeasonality(): number {
    const month = new Date().getMonth()
    // Q1 and Q4 typically stronger for domain sales
    if (month < 3 || month >= 9) return 65
    return 45
  }

  private assessAuctionActivity(): number {
    // Simulate auction activity assessment
    return 55 + (Math.random() - 0.5) * 30
  }

  // ============================================================================
  // DECISION MAKING
  // ============================================================================

  private makeDecision(params: Omit<ExecutiveDecision, 'id' | 'timestamp' | 'executed'>): ExecutiveDecision {
    const decision: ExecutiveDecision = {
      id: `DEC-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      ...params,
      timestamp: new Date(),
      executed: false,
    }

    this.decisionHistory.push(decision)
    this.state.recentDecisions.unshift(decision)

    // Keep only last 20 decisions in state
    if (this.state.recentDecisions.length > 20) {
      this.state.recentDecisions = this.state.recentDecisions.slice(0, 20)
    }

    logger.info('CEO_BRAIN', `📋 EXECUTIVE DECISION: ${decision.decision}`, {
      type: decision.type,
      priority: decision.priority,
      confidence: decision.confidenceLevel,
    })

    if (decision.priority === 'critical') {
      soundEngine.vaultOpen()
      toast.info('🎯 CRITICAL EXECUTIVE DECISION', {
        description: decision.decision,
        duration: 8000,
      })
    }

    return decision
  }

  async evaluateAcquisition(
    domainName: string,
    price: number,
    estimatedValue: number,
    metrics: Record<string, number>
  ): Promise<{ approved: boolean; reasoning: string; maxBid?: number }> {
    logger.info('CEO_BRAIN', `🤔 Evaluating acquisition: ${domainName} at $${price}`)

    const roi = ((estimatedValue - price) / price) * 100
    const roiThreshold = this.getRoiThreshold()
    const budgetAvailable = this.state.resources.acquisitionBudget

    // CEO-level considerations
    const strategicValue = this.assessStrategicValue(domainName, metrics)
    const riskAssessment = this.assessAcquisitionRisk(price, estimatedValue)
    const portfolioFit = this.assessPortfolioFit(domainName)
    const marketTiming = this.assessMarketTiming()

    // Weighted decision score
    const weights = {
      roi: 0.35,
      strategic: 0.25,
      risk: 0.2,
      fit: 0.1,
      timing: 0.1,
    }

    const roiScore = Math.min(100, Math.max(0, roi / 2))
    const decisionScore = 
      roiScore * weights.roi +
      strategicValue * weights.strategic +
      (100 - riskAssessment) * weights.risk +
      portfolioFit * weights.fit +
      marketTiming * weights.timing

    // Adjust for CEO mood and confidence
    const adjustedScore = decisionScore * (this.state.confidenceIndex / 100)

    if (price > budgetAvailable) {
      return {
        approved: false,
        reasoning: `Price ($${price}) exceeds available acquisition budget ($${budgetAvailable.toFixed(2)}). Declining.`,
      }
    }

    if (roi < roiThreshold) {
      return {
        approved: false,
        reasoning: `Projected ROI (${roi.toFixed(1)}%) below threshold (${roiThreshold}%). Not aligned with profit objectives.`,
      }
    }

    if (adjustedScore >= 60) {
      const maxBid = Math.min(
        price * 1.15, // Max 15% above asking
        estimatedValue * 0.4, // Max 40% of estimated value
        budgetAvailable * 0.5 // Max 50% of budget on single domain
      )

      this.makeDecision({
        type: 'acquisition',
        priority: adjustedScore >= 80 ? 'high' : 'medium',
        decision: `APPROVE acquisition of ${domainName}`,
        reasoning: `Strategic score: ${adjustedScore.toFixed(1)}/100, ROI: ${roi.toFixed(1)}%`,
        expectedOutcome: `Estimated profit of $${(estimatedValue - price).toFixed(2)}`,
        riskLevel: riskAssessment,
        confidenceLevel: this.state.confidenceIndex,
      })

      return {
        approved: true,
        reasoning: `CEO approved. Score: ${adjustedScore.toFixed(1)}/100. Strategic fit confirmed.`,
        maxBid: maxBid,
      }
    }

    return {
      approved: false,
      reasoning: `Decision score (${adjustedScore.toFixed(1)}/100) below approval threshold. Passing on this opportunity.`,
    }
  }

  evaluateSaleOffer(
    domainName: string,
    purchasePrice: number,
    currentValue: number,
    offerPrice: number,
    holdTime: number
  ): { accept: boolean; counterOffer?: number; reasoning: string } {
    logger.info('CEO_BRAIN', `💰 Evaluating sale offer: ${domainName} - $${offerPrice}`)

    const profit = offerPrice - purchasePrice
    const roi = (profit / purchasePrice) * 100
    const roiPerMonth = roi / Math.max(1, holdTime / 30)
    
    // CEO considerations
    const profitThreshold = this.getProfitThreshold()
    const marketConditionMultiplier = this.getMarketConditionMultiplier()
    const portfolioNeed = this.assessPortfolioLiquidityNeed()

    // Minimum acceptable price
    const minAcceptablePrice = purchasePrice * (1 + profitThreshold / 100) * marketConditionMultiplier

    if (offerPrice >= currentValue * 0.9) {
      // Great offer - accept immediately
      this.makeDecision({
        type: 'sale',
        priority: 'high',
        decision: `ACCEPT offer for ${domainName}`,
        reasoning: `Offer ($${offerPrice}) is ${((offerPrice / currentValue) * 100).toFixed(1)}% of current value`,
        expectedOutcome: `Realize profit of $${profit.toFixed(2)} (${roi.toFixed(1)}% ROI)`,
        riskLevel: 10,
        confidenceLevel: 95,
      })

      return {
        accept: true,
        reasoning: `Excellent offer at ${((offerPrice / currentValue) * 100).toFixed(1)}% of value. CEO approves.`,
      }
    }

    if (offerPrice >= minAcceptablePrice) {
      if (portfolioNeed > 70 || roiPerMonth > 10) {
        // Acceptable offer and we need liquidity or good monthly ROI
        return {
          accept: true,
          reasoning: `Acceptable offer meets profit threshold. Liquidity need: ${portfolioNeed.toFixed(0)}%`,
        }
      }

      // Counter with higher price
      const counterPrice = Math.min(
        currentValue * 0.95,
        offerPrice * 1.25
      )

      return {
        accept: false,
        counterOffer: counterPrice,
        reasoning: `Good start, but seeking better terms. Counter at $${counterPrice.toFixed(2)}`,
      }
    }

    // Reject low offers
    return {
      accept: false,
      counterOffer: minAcceptablePrice,
      reasoning: `Offer below minimum threshold. Minimum acceptable: $${minAcceptablePrice.toFixed(2)}`,
    }
  }

  private getRoiThreshold(): number {
    // Adjust based on market conditions and risk profile
    const baseThreshold = this.state.portfolioStrategy.riskProfile === 'aggressive' ? 30 :
      this.state.portfolioStrategy.riskProfile === 'moderate' ? 50 : 75

    if (this.state.marketCondition.phase === 'bull') return baseThreshold * 0.8
    if (this.state.marketCondition.phase === 'bear') return baseThreshold * 1.2
    return baseThreshold
  }

  private getProfitThreshold(): number {
    return this.state.portfolioStrategy.riskProfile === 'aggressive' ? 25 :
      this.state.portfolioStrategy.riskProfile === 'moderate' ? 40 : 60
  }

  private getMarketConditionMultiplier(): number {
    if (this.state.marketCondition.phase === 'bull') return 0.9
    if (this.state.marketCondition.phase === 'bear') return 1.1
    return 1.0
  }

  private assessStrategicValue(domainName: string, metrics: Record<string, number>): number {
    let score = 50

    // Length bonus
    if (domainName.length <= 6) score += 15
    else if (domainName.length <= 10) score += 8

    // TLD bonus
    if (domainName.endsWith('.com')) score += 20
    else if (domainName.endsWith('.io') || domainName.endsWith('.ai')) score += 15
    else if (domainName.endsWith('.co')) score += 10

    // Metrics bonuses
    if (metrics.seoScore > 70) score += 10
    if (metrics.brandScore > 70) score += 10
    if (metrics.trendScore > 60) score += 5

    return Math.min(100, score)
  }

  private assessAcquisitionRisk(price: number, estimatedValue: number): number {
    const valuationRatio = price / estimatedValue
    
    if (valuationRatio > 0.8) return 80 // High risk - paying near full value
    if (valuationRatio > 0.6) return 60 // Moderate risk
    if (valuationRatio > 0.4) return 40 // Acceptable risk
    return 20 // Low risk - significant discount
  }

  private assessPortfolioFit(domainName: string): number {
    let score = 60

    // Check TLD distribution
    const tld = '.' + domainName.split('.').pop()
    const currentAllocation = this.state.portfolioStrategy.tldDistribution[tld] || 0
    const targetAllocation = this.state.portfolioStrategy.tldDistribution[tld] || 5

    if (currentAllocation < targetAllocation) {
      score += 20 // Underweight - good fit
    } else if (currentAllocation > targetAllocation * 1.5) {
      score -= 20 // Overweight - poor fit
    }

    return Math.max(0, Math.min(100, score))
  }

  private assessMarketTiming(): number {
    if (this.state.marketCondition.phase === 'bull') return 80
    if (this.state.marketCondition.phase === 'neutral') return 60
    if (this.state.marketCondition.phase === 'bear') return 40
    return 50 // Volatile
  }

  private assessPortfolioLiquidityNeed(): number {
    const liquidRatio = this.state.resources.emergencyFund / 
      (this.state.resources.acquisitionBudget + this.state.resources.emergencyFund)
    
    if (liquidRatio < 0.15) return 90 // Urgent need for liquidity
    if (liquidRatio < 0.25) return 70 // High need
    if (liquidRatio < 0.35) return 50 // Moderate need
    return 30 // Low need - comfortable position
  }

  // ============================================================================
  // STRATEGIC REVIEW & PLANNING
  // ============================================================================

  private async conductStrategicReview(): Promise<void> {
    this.state.currentFocus = 'Strategic Review'
    logger.info('CEO_BRAIN', '📊 Conducting strategic review...')

    // Review performance
    await this.reviewPerformance()

    // Adjust priorities
    this.adjustPriorities()

    // Generate strategic plan
    const strategicPlan = this.generateStrategicPlan()

    // Process insights
    this.processStrategicInsights()

    this.state.lastStrategicReview = new Date()
    this.state.nextStrategicReview = new Date(Date.now() + 24 * 60 * 60 * 1000)

    logger.info('CEO_BRAIN', '✅ Strategic review completed', {
      prioritiesUpdated: true,
      insightsProcessed: this.insightBuffer.length,
      nextReview: this.state.nextStrategicReview,
    })

    // Clear insights buffer after processing
    this.insightBuffer = []

    return strategicPlan
  }

  private async reviewPerformance(): Promise<void> {
    // Calculate performance metrics
    const metrics = this.state.performanceMetrics

    if (metrics.totalROI < 0) {
      this.state.moodIndex = Math.max(20, this.state.moodIndex - 15)
      
      this.makeDecision({
        type: 'strategy',
        priority: 'critical',
        decision: 'PIVOT to defensive strategy',
        reasoning: `Negative ROI (${metrics.totalROI.toFixed(1)}%) requires immediate action`,
        expectedOutcome: 'Stop losses and preserve capital',
        riskLevel: 80,
        confidenceLevel: 90,
      })
    } else if (metrics.totalROI > 50) {
      this.state.moodIndex = Math.min(95, this.state.moodIndex + 10)
      this.state.confidenceIndex = Math.min(95, this.state.confidenceIndex + 5)
    }
  }

  private adjustPriorities(): void {
    // Dynamic priority adjustment based on conditions
    this.state.priorities = this.state.priorities.map(p => {
      if (p.id === 'growth' && this.state.marketCondition.phase === 'bear') {
        return { ...p, weight: 25, reason: 'Reduced growth focus in bear market' }
      }
      if (p.id === 'risk' && this.state.marketCondition.phase === 'bear') {
        return { ...p, weight: 35, reason: 'Increased risk focus in bear market' }
      }
      if (p.id === 'profit' && this.state.moodIndex > 70) {
        return { ...p, weight: 40, reason: 'Increased profit focus due to high confidence' }
      }
      return p
    })
  }

  private generateStrategicPlan(): void {
    const plan = {
      quarter: `Q${Math.ceil((new Date().getMonth() + 1) / 3)}`,
      year: new Date().getFullYear(),
      objectives: [
        `Achieve ${this.state.portfolioStrategy.riskProfile === 'aggressive' ? '40' : '25'}% ROI`,
        `Grow portfolio to ${this.state.portfolioStrategy.targetSize} domains`,
        'Maintain diversification score above 70',
        'Keep risk exposure below 40%',
      ],
      initiatives: this.insightBuffer
        .filter(i => i.category === 'recommendation')
        .map(i => i.title),
      risks: this.insightBuffer
        .filter(i => i.category === 'threat')
        .map(i => i.title),
    }

    logger.info('CEO_BRAIN', '📋 Strategic plan generated', plan)
  }

  private processStrategicInsights(): void {
    const criticalInsights = this.insightBuffer.filter(i => i.urgency > 80)

    criticalInsights.forEach(insight => {
      this.makeDecision({
        type: 'strategy',
        priority: 'high',
        decision: `Address: ${insight.title}`,
        reasoning: insight.description,
        expectedOutcome: insight.actionItems.join('; '),
        riskLevel: insight.category === 'threat' ? 70 : 30,
        confidenceLevel: 75,
      })
    })
  }

  private async generateStrategicInsights(): Promise<void> {
    logger.info('CEO_BRAIN', '💡 Generating strategic insights with deep analysis...')

    // Use Strategic Thinking for first-principles analysis
    const marketAnalysis = await strategicThinking.thinkFromFirstPrinciples(
      'What is the optimal domain acquisition strategy given current market conditions?',
      {
        marketPhase: this.state.marketCondition.phase,
        availableCapital: this.state.resources.acquisitionBudget,
        riskTolerance: this.state.portfolioStrategy.riskProfile,
      }
    )

    // Generate insight from analysis
    if (marketAnalysis.actionable) {
      this.insightBuffer.push({
        category: 'recommendation',
        title: 'Strategic Direction',
        description: marketAnalysis.conclusion,
        actionItems: marketAnalysis.actions,
        urgency: marketAnalysis.confidence,
        impact: 80,
      })
    }

    // Perform competitive analysis
    const competitive = strategicThinking.analyzeCompetitivePosition()
    this.insightBuffer.push({
      category: 'trend',
      title: 'Competitive Position Update',
      description: `Strength: ${competitive.strength}. Strategic Move: ${competitive.strategicMove}`,
      actionItems: [competitive.strategicMove],
      urgency: 50,
      impact: 60,
    })

    // Analyze scenarios for major decisions
    const scenarios = await strategicThinking.analyzeScenarios(
      'Market outlook for domain trading',
      ['aggressive expansion', 'conservative hold', 'selective acquisition']
    )

    const bestScenario = scenarios.find(s => s.name === 'Most Likely')
    if (bestScenario) {
      this.insightBuffer.push({
        category: 'trend',
        title: 'Scenario Outlook',
        description: `Most likely: ${bestScenario.outcome} (${bestScenario.probability}% probability)`,
        actionItems: bestScenario.preparation,
        urgency: 40,
        impact: 70,
      })
    }
  }

  /**
   * Deep strategic analysis for major decisions
   */
  async conductDeepAnalysis(question: string): Promise<{
    analysis: string
    recommendation: string
    confidence: number
    actions: string[]
  }> {
    logger.info('CEO_BRAIN', `🧠 Conducting deep analysis: "${question}"`)

    // First-principles thinking
    const firstPrinciples = await strategicThinking.thinkFromFirstPrinciples(question)

    // Scenario analysis
    const scenarios = await strategicThinking.analyzeScenarios(question, [
      'proceed aggressively',
      'proceed cautiously',
      'hold and wait',
    ])

    // Competitive context
    const competitive = strategicThinking.analyzeCompetitivePosition()

    // Synthesize
    const analysis = `
First-Principles: ${firstPrinciples.conclusion}

Scenarios: Best case ${scenarios[0].probability}%, Most likely ${scenarios[1].probability}%, Worst case ${scenarios[2].probability}%

Competitive Position: ${competitive.strategicMove}
    `.trim()

    const recommendation = firstPrinciples.steps[firstPrinciples.steps.length - 1].result

    return {
      analysis,
      recommendation,
      confidence: firstPrinciples.confidence,
      actions: firstPrinciples.actions,
    }
  }

  /**
   * Analyze specific trade-off decision
   */
  analyzeTradeoff(option1: string, option2: string): {
    recommendation: string
    reasoning: string
    option1Score: number
    option2Score: number
  } {
    const criteria = [
      { name: 'profit', weight: 40 },
      { name: 'risk', weight: 30 },
      { name: 'growth', weight: 20 },
      { name: 'efficiency', weight: 10 },
    ]

    const analysis = strategicThinking.analyzeTradeoff(option1, option2, criteria)

    return {
      recommendation: analysis.recommendation,
      reasoning: analysis.reasoning,
      option1Score: analysis.option1.score,
      option2Score: analysis.option2.score,
    }
  }

  /**
   * Calculate risk-reward for a specific opportunity
   */
  analyzeRiskReward(gain: number, loss: number, probability: number): {
    recommendation: string
    score: number
    reasoning: string
  } {
    const result = strategicThinking.analyzeRiskReward(gain, loss, probability)
    return {
      recommendation: result.recommendation,
      score: result.score,
      reasoning: result.reasoning,
    }
  }

  private evaluatePendingDecisions(): void {
    const pendingDecisions = this.decisionHistory.filter(d => !d.executed)
    
    pendingDecisions.forEach(decision => {
      // Auto-execute medium/low priority decisions after delay
      const ageMinutes = (Date.now() - decision.timestamp.getTime()) / 60000
      
      if (ageMinutes > 30 && decision.priority !== 'critical' && decision.priority !== 'high') {
        decision.executed = true
        decision.result = 'Auto-executed after delay'
        logger.info('CEO_BRAIN', `⚡ Auto-executed decision: ${decision.decision}`)
      }
    })
  }

  // ============================================================================
  // METRICS & CALCULATIONS
  // ============================================================================

  private calculateDiversificationScore(): number {
    const tldValues = Object.values(this.state.portfolioStrategy.tldDistribution)
    const maxConcentration = Math.max(...tldValues)
    const numTLDs = tldValues.length

    // Higher diversification = lower concentration + more TLDs
    const concentrationPenalty = maxConcentration > 50 ? (maxConcentration - 50) * 2 : 0
    const tldBonus = Math.min(30, numTLDs * 5)

    return Math.max(0, Math.min(100, 100 - concentrationPenalty + tldBonus))
  }

  private calculateRiskAdjustedReturn(): number {
    const roi = this.state.performanceMetrics.totalROI || 0
    const volatility = this.state.marketCondition.volatility
    
    // Sharpe-like calculation
    const riskFreeRate = 5 // Assume 5% risk-free
    const riskAdjusted = (roi - riskFreeRate) / Math.max(1, volatility / 100)

    return Math.max(0, Math.min(100, 50 + riskAdjusted * 10))
  }

  private calculateLiquidityRatio(): number {
    const totalAssets = this.state.performanceMetrics.portfolioValue +
      this.state.resources.emergencyFund +
      this.state.resources.acquisitionBudget

    const liquidAssets = this.state.resources.emergencyFund +
      this.state.resources.acquisitionBudget

    const ratio = totalAssets > 0 ? (liquidAssets / totalAssets) * 100 : 50

    return Math.min(100, ratio)
  }

  // ============================================================================
  // MARKET ANALYSIS
  // ============================================================================

  async analyzeMarketConditions(): Promise<MarketCondition> {
    logger.info('CEO_BRAIN', '🌍 Analyzing market conditions...')

    // Gather market signals
    const signals = {
      auctionVolume: this.measureAuctionVolume(),
      priceMovement: this.measurePriceMovement(),
      buyerActivity: this.measureBuyerActivity(),
      sellerActivity: this.measureSellerActivity(),
      newListings: this.measureNewListings(),
    }

    const avgSignal = Object.values(signals).reduce((a, b) => a + b, 0) / 5

    // Determine market phase
    let phase: 'bull' | 'bear' | 'neutral' | 'volatile'
    let trend: 'up' | 'down' | 'sideways'

    const volatility = Math.abs(signals.priceMovement - 50) + 
                       Math.abs(signals.buyerActivity - signals.sellerActivity)

    if (volatility > 40) {
      phase = 'volatile'
      trend = 'sideways'
    } else if (avgSignal > 60) {
      phase = 'bull'
      trend = 'up'
    } else if (avgSignal < 40) {
      phase = 'bear'
      trend = 'down'
    } else {
      phase = 'neutral'
      trend = 'sideways'
    }

    this.state.marketCondition = {
      phase,
      trend,
      confidence: Math.min(100, 50 + (100 - volatility) / 2),
      volatility,
      opportunity: avgSignal,
      risk: 100 - avgSignal,
    }

    logger.info('CEO_BRAIN', `🌍 Market analysis complete: ${phase} market`, {
      trend,
      opportunity: avgSignal.toFixed(1),
      volatility: volatility.toFixed(1),
    })

    return this.state.marketCondition
  }

  private measureAuctionVolume(): number {
    return 50 + (Math.random() - 0.5) * 40
  }

  private measurePriceMovement(): number {
    return 50 + (Math.random() - 0.5) * 60
  }

  private measureBuyerActivity(): number {
    return 55 + (Math.random() - 0.5) * 30
  }

  private measureSellerActivity(): number {
    return 45 + (Math.random() - 0.5) * 30
  }

  private measureNewListings(): number {
    return 50 + (Math.random() - 0.5) * 40
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  getState(): CEOState {
    return { ...this.state }
  }

  getMarketCondition(): MarketCondition {
    return { ...this.state.marketCondition }
  }

  getPriorities(): StrategicPriority[] {
    return [...this.state.priorities]
  }

  getRecentDecisions(): ExecutiveDecision[] {
    return [...this.state.recentDecisions]
  }

  getResources(): ResourceAllocation {
    return { ...this.state.resources }
  }

  getInsights(): StrategicInsight[] {
    return [...this.insightBuffer]
  }

  getMoodIndex(): number {
    return this.state.moodIndex
  }

  getConfidenceIndex(): number {
    return this.state.confidenceIndex
  }

  isActive(): boolean {
    return this.state.isActive
  }

  setRiskProfile(profile: 'conservative' | 'moderate' | 'aggressive'): void {
    this.state.portfolioStrategy.riskProfile = profile
    logger.info('CEO_BRAIN', `📊 Risk profile updated to: ${profile}`)
    this.notifyListeners()
  }

  updateBudget(budget: Partial<ResourceAllocation>): void {
    this.state.resources = { ...this.state.resources, ...budget }
    logger.info('CEO_BRAIN', '💰 Budget updated', budget)
    this.notifyListeners()
  }

  updatePerformanceMetrics(metrics: Partial<PerformanceMetrics>): void {
    this.state.performanceMetrics = { ...this.state.performanceMetrics, ...metrics }
    this.notifyListeners()
  }

  // Force a strategic review
  async forceStrategicReview(): Promise<void> {
    await this.conductStrategicReview()
  }

  // Subscribe to state changes
  subscribe(listener: (state: CEOState) => void): () => void {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  private notifyListeners(): void {
    const state = this.getState()
    this.listeners.forEach(listener => listener(state))
  }

  // Get CEO thinking summary
  getThinkingSummary(): string {
    const mood = this.state.moodIndex >= 70 ? '😎 Confident' :
                 this.state.moodIndex >= 50 ? '🤔 Cautious' : '😰 Concerned'
    
    return `
📊 CEO BRAIN STATUS
━━━━━━━━━━━━━━━━━━━
Focus: ${this.state.currentFocus}
Mood: ${mood} (${this.state.moodIndex}%)
Confidence: ${this.state.confidenceIndex}%

🌍 MARKET VIEW
Phase: ${this.state.marketCondition.phase.toUpperCase()}
Trend: ${this.state.marketCondition.trend}
Opportunity: ${this.state.marketCondition.opportunity.toFixed(0)}%
Risk: ${this.state.marketCondition.risk.toFixed(0)}%

💰 RESOURCE ALLOCATION
Acquisition: $${this.state.resources.acquisitionBudget.toFixed(0)}
Emergency: $${this.state.resources.emergencyFund.toFixed(0)}
Reinvest Rate: ${(this.state.resources.reinvestmentRate * 100).toFixed(0)}%

🎯 TOP PRIORITIES
${this.state.priorities.map(p => `• ${p.name}: ${p.weight}%`).join('\n')}

📋 RECENT DECISIONS: ${this.state.recentDecisions.length}
Next Review: ${this.state.nextStrategicReview.toLocaleString()}
━━━━━━━━━━━━━━━━━━━
    `.trim()
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const ceoBrain = new CEOBrain()
export type { CEOState, ExecutiveDecision, MarketCondition, StrategicInsight, ResourceAllocation }

