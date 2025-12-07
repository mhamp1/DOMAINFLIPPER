/**
 * Transfer Service
 * Handles domain transfer operations
 * December 2025
 */

import { logger } from '@/lib/utils/logger'

export interface TransferRequest {
  id: string
  domain: string
  fromRegistrar: string
  toRegistrar: string
  authCode?: string
  status: 'initiated' | 'pending' | 'completed' | 'failed' | 'cancelled'
  createdAt: Date
  completedAt?: Date
  error?: string
}

export interface TransferProvider {
  name: string

  /**
   * Initiate domain transfer
   */
  initiateTransfer(
    domain: string,
    toRegistrar: string,
    authCode?: string
  ): Promise<TransferRequest>

  /**
   * Get transfer status
   */
  getTransferStatus(transferId: string): Promise<TransferRequest>

  /**
   * Cancel transfer
   */
  cancelTransfer(transferId: string): Promise<{ success: boolean; error?: string }>

  /**
   * Get auth code for domain
   */
  getAuthCode(domain: string): Promise<{ authCode?: string; error?: string }>

  /**
   * Check if provider is configured
   */
  isConfigured(): boolean
}

/**
 * Transfer Service
 * Coordinates domain transfers between registrars
 */
class TransferService {
  private providers: Map<string, TransferProvider> = new Map()
  private defaultProvider: string = 'stub'

  /**
   * Register a transfer provider
   */
  registerProvider(provider: TransferProvider): void {
    this.providers.set(provider.name, provider)
    logger.info('TRANSFER', `Registered transfer provider: ${provider.name}`)
  }

  /**
   * Set default provider
   */
  setDefaultProvider(name: string): void {
    if (!this.providers.has(name)) {
      throw new Error(`Provider ${name} not registered`)
    }
    this.defaultProvider = name
    logger.info('TRANSFER', `Default transfer provider set to: ${name}`)
  }

  /**
   * Initiate a domain transfer
   */
  async initiateTransfer(
    domain: string,
    toRegistrar: string,
    authCode?: string,
    providerName?: string
  ): Promise<TransferRequest> {
    const provider = this.getProvider(providerName)

    try {
      logger.info('TRANSFER', `Initiating transfer for ${domain} to ${toRegistrar}`, {
        domain,
        toRegistrar,
        provider: provider.name,
      })

      const result = await provider.initiateTransfer(domain, toRegistrar, authCode)

      if (result.status !== 'failed') {
        logger.info('TRANSFER', `✅ Transfer initiated for ${domain}`, {
          transferId: result.id,
          status: result.status,
        })
      } else {
        logger.error('TRANSFER', `❌ Transfer failed for ${domain}`, undefined, {
          error: result.error,
        })
      }

      return result
    } catch (error) {
      logger.error('TRANSFER', `Exception during transfer of ${domain}`, error as Error)

      return {
        id: `TFAIL-${Date.now()}`,
        domain,
        fromRegistrar: 'unknown',
        toRegistrar,
        status: 'failed',
        createdAt: new Date(),
        error: (error as Error).message,
      }
    }
  }

  /**
   * Get transfer status
   */
  async getTransferStatus(
    transferId: string,
    providerName?: string
  ): Promise<TransferRequest> {
    const provider = this.getProvider(providerName)

    try {
      return await provider.getTransferStatus(transferId)
    } catch (error) {
      logger.error('TRANSFER', `Failed to get transfer status for ${transferId}`, error as Error)
      throw error
    }
  }

  /**
   * Get auth code for domain
   */
  async getAuthCode(domain: string, providerName?: string): Promise<string | null> {
    const provider = this.getProvider(providerName)

    try {
      logger.info('TRANSFER', `Getting auth code for ${domain}`)
      const result = await provider.getAuthCode(domain)

      if (result.authCode) {
        logger.info('TRANSFER', `✅ Auth code retrieved for ${domain}`)
        return result.authCode
      } else {
        logger.error('TRANSFER', `❌ Failed to get auth code for ${domain}`, undefined, {
          error: result.error,
        })
        return null
      }
    } catch (error) {
      logger.error('TRANSFER', `Exception getting auth code for ${domain}`, error as Error)
      return null
    }
  }

  /**
   * Get provider by name or default
   */
  private getProvider(name?: string): TransferProvider {
    const providerName = name || this.defaultProvider
    const provider = this.providers.get(providerName)

    if (!provider) {
      throw new Error(`Transfer provider ${providerName} not found`)
    }

    if (!provider.isConfigured()) {
      throw new Error(`Transfer provider ${providerName} is not configured`)
    }

    return provider
  }

  /**
   * Get registered providers
   */
  getProviders(): string[] {
    return Array.from(this.providers.keys())
  }

  /**
   * Get configured providers
   */
  getConfiguredProviders(): string[] {
    return Array.from(this.providers.values())
      .filter(p => p.isConfigured())
      .map(p => p.name)
  }
}

/**
 * Stub Transfer Provider
 * No-op implementation for testing
 */
export class StubTransferProvider implements TransferProvider {
  name = 'stub'

  async initiateTransfer(
    domain: string,
    toRegistrar: string,
    authCode?: string
  ): Promise<TransferRequest> {
    logger.info('TRANSFER', `[STUB] Simulating transfer initiation for ${domain}`, {
      domain,
      toRegistrar,
      hasAuthCode: !!authCode,
    })

    await new Promise(resolve => setTimeout(resolve, 500))

    return {
      id: `TRF-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      domain,
      fromRegistrar: 'stub-current',
      toRegistrar,
      authCode,
      status: 'initiated',
      createdAt: new Date(),
    }
  }

  async getTransferStatus(transferId: string): Promise<TransferRequest> {
    logger.debug('TRANSFER', `[STUB] Fetching status for ${transferId}`)

    // Simulate random status
    const statuses: TransferRequest['status'][] = ['initiated', 'pending', 'completed']
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)]

    return {
      id: transferId,
      domain: 'example.com',
      fromRegistrar: 'stub-from',
      toRegistrar: 'stub-to',
      status: randomStatus,
      createdAt: new Date(),
      completedAt: randomStatus === 'completed' ? new Date() : undefined,
    }
  }

  async cancelTransfer(transferId: string): Promise<{ success: boolean; error?: string }> {
    logger.info('TRANSFER', `[STUB] Cancelling transfer ${transferId}`)
    await new Promise(resolve => setTimeout(resolve, 200))
    return { success: true }
  }

  async getAuthCode(domain: string): Promise<{ authCode?: string; error?: string }> {
    logger.info('TRANSFER', `[STUB] Getting auth code for ${domain}`)
    await new Promise(resolve => setTimeout(resolve, 300))

    return {
      authCode: `AUTH-${Math.random().toString(36).slice(2, 14).toUpperCase()}`,
    }
  }

  isConfigured(): boolean {
    return true
  }
}

// Export singleton instance
export const transferService = new TransferService()

// Register stub provider by default
transferService.registerProvider(new StubTransferProvider())
transferService.setDefaultProvider('stub')
