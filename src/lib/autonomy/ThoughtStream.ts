/**
 * ThoughtStream.ts — BOT REASONING ENGINE
 * Real-time thought process visualization
 * Shows the bot "thinking" like an AI assistant
 * December 2025
 */

import { logger } from '@/lib/utils/logger'

// ==================== TYPES ====================

export type ThoughtType = 
  | 'observation'    // 📡 What the bot sees/detects
  | 'analysis'       // 🔍 Breaking down information
  | 'evaluation'     // ⚖️ Weighing options
  | 'decision'       // ✅ Making a choice
  | 'action'         // ⚡ Taking action
  | 'result'         // 📊 Outcome of action
  | 'strategy'       // 🎯 Strategic thinking
  | 'warning'        // ⚠️ Concern or risk
  | 'opportunity'    // 💎 Spotted opportunity
  | 'negotiation'    // 🤝 Negotiation logic
  | 'calculation'    // 🧮 Math/valuation
  | 'learning'       // 🧠 Pattern recognition

export interface Thought {
  id: string
  timestamp: Date
  type: ThoughtType
  title: string
  content: string
  details?: string[]
  data?: Record<string, any>
  confidence?: number  // 0-100
  duration?: number    // How long this thought took
  relatedDomain?: string
  parentThoughtId?: string  // For nested reasoning
}

export interface ThinkingSession {
  id: string
  startedAt: Date
  domain?: string
  topic: string
  thoughts: Thought[]
  conclusion?: string
  status: 'thinking' | 'concluded' | 'interrupted'
}

// ==================== THOUGHT TEMPLATES ====================

const THOUGHT_PREFIXES: Record<ThoughtType, string> = {
  observation: '📡 Observing',
  analysis: '🔍 Analyzing',
  evaluation: '⚖️ Evaluating',
  decision: '✅ Decided',
  action: '⚡ Executing',
  result: '📊 Result',
  strategy: '🎯 Strategy',
  warning: '⚠️ Warning',
  opportunity: '💎 Opportunity',
  negotiation: '🤝 Negotiation',
  calculation: '🧮 Calculating',
  learning: '🧠 Learning',
}

// ==================== THOUGHT STREAM CLASS ====================

class ThoughtStreamService {
  private thoughts: Thought[] = []
  private sessions: Map<string, ThinkingSession> = new Map()
  private listeners: Array<(thought: Thought) => void> = []
  private sessionListeners: Array<(session: ThinkingSession) => void> = []
  private maxThoughts = 500
  private currentSession: ThinkingSession | null = null

  constructor() {
    this.loadState()
  }

  // ==================== THINKING METHODS ====================

  /**
   * Start a new thinking session (like opening a reasoning block)
   */
  startThinking(topic: string, domain?: string): ThinkingSession {
    const session: ThinkingSession = {
      id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      startedAt: new Date(),
      domain,
      topic,
      thoughts: [],
      status: 'thinking',
    }

    this.sessions.set(session.id, session)
    this.currentSession = session
    this.notifySessionListeners(session)

    // Opening thought
    this.think('observation', `Starting analysis: ${topic}`, domain ? [
      `Domain: ${domain}`,
      `Timestamp: ${new Date().toISOString()}`,
    ] : undefined, { sessionId: session.id })

    return session
  }

