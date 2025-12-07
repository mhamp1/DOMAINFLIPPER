/**
 * Registrar Optimizer — Regional endpoints and pre-auth for faster sniping
 * December 2025
 * 
 * Features:
 * - Support regional registrar endpoints for lower latency
 * - Pre-authentication for faster availability checks
 * - Maintains all safety guardrails (DRY_RUN, caps, margins, circuit breakers)
 */

export interface RegistrarEndpoint {
  registrar: 'GoDaddy' | 'Namecheap' | 'DropCatch'
  region: 'us-east' | 'us-west' | 'eu-west' | 'ap-southeast'
  endpoint: string
  latencyMs?: number              // Average latency
  available: boolean              // Whether endpoint is reachable
  lastChecked?: Date
}

export interface RegistrarConfig {
  registrar: 'GoDaddy' | 'Namecheap' | 'DropCatch'
  preferredRegion?: string        // Preferred region for lower latency
  preAuthEnabled: boolean         // Pre-authenticate for faster checks
  preAuthToken?: string           // Cached auth token
  preAuthExpiry?: Date            // When token expires
  maxRetries: number              // Max retries on failure
  timeoutMs: number               // Request timeout
}

export interface SafetyConfig {
  dryRun: boolean                 // DRY_RUN mode (DEFAULT: TRUE)
  dailyCapUSD: number             // Daily spending cap
  perDomainCapUSD: number         // Per-domain spending cap
  minMargin: number               // Minimum profit margin (e.g., 3.0x)
  allowedTLDs: string[]           // Allowed TLDs
  circuitBreakerThreshold: number // Failures before circuit breaker
  requireConfirmation: boolean    // Require user confirmation
}

export const DEFAULT_SAFETY_CONFIG: SafetyConfig = {
  dryRun: true,                   // DEFAULT: DRY RUN MODE
  dailyCapUSD: 200,
  perDomainCapUSD: 20,
  minMargin: 3.0,
  allowedTLDs: ['.com', '.ai', '.io'],
  circuitBreakerThreshold: 5,
  requireConfirmation: true,      // DEFAULT: REQUIRE CONFIRMATION
}

// Regional endpoints
// TODO: Configure actual regional endpoints before production deployment
// These are example configurations - replace with real registrar endpoints
const REGIONAL_ENDPOINTS: RegistrarEndpoint[] = [
  {
    registrar: 'GoDaddy',
    region: 'us-east',
    endpoint: 'https://api.godaddy.com',
    available: true,
  },
  {
    registrar: 'GoDaddy',
    region: 'us-west',
    endpoint: 'https://api-west.godaddy.com',
    available: true,
  },
  {
    registrar: 'Namecheap',
    region: 'us-east',
    endpoint: 'https://api.namecheap.com',
    available: true,
  },
]

export class RegistrarOptimizer {
  private registrarConfigs: Map<string, RegistrarConfig> = new Map()
  private safetyConfig: SafetyConfig
  private endpoints: Map<string, RegistrarEndpoint[]> = new Map()
  private circuitBreakerCount: Map<string, number> = new Map()
  private dailySpend: number = 0
  private lastResetDate: Date = new Date()

  constructor(safetyConfig: SafetyConfig = DEFAULT_SAFETY_CONFIG) {
    this.safetyConfig = safetyConfig
    this.initializeEndpoints()
  }

  /**
   * Initialize regional endpoints
   */
  private initializeEndpoints(): void {
    for (const endpoint of REGIONAL_ENDPOINTS) {
      if (!this.endpoints.has(endpoint.registrar)) {
        this.endpoints.set(endpoint.registrar, [])
      }
      this.endpoints.get(endpoint.registrar)!.push(endpoint)
    }
  }

  /**
   * Get optimal endpoint for a registrar
   * Selects based on region preference and measured latency
   */
  async getOptimalEndpoint(registrar: 'GoDaddy' | 'Namecheap' | 'DropCatch'): Promise<RegistrarEndpoint | null> {
    const endpoints = this.endpoints.get(registrar) || []
    if (endpoints.length === 0) {
      return null
    }

    const config = this.registrarConfigs.get(registrar)
    
    // Filter by preferred region if specified
    let candidates = endpoints.filter(e => e.available)
    if (config?.preferredRegion) {
      const regionalMatch = candidates.filter(e => e.region === config.preferredRegion)
      if (regionalMatch.length > 0) {
        candidates = regionalMatch
      }
    }

    // Sort by latency (if measured)
    candidates.sort((a, b) => {
      const latencyA = a.latencyMs ?? 999999
      const latencyB = b.latencyMs ?? 999999
      return latencyA - latencyB
    })

    return candidates[0] || null
  }

  /**
   * Pre-authenticate with registrar
   * Caches auth token for faster subsequent requests
   */
  async preAuthenticate(registrar: 'GoDaddy' | 'Namecheap' | 'DropCatch'): Promise<boolean> {
    const config = this.registrarConfigs.get(registrar)
    if (!config) {
      console.warn(`No config for registrar ${registrar}`)
      return false
    }

    if (!config.preAuthEnabled) {
      return false
    }

    // Check if existing token is still valid
    if (config.preAuthToken && config.preAuthExpiry) {
      if (config.preAuthExpiry > new Date()) {
        return true // Token still valid
      }
    }

    try {
      // In production, this would make actual auth API call
      // For now, simulate successful auth
      config.preAuthToken = 'cached-token-' + Date.now()
      config.preAuthExpiry = new Date(Date.now() + 3600000) // 1 hour
      
      console.log(`✅ Pre-authenticated with ${registrar}`)
      return true
    } catch (error) {
      console.error(`Failed to pre-authenticate with ${registrar}:`, error)
      return false
    }
  }

