/**
 * STRATEGIC THINKING ENGINE
 * 
 * Advanced logical reasoning and decision-making that complements the CEO Brain.
 * Implements cognitive patterns like:
 * - First-principles thinking
 * - Scenario analysis
 * - Risk-reward optimization
 * - Competitive positioning
 * - Long-term vs short-term trade-offs
 */

import { logger } from '../utils/logger'
import { ceoBrain } from './CEOBrain'
import type { MarketCondition, ResourceAllocation } from './CEOBrain'

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface ThinkingContext {
  question: string
  relevantData: Record<string, unknown>
  constraints: string[]
  objectives: string[]
}

interface ThoughtProcess {
  id: string
  type: 'first_principles' | 'scenario_analysis' | 'risk_reward' | 'competitive' | 'tradeoff'
  question: string
  steps: ThinkingStep[]
  conclusion: string
  confidence: number
  actionable: boolean
  actions: string[]
  timestamp: Date
}

interface ThinkingStep {
  step: number
  description: string
  reasoning: string
  result: string
}

interface Scenario {
  name: string
  probability: number
  outcome: string
  impact: number
  preparation: string[]
}

interface CompetitivePosition {
  strength: string
  weakness: string
  opportunity: string
  threat: string
  strategicMove: string
}

interface TradeoffAnalysis {
  option1: { name: string; pros: string[]; cons: string[]; score: number }
  option2: { name: string; pros: string[]; cons: string[]; score: number }
  recommendation: string
  reasoning: string
}

// ============================================================================
// STRATEGIC THINKING CLASS
// ============================================================================

class StrategicThinking {
  private thoughtHistory: ThoughtProcess[] = []
  private isThinking = false

  constructor() {
    logger.info('THINKING', '🧠 Strategic Thinking Engine initialized')
  }

  // ============================================================================
  // FIRST PRINCIPLES THINKING
  // ============================================================================

  /**
   * Break down a complex problem into fundamental truths
   */
  async thinkFromFirstPrinciples(question: string, context?: Record<string, unknown>): Promise<ThoughtProcess> {
    this.isThinking = true
    logger.info('THINKING', `🔬 Applying first principles to: "${question}"`)

    const steps: ThinkingStep[] = []

    // Step 1: Identify the core problem
    steps.push({
      step: 1,
      description: 'Identify the core problem',
      reasoning: 'Strip away assumptions to find the fundamental challenge',
      result: this.extractCoreProblem(question),
    })

    // Step 2: Break down into fundamental truths
    steps.push({
      step: 2,
      description: 'Break down into fundamental truths',
      reasoning: 'What do we know for certain? What are the basic facts?',
      result: this.identifyFundamentalTruths(question, context),
    })

    // Step 3: Challenge assumptions
    steps.push({
      step: 3,
      description: 'Challenge existing assumptions',
      reasoning: 'What assumptions are we making? Are they valid?',
      result: this.challengeAssumptions(question),
    })

    // Step 4: Reason up from basics
    steps.push({
      step: 4,
      description: 'Reason up from the basics',
      reasoning: 'Build a new solution from fundamental truths',
      result: this.reasonFromBasics(steps),
    })

    // Step 5: Synthesize conclusion
    const conclusion = this.synthesizeConclusion(steps)

    const process: ThoughtProcess = {
      id: `FP-${Date.now()}`,
      type: 'first_principles',
      question,
      steps,
      conclusion,
      confidence: this.calculateConfidence(steps),
      actionable: true,
      actions: this.extractActions(conclusion),
      timestamp: new Date(),
    }

    this.thoughtHistory.push(process)
    this.isThinking = false

    logger.info('THINKING', `✅ First principles analysis complete: ${conclusion.substring(0, 100)}...`)
    return process
  }

