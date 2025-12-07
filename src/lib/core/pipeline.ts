/**
 * Domain Flipping Pipeline
 * End-to-end orchestration of domain discovery, purchase, and listing
 * December 2025
 */

import { logger } from '@/lib/utils/logger'
import { alertSystem, healthHeartbeat } from '@/lib/utils/alerts'
import type { RuntimeConfig } from '@/lib/config/runtimeConfig'
import { availabilityService } from '@/lib/availability/availabilityService'
import { valuationService } from '@/lib/valuation/valuationService'
import { pricingPolicy } from '@/lib/pricing/policy'
import { PurchaseController } from '@/lib/buy/purchaseController'
import { listingOrchestrator } from '@/lib/marketplace/listingOrchestrator'
import type { Domain } from '@/types/domain'

export interface PipelineStage {
  name: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
  startTime?: Date
  endTime?: Date
  error?: string
  itemsProcessed?: number
}

export interface PipelineResult {
  success: boolean
  stages: PipelineStage[]
  opportunitiesFound: number
  opportunitiesValued: number
  opportunitiesAvailable: number
  purchaseAttempts: number
  purchasesSucceeded: number
  listingsCreated: number
  errors: string[]
  startTime: Date
  endTime: Date
  durationMs: number
}

export interface PipelineHooks {
  onStageStart?: (stage: string) => void | Promise<void>
  onStageComplete?: (stage: string, success: boolean) => void | Promise<void>
  onPurchaseAttempt?: (domain: Domain) => void | Promise<void>
  onPurchaseSuccess?: (domain: Domain, price: number) => void | Promise<void>
  onListingCreated?: (domain: Domain, marketplace: string) => void | Promise<void>
}

/**
 * Domain Flipping Pipeline
 * Orchestrates the complete workflow from intelligence to listing
 */
export class DomainFlippingPipeline {
  private config: RuntimeConfig
  private purchaseController: PurchaseController
  private hooks: PipelineHooks
  private stages: PipelineStage[] = []

  constructor(config: RuntimeConfig, purchaseController: PurchaseController, hooks?: PipelineHooks) {
    this.config = config
    this.purchaseController = purchaseController
    this.hooks = hooks || {}

    logger.info('PIPELINE', 'Pipeline initialized', {
      dryRun: config.DRY_RUN,
      simulation: config.SIMULATION,
    })
  }

