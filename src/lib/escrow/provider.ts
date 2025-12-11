/**
 * Escrow Provider
 * Handles escrow transactions for domain sales
 * December 2025
 */

import { logger } from '@/lib/utils/logger'

export interface EscrowTransaction {
  id: string
  domain: string
  buyer: string
  seller: string
  amount: number
  status: 'pending' | 'funded' | 'released' | 'cancelled' | 'disputed'
  createdAt: Date
  completedAt?: Date
}

export interface EscrowProvider {
  name: string

  /**
   * Create a new escrow transaction
   */
  createTransaction(
    domain: string,
    amount: number,
    buyer: string,
    seller: string
  ): Promise<EscrowTransaction>

  /**
   * Get transaction status
   */
  getTransactionStatus(transactionId: string): Promise<EscrowTransaction>

  /**
   * Release funds to seller
   */
  releaseFunds(transactionId: string): Promise<{ success: boolean; error?: string }>

  /**
   * Cancel transaction
   */
  cancelTransaction(transactionId: string): Promise<{ success: boolean; error?: string }>

  /**
   * Check if provider is configured
   */
  isConfigured(): boolean
}

/**
 * Stub Escrow Provider
 * No-op implementation for testing
 */
export class StubEscrowProvider implements EscrowProvider {
  name = 'stub'

  async createTransaction(
    domain: string,
    amount: number,
    buyer: string,
    seller: string
  ): Promise<EscrowTransaction> {
    logger.info('ESCROW', `[STUB] Creating escrow transaction for ${domain}`, {
      domain,
      amount,
      buyer,
      seller,
    })

    await new Promise(resolve => setTimeout(resolve, 300))

    return {
      id: `ESC-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      domain,
      buyer,
      seller,
      amount,
      status: 'pending',
      createdAt: new Date(),
    }
  }

  async getTransactionStatus(transactionId: string): Promise<EscrowTransaction> {
    logger.debug('ESCROW', `[STUB] Fetching status for ${transactionId}`)

    return {
      id: transactionId,
      domain: 'example.com',
      buyer: 'buyer@example.com',
      seller: 'seller@example.com',
      amount: 5000,
      status: 'pending',
      createdAt: new Date(),
    }
  }

  async releaseFunds(transactionId: string): Promise<{ success: boolean; error?: string }> {
    logger.info('ESCROW', `[STUB] Releasing funds for ${transactionId}`)
    await new Promise(resolve => setTimeout(resolve, 200))
    return { success: true }
  }

  async cancelTransaction(transactionId: string): Promise<{ success: boolean; error?: string }> {
    logger.info('ESCROW', `[STUB] Cancelling transaction ${transactionId}`)
    await new Promise(resolve => setTimeout(resolve, 200))
    return { success: true }
  }

  isConfigured(): boolean {
    return true
  }
}

/**
 * Escrow.com Provider (TODO: Implement real API integration)
 */
export class EscrowComProvider implements EscrowProvider {
  name = 'escrow.com'
  private apiKey?: string

  constructor(apiKey?: string) {
    this.apiKey = apiKey
  }

  async createTransaction(
    domain: string,
    amount: number,
    buyer: string,
    seller: string
  ): Promise<EscrowTransaction> {
    if (!this.isConfigured()) {
      throw new Error('Escrow.com API credentials not configured')
    }

    try {
      // Escrow.com API integration
      const apiUrl = 'https://api.escrow.com/v2/transactions'

      const payload = {
        title: `Domain Sale: ${domain}`,
        description: `Secure escrow transaction for domain ${domain}`,
        items: [{
          title: domain,
          description: `Domain name registration and transfer`,
          type: 'domain_name',
          inspection_period: 3, // 3 days inspection
          quantity: 1,
          schedule: [{
            amount: amount,
            payer_customer: buyer,
            beneficiary_customer: seller,
          }]
        }],
        currency: 'usd',
        parties: [
          {
            customer: buyer,
            role: 'buyer',
          },
          {
            customer: seller,
            role: 'seller',
          }
        ],
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Escrow.com API error: ${response.status} - ${errorText}`)
      }

