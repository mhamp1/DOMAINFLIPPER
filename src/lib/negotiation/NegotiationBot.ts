/**
 * NegotiationBot.ts — AUTOMATED NEGOTIATION ENGINE
 * Finite-state machine with price ladders, BATNA, and guardrails
 * December 2025 — Close deals while you sleep
 */

import { logger } from '@/lib/utils/logger'
import { auditLog } from '@/lib/infrastructure/AuditLog'
import { killSwitches } from '@/lib/infrastructure/KillSwitches'
import { metrics } from '@/lib/infrastructure/Metrics'
import { toast } from 'sonner'

// ==================== TYPES ====================

export type NegotiationState = 
  | 'idle'
  | 'waiting_for_offer'
  | 'evaluating_offer'
  | 'counter_offered'
  | 'accepted'
  | 'rejected'
  | 'expired'
  | 'escalated'  // Needs human intervention

export interface NegotiationConfig {
  enabled: boolean
  maxRounds: number
  timeoutHours: number
  minAcceptPercent: number      // Min % of asking to auto-accept
  targetAcceptPercent: number   // Target % for negotiation
  maxDiscountPercent: number    // Max discount from asking
  counterIncrement: number      // % to drop each round
  autoAcceptThreshold: number   // USD amount to auto-accept above
  requireHumanAbove: number     // USD amount requiring human approval
  aggressiveness: 'conservative' | 'moderate' | 'aggressive'
}

export interface NegotiationSession {
  id: string
  domain: string
  state: NegotiationState
  askingPrice: number
  floorPrice: number
  ceilingPrice: number
  currentOffer?: number
  ourLastCounter?: number
  buyerEmail?: string
  buyerName?: string
  rounds: NegotiationRound[]
  createdAt: Date
  updatedAt: Date
  expiresAt: Date
  outcome?: 'sold' | 'no_deal' | 'expired' | 'escalated'
  finalPrice?: number
  correlationId: string
  metadata?: Record<string, any>
}

export interface NegotiationRound {
  roundNumber: number
  theirOffer?: number
  ourCounter?: number
  action: 'offer_received' | 'counter_sent' | 'accepted' | 'rejected' | 'expired'
  timestamp: Date
  notes?: string
}

export interface OfferEvaluation {
  accept: boolean
  counter?: number
  reasoning: string
  batna: number  // Best Alternative To Negotiated Agreement
  zopa: { min: number; max: number }  // Zone of Possible Agreement
}

// ==================== PRICE LADDERS ====================

interface PriceLadder {
  round: number
  discountPercent: number
}

const CONSERVATIVE_LADDER: PriceLadder[] = [
  { round: 1, discountPercent: 0 },
  { round: 2, discountPercent: 5 },
  { round: 3, discountPercent: 10 },
  { round: 4, discountPercent: 15 },
  { round: 5, discountPercent: 20 },
]

const MODERATE_LADDER: PriceLadder[] = [
  { round: 1, discountPercent: 5 },
  { round: 2, discountPercent: 12 },
  { round: 3, discountPercent: 18 },
  { round: 4, discountPercent: 25 },
  { round: 5, discountPercent: 30 },
]

const AGGRESSIVE_LADDER: PriceLadder[] = [
  { round: 1, discountPercent: 10 },
  { round: 2, discountPercent: 20 },
  { round: 3, discountPercent: 30 },
  { round: 4, discountPercent: 40 },
  { round: 5, discountPercent: 45 },
]

// ==================== NEGOTIATION BOT ====================

class NegotiationBot {
  private sessions: Map<string, NegotiationSession> = new Map()
  private config: NegotiationConfig
  private listeners: Array<(session: NegotiationSession) => void> = []
  private checkInterval: ReturnType<typeof setInterval> | null = null

  constructor() {
    this.config = {
      enabled: true,
      maxRounds: 5,
      timeoutHours: 72,
      minAcceptPercent: 60,
      targetAcceptPercent: 85,
      maxDiscountPercent: 40,
      counterIncrement: 8,
      autoAcceptThreshold: 500,
      requireHumanAbove: 5000,
      aggressiveness: 'moderate',
    }

    this.loadState()

    // Start expiration check
    this.checkInterval = setInterval(() => this.checkExpirations(), 60000)
  }

  // ==================== SESSION MANAGEMENT ====================