  /**
   * Run the complete pipeline
   */
  async run(intelligenceSource: () => Promise<Domain[]>): Promise<PipelineResult> {
    const startTime = new Date()
    
    logger.info('PIPELINE', '🚀 Starting domain flipping pipeline', {
      dryRun: this.config.DRY_RUN,
      simulation: this.config.SIMULATION,
    })

    this.stages = []
    const errors: string[] = []
    let opportunities: Domain[] = []
    let valuedOpportunities: Domain[] = []
    let availableOpportunities: Domain[] = []
    let purchaseResults: Array<{ domain: Domain; success: boolean; price: number }> = []
    let listingResults: any[] = []

    // Configure alert system
    alertSystem.configure({
      webhookUrl: this.config.ALERT_WEBHOOK,
      enabled: !!this.config.ALERT_WEBHOOK,
      minSeverity: 'warning',
    })

    // Start health heartbeat
    if (this.config.HEALTH_CHECK_INTERVAL) {
      healthHeartbeat.configure({
        interval: this.config.HEALTH_CHECK_INTERVAL,
        webhookUrl: this.config.ALERT_WEBHOOK,
        enabled: !!this.config.ALERT_WEBHOOK,
      })
      healthHeartbeat.start()
    }

    try {
      // Stage 1: Intelligence - Gather opportunities
      opportunities = await this.runStage('Intelligence', async () => {
        const opps = await intelligenceSource()
        logger.info('PIPELINE', `Found ${opps.length} opportunities`)
        return opps
      })

      if (opportunities.length === 0) {
        logger.warn('PIPELINE', 'No opportunities found, pipeline short-circuited')
        return this.buildResult(startTime, opportunities, valuedOpportunities, availableOpportunities, purchaseResults, listingResults, errors)
      }

      // Stage 2: Valuation - Estimate values
      valuedOpportunities = await this.runStage('Valuation', async () => {
        const valued = await valuationService.enrichOpportunities(opportunities)
        logger.info('PIPELINE', `Valued ${valued.length} opportunities`)
        return valued
      })

      // Stage 3: Pricing - Calculate list and floor prices
      const pricedOpportunities = await this.runStage('Pricing', async () => {
        const priced = pricingPolicy.enrichOpportunitiesWithPricing(valuedOpportunities, 'balanced')
        logger.info('PIPELINE', `Calculated pricing for ${priced.length} opportunities`)
        return priced
      })

      // Stage 4: Risk Filters - Apply margin threshold and TLD filters
      const filteredOpportunities = await this.runStage('Risk Filters', async () => {
        const filtered = pricedOpportunities.filter(opp => {
          // Check TLD
          const tld = opp.tld || opp.name.split('.').pop() || ''
          if (!this.config.ALLOWED_TLDS.includes(tld.toLowerCase())) {
            return false
          }

          // Check margin threshold
          const margin = opp.estimatedValue > 0 
            ? ((opp.estimatedValue - (opp.purchasePrice || 0)) / opp.estimatedValue) * 100
            : 0
          
          return margin >= this.config.MARGIN_THRESHOLD
        })
        
        logger.info('PIPELINE', `${filtered.length}/${pricedOpportunities.length} passed risk filters`)
        return filtered
      })

      if (filteredOpportunities.length === 0) {
        logger.warn('PIPELINE', 'No opportunities passed risk filters, pipeline short-circuited')
        return this.buildResult(startTime, opportunities, valuedOpportunities, availableOpportunities, purchaseResults, listingResults, errors)
      }

      // Stage 5: Availability - Check domain availability
      availableOpportunities = await this.runStage('Availability', async () => {
        const available = await availabilityService.enrichOpportunities(filteredOpportunities)
        const actuallyAvailable = available.filter(opp => opp.status === 'available')
        logger.info('PIPELINE', `${actuallyAvailable.length}/${available.length} domains are available`)
        return actuallyAvailable
      })

      if (availableOpportunities.length === 0) {
        logger.warn('PIPELINE', 'No available domains, pipeline short-circuited')
        return this.buildResult(startTime, opportunities, valuedOpportunities, availableOpportunities, purchaseResults, listingResults, errors)
      }

      // Stage 6: Purchase - Attempt to purchase domains (with guardrails)
      purchaseResults = await this.runStage('Purchase', async () => {
        const results = []
        
        for (const opp of availableOpportunities) {
          try {
            // Call hook
            if (this.hooks.onPurchaseAttempt) {
              await this.hooks.onPurchaseAttempt(opp)
            }

            const result = await this.purchaseController.purchaseDomain(opp)
            
            results.push({
              domain: opp,
              success: result.success,
              price: result.price,
            })

            if (result.success && this.hooks.onPurchaseSuccess) {
              await this.hooks.onPurchaseSuccess(opp, result.price)
            }

            // Check if we've hit daily spend limit
            const stats = this.purchaseController.getSpendStats()
            if (stats.remainingBudget <= 0) {
              logger.warn('PIPELINE', 'Daily spending limit reached, stopping purchases')
              break
            }
          } catch (error) {
            logger.error('PIPELINE', `Purchase error for ${opp.name}`, error as Error)
            errors.push(`Purchase failed for ${opp.name}: ${(error as Error).message}`)
          }
        }

        const succeeded = results.filter(r => r.success).length
        logger.info('PIPELINE', `Purchase complete: ${succeeded}/${results.length} succeeded`)
        return results
      })

      const successfulPurchases = purchaseResults.filter(r => r.success)

      if (successfulPurchases.length === 0) {
        logger.warn('PIPELINE', 'No successful purchases, skipping listing stage')
        return this.buildResult(startTime, opportunities, valuedOpportunities, availableOpportunities, purchaseResults, listingResults, errors)
      }

      // Stage 7: Listing - List purchased domains on marketplaces
      listingResults = await this.runStage('Listing', async () => {
        const results = []
        
        for (const purchase of successfulPurchases) {
          try {
            const domain = purchase.domain as Domain & { listPrice: number; floorPrice?: number }
            const listingResult = await listingOrchestrator.createMultiChannelListing({
              domain: domain.name,
              listPrice: domain.listPrice,
              floorPrice: domain.floorPrice,
              buyNowEnabled: true,
              makeOfferEnabled: true,
            })

            results.push(listingResult)

            // Call hook for each successful listing
            if (this.hooks.onListingCreated) {
              for (const result of listingResult.results.filter(r => r.success)) {
                await this.hooks.onListingCreated(domain, result.marketplace)
              }
            }
          } catch (error) {
            logger.error('PIPELINE', `Listing error for ${purchase.domain.name}`, error as Error)
            errors.push(`Listing failed for ${purchase.domain.name}: ${(error as Error).message}`)
          }
        }

        const totalListings = results.reduce((sum, r) => sum + r.successCount, 0)
        logger.info('PIPELINE', `Listing complete: ${totalListings} listings created`)
        return results
      })

    } catch (error) {
      logger.error('PIPELINE', 'Pipeline execution failed', error as Error)
      errors.push(`Pipeline error: ${(error as Error).message}`)
      await alertSystem.pipelineError('execution', (error as Error).message)
    } finally {
      // Stop heartbeat
      healthHeartbeat.stop()
    }

    return this.buildResult(
      startTime,
      opportunities,
      valuedOpportunities,
      availableOpportunities,
      purchaseResults,
      listingResults,
      errors
    )
  }

