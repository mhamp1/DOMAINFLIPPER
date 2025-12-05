/**
 * AINarrator.ts — GENIUS BOT NARRATOR
 * Explains bot reasoning in plain English, voice mode optional
 * December 2025 — Your AI co-pilot speaks
 */

import { toast } from 'sonner'

// ==================== TYPES ====================

interface NarratorEvent {
  id: string
  timestamp: Date
  type: 'scan' | 'evaluate' | 'decision' | 'action' | 'result' | 'insight' | 'warning'
  domain?: string
  narration: string
  technicalDetails?: string
  confidence?: number
  emotion?: 'excited' | 'cautious' | 'confident' | 'analytical' | 'warning'
  priority: 'high' | 'medium' | 'low'
}

interface DecisionContext {
  domain: string
  estimatedValue: number
  currentPrice: number
  aiScore: number
  riskScore: number
  strategy: string
  factors: {
    length: number
    tld: string
    age?: number
    backlinks?: number
    trademark?: boolean
    trending?: boolean
  }
}

interface SimulationScenario {
  name: string
  description: string
  parameters: {
    compoundRate: number // daily compound rate
    startingCapital: number
    dailyBudget: number
    winRate: number
    avgROI: number
  }
  projections: {
    day30: number
    day90: number
    day180: number
    day365: number
  }
}

// ==================== AI NARRATOR ====================

export class AINarrator {
  private eventHistory: NarratorEvent[] = []
  private voiceEnabled = false
  private readonly MAX_HISTORY = 100

  constructor() {}

  // ==================== NARRATION GENERATION ====================

  /**
   * Generate narration for a domain evaluation
   */
  narrateEvaluation(context: DecisionContext): NarratorEvent {
    const { domain, estimatedValue, currentPrice, aiScore, riskScore, strategy, factors } = context

    // Build natural language explanation
    let narration = ''
    let emotion: NarratorEvent['emotion'] = 'analytical'
    let priority: NarratorEvent['priority'] = 'medium'

    // Opening analysis
    if (aiScore >= 90) {
      narration = `🎯 I found something exceptional — ${domain}. `
      emotion = 'excited'
      priority = 'high'
    } else if (aiScore >= 80) {
      narration = `📊 Analyzing ${domain} — this looks promising. `
      emotion = 'confident'
      priority = 'medium'
    } else if (aiScore >= 70) {
      narration = `🔍 Taking a closer look at ${domain}. `
      emotion = 'analytical'
      priority = 'low'
    } else {
      narration = `⏸️ ${domain} doesn't meet our criteria. `
      emotion = 'cautious'
      priority = 'low'
    }

    // Value analysis
    const roi = currentPrice > 0 ? ((estimatedValue - currentPrice) / currentPrice) * 100 : 0
    if (roi >= 1000) {
      narration += `This could be a 10x+ flip! Current price is $${currentPrice.toLocaleString()} but I estimate it's worth $${estimatedValue.toLocaleString()}. `
    } else if (roi >= 300) {
      narration += `Solid opportunity here — priced at $${currentPrice.toLocaleString()}, I value it at $${estimatedValue.toLocaleString()} (${roi.toFixed(0)}% ROI potential). `
    } else {
      narration += `Value estimate: $${estimatedValue.toLocaleString()} vs current price $${currentPrice.toLocaleString()}. `
    }

    // Factor breakdown
    if (factors.length <= 4) {
      narration += `The ${factors.length}-character name is ultra-premium. `
    } else if (factors.length <= 6) {
      narration += `Short and memorable at ${factors.length} characters. `
    }

    if (factors.tld === '.com') {
      narration += `It's a .com — king of TLDs. `
    } else if (factors.tld === '.ai') {
      narration += `The .ai extension is hot right now with AI trends. `
    }

    if (factors.trademark) {
      narration += `⚠️ Heads up: trademark detected — higher risk. `
      emotion = 'cautious'
    }

    if (factors.trending) {
      narration += `📈 Bonus: this keyword is trending on social media! `
    }

    // Strategy explanation
    narration += `Using the "${strategy}" strategy here.`

    // Risk assessment
    if (riskScore > 80) {
      narration += ` Risk score is excellent at ${riskScore}/100.`
    } else if (riskScore < 50) {
      narration += ` ⚠️ Risk score is concerning at ${riskScore}/100 — proceeding with caution.`
      emotion = 'warning'
    }

    const event: NarratorEvent = {
      id: `narrate-${Date.now()}`,
      timestamp: new Date(),
      type: 'evaluate',
      domain,
      narration,
      technicalDetails: `AI Score: ${aiScore} | Risk: ${riskScore} | ROI: ${roi.toFixed(0)}% | Strategy: ${strategy}`,
      confidence: aiScore,
      emotion,
      priority,
    }

    this.addEvent(event)
    return event
  }

