/**
 * AuditLog.ts — IMMUTABLE AUDIT TRAIL
 * Append-only log for all decisions, actions, and API responses
 * December 2025 — Compliance-ready audit trail
 */

import { logger } from '@/lib/utils/logger'

// ==================== TYPES ====================

export type AuditEventType = 
  | 'scan_started' | 'scan_completed'
  | 'valuation_requested' | 'valuation_completed'
  | 'bid_attempted' | 'bid_success' | 'bid_failed'
  | 'buy_attempted' | 'buy_success' | 'buy_failed'
  | 'list_attempted' | 'list_success' | 'list_failed'
  | 'negotiation_started' | 'negotiation_counter' | 'negotiation_accepted' | 'negotiation_rejected'
  | 'transfer_initiated' | 'transfer_completed' | 'transfer_failed'
  | 'sale_completed'
  | 'kill_switch_triggered' | 'kill_switch_reset'
  | 'spend_limit_hit' | 'spend_anomaly'
  | 'compliance_check' | 'compliance_blocked'
  | 'api_call' | 'api_error'
  | 'config_changed'
  | 'human_override'
  | 'offer_received' | 'payment_received'
  | 'payment_request_created' | 'payment_confirmed'
  | 'escrow_created' | 'escrow_completed'

export interface AuditEntry {
  id: string
  timestamp: Date
  type: AuditEventType
  domain?: string
  correlationId?: string
  actor: 'system' | 'human' | 'api'
  action: string
  inputs: Record<string, any>
  outputs?: Record<string, any>
  decision?: {
    made: string
    reasoning: string
    thresholds: Record<string, number>
    scores: Record<string, number>
  }
  apiResponse?: {
    endpoint: string
    statusCode: number
    responseTime: number
    body?: any
  }
  metadata?: Record<string, any>
  hash?: string // For integrity verification
  previousHash?: string // Chain integrity
}

export interface AuditQuery {
  type?: AuditEventType | AuditEventType[]
  domain?: string
  correlationId?: string
  actor?: 'system' | 'human' | 'api'
  startDate?: Date
  endDate?: Date
  limit?: number
  offset?: number
}

export interface AuditStats {
  totalEntries: number
  byType: Record<AuditEventType, number>
  byActor: Record<string, number>
  successRate: number
  avgDecisionTime: number
}

// ==================== AUDIT LOG SERVICE ====================

class AuditLogService {
  private entries: AuditEntry[] = []
  private readonly MAX_ENTRIES = 10000
  private readonly STORAGE_KEY = 'domainFlipper_auditLog'
  private lastHash: string = '0'
  private listeners: Array<(entry: AuditEntry) => void> = []

  constructor() {
    this.loadState()
  }

  // ==================== LOGGING ====================

  /**
   * Record an audit entry (immutable append)
   */
  log(
    type: AuditEventType,
    action: string,
    data: {
      domain?: string
      correlationId?: string
      actor?: 'system' | 'human' | 'api'
      inputs?: Record<string, any>
      outputs?: Record<string, any>
      decision?: AuditEntry['decision']
      apiResponse?: AuditEntry['apiResponse']
      metadata?: Record<string, any>
    } = {}
  ): AuditEntry {
    const entry: AuditEntry = {
      id: this.generateId(),
      timestamp: new Date(),
      type,
      action,
      domain: data.domain,
      correlationId: data.correlationId,
      actor: data.actor || 'system',
      inputs: this.sanitizeData(data.inputs || {}),
      outputs: data.outputs ? this.sanitizeData(data.outputs) : undefined,
      decision: data.decision,
      apiResponse: data.apiResponse,
      metadata: data.metadata,
      previousHash: this.lastHash,
    }

    // Calculate hash for integrity
    entry.hash = this.calculateHash(entry)
    this.lastHash = entry.hash

    // Append to log
    this.entries.push(entry)

    // Trim if over limit
    if (this.entries.length > this.MAX_ENTRIES) {
      this.entries = this.entries.slice(-this.MAX_ENTRIES)
    }

    // Persist
    this.saveState()

    // Notify listeners
    this.notifyListeners(entry)

    // Also log to standard logger
    logger.debug('AUDIT', `${type}: ${action}`, { 
      domain: data.domain, 
      correlationId: data.correlationId 
    })

    return entry
  }

  // ==================== SPECIALIZED LOGGING ====================

  /**
   * Log a scan event
   */
  logScan(
    phase: 'started' | 'completed',
    data: {
      sources: string[]
      domainsFound?: number
      duration?: number
      correlationId?: string
    }
  ): void {
    this.log(
      phase === 'started' ? 'scan_started' : 'scan_completed',
      `Domain scan ${phase}`,
      {
        correlationId: data.correlationId,
        inputs: { sources: data.sources },
        outputs: phase === 'completed' ? {
          domainsFound: data.domainsFound,
          duration: data.duration,
        } : undefined,
      }
    )
  }

