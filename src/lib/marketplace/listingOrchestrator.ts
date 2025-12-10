/**
 * Listing Orchestrator
 * Manages marketplace listings across multiple channels
 * December 2025
 */

import { logger } from '@/lib/utils/logger'
import { alertSystem } from '@/lib/utils/alerts'
import type {
  MarketplaceProvider,
  ListingOptions,
  ListingResult,
  ListingStatus,
} from './providers/marketplaceProvider'
import type { Domain } from '@/types/domain'

export interface MultiChannelListingResult {
  domain: string
  results: ListingResult[]
  successCount: number
  failureCount: number
}

/**
 * Listing Orchestrator
 * Coordinates listings across multiple marketplace channels
 */
export class ListingOrchestrator {
  private providers: Map<string, MarketplaceProvider> = new Map()
  private activeChannels: string[] = []

  /**
   * Register a marketplace provider
   */
  registerProvider(provider: MarketplaceProvider): void {
    this.providers.set(provider.name, provider)
    logger.info('LISTING', `Registered marketplace provider: ${provider.name}`)
  }

  /**
   * Set active channels for listing
   */
  setActiveChannels(channels: string[]): void {
    // Validate all channels exist
    const invalid = channels.filter(c => !this.providers.has(c))
    if (invalid.length > 0) {
      throw new Error(`Unknown marketplace channels: ${invalid.join(', ')}`)
    }

    this.activeChannels = channels
    logger.info('LISTING', `Active channels set to: ${channels.join(', ')}`)
  }

  /**
   * Create listing on a single marketplace
   */
  async createListing(
    options: ListingOptions,
    marketplaceName: string
  ): Promise<ListingResult> {
    const provider = this.getProvider(marketplaceName)

    try {
      // Validate options
      const validation = provider.validateOptions(options)
      if (!validation.valid) {
        logger.error('LISTING', `Invalid listing options for ${options.domain}`, undefined, {
          errors: validation.errors,
        })

        return {
          success: false,
          domain: options.domain,
          marketplace: marketplaceName,
          listPrice: options.listPrice,
          timestamp: new Date(),
          error: `Validation failed: ${validation.errors.join(', ')}`,
        }
      }

      // Create listing
      logger.info('LISTING', `Creating listing for ${options.domain} on ${marketplaceName}`, {
        domain: options.domain,
        listPrice: options.listPrice,
        marketplace: marketplaceName,
      })

      const result = await provider.createListing(options)

      if (result.success) {
        logger.info('LISTING', `✅ Successfully listed ${options.domain} on ${marketplaceName}`, {
          domain: options.domain,
          listingId: result.listingId,
          listPrice: result.listPrice,
        })

        await alertSystem.listingCreated(options.domain, options.listPrice, marketplaceName)
      } else {
        logger.error('LISTING', `❌ Failed to list ${options.domain} on ${marketplaceName}`, undefined, {
          domain: options.domain,
          error: result.error,
        })
      }

      return result
    } catch (error) {
      logger.error('LISTING', `Exception listing ${options.domain} on ${marketplaceName}`, error as Error)

      return {
        success: false,
        domain: options.domain,
        marketplace: marketplaceName,
        listPrice: options.listPrice,
        timestamp: new Date(),
        error: (error as Error).message,
      }
    }
  }

  /**
   * Create listings across multiple marketplaces
   */
  async createMultiChannelListing(options: ListingOptions): Promise<MultiChannelListingResult> {
    const channels = this.activeChannels.length > 0 
      ? this.activeChannels 
      : this.getConfiguredProviders()

    if (channels.length === 0) {
      logger.warn('LISTING', 'No configured marketplace channels available')
      return {
        domain: options.domain,
        results: [],
        successCount: 0,
        failureCount: 0,
      }
    }

    logger.info('LISTING', `Creating multi-channel listing for ${options.domain}`, {
      domain: options.domain,
      channels,
    })

    // Create listings in parallel
    const results = await Promise.all(
      channels.map(channel => this.createListing(options, channel))
    )

    const successCount = results.filter(r => r.success).length
    const failureCount = results.filter(r => !r.success).length

    logger.info('LISTING', `Multi-channel listing complete: ${successCount}/${channels.length} succeeded`, {
      domain: options.domain,
      successCount,
      failureCount,
    })

    return {
      domain: options.domain,
      results,
      successCount,
      failureCount,
    }
  }

