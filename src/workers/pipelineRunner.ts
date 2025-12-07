/**
 * Pipeline Runner Worker
 * Entry point for running the domain flipping pipeline
 * December 2025
 */

import { logger } from '@/lib/utils/logger'
import { getRuntimeConfig } from '@/lib/config/runtimeConfig'
import { DomainFlippingPipeline } from '@/lib/core/pipeline'
import { createPurchaseController } from '@/lib/buy/purchaseController'
import { StubRegistrarProvider } from '@/lib/buy/providers/registrarProvider'
import { StubMarketplaceProvider } from '@/lib/marketplace/providers/marketplaceProvider'
import { listingOrchestrator } from '@/lib/marketplace/listingOrchestrator'
import type { Domain } from '@/types/domain'

/**
 * Mock intelligence source for testing
 * In production, this would call actual domain scanners
 */
async function mockIntelligenceSource(): Promise<Domain[]> {
  logger.info('WORKER', 'Gathering domain opportunities (mock)')

  // Return mock opportunities for testing
  const mockDomains: Domain[] = [
    {
      id: '1',
      name: 'aitrends.com',
      tld: 'com',
      length: 8,
      estimatedValue: 5000,
      aiScore: 85,
      strategyId: 'test',
      status: 'available',
    },
    {
      id: '2',
      name: 'cloudify.io',
      tld: 'io',
      length: 8,
      estimatedValue: 3000,
      aiScore: 80,
      strategyId: 'test',
      status: 'available',
    },
    {
      id: '3',
      name: 'dataworld.net',
      tld: 'net',
      length: 9,
      estimatedValue: 2000,
      aiScore: 75,
      strategyId: 'test',
      status: 'available',
    },
  ]

  return mockDomains
}

/**
 * Real intelligence source that uses actual scanners
 * TODO: Integrate with existing scanner infrastructure
 */
async function realIntelligenceSource(): Promise<Domain[]> {
  logger.info('WORKER', 'Gathering domain opportunities from real scanners')

  // TODO: Integrate with:
  // - expiredDomainsScanner
  // - realDomainScanner
  // - multiSourceScanner
  // - etc.

  // For now, return empty array
  return []
}

/**
 * Main worker function
 */
export async function runPipeline(useRealIntelligence: boolean = false): Promise<void> {
  logger.info('WORKER', '🚀 Starting pipeline runner')

  try {
    // Load runtime configuration
    const config = getRuntimeConfig()

    logger.info('WORKER', 'Configuration loaded', {
      dryRun: config.DRY_RUN,
      simulation: config.SIMULATION,
      maxSpendPerDay: config.MAX_SPEND_PER_DAY,
    })

    // Create purchase controller with guardrails
    const purchaseController = createPurchaseController(config)

    // Register stub providers (safe for DRY_RUN)
    const stubRegistrar = new StubRegistrarProvider()
    purchaseController.registerProvider(stubRegistrar)
    purchaseController.setDefaultProvider('stub')

    // Register marketplace providers
    const stubMarketplace = new StubMarketplaceProvider()
    listingOrchestrator.registerProvider(stubMarketplace)
    listingOrchestrator.setActiveChannels(['stub'])

    // TODO: Register real providers when credentials are available
    // const godaddyProvider = new GoDaddyRegistrarProvider(config.REGISTRAR_API_KEY, config.REGISTRAR_API_SECRET)
    // if (godaddyProvider.isConfigured()) {
    //   purchaseController.registerProvider(godaddyProvider)
    //   purchaseController.setDefaultProvider('godaddy')
    // }

    // Create pipeline with hooks
    const pipeline = new DomainFlippingPipeline(config, purchaseController, {
      onStageStart: async (stage) => {
        logger.info('WORKER', `📍 Stage starting: ${stage}`)
      },
      onStageComplete: async (stage, success) => {
        logger.info('WORKER', `${success ? '✅' : '❌'} Stage ${success ? 'completed' : 'failed'}: ${stage}`)
      },
      onPurchaseAttempt: async (domain) => {
        logger.info('WORKER', `💰 Attempting to purchase: ${domain.name}`)
      },
      onPurchaseSuccess: async (domain, price) => {
        logger.info('WORKER', `🎉 Successfully purchased: ${domain.name} for $${price}`)
      },
      onListingCreated: async (domain, marketplace) => {
        logger.info('WORKER', `📢 Listed ${domain.name} on ${marketplace}`)
      },
    })

    // Choose intelligence source
    const intelligenceSource = useRealIntelligence ? realIntelligenceSource : mockIntelligenceSource

    // Run the pipeline
    const result = await pipeline.run(intelligenceSource)

    // Log results
    logger.info('WORKER', '📊 Pipeline Results', {
      success: result.success,
      duration: `${(result.durationMs / 1000).toFixed(2)}s`,
      opportunitiesFound: result.opportunitiesFound,
      opportunitiesValued: result.opportunitiesValued,
      opportunitiesAvailable: result.opportunitiesAvailable,
      purchaseAttempts: result.purchaseAttempts,
      purchasesSucceeded: result.purchasesSucceeded,
      listingsCreated: result.listingsCreated,
      errors: result.errors.length,
    })

    // Log stage details
    result.stages.forEach(stage => {
      const duration = stage.endTime && stage.startTime 
        ? `${((stage.endTime.getTime() - stage.startTime.getTime()) / 1000).toFixed(2)}s`
        : 'N/A'
      
      logger.info('WORKER', `  ${stage.name}: ${stage.status} (${duration})`, {
        error: stage.error,
      })
    })

    // Log errors
    if (result.errors.length > 0) {
      logger.error('WORKER', 'Pipeline completed with errors', undefined, {
        errors: result.errors,
      })
    }

    // Exit with appropriate code
    if (!result.success) {
      logger.error('WORKER', 'Pipeline failed')
      process.exit(1)
    }

    logger.info('WORKER', '✅ Pipeline completed successfully')
    process.exit(0)

  } catch (error) {
    logger.error('WORKER', 'Fatal error in pipeline runner', error as Error)
    process.exit(1)
  }
}

// Allow running directly via node
if (typeof process !== 'undefined' && require.main === module) {
  const useReal = process.env.USE_REAL_INTELLIGENCE === 'true'
  runPipeline(useReal).catch(error => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
}