  /**
   * Log a valuation with full decision details
   */
  logValuation(
    domain: string,
    inputs: Record<string, any>,
    outputs: {
      value: number
      score: number
      confidence: number
    },
    decision: {
      made: 'acquire' | 'skip' | 'watch'
      reasoning: string
      thresholds: Record<string, number>
    },
    correlationId?: string
  ): void {
    this.log('valuation_completed', `Valuated ${domain}`, {
      domain,
      correlationId,
      inputs,
      outputs,
      decision: {
        made: decision.made,
        reasoning: decision.reasoning,
        thresholds: decision.thresholds,
        scores: {
          value: outputs.value,
          score: outputs.score,
          confidence: outputs.confidence,
        },
      },
    })
  }

  /**
   * Log a buy attempt with full context
   */
  logBuy(
    phase: 'attempted' | 'success' | 'failed',
    domain: string,
    data: {
      price: number
      registrar: string
      reason?: string
      correlationId?: string
      apiResponse?: AuditEntry['apiResponse']
    }
  ): void {
    const type: AuditEventType = phase === 'attempted' ? 'buy_attempted' :
                                  phase === 'success' ? 'buy_success' : 'buy_failed'
    
    this.log(type, `Buy ${phase}: ${domain}`, {
      domain,
      correlationId: data.correlationId,
      inputs: { price: data.price, registrar: data.registrar },
      outputs: phase === 'failed' ? { reason: data.reason } : undefined,
      apiResponse: data.apiResponse,
    })
  }

  /**
   * Log a negotiation event
   */
  logNegotiation(
    phase: 'started' | 'counter' | 'accepted' | 'rejected',
    domain: string,
    data: {
      ourPrice: number
      theirPrice?: number
      round?: number
      decision?: string
      correlationId?: string
    }
  ): void {
    const type: AuditEventType = `negotiation_${phase}` as AuditEventType
    
    this.log(type, `Negotiation ${phase}: ${domain}`, {
      domain,
      correlationId: data.correlationId,
      inputs: { ourPrice: data.ourPrice, theirPrice: data.theirPrice, round: data.round },
      outputs: data.decision ? { decision: data.decision } : undefined,
    })
  }

  /**
   * Log a compliance check
   */
  logCompliance(
    domain: string,
    result: 'pass' | 'block',
    data: {
      checks: Record<string, boolean>
      riskLevel: string
      reasons?: string[]
      correlationId?: string
    }
  ): void {
    this.log(
      result === 'pass' ? 'compliance_check' : 'compliance_blocked',
      `Compliance ${result}: ${domain}`,
      {
        domain,
        correlationId: data.correlationId,
        inputs: data.checks,
        outputs: { riskLevel: data.riskLevel, reasons: data.reasons },
      }
    )
  }

  /**
   * Log API call with response details
   */
  logApiCall(
    endpoint: string,
    data: {
      method: string
      statusCode: number
      responseTime: number
      domain?: string
      correlationId?: string
      requestBody?: any
      responseBody?: any
      error?: string
    }
  ): void {
    const isError = data.statusCode >= 400
    
    this.log(
      isError ? 'api_error' : 'api_call',
      `API ${data.method} ${endpoint}`,
      {
        domain: data.domain,
        correlationId: data.correlationId,
        inputs: { method: data.method, body: data.requestBody },
        apiResponse: {
          endpoint,
          statusCode: data.statusCode,
          responseTime: data.responseTime,
          body: isError ? data.error : data.responseBody,
        },
      }
    )
  }

  // ==================== QUERYING ====================

  /**
   * Query audit entries
   */
  query(query: AuditQuery = {}): AuditEntry[] {
    let results = [...this.entries]

    if (query.type) {
      const types = Array.isArray(query.type) ? query.type : [query.type]
      results = results.filter(e => types.includes(e.type))
    }

    if (query.domain) {
      results = results.filter(e => e.domain === query.domain)
    }

    if (query.correlationId) {
      results = results.filter(e => e.correlationId === query.correlationId)
    }

    if (query.actor) {
      results = results.filter(e => e.actor === query.actor)
    }

    if (query.startDate) {
      results = results.filter(e => e.timestamp >= query.startDate!)
    }

    if (query.endDate) {
      results = results.filter(e => e.timestamp <= query.endDate!)
    }

    // Sort by timestamp descending (newest first)
    results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

    // Apply pagination
    if (query.offset) {
      results = results.slice(query.offset)
    }
    if (query.limit) {
      results = results.slice(0, query.limit)
    }

    return results
  }

  /**
   * Get domain history
   */
  getDomainHistory(domain: string): AuditEntry[] {
    return this.query({ domain })
  }