  /**
   * Narrate a buy decision
   */
  narrateDecision(domain: string, decision: 'buy' | 'pass' | 'watch', reason: string): NarratorEvent {
    let narration = ''
    let emotion: NarratorEvent['emotion'] = 'analytical'
    let priority: NarratorEvent['priority'] = 'medium'

    switch (decision) {
      case 'buy':
        narration = `✅ DECISION: I'm buying ${domain}. ${reason}`
        emotion = 'confident'
        priority = 'high'
        break
      case 'pass':
        narration = `❌ DECISION: Passing on ${domain}. ${reason}`
        emotion = 'cautious'
        priority = 'low'
        break
      case 'watch':
        narration = `👀 DECISION: Adding ${domain} to watchlist. ${reason}`
        emotion = 'analytical'
        priority = 'medium'
        break
    }

    const event: NarratorEvent = {
      id: `decision-${Date.now()}`,
      timestamp: new Date(),
      type: 'decision',
      domain,
      narration,
      emotion,
      priority,
    }

    this.addEvent(event)
    return event
  }

  /**
   * Narrate an action (purchase, listing, sale)
   */
  narrateAction(action: 'purchased' | 'listed' | 'sold' | 'sniped', domain: string, amount: number, details?: string): NarratorEvent {
    let narration = ''
    let emotion: NarratorEvent['emotion'] = 'excited'

    switch (action) {
      case 'sniped':
        narration = `⚡ SNIPE SUCCESS! Just grabbed ${domain} for $${amount.toLocaleString()}. ${details || 'Beat the competition!'}`
        break
      case 'purchased':
        narration = `💎 ACQUIRED: ${domain} is now ours for $${amount.toLocaleString()}. ${details || 'Adding to the empire!'}`
        break
      case 'listed':
        narration = `📋 LISTED: ${domain} is now for sale at $${amount.toLocaleString()}. ${details || 'Let the offers roll in!'}`
        break
      case 'sold':
        narration = `💰 KA-CHING! Sold ${domain} for $${amount.toLocaleString()}! ${details || 'Another successful flip!'}`
        emotion = 'excited'
        break
    }

    const event: NarratorEvent = {
      id: `action-${Date.now()}`,
      timestamp: new Date(),
      type: 'action',
      domain,
      narration,
      emotion,
      priority: 'high',
    }

    this.addEvent(event)
    
    // Show toast for important actions
    toast.success(narration, { icon: action === 'sold' ? '💰' : '⚡' })

    return event
  }

  /**
   * Generate market insight narration
   */
  narrateInsight(title: string, insight: string, importance: 'high' | 'medium' | 'low' = 'medium'): NarratorEvent {
    const narration = `💡 ${title}: ${insight}`
    
    const event: NarratorEvent = {
      id: `insight-${Date.now()}`,
      timestamp: new Date(),
      type: 'insight',
      narration,
      emotion: importance === 'high' ? 'excited' : 'analytical',
      priority: importance,
    }

    this.addEvent(event)
    return event
  }

  /**
   * Generate warning narration
   */
  narrateWarning(warning: string, severity: 'critical' | 'warning' | 'info' = 'warning'): NarratorEvent {
    let prefix = ''
    let emotion: NarratorEvent['emotion'] = 'warning'
    let priority: NarratorEvent['priority'] = 'medium'

    switch (severity) {
      case 'critical':
        prefix = '🚨 CRITICAL'
        priority = 'high'
        break
      case 'warning':
        prefix = '⚠️ WARNING'
        priority = 'medium'
        break
      case 'info':
        prefix = 'ℹ️ NOTE'
        emotion = 'analytical'
        priority = 'low'
        break
    }

    const narration = `${prefix}: ${warning}`
    
    const event: NarratorEvent = {
      id: `warning-${Date.now()}`,
      timestamp: new Date(),
      type: 'warning',
      narration,
      emotion,
      priority,
    }

    this.addEvent(event)
    return event
  }

  // ==================== SIMULATION MODE ====================

  /**
   * Run "what-if" simulation scenarios
   */
  runSimulation(scenarios: SimulationScenario[]): SimulationScenario[] {
    return scenarios.map(scenario => {
      const { compoundRate, startingCapital, dailyBudget, winRate, avgROI } = scenario.parameters

      // Calculate projections using compound growth formula
      const calculateProjection = (days: number): number => {
        let capital = startingCapital
        const dailyReturn = (compoundRate / 100) * (winRate / 100) * (avgROI / 100)
        
        for (let i = 0; i < days; i++) {
          // Simulate daily trading
          const trades = Math.floor(dailyBudget / 50) // Assume $50 avg trade
          const wins = Math.floor(trades * (winRate / 100))
          const profit = wins * 50 * (avgROI / 100)
          capital += profit
        }
        
        return Math.round(capital)
      }

      return {
        ...scenario,
        projections: {
          day30: calculateProjection(30),
          day90: calculateProjection(90),
          day180: calculateProjection(180),
          day365: calculateProjection(365),
        },
      }
    })
  }