  private extractCoreProblem(question: string): string {
    // Simplify the question to its essence
    const keywords = question.toLowerCase()
    
    if (keywords.includes('should we buy') || keywords.includes('acquisition')) {
      return 'Decision: Resource allocation for domain acquisition'
    }
    if (keywords.includes('should we sell') || keywords.includes('when to sell')) {
      return 'Decision: Optimal timing for profit realization'
    }
    if (keywords.includes('price') || keywords.includes('valuation')) {
      return 'Analysis: Determine true market value'
    }
    if (keywords.includes('strategy') || keywords.includes('approach')) {
      return 'Planning: Optimize operational strategy'
    }
    
    return `Analysis: ${question.split(' ').slice(0, 5).join(' ')}`
  }

  private identifyFundamentalTruths(question: string, context?: Record<string, unknown>): string {
    const truths: string[] = []

    // Market fundamentals
    const market = ceoBrain.getMarketCondition()
    truths.push(`Market is in ${market.phase} phase with ${market.confidence.toFixed(0)}% confidence`)
    truths.push(`Current opportunity level: ${market.opportunity.toFixed(0)}%`)
    truths.push(`Risk exposure: ${market.risk.toFixed(0)}%`)

    // Resource fundamentals
    const resources = ceoBrain.getResources()
    truths.push(`Available capital: $${resources.acquisitionBudget.toLocaleString()}`)
    truths.push(`Emergency reserves: $${resources.emergencyFund.toLocaleString()}`)

    // Context-specific truths
    if (context?.domainValue) {
      truths.push(`Domain valued at: $${context.domainValue}`)
    }
    if (context?.currentPrice) {
      truths.push(`Current price: $${context.currentPrice}`)
    }

    return truths.join('. ')
  }

  private challengeAssumptions(question: string): string {
    const assumptions: string[] = []

    // Common assumptions to challenge
    assumptions.push('Assumption: Past performance predicts future results - CHALLENGED: Market conditions change')
    assumptions.push('Assumption: Listed price equals value - CHALLENGED: Price is negotiable, value is subjective')
    assumptions.push('Assumption: Quick profits are always better - CHALLENGED: Hold time can increase returns')

    return assumptions.join('. ')
  }

  private reasonFromBasics(steps: ThinkingStep[]): string {
    // Build logical chain from fundamental truths
    const market = ceoBrain.getMarketCondition()
    const mood = ceoBrain.getMoodIndex()

    if (market.phase === 'bull' && mood > 60) {
      return 'Given favorable conditions, aggressive action is warranted with calculated risk-taking'
    }
    if (market.phase === 'bear') {
      return 'Defensive positioning recommended - focus on capital preservation and selective opportunities'
    }
    
    return 'Balanced approach optimal - pursue opportunities while maintaining risk controls'
  }

  private synthesizeConclusion(steps: ThinkingStep[]): string {
    const finalResult = steps[steps.length - 1].result
    const market = ceoBrain.getMarketCondition()
    
    return `Based on first-principles analysis: ${finalResult}. ` +
      `Current ${market.phase} market conditions suggest ` +
      `${market.phase === 'bull' ? 'opportunity capture' : market.phase === 'bear' ? 'capital preservation' : 'balanced positioning'}.`
  }

  // ============================================================================
  // SCENARIO ANALYSIS
  // ============================================================================

