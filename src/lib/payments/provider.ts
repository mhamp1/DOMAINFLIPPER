/**
 * Payment Provider
 * Handles payment processing for domain transactions
 * December 2025
 */

import { logger } from '@/lib/utils/logger'

export interface PaymentTransaction {
  id: string
  amount: number
  currency: string
  status: 'pending' | 'completed' | 'failed' | 'refunded'
  paymentMethod: string
  createdAt: Date
  completedAt?: Date
  metadata?: Record<string, any>
}

export interface PaymentProvider {
  name: string

  /**
   * Process a payment
   */
  processPayment(
    amount: number,
    currency: string,
    metadata?: Record<string, any>
  ): Promise<PaymentTransaction>

  /**
   * Get payment status
   */
  getPaymentStatus(transactionId: string): Promise<PaymentTransaction>

  /**
   * Refund a payment
   */
  refundPayment(
    transactionId: string,
    amount?: number
  ): Promise<{ success: boolean; refundId?: string; error?: string }>

  /**
   * Check if provider is configured
   */
  isConfigured(): boolean
}

/**
 * Stub Payment Provider
 * No-op implementation for testing
 */
export class StubPaymentProvider implements PaymentProvider {
  name = 'stub'

  async processPayment(
    amount: number,
    currency: string,
    metadata?: Record<string, any>
  ): Promise<PaymentTransaction> {
    logger.info('PAYMENT', `[STUB] Processing payment of ${amount} ${currency}`, {
      amount,
      currency,
      metadata,
    })

    await new Promise(resolve => setTimeout(resolve, 500))

    // Simulate success (95% success rate)
    const success = Math.random() > 0.05

    return {
      id: `PAY-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      amount,
      currency,
      status: success ? 'completed' : 'failed',
      paymentMethod: 'stub',
      createdAt: new Date(),
      completedAt: success ? new Date() : undefined,
      metadata,
    }
  }

  async getPaymentStatus(transactionId: string): Promise<PaymentTransaction> {
    logger.debug('PAYMENT', `[STUB] Fetching status for ${transactionId}`)

    return {
      id: transactionId,
      amount: 1000,
      currency: 'USD',
      status: 'completed',
      paymentMethod: 'stub',
      createdAt: new Date(),
      completedAt: new Date(),
    }
  }

  async refundPayment(
    transactionId: string,
    amount?: number
  ): Promise<{ success: boolean; refundId?: string; error?: string }> {
    logger.info('PAYMENT', `[STUB] Refunding payment ${transactionId}`, { amount })
    await new Promise(resolve => setTimeout(resolve, 300))

    return {
      success: true,
      refundId: `REF-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
    }
  }

  isConfigured(): boolean {
    return true
  }
}

/**
 * Stripe Payment Provider (TODO: Implement real API integration)
 */
export class StripePaymentProvider implements PaymentProvider {
  name = 'stripe'
  private apiKey?: string

  constructor(apiKey?: string) {
    this.apiKey = apiKey
  }

  async processPayment(
    amount: number,
    currency: string,
    metadata?: Record<string, any>
  ): Promise<PaymentTransaction> {
    if (!this.isConfigured()) {
      throw new Error('Stripe API credentials not configured')
    }

    try {
      // Stripe API integration - create payment intent
      const apiUrl = 'https://api.stripe.com/v1/payment_intents'

      const formData = new URLSearchParams()
      formData.append('amount', Math.round(amount * 100).toString()) // Convert to cents
      formData.append('currency', currency.toLowerCase())
      formData.append('payment_method_types[]', 'card')
      formData.append('payment_method_types[]', 'bank_transfer')

      if (metadata?.description) {
        formData.append('description', metadata.description)
      }

      if (metadata?.receipt_email) {
        formData.append('receipt_email', metadata.receipt_email)
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Stripe API error: ${response.status} - ${errorText}`)
      }

      const result = await response.json()

      if (result.id && result.status === 'requires_payment_method') {
        logger.info('PAYMENT', `Successfully created Stripe payment intent`, {
          paymentId: result.id,
          amount,
          currency,
        })

        return {
          id: result.id,
          amount,
          currency: currency.toUpperCase(),
          status: 'pending',
          paymentMethod: 'stripe',
          createdAt: new Date(),
          metadata,
        }
      } else {
        throw new Error(result.error?.message || 'Failed to create payment intent')
      }

    } catch (error: any) {
      logger.error('PAYMENT', `Failed to process Stripe payment`, error)
      throw error
    }
  }

  async getPaymentStatus(transactionId: string): Promise<PaymentTransaction> {
    if (!this.isConfigured()) {
      throw new Error('Stripe API credentials not configured')
    }

    try {
      const apiUrl = `https://api.stripe.com/v1/payment_intents/${transactionId}`

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Stripe API error: ${response.status} - ${errorText}`)
      }

      const result = await response.json()

      // Map Stripe status to our standard status
      let status: PaymentTransaction['status'] = 'pending'
      switch (result.status) {
        case 'succeeded':
          status = 'completed'
          break
        case 'canceled':
          status = 'failed'
          break
        case 'requires_payment_method':
        case 'requires_confirmation':
          status = 'pending'
          break
        default:
          status = 'pending'
      }

      return {
        id: result.id,
        amount: result.amount / 100, // Convert from cents
        currency: result.currency?.toUpperCase() || 'USD',
        status,
        paymentMethod: 'stripe',
        createdAt: new Date(result.created * 1000),
        completedAt: result.status === 'succeeded' ? new Date(result.created * 1000) : undefined,
        metadata: result.metadata || {},
      }

    } catch (error: any) {
      logger.error('PAYMENT', `Failed to get Stripe payment status for ${transactionId}`, error)
      throw error
    }
  }

  async refundPayment(
    transactionId: string,
    amount?: number
  ): Promise<{ success: boolean; refundId?: string; error?: string }> {
    if (!this.isConfigured()) {
      return { success: false, error: 'Stripe API credentials not configured' }
    }

    try {
      // First get the payment intent to find the charge
      const paymentIntentUrl = `https://api.stripe.com/v1/payment_intents/${transactionId}`

      const intentResponse = await fetch(paymentIntentUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      })

      if (!intentResponse.ok) {
        const errorText = await intentResponse.text()
        throw new Error(`Stripe API error: ${intentResponse.status} - ${errorText}`)
      }

      const intent = await intentResponse.json()

      if (!intent.charges?.data?.[0]?.id) {
        throw new Error('No charge found for this payment intent')
      }

      // Create refund
      const refundUrl = 'https://api.stripe.com/v1/refunds'
      const formData = new URLSearchParams()
      formData.append('charge', intent.charges.data[0].id)

      if (amount) {
        formData.append('amount', Math.round(amount * 100).toString()) // Convert to cents
      }

      const response = await fetch(refundUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Stripe refund API error: ${response.status} - ${errorText}`)
      }

      const result = await response.json()

      if (result.id && result.status === 'succeeded') {
        logger.info('PAYMENT', `Successfully refunded Stripe payment ${transactionId}`, {
          refundId: result.id,
          amount: amount || (result.amount / 100),
        })

        return {
          success: true,
          refundId: result.id,
        }
      } else {
        throw new Error(result.error?.message || 'Refund failed')
      }

    } catch (error: any) {
      logger.error('PAYMENT', `Failed to refund Stripe payment ${transactionId}`, error)
      return { success: false, error: error.message }
    }
  }

  isConfigured(): boolean {
    return !!this.apiKey
  }
}

// Export singleton stub instance
export const paymentProvider = new StubPaymentProvider()