  /**
   * Get correlated events
   */
  getCorrelatedEvents(correlationId: string): AuditEntry[] {
    return this.query({ correlationId })
  }

  /**
   * Get recent errors
   */
  getRecentErrors(limit: number = 50): AuditEntry[] {
    return this.query({
      type: ['api_error', 'buy_failed', 'list_failed', 'transfer_failed', 'compliance_blocked'],
      limit,
    })
  }

  // ==================== STATISTICS ====================

  /**
   * Get audit statistics
   */
  getStats(since?: Date): AuditStats {
    let entries = this.entries
    if (since) {
      entries = entries.filter(e => e.timestamp >= since)
    }

    const byType: Record<string, number> = {}
    const byActor: Record<string, number> = {}
    let successCount = 0
    let failCount = 0

    for (const entry of entries) {
      byType[entry.type] = (byType[entry.type] || 0) + 1
      byActor[entry.actor] = (byActor[entry.actor] || 0) + 1

      if (entry.type.includes('success') || entry.type.includes('completed')) {
        successCount++
      } else if (entry.type.includes('failed') || entry.type.includes('blocked')) {
        failCount++
      }
    }

    return {
      totalEntries: entries.length,
      byType: byType as Record<AuditEventType, number>,
      byActor,
      successRate: successCount + failCount > 0 ? successCount / (successCount + failCount) : 1,
      avgDecisionTime: 0, // Would calculate from actual timing data
    }
  }

  // ==================== INTEGRITY ====================

  /**
   * Verify log integrity
   */
  verifyIntegrity(): { valid: boolean; brokenAt?: number } {
    let previousHash = '0'

    for (let i = 0; i < this.entries.length; i++) {
      const entry = this.entries[i]

      // Check chain
      if (entry.previousHash !== previousHash) {
        return { valid: false, brokenAt: i }
      }

      // Verify hash
      const calculatedHash = this.calculateHash(entry)
      if (entry.hash !== calculatedHash) {
        return { valid: false, brokenAt: i }
      }

      previousHash = entry.hash!
    }

    return { valid: true }
  }

  // ==================== EXPORT ====================

  /**
   * Export audit log as JSON
   */
  exportJSON(query?: AuditQuery): string {
    const entries = query ? this.query(query) : this.entries
    return JSON.stringify(entries, null, 2)
  }

  /**
   * Export audit log as CSV
   */
  exportCSV(query?: AuditQuery): string {
    const entries = query ? this.query(query) : this.entries
    const headers = ['id', 'timestamp', 'type', 'domain', 'actor', 'action', 'correlationId']
    
    const rows = entries.map(e => [
      e.id,
      e.timestamp.toISOString(),
      e.type,
      e.domain || '',
      e.actor,
      e.action,
      e.correlationId || '',
    ])

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
  }

  // ==================== SUBSCRIPTIONS ====================

  subscribe(listener: (entry: AuditEntry) => void): () => void {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  private notifyListeners(entry: AuditEntry): void {
    this.listeners.forEach(l => l(entry))
  }

  // ==================== HELPERS ====================

  private generateId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private calculateHash(entry: AuditEntry): string {
    // Simple hash for integrity (in production, use crypto)
    const content = JSON.stringify({
      id: entry.id,
      timestamp: entry.timestamp.toISOString(),
      type: entry.type,
      action: entry.action,
      previousHash: entry.previousHash,
    })
    
    let hash = 0
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return Math.abs(hash).toString(36)
  }

  private sanitizeData(data: Record<string, any>): Record<string, any> {
    // Remove sensitive fields
    const sanitized = { ...data }
    const sensitiveKeys = ['password', 'apiKey', 'apiSecret', 'token', 'secret', 'key']
    
    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
        sanitized[key] = '[REDACTED]'
      }
    }

    return sanitized
  }

  // ==================== PERSISTENCE ====================

  private saveState(): void {
    try {
      // Only save last 1000 entries to localStorage
      const toSave = this.entries.slice(-1000).map(e => ({
        ...e,
        timestamp: e.timestamp.toISOString(),
      }))
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify({
        entries: toSave,
        lastHash: this.lastHash,
      }))
    } catch (e) {
      // Ignore
    }
  }

  private loadState(): void {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY)
      if (saved) {
        const state = JSON.parse(saved)
        this.entries = (state.entries || []).map((e: any) => ({
          ...e,
          timestamp: new Date(e.timestamp),
        }))
        this.lastHash = state.lastHash || '0'
      }
    } catch (e) {
      // Ignore
    }
  }

  /**
   * Clear audit log (admin only)
   */
  clear(): void {
    this.entries = []
    this.lastHash = '0'
    this.saveState()
    logger.warn('AUDIT', 'Audit log cleared')
  }
}

// ==================== SINGLETON ====================

export const auditLog = new AuditLogService()