  /**
   * Analyze multiple scenarios and their outcomes
   */
  async analyzeScenarios(decision: string, options: string[]): Promise<Scenario[]> {
    logger.info('THINKING', `📊 Analyzing scenarios for: "${decision}"`)

    const scenarios: Scenario[] = []
    const market = ceoBrain.getMarketCondition()

    // Best case scenario
    scenarios.push({
      name: 'Best Case',
      probability: market.phase === 'bull' ? 40 : 25,
      outcome: 'Maximum profit realization with optimal timing',
      impact: 100,
      preparation: [
        'Set aggressive targets',
        'Prepare for quick execution',
        'Have capital ready to reinvest',
      ],
    })

    // Most likely scenario
    scenarios.push({
      name: 'Most Likely',
      probability: 45,
      outcome: 'Moderate returns with typical market conditions',
      impact: 60,
      preparation: [
        'Maintain current strategy',
        'Monitor for changes',
        'Keep reserves adequate',
      ],
    })

    // Worst case scenario
    scenarios.push({
      name: 'Worst Case',
      probability: market.phase === 'bear' ? 35 : 15,
      outcome: 'Losses or extended hold times required',
      impact: -30,
      preparation: [
        'Set stop-loss levels',
        'Maintain emergency fund',
        'Have exit strategy ready',
      ],
    })

    // Black swan scenario
    scenarios.push({
      name: 'Black Swan',
      probability: 5,
      outcome: 'Extreme market event (crash or boom)',
      impact: market.phase === 'volatile' ? 50 : 0,
      preparation: [
        'Diversify holdings',
        'Maintain liquidity',
        'Stay informed on market news',
      ],
    })

    logger.info('THINKING', `📊 Scenario analysis complete: ${scenarios.length} scenarios evaluated`)
    return scenarios
  }

  // ============================================================================
  // RISK-REWARD OPTIMIZATION
  // ============================================================================

  /**
   * Calculate optimal risk-reward balance
   */
  analyzeRiskReward(
    potentialGain: number,
    potentialLoss: number,
    probability: number
  ): { score: number; recommendation: string; reasoning: string } {
    const expectedValue = (probability * potentialGain) - ((1 - probability) * potentialLoss)
    const riskRewardRatio = potentialGain / Math.max(1, potentialLoss)
    
    const market = ceoBrain.getMarketCondition()
    const mood = ceoBrain.getMoodIndex()

    // Adjust thresholds based on CEO mood and market
    const minRatio = mood > 70 ? 2 : mood > 40 ? 3 : 4
    const minEV = market.phase === 'bull' ? 0 : market.phase === 'bear' ? potentialLoss * 0.2 : potentialLoss * 0.1

    let score = 50
    let recommendation = 'HOLD'
    let reasoning = ''

    if (expectedValue > minEV && riskRewardRatio >= minRatio) {
      score = Math.min(100, 50 + (expectedValue / potentialLoss) * 20 + (riskRewardRatio / minRatio) * 20)
      recommendation = 'PROCEED'
      reasoning = `Expected value of $${expectedValue.toFixed(2)} with ${riskRewardRatio.toFixed(1)}:1 ratio exceeds thresholds`
    } else if (riskRewardRatio < minRatio / 2) {
      score = Math.max(0, 30 - (minRatio - riskRewardRatio) * 10)
      recommendation = 'AVOID'
      reasoning = `Risk-reward ratio of ${riskRewardRatio.toFixed(1)}:1 is below minimum ${minRatio}:1`
    } else {
      reasoning = `Borderline case - EV: $${expectedValue.toFixed(2)}, R:R: ${riskRewardRatio.toFixed(1)}:1`
    }

    logger.info('THINKING', `⚖️ Risk-Reward: ${recommendation} (score: ${score.toFixed(0)})`)
    return { score, recommendation, reasoning }
  }

  // ============================================================================
  // COMPETITIVE ANALYSIS
  // ============================================================================

  /**
   * SWOT analysis for competitive positioning
   */
  analyzeCompetitivePosition(): CompetitivePosition {
    const market = ceoBrain.getMarketCondition()
    const resources = ceoBrain.getResources()
    const confidence = ceoBrain.getConfidenceIndex()

    const position: CompetitivePosition = {
      strength: this.identifyStrength(resources, confidence),
      weakness: this.identifyWeakness(resources, confidence),
      opportunity: this.identifyOpportunity(market),
      threat: this.identifyThreat(market),
      strategicMove: this.recommendStrategicMove(market, resources),
    }

    logger.info('THINKING', '🎯 Competitive analysis complete', position)
    return position
  }