      const result = await response.json()

      if (result.transaction_id) {
        logger.info('ESCROW', `Successfully created escrow transaction for ${domain}`, {
          domain,
          transactionId: result.transaction_id,
          amount,
          buyer,
          seller,
        })

        return {
          id: result.transaction_id,
          domain,
          buyer,
          seller,
          amount,
          status: 'pending',
          createdAt: new Date(),
        }
      } else {
        throw new Error(result.message || 'Failed to create escrow transaction')
      }

    } catch (error: any) {
      logger.error('ESCROW', `Failed to create escrow transaction for ${domain}`, error)
      throw error
    }
  }

  async getTransactionStatus(transactionId: string): Promise<EscrowTransaction> {
    if (!this.isConfigured()) {
      throw new Error('Escrow.com API credentials not configured')
    }

    try {
      const apiUrl = `https://api.escrow.com/v2/transactions/${transactionId}`

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Escrow.com API error: ${response.status} - ${errorText}`)
      }

      const result = await response.json()

      // Map Escrow.com status to our standard status
      let status: EscrowTransaction['status'] = 'pending'
      switch (result.status?.toLowerCase()) {
        case 'funded':
          status = 'funded'
          break
        case 'accepted':
        case 'shipped':
          status = 'released'
          break
        case 'cancelled':
          status = 'cancelled'
          break
        case 'disputed':
          status = 'disputed'
          break
        default:
          status = 'pending'
      }

      return {
        id: transactionId,
        domain: result.items?.[0]?.title || 'unknown',
        buyer: result.parties?.find((p: any) => p.role === 'buyer')?.customer || 'unknown',
        seller: result.parties?.find((p: any) => p.role === 'seller')?.customer || 'unknown',
        amount: result.items?.[0]?.schedule?.[0]?.amount || 0,
        status,
        createdAt: new Date(result.created_at || Date.now()),
        completedAt: result.completed_at ? new Date(result.completed_at) : undefined,
      }

    } catch (error: any) {
      logger.error('ESCROW', `Failed to get transaction status for ${transactionId}`, error)
      throw error
    }
  }

  async releaseFunds(transactionId: string): Promise<{ success: boolean; error?: string }> {
    if (!this.isConfigured()) {
      return { success: false, error: 'Escrow.com API credentials not configured' }
    }

    try {
      const apiUrl = `https://api.escrow.com/v2/transactions/${transactionId}/accept`

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'accept',
          note: 'Domain delivered successfully',
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Escrow.com API error: ${response.status} - ${errorText}`)
      }

      const result = await response.json()

      if (result.success) {
        logger.info('ESCROW', `Successfully released funds for transaction ${transactionId}`)
        return { success: true }
      } else {
        throw new Error(result.message || 'Failed to release funds')
      }

    } catch (error: any) {
      logger.error('ESCROW', `Failed to release funds for transaction ${transactionId}`, error)
      return { success: false, error: error.message }
    }
  }

  async cancelTransaction(transactionId: string): Promise<{ success: boolean; error?: string }> {
    if (!this.isConfigured()) {
      return { success: false, error: 'Escrow.com API credentials not configured' }
    }

    try {
      const apiUrl = `https://api.escrow.com/v2/transactions/${transactionId}/cancel`

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: 'Transaction cancelled by seller',
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Escrow.com API error: ${response.status} - ${errorText}`)
      }

      const result = await response.json()

      if (result.success) {
        logger.info('ESCROW', `Successfully cancelled transaction ${transactionId}`)
        return { success: true }
      } else {
        throw new Error(result.message || 'Failed to cancel transaction')
      }

    } catch (error: any) {
      logger.error('ESCROW', `Failed to cancel transaction ${transactionId}`, error)
      return { success: false, error: error.message }
    }
  }

  isConfigured(): boolean {
    return !!this.apiKey
  }
}

// Export singleton stub instance
export const escrowProvider = new StubEscrowProvider()
