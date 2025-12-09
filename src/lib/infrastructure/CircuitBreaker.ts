/**
 * CircuitBreaker.ts — FAULT TOLERANCE SYSTEM
 * Circuit breaker pattern for external API calls
 * December 2025 — Graceful degradation
 */

import { logger } from '@/lib/utils/logger'
import { toast } from 'sonner'

// ==================== TYPES ====================

export type CircuitState = 'closed' | 'open' | 'half-open'

export interface CircuitConfig {
  failureThreshold: number    // Number of failures before opening
  successThreshold: number    // Successes needed to close from half-open
  timeout: number             // Time in ms before trying again (half-open)
  resetTimeout: number        // Time to auto-reset if no activity
}

export interface CircuitStats {
  state: CircuitState
  failures: number
  successes: number
  lastFailure?: Date
  lastSuccess?: Date
  openedAt?: Date
  totalCalls: number
  failedCalls: number
  successRate: number
}

interface CircuitData {
  state: CircuitState
  failures: number
  successes: number
  lastFailure?: Date
  lastSuccess?: Date
  openedAt?: Date
  config: CircuitConfig
  totalCalls: number
  failedCalls: number
}

// ==================== DEFAULT CONFIGS ====================

const DEFAULT_CONFIG: CircuitConfig = {
  failureThreshold: 5,
  successThreshold: 3,
  timeout: 30000,        // 30 seconds
  resetTimeout: 300000,  // 5 minutes
}

const API_CONFIGS: Record<string, Partial<CircuitConfig>> = {
  godaddy: { failureThreshold: 3, timeout: 60000 },
  namecheap: { failureThreshold: 5, timeout: 45000 },
  dropcatch: { failureThreshold: 5, timeout: 60000 },
  sedo: { failureThreshold: 5, timeout: 45000 },
  afternic: { failureThreshold: 5, timeout: 45000 },
  flippa: { failureThreshold: 5, timeout: 45000 },
  dan: { failureThreshold: 5, timeout: 45000 },
  uspto: { failureThreshold: 10, timeout: 120000 },
  twitter: { failureThreshold: 5, timeout: 60000 },
  google: { failureThreshold: 5, timeout: 30000 },
}

// ==================== CIRCUIT BREAKER SERVICE ====================

class CircuitBreakerService {
  private circuits: Map<string, CircuitData> = new Map()
  private listeners: Array<(circuits: Map<string, CircuitStats>) => void> = []
  private checkInterval: ReturnType<typeof setInterval> | null = null

  constructor() {
    this.loadState()
    
    // Start periodic check for half-open transitions
    this.checkInterval = setInterval(() => this.checkTimeouts(), 5000)
  }

  // ==================== CIRCUIT OPERATIONS ====================

  /**
   * Execute a function through the circuit breaker
   */
  async execute<T>(
    name: string,
    fn: () => Promise<T>,
    fallback?: () => T | Promise<T>
  ): Promise<T> {
    const circuit = this.getOrCreateCircuit(name)
    circuit.totalCalls++

    // Check if circuit is open
    if (circuit.state === 'open') {
      // Check if timeout has passed
      if (circuit.openedAt && Date.now() - circuit.openedAt.getTime() > circuit.config.timeout) {
        // Transition to half-open
        circuit.state = 'half-open'
        logger.info('CIRCUIT', `${name} transitioning to half-open`)
      } else {
        // Circuit is open, use fallback or throw
        circuit.failedCalls++
        if (fallback) {
          logger.debug('CIRCUIT', `${name} open, using fallback`)
          return fallback()
        }
        throw new Error(`Circuit breaker open for ${name}`)
      }
    }

    try {
      const result = await fn()
      this.recordSuccess(name)
      return result
    } catch (error) {
      this.recordFailure(name, error as Error)
      
      // Use fallback if available
      if (fallback) {
        return fallback()
      }
      throw error
    }
  }