  /**
   * Generate default simulation scenarios
   */
  getDefaultScenarios(startingCapital: number): SimulationScenario[] {
    return [
      {
        name: 'Conservative',
        description: 'Low risk, steady growth',
        parameters: {
          compoundRate: 3,
          startingCapital,
          dailyBudget: startingCapital * 0.05,
          winRate: 70,
          avgROI: 150,
        },
        projections: { day30: 0, day90: 0, day180: 0, day365: 0 },
      },
      {
        name: 'Balanced',
        description: 'Moderate risk, solid returns',
        parameters: {
          compoundRate: 6,
          startingCapital,
          dailyBudget: startingCapital * 0.1,
          winRate: 75,
          avgROI: 300,
        },
        projections: { day30: 0, day90: 0, day180: 0, day365: 0 },
      },
      {
        name: 'Aggressive',
        description: 'Higher risk, maximum growth',
        parameters: {
          compoundRate: 10,
          startingCapital,
          dailyBudget: startingCapital * 0.15,
          winRate: 80,
          avgROI: 500,
        },
        projections: { day30: 0, day90: 0, day180: 0, day365: 0 },
      },
    ].map(scenario => {
      const results = this.runSimulation([scenario])
      return results[0]
    })
  }

  // ==================== VOICE MODE (OPTIONAL) ====================

  /**
   * Enable voice narration using Web Speech API
   */
  enableVoice(): void {
    if ('speechSynthesis' in window) {
      this.voiceEnabled = true
      toast.success('🔊 Voice narration enabled')
    } else {
      toast.warning('Voice synthesis not supported in this browser')
    }
  }

  /**
   * Disable voice narration
   */
  disableVoice(): void {
    this.voiceEnabled = false
    window.speechSynthesis?.cancel()
  }

  /**
   * Speak narration using Web Speech API
   */
  speak(text: string, priority: 'high' | 'medium' | 'low' = 'medium'): void {
    if (!this.voiceEnabled || !('speechSynthesis' in window)) return

    // Only speak high priority events by default
    if (priority === 'low') return

    // Cancel current speech for high priority
    if (priority === 'high') {
      window.speechSynthesis.cancel()
    }

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 1.1
    utterance.pitch = 1.0
    utterance.volume = 0.8

    // Use a natural-sounding voice if available
    const voices = window.speechSynthesis.getVoices()
    const preferredVoice = voices.find(v => 
      v.name.includes('Samantha') || 
      v.name.includes('Alex') || 
      v.name.includes('Google')
    )
    if (preferredVoice) {
      utterance.voice = preferredVoice
    }

    window.speechSynthesis.speak(utterance)
  }

  // ==================== EVENT MANAGEMENT ====================

  /**
   * Add event to history
   */
  private addEvent(event: NarratorEvent): void {
    this.eventHistory.unshift(event)
    
    // Trim history
    if (this.eventHistory.length > this.MAX_HISTORY) {
      this.eventHistory = this.eventHistory.slice(0, this.MAX_HISTORY)
    }

    // Speak if voice enabled
    if (this.voiceEnabled) {
      this.speak(event.narration, event.priority)
    }
  }

  /**
   * Get recent events
   */
  getRecentEvents(count = 10): NarratorEvent[] {
    return this.eventHistory.slice(0, count)
  }

  /**
   * Get events by type
   */
  getEventsByType(type: NarratorEvent['type']): NarratorEvent[] {
    return this.eventHistory.filter(e => e.type === type)
  }

  /**
   * Get high priority events
   */
  getHighPriorityEvents(): NarratorEvent[] {
    return this.eventHistory.filter(e => e.priority === 'high')
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.eventHistory = []
  }

  /**
   * Check if voice is enabled
   */
  isVoiceEnabled(): boolean {
    return this.voiceEnabled
  }

  /**
   * Generate daily summary narration
   */
  generateDailySummary(stats: {
    domainsScanned: number
    domainsBought: number
    domainsSold: number
    profit: number
    topDomain?: string
  }): NarratorEvent {
    let narration = `📊 Daily Empire Report: `

    if (stats.profit > 0) {
      narration += `We made $${stats.profit.toLocaleString()} today! 🎉 `
    } else if (stats.profit < 0) {
      narration += `Down $${Math.abs(stats.profit).toLocaleString()} today — let's bounce back tomorrow. `
    } else {
      narration += `Break-even day. `
    }

    narration += `Scanned ${stats.domainsScanned.toLocaleString()} domains, bought ${stats.domainsBought}, sold ${stats.domainsSold}. `

    if (stats.topDomain) {
      narration += `Top performer: ${stats.topDomain}. `
    }

    narration += `The empire grows stronger! 💪`

    const event: NarratorEvent = {
      id: `summary-${Date.now()}`,
      timestamp: new Date(),
      type: 'insight',
      narration,
      emotion: stats.profit > 0 ? 'excited' : stats.profit < 0 ? 'cautious' : 'analytical',
      priority: 'high',
    }

    this.addEvent(event)
    return event
  }
}

// Export singleton
export const aiNarrator = new AINarrator()