  /**
   * Add a thought to the stream
   */
  think(
    type: ThoughtType,
    content: string,
    details?: string[],
    data?: Record<string, any>
  ): Thought {
    const thought: Thought = {
      id: `thought_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      type,
      title: THOUGHT_PREFIXES[type],
      content,
      details,
      data,
      relatedDomain: data?.domain || this.currentSession?.domain,
      parentThoughtId: this.currentSession?.id,
    }

    this.thoughts.unshift(thought)
    
    // Add to current session if active
    if (this.currentSession) {
      this.currentSession.thoughts.push(thought)
    }

    // Trim old thoughts
    if (this.thoughts.length > this.maxThoughts) {
      this.thoughts = this.thoughts.slice(0, this.maxThoughts)
    }

    this.saveState()
    this.notifyListeners(thought)

    // Also log it
    logger.debug('BRAIN_THOUGHT', `${thought.title}: ${content}`)

    return thought
  }

  /**
   * End a thinking session with a conclusion
   */
  concludeThinking(conclusion: string, sessionId?: string): void {
    const session = sessionId 
      ? this.sessions.get(sessionId) 
      : this.currentSession

    if (session) {
      session.status = 'concluded'
      session.conclusion = conclusion

      this.think('decision', conclusion, undefined, { sessionId: session.id })
      this.notifySessionListeners(session)

      if (this.currentSession?.id === session.id) {
        this.currentSession = null
      }
    }
  }

  // ==================== DOMAIN EVALUATION THOUGHTS ====================

  /**
   * Think through a domain evaluation
   */
  evaluateDomain(
    domain: string,
    price: number,
    metrics: {
      length?: number
      tld?: string
      keywords?: string[]
      searchVolume?: number
      cpc?: number
      brandable?: boolean
      estimatedValue?: number
    }
  ): void {
    const session = this.startThinking(`Evaluate acquisition: ${domain}`, domain)

    // Initial observation
    this.think('observation', `New domain opportunity detected`, [
      `Domain: ${domain}`,
      `Listed Price: $${price.toLocaleString()}`,
      `Source: Marketplace scan`,
    ], { domain, price })

    // Analysis
    setTimeout(() => {
      this.think('analysis', `Breaking down domain characteristics`, [
        `Length: ${metrics.length || domain.split('.')[0].length} characters`,
        `TLD: ${metrics.tld || '.' + domain.split('.').pop()}`,
        `Keywords: ${metrics.keywords?.join(', ') || 'Analyzing...'}`,
        `Brandable: ${metrics.brandable ? 'Yes ✓' : 'Checking...'}`,
      ], { domain, metrics })
    }, 100)

    // Valuation calculation
    setTimeout(() => {
      if (metrics.estimatedValue) {
        const roi = ((metrics.estimatedValue - price) / price * 100).toFixed(1)
        this.think('calculation', `Valuation complete`, [
          `Estimated Value: $${metrics.estimatedValue.toLocaleString()}`,
          `Purchase Price: $${price.toLocaleString()}`,
          `Potential ROI: ${roi}%`,
          `Profit Margin: $${(metrics.estimatedValue - price).toLocaleString()}`,
        ], { domain, estimatedValue: metrics.estimatedValue, roi })
      }
    }, 200)

    // Decision
    setTimeout(() => {
      const shouldBuy = metrics.estimatedValue && metrics.estimatedValue > price * 1.5
      
      if (shouldBuy) {
        this.think('opportunity', `HIGH-VALUE OPPORTUNITY DETECTED`, [
          `This domain has strong acquisition potential`,
          `ROI exceeds minimum threshold (50%)`,
          `Recommending: ACQUIRE`,
        ], { domain, recommendation: 'BUY' })
        
        this.concludeThinking(`✅ Recommend acquiring ${domain} at $${price}`)
      } else {
        this.think('evaluation', `Domain does not meet criteria`, [
          `ROI below threshold or risk too high`,
          `Recommending: PASS`,
        ], { domain, recommendation: 'PASS' })
        
        this.concludeThinking(`❌ Passing on ${domain} — insufficient ROI`)
      }
    }, 300)
  }

  // ==================== NEGOTIATION THOUGHTS ====================

  /**
   * Think through a negotiation
   */
  negotiationThought(
    domain: string,
    buyerOffer: number,
    ourAsk: number,
    round: number,
    decision: 'accept' | 'counter' | 'reject',
    counterAmount?: number
  ): void {
    const spread = ((ourAsk - buyerOffer) / ourAsk * 100).toFixed(1)

    this.think('negotiation', `Processing offer for ${domain}`, [
      `Round: ${round}`,
      `Buyer Offer: $${buyerOffer.toLocaleString()}`,
      `Our Ask: $${ourAsk.toLocaleString()}`,
      `Spread: ${spread}%`,
    ], { domain, buyerOffer, ourAsk, round })

    setTimeout(() => {
      if (decision === 'accept') {
        this.think('decision', `ACCEPTING offer of $${buyerOffer.toLocaleString()}`, [
          `Offer meets our minimum threshold`,
          `Initiating escrow process`,
        ], { domain, decision: 'ACCEPT', amount: buyerOffer })
      } else if (decision === 'counter') {
        this.think('strategy', `Countering at $${counterAmount?.toLocaleString()}`, [
          `Applying negotiation ladder`,
          `Round ${round} discount applied`,
          `New ask: $${counterAmount?.toLocaleString()}`,
        ], { domain, decision: 'COUNTER', amount: counterAmount })
      } else {
        this.think('warning', `Rejecting low offer`, [
          `Offer too far below floor price`,
          `Waiting for better offer`,
        ], { domain, decision: 'REJECT' })
      }
    }, 150)
  }

  // ==================== STRATEGY THOUGHTS ====================

  /**
   * Think about strategy selection
   */
  strategyThought(
    strategy: string,
    domains: string[],
    reasoning: string[]
  ): void {
    this.think('strategy', `Activating strategy: ${strategy}`, [
      `Domains identified: ${domains.length}`,
      ...reasoning,
    ], { strategy, domainCount: domains.length })
  }

  /**
   * Market observation
   */
  marketObservation(observation: string, data?: Record<string, any>): void {
    this.think('observation', observation, undefined, data)
  }

  /**
   * Learning/pattern recognition
   */
  patternLearning(pattern: string, details: string[]): void {
    this.think('learning', pattern, details)
  }

  /**
   * Action execution
   */
  actionThought(action: string, details: string[], result?: string): void {
    this.think('action', action, details)
    
    if (result) {
      setTimeout(() => {
        this.think('result', result)
      }, 100)
    }
  }

  // ==================== STREAM ACCESS ====================

  /**
   * Get recent thoughts
   */
  getThoughts(limit = 50): Thought[] {
    return this.thoughts.slice(0, limit)
  }

  /**
   * Get active session
   */
  getCurrentSession(): ThinkingSession | null {
    return this.currentSession
  }

  /**
   * Get all sessions
   */
  getSessions(): ThinkingSession[] {
    return Array.from(this.sessions.values()).slice(0, 20)
  }

  /**
   * Subscribe to new thoughts
   */
  subscribe(listener: (thought: Thought) => void): () => void {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  /**
   * Subscribe to session updates
   */
  subscribeToSessions(listener: (session: ThinkingSession) => void): () => void {
    this.sessionListeners.push(listener)
    return () => {
      this.sessionListeners = this.sessionListeners.filter(l => l !== listener)
    }
  }

  // ==================== INTERNAL ====================

  private notifyListeners(thought: Thought): void {
    this.listeners.forEach(listener => {
      try {
        listener(thought)
      } catch (e) {
        console.error('Thought listener error:', e)
      }
    })
  }

  private notifySessionListeners(session: ThinkingSession): void {
    this.sessionListeners.forEach(listener => {
      try {
        listener(session)
      } catch (e) {
        console.error('Session listener error:', e)
      }
    })
  }

  private saveState(): void {
    try {
      localStorage.setItem('thought_stream', JSON.stringify({
        thoughts: this.thoughts.slice(0, 100),
        savedAt: new Date().toISOString(),
      }))
    } catch (e) {
      // Storage full or unavailable
    }
  }

  private loadState(): void {
    try {
      const saved = localStorage.getItem('thought_stream')
      if (saved) {
        const data = JSON.parse(saved)
        this.thoughts = (data.thoughts || []).map((t: any) => ({
          ...t,
          timestamp: new Date(t.timestamp),
        }))
      }
    } catch (e) {
      // Invalid state
    }
  }

  /**
   * Clear all thoughts
   */
  clear(): void {
    this.thoughts = []
    this.sessions.clear()
    this.currentSession = null
    localStorage.removeItem('thought_stream')
  }
}

// ==================== SINGLETON ====================

export const thoughtStream = new ThoughtStreamService()

// Export convenience functions
export const think = thoughtStream.think.bind(thoughtStream)
export const startThinking = thoughtStream.startThinking.bind(thoughtStream)
export const concludeThinking = thoughtStream.concludeThinking.bind(thoughtStream)