  /**
   * Record a successful call
   */
  recordSuccess(name: string): void {
    const circuit = this.getOrCreateCircuit(name)
    circuit.lastSuccess = new Date()
    circuit.successes++
    circuit.failures = 0 // Reset failures on success

    if (circuit.state === 'half-open') {
      if (circuit.successes >= circuit.config.successThreshold) {
        // Close the circuit
        circuit.state = 'closed'
        circuit.successes = 0
        logger.info('CIRCUIT', `${name} closed after recovery`, {
          successThreshold: circuit.config.successThreshold,
        })
        toast.success(`✅ ${name} recovered`)
      }
    }

    this.saveState()
  }

  /**
   * Record a failed call
   */
  recordFailure(name: string, error?: Error): void {
    const circuit = this.getOrCreateCircuit(name)
    circuit.lastFailure = new Date()
    circuit.failures++
    circuit.failedCalls++
    circuit.successes = 0 // Reset successes on failure

    if (circuit.state === 'closed') {
      if (circuit.failures >= circuit.config.failureThreshold) {
        // Open the circuit
        this.openCircuit(name, error)
      }
    } else if (circuit.state === 'half-open') {
      // Any failure in half-open returns to open
      this.openCircuit(name, error)
    }

    this.saveState()
  }

  /**
   * Open a circuit
   */
  private openCircuit(name: string, error?: Error): void {
    const circuit = this.getOrCreateCircuit(name)
    circuit.state = 'open'
    circuit.openedAt = new Date()

    logger.warn('CIRCUIT', `${name} OPENED`, {
      failures: circuit.failures,
      threshold: circuit.config.failureThreshold,
      error: error?.message,
    })

    toast.warning(`⚠️ ${name} temporarily unavailable`, {
      description: `Will retry in ${circuit.config.timeout / 1000}s`,
    })

    this.notifyListeners()
  }

  /**
   * Manually reset a circuit
   */
  reset(name: string): void {
    const circuit = this.circuits.get(name)
    if (circuit) {
      circuit.state = 'closed'
      circuit.failures = 0
      circuit.successes = 0
      circuit.openedAt = undefined
      this.saveState()
      this.notifyListeners()
      logger.info('CIRCUIT', `${name} manually reset`)
    }
  }

  /**
   * Manually open a circuit (e.g., for maintenance)
   */
  trip(name: string, reason?: string): void {
    const circuit = this.getOrCreateCircuit(name)
    circuit.state = 'open'
    circuit.openedAt = new Date()
    this.saveState()
    this.notifyListeners()
    logger.warn('CIRCUIT', `${name} manually tripped`, { reason })
  }

  // ==================== STATUS CHECKS ====================

  /**
   * Check if a circuit allows calls
   */
  isAvailable(name: string): boolean {
    const circuit = this.circuits.get(name)
    if (!circuit) return true
    
    if (circuit.state === 'open') {
      // Check for timeout
      if (circuit.openedAt && Date.now() - circuit.openedAt.getTime() > circuit.config.timeout) {
        return true // Will transition to half-open
      }
      return false
    }
    
    return true
  }

  /**
   * Get circuit state
   */
  getState(name: string): CircuitState {
    return this.circuits.get(name)?.state || 'closed'
  }

  /**
   * Get circuit stats
   */
  getStats(name: string): CircuitStats | undefined {
    const circuit = this.circuits.get(name)
    if (!circuit) return undefined

    return {
      state: circuit.state,
      failures: circuit.failures,
      successes: circuit.successes,
      lastFailure: circuit.lastFailure,
      lastSuccess: circuit.lastSuccess,
      openedAt: circuit.openedAt,
      totalCalls: circuit.totalCalls,
      failedCalls: circuit.failedCalls,
      successRate: circuit.totalCalls > 0 
        ? (circuit.totalCalls - circuit.failedCalls) / circuit.totalCalls 
        : 1,
    }
  }

  /**
   * Get all circuit stats
   */
  getAllStats(): Map<string, CircuitStats> {
    const stats = new Map<string, CircuitStats>()
    for (const [name, circuit] of this.circuits) {
      stats.set(name, {
        state: circuit.state,
        failures: circuit.failures,
        successes: circuit.successes,
        lastFailure: circuit.lastFailure,
        lastSuccess: circuit.lastSuccess,
        openedAt: circuit.openedAt,
        totalCalls: circuit.totalCalls,
        failedCalls: circuit.failedCalls,
        successRate: circuit.totalCalls > 0 
          ? (circuit.totalCalls - circuit.failedCalls) / circuit.totalCalls 
          : 1,
      })
    }
    return stats
  }

