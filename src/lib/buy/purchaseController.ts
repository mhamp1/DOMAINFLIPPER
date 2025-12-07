/**
 * Purchase Controller
 * Manages domain purchases with guardrails and safety checks
 * December 2025
 */

import { logger } from '@/lib/utils/logger'
import { alertSystem } from '@/lib/utils/alerts'
import type {
  RegistrarProvider,
  PurchaseOptions,
  PurchaseResult,
} from './providers/registrarProvider'
import type { RuntimeConfig } from '@/lib/config/runtimeConfig'
import type { Domain } from '@/types/domain'

export interface PurchaseGuardrails {
  dryRun: boolean
  maxSpendPerDay: number
  maxSpendPerDomain: number
  marginThreshold: number // Minimum ROI percentage
  allowedTlds: string[]
}

export interface SpendTracker {
  todaySpend: number
  lastResetDate: string
  purchases: Array<{
    domain: string
    amount: number
    timestamp: Date
  }>
}

export interface PurchaseDecision {
  approved: boolean
  domain: string
  estimatedCost: number
  estimatedValue: number
  marginPercentage: number
  reasons: string[]
}

/**
 * Purchase Controller
 * Enforces spending limits and safety guardrails
 */
export class PurchaseController {
  private providers: Map<string, RegistrarProvider> = new Map()
  private defaultProvider: string = 'stub'
  private guardrails: PurchaseGuardrails
  private spendTracker: SpendTracker

  constructor(guardrails: PurchaseGuardrails) {
    this.guardrails = guardrails
    this.spendTracker = this.loadSpendTracker()
    
    // Reset daily spend if it's a new day
    this.checkAndResetDailySpend()

    logger.info('PURCHASE', 'Purchase controller initialized', {
      dryRun: guardrails.dryRun,
      maxSpendPerDay: guardrails.maxSpendPerDay,
      maxSpendPerDomain: guardrails.maxSpendPerDomain,
    })
  }

  /**
   * Register a registrar provider
   */
  registerProvider(provider: RegistrarProvider): void {
    this.providers.set(provider.name, provider)
    logger.info('PURCHASE', `Registered registrar provider: ${provider.name}`)
  }

  /**
   * Set default provider
   */
  setDefaultProvider(name: string): void {
    if (!this.providers.has(name)) {
      throw new Error(`Provider ${name} not registered`)
    }
    this.defaultProvider = name
    logger.info('PURCHASE', `Default registrar set to: ${name}`)
  }

  /**
   * Evaluate if a purchase should be approved
   */
  async evaluatePurchase(opportunity: Domain, price: number): Promise<PurchaseDecision> {
    const reasons: string[] = []
    let approved = true

    // Check TLD allowlist
    const tld = opportunity.tld || opportunity.name.split('.').pop() || ''
    if (!this.guardrails.allowedTlds.includes(tld.toLowerCase())) {
      approved = false
      reasons.push(`TLD .${tld} not in allowlist`)
    }

    // Check per-domain spending limit
    if (price > this.guardrails.maxSpendPerDomain) {
      approved = false
      reasons.push(
        `Price $${price} exceeds per-domain limit of $${this.guardrails.maxSpendPerDomain}`
      )
    }

    // Check daily spending limit
    if (this.spendTracker.todaySpend + price > this.guardrails.maxSpendPerDay) {
      approved = false
      reasons.push(
        `Would exceed daily limit: $${this.spendTracker.todaySpend + price} > $${this.guardrails.maxSpendPerDay}`
      )
      await alertSystem.spendingLimitReached('Daily', this.spendTracker.todaySpend)
    }

    // Check margin threshold
    const estimatedValue = opportunity.estimatedValue || 0
    const margin = estimatedValue - price
    const marginPercentage = estimatedValue > 0 ? (margin / estimatedValue) * 100 : 0

    if (marginPercentage < this.guardrails.marginThreshold) {
      approved = false
      reasons.push(
        `Margin ${marginPercentage.toFixed(1)}% below threshold of ${this.guardrails.marginThreshold}%`
      )
    }

    // Log evaluation
    if (approved) {
      logger.info('PURCHASE', `✅ Purchase approved: ${opportunity.name}`, {
        domain: opportunity.name,
        price,
        estimatedValue,
        marginPercentage: marginPercentage.toFixed(1),
      })
    } else {
      logger.warn('PURCHASE', `❌ Purchase rejected: ${opportunity.name}`, {
        domain: opportunity.name,
        price,
        reasons,
      })
    }

    return {
      approved,
      domain: opportunity.name,
      estimatedCost: price,
      estimatedValue,
      marginPercentage,
      reasons: approved ? ['All guardrails passed'] : reasons,
    }
  }