  private identifyStrength(resources: ResourceAllocation, confidence: number): string {
    if (resources.acquisitionBudget > 10000) return 'Strong capital position enables aggressive acquisition'
    if (confidence > 80) return 'High AI confidence provides decision-making edge'
    if (resources.emergencyFund > resources.acquisitionBudget * 0.3) return 'Healthy reserves provide flexibility'
    return 'Lean operations enable quick pivots'
  }

  private identifyWeakness(resources: ResourceAllocation, confidence: number): string {
    if (resources.acquisitionBudget < 1000) return 'Limited capital constrains opportunities'
    if (confidence < 50) return 'Low confidence may cause missed opportunities'
    if (resources.emergencyFund < 500) return 'Thin reserves create vulnerability'
    return 'Execution speed may lag market leaders'
  }

  private identifyOpportunity(market: MarketCondition): string {
    if (market.phase === 'bear') return 'Distressed assets available at discount'
    if (market.phase === 'bull') return 'Strong buyer demand for premium names'
    if (market.opportunity > 70) return 'High-value deals currently available'
    return 'Stable market allows strategic positioning'
  }

  private identifyThreat(market: MarketCondition): string {
    if (market.phase === 'volatile') return 'Market unpredictability increases risk'
    if (market.risk > 60) return 'Elevated risk levels require caution'
    if (market.volatility > 50) return 'Price swings may erode margins'
    return 'Competition may increase for quality domains'
  }

  private recommendStrategicMove(market: MarketCondition, resources: ResourceAllocation): string {
    if (market.phase === 'bull' && resources.acquisitionBudget > 5000) {
      return 'EXPAND: Increase acquisition rate while market is favorable'
    }
    if (market.phase === 'bear') {
      return 'ACCUMULATE: Selectively acquire discounted premium assets'
    }
    if (resources.emergencyFund < 1000) {
      return 'CONSOLIDATE: Build reserves before aggressive moves'
    }
    return 'OPTIMIZE: Fine-tune operations and monitor for opportunities'
  }

  // ============================================================================
  // TRADE-OFF ANALYSIS
  // ============================================================================

  /**
   * Analyze trade-offs between two options
   */
  analyzeTradeoff(
    option1: string,
    option2: string,
    criteria: { name: string; weight: number }[]
  ): TradeoffAnalysis {
    logger.info('THINKING', `⚖️ Analyzing trade-off: "${option1}" vs "${option2}"`)

    const analysis: TradeoffAnalysis = {
      option1: {
        name: option1,
        pros: this.identifyPros(option1),
        cons: this.identifyCons(option1),
        score: 0,
      },
      option2: {
        name: option2,
        pros: this.identifyPros(option2),
        cons: this.identifyCons(option2),
        score: 0,
      },
      recommendation: '',
      reasoning: '',
    }

    // Score based on criteria
    analysis.option1.score = this.scoreOption(option1, criteria)
    analysis.option2.score = this.scoreOption(option2, criteria)

    if (analysis.option1.score > analysis.option2.score * 1.2) {
      analysis.recommendation = option1
      analysis.reasoning = `${option1} scores ${((analysis.option1.score / analysis.option2.score - 1) * 100).toFixed(0)}% higher on weighted criteria`
    } else if (analysis.option2.score > analysis.option1.score * 1.2) {
      analysis.recommendation = option2
      analysis.reasoning = `${option2} scores ${((analysis.option2.score / analysis.option1.score - 1) * 100).toFixed(0)}% higher on weighted criteria`
    } else {
      analysis.recommendation = 'Either option acceptable'
      analysis.reasoning = 'Both options score similarly - choose based on secondary factors'
    }

    return analysis
  }