  /**
   * Run a pipeline stage with error handling
   */
  private async runStage<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const stage: PipelineStage = {
      name,
      status: 'running',
      startTime: new Date(),
    }

    this.stages.push(stage)

    try {
      // Call hook
      if (this.hooks.onStageStart) {
        await this.hooks.onStageStart(name)
      }

      logger.info('PIPELINE', `Starting stage: ${name}`)

      const result = await fn()

      stage.status = 'completed'
      stage.endTime = new Date()

      logger.info('PIPELINE', `✅ Stage completed: ${name}`, {
        duration: stage.endTime.getTime() - stage.startTime!.getTime(),
      })

      // Call hook
      if (this.hooks.onStageComplete) {
        await this.hooks.onStageComplete(name, true)
      }

      return result
    } catch (error) {
      stage.status = 'failed'
      stage.endTime = new Date()
      stage.error = (error as Error).message

      logger.error('PIPELINE', `❌ Stage failed: ${name}`, error as Error)

      await alertSystem.pipelineError(name, (error as Error).message)

      // Call hook
      if (this.hooks.onStageComplete) {
        await this.hooks.onStageComplete(name, false)
      }

      // Return empty/default result instead of throwing to allow pipeline to continue
      return [] as any
    }
  }

  /**
   * Build final pipeline result
   */
  private buildResult(
    startTime: Date,
    opportunities: Domain[],
    valuedOpportunities: Domain[],
    availableOpportunities: Domain[],
    purchaseResults: Array<{ domain: Domain; success: boolean; price: number }>,
    listingResults: any[],
    errors: string[]
  ): PipelineResult {
    const endTime = new Date()
    const durationMs = endTime.getTime() - startTime.getTime()

    const purchasesSucceeded = purchaseResults.filter(r => r.success).length
    const listingsCreated = listingResults.reduce((sum, r) => sum + (r.successCount || 0), 0)

    const result: PipelineResult = {
      success: errors.length === 0,
      stages: this.stages,
      opportunitiesFound: opportunities.length,
      opportunitiesValued: valuedOpportunities.length,
      opportunitiesAvailable: availableOpportunities.length,
      purchaseAttempts: purchaseResults.length,
      purchasesSucceeded,
      listingsCreated,
      errors,
      startTime,
      endTime,
      durationMs,
    }

    logger.info('PIPELINE', '🏁 Pipeline completed', {
      success: result.success,
      duration: `${(durationMs / 1000).toFixed(2)}s`,
      opportunitiesFound: result.opportunitiesFound,
      purchasesSucceeded: result.purchasesSucceeded,
      listingsCreated: result.listingsCreated,
    })

    return result
  }

  /**
   * Get pipeline stages
   */
  getStages(): PipelineStage[] {
    return [...this.stages]
  }
}