  /**
   * Execute a domain purchase
   */
  async purchaseDomain(
    opportunity: Domain,
    providerName?: string
  ): Promise<PurchaseResult> {
    const provider = this.getProvider(providerName)

    try {
      // Get estimated price
      const price = await provider.getPrice(opportunity.name)

      // Evaluate purchase
      const decision = await this.evaluatePurchase(opportunity, price)

      if (!decision.approved) {
        logger.warn('PURCHASE', `Purchase blocked by guardrails: ${opportunity.name}`, {
          reasons: decision.reasons,
        })

        await alertSystem.purchaseFailed(
          opportunity.name,
          'Blocked by guardrails',
          { reasons: decision.reasons }
        )

        return {
          success: false,
          domain: opportunity.name,
          price,
          registrar: provider.name,
          timestamp: new Date(),
          error: `Guardrails failed: ${decision.reasons.join(', ')}`,
          dryRun: this.guardrails.dryRun,
        }
      }

      // Prepare purchase options
      const options: PurchaseOptions = {
        domain: opportunity.name,
        durationYears: 1,
        autoRenew: false,
        privacy: true,
        dryRun: this.guardrails.dryRun,
      }

      // Validate options
      const validation = provider.validateOptions(options)
      if (!validation.valid) {
        logger.error('PURCHASE', 'Invalid purchase options', undefined, {
          domain: opportunity.name,
          errors: validation.errors,
        })

        return {
          success: false,
          domain: opportunity.name,
          price,
          registrar: provider.name,
          timestamp: new Date(),
          error: `Validation failed: ${validation.errors.join(', ')}`,
          dryRun: this.guardrails.dryRun,
        }
      }

      // Execute purchase
      logger.info('PURCHASE', `Attempting to purchase ${opportunity.name} via ${provider.name}`, {
        domain: opportunity.name,
        price,
        dryRun: this.guardrails.dryRun,
      })

      const result = await provider.purchaseDomain(options)

      // Record spend if successful (even in dry-run for tracking)
      if (result.success) {
        this.recordSpend(opportunity.name, price)

        logger.info('PURCHASE', `✅ Successfully purchased ${opportunity.name}`, {
          domain: opportunity.name,
          price,
          transactionId: result.transactionId,
          dryRun: result.dryRun,
        })

        await alertSystem.purchaseSuccess(opportunity.name, price, provider.name)

        // Create audit event
        await this.createAuditEvent({
          type: 'purchase_success',
          domain: opportunity.name,
          price,
          provider: provider.name,
          transactionId: result.transactionId,
          dryRun: result.dryRun,
          timestamp: result.timestamp,
        })
      } else {
        logger.error('PURCHASE', `❌ Purchase failed: ${opportunity.name}`, undefined, {
          domain: opportunity.name,
          error: result.error,
        })

        await alertSystem.purchaseFailed(opportunity.name, result.error || 'Unknown error')

        // Create audit event
        await this.createAuditEvent({
          type: 'purchase_failure',
          domain: opportunity.name,
          price,
          provider: provider.name,
          error: result.error,
          dryRun: result.dryRun,
          timestamp: result.timestamp,
        })
      }

      return result
    } catch (error) {
      logger.error('PURCHASE', `Exception during purchase: ${opportunity.name}`, error as Error)

      await alertSystem.purchaseFailed(
        opportunity.name,
        'Exception: ' + (error as Error).message
      )

      return {
        success: false,
        domain: opportunity.name,
        price: 0,
        registrar: provider.name,
        timestamp: new Date(),
        error: (error as Error).message,
        dryRun: this.guardrails.dryRun,
      }
    }
  }