  /**
   * Get open circuits
   */
  getOpenCircuits(): string[] {
    return Array.from(this.circuits.entries())
      .filter(([, c]) => c.state === 'open')
      .map(([name]) => name)
  }

  // ==================== HELPERS ====================

  private getOrCreateCircuit(name: string): CircuitData {
    let circuit = this.circuits.get(name)
    
    if (!circuit) {
      const customConfig = API_CONFIGS[name.toLowerCase()] || {}
      circuit = {
        state: 'closed',
        failures: 0,
        successes: 0,
        config: { ...DEFAULT_CONFIG, ...customConfig },
        totalCalls: 0,
        failedCalls: 0,
      }
      this.circuits.set(name, circuit)
    }
    
    return circuit
  }

  private checkTimeouts(): void {
    let changed = false
    
    for (const [name, circuit] of this.circuits) {
      // Check for half-open transition
      if (circuit.state === 'open' && circuit.openedAt) {
        if (Date.now() - circuit.openedAt.getTime() > circuit.config.timeout) {
          circuit.state = 'half-open'
          logger.info('CIRCUIT', `${name} auto-transitioning to half-open`)
          changed = true
        }
      }

      // Check for auto-reset
      if (circuit.state !== 'closed' && circuit.lastFailure) {
        if (Date.now() - circuit.lastFailure.getTime() > circuit.config.resetTimeout) {
          circuit.state = 'closed'
          circuit.failures = 0
          circuit.successes = 0
          logger.info('CIRCUIT', `${name} auto-reset after inactivity`)
          changed = true
        }
      }
    }

    if (changed) {
      this.saveState()
      this.notifyListeners()
    }
  }

  // ==================== CONFIG ====================

  /**
   * Set config for a specific circuit
   */
  setConfig(name: string, config: Partial<CircuitConfig>): void {
    const circuit = this.getOrCreateCircuit(name)
    circuit.config = { ...circuit.config, ...config }
    this.saveState()
  }

  /**
   * Get config for a circuit
   */
  getConfig(name: string): CircuitConfig {
    return this.getOrCreateCircuit(name).config
  }

  // ==================== SUBSCRIPTIONS ====================

  subscribe(listener: (circuits: Map<string, CircuitStats>) => void): () => void {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(l => l(this.getAllStats()))
  }

  // ==================== PERSISTENCE ====================

  private saveState(): void {
    try {
      const state = Object.fromEntries(
        Array.from(this.circuits.entries()).map(([name, c]) => [
          name,
          {
            ...c,
            lastFailure: c.lastFailure?.toISOString(),
            lastSuccess: c.lastSuccess?.toISOString(),
            openedAt: c.openedAt?.toISOString(),
          }
        ])
      )
      localStorage.setItem('domainFlipper_circuits', JSON.stringify(state))
    } catch (e) {
      // Ignore
    }
  }

  private loadState(): void {
    try {
      const saved = localStorage.getItem('domainFlipper_circuits')
      if (saved) {
        const state = JSON.parse(saved)
        for (const [name, c] of Object.entries(state) as [string, any][]) {
          this.circuits.set(name, {
            ...c,
            lastFailure: c.lastFailure ? new Date(c.lastFailure) : undefined,
            lastSuccess: c.lastSuccess ? new Date(c.lastSuccess) : undefined,
            openedAt: c.openedAt ? new Date(c.openedAt) : undefined,
          })
        }
      }
    } catch (e) {
      // Ignore
    }
  }

  /**
   * Clean up
   */
  destroy(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
    }
  }
}

// ==================== SINGLETON ====================

export const circuitBreaker = new CircuitBreakerService()

// ==================== DECORATOR HELPER ====================

/**
 * Wrap a function with circuit breaker protection
 */
export function withCircuitBreaker<T extends (...args: any[]) => Promise<any>>(
  name: string,
  fn: T,
  fallback?: (...args: Parameters<T>) => ReturnType<T>
): T {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    return circuitBreaker.execute(
      name,
      () => fn(...args),
      fallback ? () => fallback(...args) : undefined
    )
  }) as T
}