  private identifyPros(option: string): string[] {
    const optionLower = option.toLowerCase()
    const pros: string[] = []

    if (optionLower.includes('buy') || optionLower.includes('acquire')) {
      pros.push('Potential for appreciation', 'Asset ownership', 'Portfolio growth')
    }
    if (optionLower.includes('sell') || optionLower.includes('exit')) {
      pros.push('Realize profits', 'Free up capital', 'Reduce exposure')
    }
    if (optionLower.includes('hold') || optionLower.includes('wait')) {
      pros.push('No transaction costs', 'Potential for better timing', 'Preserve optionality')
    }
    if (optionLower.includes('aggressive')) {
      pros.push('Higher potential returns', 'Faster growth', 'Market leadership')
    }
    if (optionLower.includes('conservative')) {
      pros.push('Lower risk', 'Capital preservation', 'Stable returns')
    }

    return pros.length > 0 ? pros : ['Strategic value', 'Operational efficiency']
  }

  private identifyCons(option: string): string[] {
    const optionLower = option.toLowerCase()
    const cons: string[] = []

    if (optionLower.includes('buy') || optionLower.includes('acquire')) {
      cons.push('Capital tied up', 'Market risk', 'Maintenance costs')
    }
    if (optionLower.includes('sell') || optionLower.includes('exit')) {
      cons.push('Miss future upside', 'Transaction costs', 'Potential tax impact')
    }
    if (optionLower.includes('hold') || optionLower.includes('wait')) {
      cons.push('Opportunity cost', 'Carrying costs', 'Market timing risk')
    }
    if (optionLower.includes('aggressive')) {
      cons.push('Higher risk', 'Potential for larger losses', 'Stress')
    }
    if (optionLower.includes('conservative')) {
      cons.push('Lower returns', 'Missed opportunities', 'Slower growth')
    }

    return cons.length > 0 ? cons : ['Implementation complexity', 'Resource requirements']
  }

  private scoreOption(option: string, criteria: { name: string; weight: number }[]): number {
    let score = 50
    const market = ceoBrain.getMarketCondition()
    const optionLower = option.toLowerCase()

    // Adjust based on market conditions
    if (market.phase === 'bull') {
      if (optionLower.includes('buy') || optionLower.includes('aggressive')) score += 15
      if (optionLower.includes('sell')) score -= 10
    }
    if (market.phase === 'bear') {
      if (optionLower.includes('sell') || optionLower.includes('conservative')) score += 15
      if (optionLower.includes('buy') || optionLower.includes('aggressive')) score -= 10
    }

    // Apply criteria weights
    criteria.forEach(c => {
      if (optionLower.includes(c.name.toLowerCase())) {
        score += c.weight * 0.5
      }
    })

    return Math.max(0, Math.min(100, score))
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private calculateConfidence(steps: ThinkingStep[]): number {
    // Base confidence from number of successful reasoning steps
    let confidence = 50 + (steps.length * 10)
    
    // Adjust based on CEO Brain state
    confidence = (confidence + ceoBrain.getConfidenceIndex()) / 2

    return Math.min(95, Math.max(20, confidence))
  }

  private extractActions(conclusion: string): string[] {
    const actions: string[] = []
    
    if (conclusion.includes('aggressive')) {
      actions.push('Increase acquisition rate', 'Raise bid limits', 'Target premium domains')
    } else if (conclusion.includes('defensive') || conclusion.includes('preservation')) {
      actions.push('Reduce acquisition rate', 'Build emergency fund', 'Review underperformers')
    } else {
      actions.push('Monitor market conditions', 'Maintain current strategy', 'Review weekly')
    }

    return actions
  }

  /**
   * Get thinking history
   */
  getHistory(): ThoughtProcess[] {
    return [...this.thoughtHistory]
  }

  /**
   * Clear thinking history
   */
  clearHistory(): void {
    this.thoughtHistory = []
  }

  /**
   * Check if currently processing
   */
  isProcessing(): boolean {
    return this.isThinking
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const strategicThinking = new StrategicThinking()
export type { ThoughtProcess, Scenario, CompetitivePosition, TradeoffAnalysis }