  /**
   * Check if a purchase is allowed by safety guardrails
   */
  canPurchase(domain: string, price: number, estimatedValue: number): {
    allowed: boolean
    reason?: string
  } {
    // Reset daily spend if new day
    const today = new Date().toDateString()
    if (this.lastResetDate.toDateString() !== today) {
      this.dailySpend = 0
      this.lastResetDate = new Date()
    }

    // Check DRY_RUN mode
    if (this.safetyConfig.dryRun) {
      return {
        allowed: false,
        reason: 'DRY_RUN mode enabled - no actual purchases',
      }
    }

    // Check daily cap
    if (this.dailySpend + price > this.safetyConfig.dailyCapUSD) {
      return {
        allowed: false,
        reason: `Daily cap of $${this.safetyConfig.dailyCapUSD} would be exceeded`,
      }
    }

    // Check per-domain cap
    if (price > this.safetyConfig.perDomainCapUSD) {
      return {
        allowed: false,
        reason: `Price $${price} exceeds per-domain cap of $${this.safetyConfig.perDomainCapUSD}`,
      }
    }

    // Check margin
    const margin = estimatedValue / price
    if (margin < this.safetyConfig.minMargin) {
      return {
        allowed: false,
        reason: `Margin ${margin.toFixed(1)}x below minimum ${this.safetyConfig.minMargin}x`,
      }
    }

    // Check TLD allowlist
    const tld = this.extractTLD(domain)
    if (!this.safetyConfig.allowedTLDs.includes(tld)) {
      return {
        allowed: false,
        reason: `TLD ${tld} not in allowlist`,
      }
    }

    // Check circuit breaker
    const failures = this.circuitBreakerCount.get(domain) || 0
    if (failures >= this.safetyConfig.circuitBreakerThreshold) {
      return {
        allowed: false,
        reason: `Circuit breaker tripped after ${failures} failures`,
      }
    }

    return { allowed: true }
  }

  /**
   * Record a purchase (for tracking daily spend)
   */
  recordPurchase(price: number): void {
    this.dailySpend += price
  }

  /**
   * Record a failure (for circuit breaker)
   */
  recordFailure(domain: string): void {
    const current = this.circuitBreakerCount.get(domain) || 0
    this.circuitBreakerCount.set(domain, current + 1)
  }

  /**
   * Reset circuit breaker for a domain
   */
  resetCircuitBreaker(domain: string): void {
    this.circuitBreakerCount.delete(domain)
  }

  /**
   * Measure endpoint latency
   */
  async measureLatency(endpoint: RegistrarEndpoint): Promise<number> {
    const start = Date.now()
    
    try {
      // In production, make actual API call
      // For now, simulate with random latency
      await new Promise(resolve => setTimeout(resolve, Math.random() * 100))
      
      const latency = Date.now() - start
      endpoint.latencyMs = latency
      endpoint.lastChecked = new Date()
      
      return latency
    } catch (error) {
      endpoint.available = false
      return 999999
    }
  }

  /**
   * Extract TLD from domain
   */
  private extractTLD(domain: string): string {
    const parts = domain.split('.')
    return parts.length > 1 ? '.' + parts[parts.length - 1] : ''
  }

  /**
   * Configure a registrar
   */
  configureRegistrar(registrar: 'GoDaddy' | 'Namecheap' | 'DropCatch', config: Partial<RegistrarConfig>): void {
    const existing = this.registrarConfigs.get(registrar) || {
      registrar,
      preAuthEnabled: false,
      maxRetries: 3,
      timeoutMs: 5000,
    }
    
    this.registrarConfigs.set(registrar, { ...existing, ...config })
  }

  /**
   * Get registrar configuration
   */
  getRegistrarConfig(registrar: string): RegistrarConfig | null {
    return this.registrarConfigs.get(registrar) || null
  }

  /**
   * Update safety configuration
   */
  updateSafetyConfig(config: Partial<SafetyConfig>): void {
    this.safetyConfig = { ...this.safetyConfig, ...config }
  }

  /**
   * Get safety configuration
   */
  getSafetyConfig(): SafetyConfig {
    return { ...this.safetyConfig }
  }

  /**
   * Get daily spend
   */
  getDailySpend(): number {
    // Reset if new day
    const today = new Date().toDateString()
    if (this.lastResetDate.toDateString() !== today) {
      this.dailySpend = 0
      this.lastResetDate = new Date()
    }
    return this.dailySpend
  }

  /**
   * Get remaining daily budget
   */
  getRemainingBudget(): number {
    return Math.max(0, this.safetyConfig.dailyCapUSD - this.getDailySpend())
  }

  /**
   * Check if DRY_RUN mode is enabled
   */
  isDryRun(): boolean {
    return this.safetyConfig.dryRun
  }
}

// Singleton instance (with safe defaults)
export const registrarOptimizer = new RegistrarOptimizer()
