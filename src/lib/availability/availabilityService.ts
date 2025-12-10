/**
 * Availability Service
 * Checks domain availability across registrars
 * December 2025
 */

import { logger } from '@/lib/utils/logger'
import type { Domain } from '@/types/domain'

export interface AvailabilityResult {
  domain: string
  available: boolean
  provider: string
  price?: number
  premium?: boolean
  checkTimestamp: Date
  error?: string
}

export interface AvailabilityProvider {
  name: string
  checkAvailability(domain: string): Promise<AvailabilityResult>
  checkBulkAvailability(domains: string[]): Promise<AvailabilityResult[]>
  isConfigured(): boolean
}

/**
 * Availability Service
 * Orchestrates availability checks across multiple providers
 */
class AvailabilityService {
  private providers: Map<string, AvailabilityProvider> = new Map()
  private defaultProvider: string = 'godaddy'

  /**
   * Register an availability provider
   */
  registerProvider(provider: AvailabilityProvider): void {
    this.providers.set(provider.name, provider)
    logger.info('AVAILABILITY', `Registered provider: ${provider.name}`)
  }

  /**
   * Set default provider
   */
  setDefaultProvider(name: string): void {
    if (!this.providers.has(name)) {
      throw new Error(`Provider ${name} not registered`)
    }
    this.defaultProvider = name
    logger.info('AVAILABILITY', `Default provider set to: ${name}`)
  }

  /**
   * Check single domain availability
   */
  async checkAvailability(
    domain: string,
    providerName?: string
  ): Promise<AvailabilityResult> {
    const provider = this.getProvider(providerName)

    try {
      logger.debug('AVAILABILITY', `Checking ${domain} via ${provider.name}`)
      const result = await provider.checkAvailability(domain)
      
      logger.info('AVAILABILITY', `${domain} is ${result.available ? 'available' : 'taken'}`, {
        domain,
        available: result.available,
        provider: provider.name,
        price: result.price,
      })

      return result
    } catch (error) {
      logger.error('AVAILABILITY', `Failed to check ${domain}`, error as Error, {
        domain,
        provider: provider.name,
      })

      return {
        domain,
        available: false,
        provider: provider.name,
        checkTimestamp: new Date(),
        error: (error as Error).message,
      }
    }
  }

  /**
   * Check multiple domains availability
   */
  async checkBulkAvailability(
    domains: string[],
    providerName?: string
  ): Promise<AvailabilityResult[]> {
    const provider = this.getProvider(providerName)

    try {
      logger.info('AVAILABILITY', `Checking ${domains.length} domains via ${provider.name}`)
      const results = await provider.checkBulkAvailability(domains)
      
      const available = results.filter(r => r.available).length
      logger.info('AVAILABILITY', `Bulk check complete: ${available}/${domains.length} available`, {
        total: domains.length,
        available,
        provider: provider.name,
      })

      return results
    } catch (error) {
      logger.error('AVAILABILITY', 'Bulk check failed', error as Error, {
        domainsCount: domains.length,
        provider: provider.name,
      })

      // Return error results for all domains
      return domains.map(domain => ({
        domain,
        available: false,
        provider: provider.name,
        checkTimestamp: new Date(),
        error: (error as Error).message,
      }))
    }
  }

  /**
   * Check availability across multiple providers (for verification)
   */
  async checkAvailabilityMultiProvider(domain: string): Promise<AvailabilityResult[]> {
    const configuredProviders = Array.from(this.providers.values())
      .filter(p => p.isConfigured())

    if (configuredProviders.length === 0) {
      throw new Error('No configured availability providers')
    }

    logger.info('AVAILABILITY', `Checking ${domain} across ${configuredProviders.length} providers`)

    const results = await Promise.allSettled(
      configuredProviders.map(p => p.checkAvailability(domain))
    )

    return results
      .map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value
        } else {
          return {
            domain,
            available: false,
            provider: configuredProviders[index].name,
            checkTimestamp: new Date(),
            error: result.reason.message,
          }
        }
      })
  }

  /**
   * Enrich opportunities with availability data
   */
  async enrichOpportunities(opportunities: Domain[]): Promise<Domain[]> {
    const domains = opportunities.map(o => o.name)
    const results = await this.checkBulkAvailability(domains)

    const resultsMap = new Map(results.map(r => [r.domain, r]))

    return opportunities.map(opp => {
      const result = resultsMap.get(opp.name)
      if (result && result.available) {
        return {
          ...opp,
          status: 'available' as const,
          purchasePrice: result.price || opp.purchasePrice,
        }
      }
      return opp
    })
  }

  /**
   * Get provider by name or default
   */
  private getProvider(name?: string): AvailabilityProvider {
    const providerName = name || this.defaultProvider
    const provider = this.providers.get(providerName)

    if (!provider) {
      throw new Error(`Provider ${providerName} not found`)
    }

    if (!provider.isConfigured()) {
      throw new Error(`Provider ${providerName} is not configured`)
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
}

/**
 * Stub Provider (for testing and no-op operations)
 */
class StubAvailabilityProvider implements AvailabilityProvider {
  name = 'stub'

  async checkAvailability(domain: string): Promise<AvailabilityResult> {
    logger.debug('AVAILABILITY', `[STUB] Checking ${domain}`)
    
    // Simulate availability check - domains with "test" are available
    const available = domain.includes('test') || Math.random() > 0.5
    
    return {
      domain,
      available,
      provider: this.name,
      price: available ? 10 + Math.random() * 40 : undefined,
      premium: false,
      checkTimestamp: new Date(),
    }
  }

  async checkBulkAvailability(domains: string[]): Promise<AvailabilityResult[]> {
    logger.debug('AVAILABILITY', `[STUB] Bulk checking ${domains.length} domains`)
    return Promise.all(domains.map(d => this.checkAvailability(d)))
  }

  isConfigured(): boolean {
    return true // Stub is always configured
  }
}

// Export singleton instance
export const availabilityService = new AvailabilityService()

// Register stub provider by default
availabilityService.registerProvider(new StubAvailabilityProvider())
availabilityService.setDefaultProvider('stub')