  /**
   * Start a new negotiation session
   */
  startSession(
    domain: string,
    askingPrice: number,
    options: {
      buyerEmail?: string
      buyerName?: string
      metadata?: Record<string, any>
    } = {}
  ): NegotiationSession {
    if (!killSwitches.canNegotiate()) {
      throw new Error('Negotiations are paused')
    }

    const session: NegotiationSession = {
      id: `neg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      domain,
      state: 'waiting_for_offer',
      askingPrice,
      floorPrice: this.calculateFloor(askingPrice),
      ceilingPrice: askingPrice,
      buyerEmail: options.buyerEmail,
      buyerName: options.buyerName,
      rounds: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      expiresAt: new Date(Date.now() + this.config.timeoutHours * 60 * 60 * 1000),
      correlationId: `corr_${Date.now()}`,
      metadata: options.metadata,
    }

    this.sessions.set(session.id, session)
    this.saveState()

    metrics.increment('active_negotiations')
    
    auditLog.logNegotiation('started', domain, {
      ourPrice: askingPrice,
      correlationId: session.correlationId,
    })

    logger.info('NEGOTIATION', `Session started: ${domain} @ $${askingPrice}`, {
      sessionId: session.id,
      floor: session.floorPrice,
    })

    return session
  }

  /**
   * Process an incoming offer
   */
  async processOffer(
    sessionId: string,
    offerAmount: number,
    buyerInfo?: { email?: string; name?: string }
  ): Promise<{ action: 'accept' | 'counter' | 'reject'; amount?: number; message: string }> {
    const session = this.sessions.get(sessionId)
    if (!session) {
      throw new Error('Session not found')
    }

    if (!this.config.enabled || !killSwitches.canNegotiate()) {
      return { action: 'reject', message: 'Negotiations temporarily unavailable' }
    }

    if (session.state === 'accepted' || session.state === 'rejected' || session.state === 'expired') {
      return { action: 'reject', message: `Negotiation already ${session.state}` }
    }

    // Update buyer info if provided
    if (buyerInfo?.email) session.buyerEmail = buyerInfo.email
    if (buyerInfo?.name) session.buyerName = buyerInfo.name

    session.currentOffer = offerAmount
    session.state = 'evaluating_offer'
    session.updatedAt = new Date()

    // Evaluate the offer
    const evaluation = this.evaluateOffer(session, offerAmount)

    // Record round
    const roundNumber = session.rounds.length + 1
    const round: NegotiationRound = {
      roundNumber,
      theirOffer: offerAmount,
      timestamp: new Date(),
      action: 'offer_received',
    }

    // Determine response
    let response: { action: 'accept' | 'counter' | 'reject'; amount?: number; message: string }

    if (evaluation.accept) {
      // Accept the offer
      round.action = 'accepted'
      session.state = 'accepted'
      session.outcome = 'sold'
      session.finalPrice = offerAmount

      response = {
        action: 'accept',
        amount: offerAmount,
        message: this.generateAcceptMessage(session, offerAmount),
      }

      metrics.gauge('active_negotiations', (metrics.getValue('active_negotiations') || 1) - 1)
      metrics.histogram('profit_per_domain', offerAmount - (session.metadata?.purchasePrice || 0))

      toast.success(`💰 Offer Accepted: ${session.domain}`, {
        description: `$${offerAmount.toLocaleString()} - Deal closed!`,
      })
    } else if (evaluation.counter && roundNumber < this.config.maxRounds) {
      // Counter offer
      round.action = 'counter_sent'
      round.ourCounter = evaluation.counter
      session.ourLastCounter = evaluation.counter
      session.state = 'counter_offered'

      response = {
        action: 'counter',
        amount: evaluation.counter,
        message: this.generateCounterMessage(session, offerAmount, evaluation.counter, roundNumber),
      }
    } else {
      // Reject (max rounds or below floor)
      if (roundNumber >= this.config.maxRounds) {
        round.action = 'rejected'
        round.notes = 'Max rounds reached'
        session.state = 'rejected'
        session.outcome = 'no_deal'

        response = {
          action: 'reject',
          message: this.generateFinalOfferMessage(session),
        }
      } else {
        // Below floor, make final counter at floor
        round.action = 'counter_sent'
        round.ourCounter = session.floorPrice
        session.ourLastCounter = session.floorPrice
        session.state = 'counter_offered'

        response = {
          action: 'counter',
          amount: session.floorPrice,
          message: this.generateFloorMessage(session),
        }
      }
    }

    session.rounds.push(round)
    this.sessions.set(sessionId, session)
    this.saveState()
    this.notifyListeners(session)

    // Audit log
    auditLog.logNegotiation(
      response.action === 'accept' ? 'accepted' : 
      response.action === 'counter' ? 'counter' : 'rejected',
      session.domain,
      {
        ourPrice: response.amount || session.floorPrice,
        theirPrice: offerAmount,
        round: roundNumber,
        decision: evaluation.reasoning,
        correlationId: session.correlationId,
      }
    )

    return response
  }

  /**
   * Escalate to human review
   */
  escalate(sessionId: string, reason: string): void {
    const session = this.sessions.get(sessionId)
    if (!session) return

    session.state = 'escalated'
    session.updatedAt = new Date()
    
    this.sessions.set(sessionId, session)
    this.saveState()
    this.notifyListeners(session)

    logger.warn('NEGOTIATION', `Escalated: ${session.domain}`, { reason, sessionId })
    toast.warning(`⚠️ Human Review Required: ${session.domain}`, { description: reason })
  }

  // ==================== OFFER EVALUATION ====================

  /**
   * Evaluate an offer using game theory principles
   */
  private evaluateOffer(session: NegotiationSession, offerAmount: number): OfferEvaluation {
    const roundNumber = session.rounds.length + 1
    const batna = session.floorPrice * 0.9 // Slightly below floor as BATNA
    
    // Zone of Possible Agreement
    const zopa = {
      min: session.floorPrice,
      max: session.ceilingPrice,
    }

    // Calculate acceptable threshold based on round
    const ladder = this.getPriceLadder()
    const ladderEntry = ladder.find(l => l.round === roundNumber) || ladder[ladder.length - 1]
    const acceptThreshold = session.askingPrice * (1 - ladderEntry.discountPercent / 100)
    const minAccept = session.askingPrice * (this.config.minAcceptPercent / 100)

    // Decision logic
    let accept = false
    let counter: number | undefined
    let reasoning: string

    // Auto-accept conditions
    if (offerAmount >= acceptThreshold) {
      accept = true
      reasoning = `Offer of $${offerAmount} meets threshold of $${acceptThreshold.toFixed(0)} (round ${roundNumber})`
    } else if (offerAmount >= this.config.autoAcceptThreshold && offerAmount >= minAccept) {
      accept = true
      reasoning = `Offer of $${offerAmount} exceeds auto-accept threshold`
    } else if (offerAmount >= session.askingPrice * (this.config.targetAcceptPercent / 100)) {
      accept = true
      reasoning = `Offer of $${offerAmount} meets target percentage`
    }

    // Counter logic
    if (!accept && offerAmount >= session.floorPrice) {
      // Calculate counter based on midpoint negotiation
      const midpoint = (offerAmount + session.ourLastCounter || session.askingPrice) / 2
      const ladderCounter = session.askingPrice * (1 - (ladderEntry.discountPercent + this.config.counterIncrement) / 100)
      
      counter = Math.max(midpoint, ladderCounter, session.floorPrice)
      counter = Math.round(counter)
      
      reasoning = `Counter at $${counter} (midpoint: $${midpoint.toFixed(0)}, ladder: $${ladderCounter.toFixed(0)})`
    } else if (!accept) {
      reasoning = `Offer of $${offerAmount} below floor of $${session.floorPrice}`
    }

    // Human review threshold
    if (offerAmount >= this.config.requireHumanAbove && !accept) {
      this.escalate(session.id, `High-value offer: $${offerAmount}`)
    }

    return { accept, counter, reasoning, batna, zopa }
  }

  // ==================== MESSAGE GENERATION ====================

  private generateAcceptMessage(session: NegotiationSession, amount: number): string {
    return `Great news! We've accepted your offer of $${amount.toLocaleString()} for ${session.domain}. ` +
           `We'll send escrow/transfer instructions shortly. Thank you for your business!`
  }

  private generateCounterMessage(
    session: NegotiationSession,
    theirOffer: number,
    ourCounter: number,
    round: number
  ): string {
    const messages = [
      `Thank you for your offer of $${theirOffer.toLocaleString()}. ${session.domain} is a premium domain with strong potential. ` +
      `We can offer it to you for $${ourCounter.toLocaleString()}.`,
      
      `We appreciate your interest in ${session.domain}. While $${theirOffer.toLocaleString()} is below our target, ` +
      `we'd like to work with you. How about $${ourCounter.toLocaleString()}?`,
      
      `Thanks for getting back to us. We've reviewed your offer of $${theirOffer.toLocaleString()} for ${session.domain}. ` +
      `Our best price is $${ourCounter.toLocaleString()}.`,
      
      `We want to make this work. For ${session.domain}, we can come down to $${ourCounter.toLocaleString()}. ` +
      `This is a competitive price for a domain of this quality.`,
      
      `Final offer: $${ourCounter.toLocaleString()} for ${session.domain}. ` +
      `This is the best we can do while ensuring value for both parties.`,
    ]

    return messages[Math.min(round - 1, messages.length - 1)]
  }

  private generateFloorMessage(session: NegotiationSession): string {
    return `We appreciate your persistence. Our absolute lowest price for ${session.domain} is ` +
           `$${session.floorPrice.toLocaleString()}. This is our final offer.`
  }

  private generateFinalOfferMessage(session: NegotiationSession): string {
    return `Thank you for negotiating with us on ${session.domain}. Unfortunately, we weren't able to reach ` +
           `an agreement at this time. If circumstances change, feel free to reach out again.`
  }

  // ==================== HELPERS ====================

  private calculateFloor(askingPrice: number): number {
    return Math.round(askingPrice * (1 - this.config.maxDiscountPercent / 100))
  }

  private getPriceLadder(): PriceLadder[] {
    switch (this.config.aggressiveness) {
      case 'conservative': return CONSERVATIVE_LADDER
      case 'aggressive': return AGGRESSIVE_LADDER
      default: return MODERATE_LADDER
    }
  }

  private checkExpirations(): void {
    const now = new Date()
    
    for (const [id, session] of this.sessions) {
      if (session.state !== 'accepted' && 
          session.state !== 'rejected' && 
          session.state !== 'expired' &&
          now > session.expiresAt) {
        session.state = 'expired'
        session.outcome = 'expired'
        session.updatedAt = now
        
        this.sessions.set(id, session)
        this.notifyListeners(session)
        
        logger.info('NEGOTIATION', `Session expired: ${session.domain}`, { sessionId: id })
      }
    }

    this.saveState()
  }

  // ==================== QUERIES ====================

  getSession(sessionId: string): NegotiationSession | undefined {
    return this.sessions.get(sessionId)
  }

  getSessionByDomain(domain: string): NegotiationSession | undefined {
    for (const session of this.sessions.values()) {
      if (session.domain === domain && 
          session.state !== 'accepted' && 
          session.state !== 'rejected' && 
          session.state !== 'expired') {
        return session
      }
    }
    return undefined
  }

  getActiveSessions(): NegotiationSession[] {
    return Array.from(this.sessions.values()).filter(s => 
      s.state !== 'accepted' && 
      s.state !== 'rejected' && 
      s.state !== 'expired'
    )
  }

  getSessionHistory(limit?: number): NegotiationSession[] {
    const sessions = Array.from(this.sessions.values())
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    return limit ? sessions.slice(0, limit) : sessions
  }

  // ==================== CONFIG ====================

  setConfig(config: Partial<NegotiationConfig>): void {
    this.config = { ...this.config, ...config }
    logger.info('NEGOTIATION', 'Config updated', this.config)
  }

  getConfig(): NegotiationConfig {
    return { ...this.config }
  }

  // ==================== SUBSCRIPTIONS ====================

  subscribe(listener: (session: NegotiationSession) => void): () => void {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  private notifyListeners(session: NegotiationSession): void {
    this.listeners.forEach(l => l(session))
  }

  // ==================== PERSISTENCE ====================

  private saveState(): void {
    try {
      const state = Object.fromEntries(
        Array.from(this.sessions.entries()).map(([id, s]) => [
          id,
          {
            ...s,
            createdAt: s.createdAt.toISOString(),
            updatedAt: s.updatedAt.toISOString(),
            expiresAt: s.expiresAt.toISOString(),
            rounds: s.rounds.map(r => ({ ...r, timestamp: r.timestamp.toISOString() })),
          }
        ])
      )
      localStorage.setItem('domainFlipper_negotiations', JSON.stringify(state))
    } catch (e) {
      // Ignore
    }
  }

  private loadState(): void {
    try {
      const saved = localStorage.getItem('domainFlipper_negotiations')
      if (saved) {
        const state = JSON.parse(saved)
        for (const [id, s] of Object.entries(state) as [string, any][]) {
          this.sessions.set(id, {
            ...s,
            createdAt: new Date(s.createdAt),
            updatedAt: new Date(s.updatedAt),
            expiresAt: new Date(s.expiresAt),
            rounds: s.rounds.map((r: any) => ({ ...r, timestamp: new Date(r.timestamp) })),
          })
        }
      }
    } catch (e) {
      // Ignore
    }
  }

  destroy(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
    }
  }
}

// ==================== SINGLETON ====================

export const negotiationBot = new NegotiationBot()