  /**
   * Update price across all marketplaces where domain is listed
   */
  async updatePriceMultiChannel(
    domain: string,
    listingIds: Record<string, string>,
    newPrice: number
  ): Promise<MultiChannelListingResult> {
    logger.info('LISTING', `Updating price for ${domain} across channels`, {
      domain,
      newPrice,
      channels: Object.keys(listingIds),
    })

    const results = await Promise.all(
      Object.entries(listingIds).map(async ([marketplace, listingId]) => {
        try {
          const provider = this.getProvider(marketplace)
          return await provider.updatePrice(listingId, newPrice)
        } catch (error) {
          logger.error('LISTING', `Failed to update price on ${marketplace}`, error as Error)
          return {
            success: false,
            domain,
            marketplace,
            listPrice: newPrice,
            timestamp: new Date(),
            error: (error as Error).message,
          }
        }
      })
    )

    const successCount = results.filter(r => r.success).length
    const failureCount = results.filter(r => !r.success).length

    return {
      domain,
      results,
      successCount,
      failureCount,
    }
  }

  /**
   * Cancel listing on a specific marketplace
   */
  async cancelListing(
    marketplace: string,
    listingId: string
  ): Promise<{ success: boolean; error?: string }> {
    const provider = this.getProvider(marketplace)

    try {
      logger.info('LISTING', `Cancelling listing ${listingId} on ${marketplace}`)
      const result = await provider.cancelListing(listingId)

      if (result.success) {
        logger.info('LISTING', `✅ Successfully cancelled listing ${listingId}`)
      } else {
        logger.error('LISTING', `❌ Failed to cancel listing ${listingId}`, undefined, {
          error: result.error,
        })
      }

      return result
    } catch (error) {
      logger.error('LISTING', `Exception cancelling listing ${listingId}`, error as Error)
      return {
        success: false,
        error: (error as Error).message,
      }
    }
  }

  /**
   * Fetch status for all listings of a domain
   */
  async fetchAllStatuses(
    listingIds: Record<string, string>
  ): Promise<Record<string, ListingStatus | null>> {
    logger.debug('LISTING', 'Fetching statuses for all listings', {
      marketplaces: Object.keys(listingIds),
    })

    const statusPromises = Object.entries(listingIds).map(async ([marketplace, listingId]) => {
      try {
        const provider = this.getProvider(marketplace)
        const status = await provider.fetchStatus(listingId)
        return [marketplace, status] as const
      } catch (error) {
        logger.error('LISTING', `Failed to fetch status from ${marketplace}`, error as Error)
        return [marketplace, null] as const
      }
    })

    const results = await Promise.all(statusPromises)
    return Object.fromEntries(results)
  }

  /**
   * Enrich domains with listing information
   */
  enrichWithListings(
    domains: Domain[],
    listPrice?: number,
    floorPrice?: number
  ): Array<Domain & { listPrice?: number; floorPrice?: number }> {
    return domains.map(domain => ({
      ...domain,
      listPrice: listPrice || domain.estimatedValue * 2,
      floorPrice: floorPrice || domain.estimatedValue * 1.3,
    }))
  }

  /**
   * Auto-list purchased domains
   */
  async autoListPurchasedDomains(
    domains: Array<Domain & { listPrice: number; floorPrice?: number }>
  ): Promise<MultiChannelListingResult[]> {
    logger.info('LISTING', `Auto-listing ${domains.length} purchased domains`)

    const results = await Promise.all(
      domains.map(async domain => {
        const options: ListingOptions = {
          domain: domain.name,
          listPrice: domain.listPrice,
          floorPrice: domain.floorPrice,
          buyNowEnabled: true,
          makeOfferEnabled: true,
        }

        return await this.createMultiChannelListing(options)
      })
    )

    const totalSuccess = results.reduce((sum, r) => sum + r.successCount, 0)
    const totalFailure = results.reduce((sum, r) => sum + r.failureCount, 0)

    logger.info('LISTING', `Auto-listing complete: ${totalSuccess} successful, ${totalFailure} failed`)

    return results
  }

  /**
   * Get provider by name
   */
  private getProvider(name: string): MarketplaceProvider {
    const provider = this.providers.get(name)

    if (!provider) {
      throw new Error(`Marketplace provider ${name} not found`)
    }

    if (!provider.isConfigured()) {
      throw new Error(`Marketplace provider ${name} is not configured`)
    }

    return provider
  }

  /**
   * Get list of registered providers
   */
  getProviders(): string[] {
    return Array.from(this.providers.keys())
  }

  /**
   * Get configured providers only
   */
  getConfiguredProviders(): string[] {
    return Array.from(this.providers.values())
      .filter(p => p.isConfigured())
      .map(p => p.name)
  }

  /**
   * Get active channels
   */
  getActiveChannels(): string[] {
    return [...this.activeChannels]
  }
}

// Export singleton instance
export const listingOrchestrator = new ListingOrchestrator()