  /**
   * Record spend in tracker
   */
  private recordSpend(domain: string, amount: number): void {
    this.spendTracker.todaySpend += amount
    this.spendTracker.purchases.push({
      domain,
      amount,
      timestamp: new Date(),
    })

    // Save to persistent storage
    this.saveSpendTracker()

    logger.info('PURCHASE', 'Spend recorded', {
      domain,
      amount,
      todaySpend: this.spendTracker.todaySpend,
      remainingBudget: this.guardrails.maxSpendPerDay - this.spendTracker.todaySpend,
    })
  }

  /**
   * Check if daily spend should be reset
   */
  private checkAndResetDailySpend(): void {
    const today = new Date().toISOString().split('T')[0]

    if (this.spendTracker.lastResetDate !== today) {
      logger.info('PURCHASE', 'Resetting daily spend', {
        previousDate: this.spendTracker.lastResetDate,
        previousSpend: this.spendTracker.todaySpend,
      })

      this.spendTracker.todaySpend = 0
      this.spendTracker.lastResetDate = today
      this.spendTracker.purchases = []
      this.saveSpendTracker()
    }
  }

  /**
   * Load spend tracker from storage
   */
  private loadSpendTracker(): SpendTracker {
    try {
      const saved = localStorage.getItem('domainFlipper_spendTracker')
      if (saved) {
        const parsed = JSON.parse(saved)
        // Convert timestamp strings back to Date objects
        parsed.purchases = parsed.purchases.map((p: any) => ({
          ...p,
          timestamp: new Date(p.timestamp),
        }))
        return parsed
      }
    } catch (error) {
      logger.warn('PURCHASE', 'Failed to load spend tracker', { error })
    }

    // Return default tracker
    return {
      todaySpend: 0,
      lastResetDate: new Date().toISOString().split('T')[0],
      purchases: [],
    }
  }

  /**
   * Save spend tracker to storage
   */
  private saveSpendTracker(): void {
    try {
      localStorage.setItem('domainFlipper_spendTracker', JSON.stringify(this.spendTracker))
    } catch (error) {
      logger.warn('PURCHASE', 'Failed to save spend tracker', { error })
    }
  }

  /**
   * Create audit event (TODO: persist to database)
   */
  private async createAuditEvent(event: any): Promise<void> {
    // TODO: Store in Supabase database
    logger.debug('AUDIT', 'Purchase event', event)
  }

  /**
   * Get provider by name or default
   */
  private getProvider(name?: string): RegistrarProvider {
    const providerName = name || this.defaultProvider
    const provider = this.providers.get(providerName)

    if (!provider) {
      throw new Error(`Registrar provider ${providerName} not found`)
    }

    if (!provider.isConfigured() && !this.guardrails.dryRun) {
      throw new Error(`Registrar provider ${providerName} is not configured`)
    }

    return provider
  }

  /**
   * Get current spend statistics
   */
  getSpendStats(): {
    todaySpend: number
    remainingBudget: number
    purchaseCount: number
    lastResetDate: string
  } {
    this.checkAndResetDailySpend()

    return {
      todaySpend: this.spendTracker.todaySpend,
      remainingBudget: this.guardrails.maxSpendPerDay - this.spendTracker.todaySpend,
      purchaseCount: this.spendTracker.purchases.length,
      lastResetDate: this.spendTracker.lastResetDate,
    }
  }

  /**
   * Get registered providers
   */
  getProviders(): string[] {
    return Array.from(this.providers.keys())
  }

  /**
   * Update guardrails (useful for runtime configuration changes)
   */
  updateGuardrails(guardrails: Partial<PurchaseGuardrails>): void {
    this.guardrails = { ...this.guardrails, ...guardrails }
    logger.info('PURCHASE', 'Guardrails updated', guardrails)
  }
}

/**
 * Create purchase controller from runtime config
 */
export function createPurchaseController(config: RuntimeConfig): PurchaseController {
  const guardrails: PurchaseGuardrails = {
    dryRun: config.DRY_RUN,
    maxSpendPerDay: config.MAX_SPEND_PER_DAY,
    maxSpendPerDomain: config.MAX_SPEND_PER_DOMAIN,
    marginThreshold: config.MARGIN_THRESHOLD,
    allowedTlds: config.ALLOWED_TLDS,
  }

  return new PurchaseController(guardrails)
}
