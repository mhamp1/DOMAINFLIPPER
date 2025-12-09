/**
 * AutomatedSaleFlow.ts — COMPLETE AUTOMATED SALE PIPELINE
 * Handles the entire sale process from inquiry to payment to transfer
 * NO MANUAL INTERVENTION REQUIRED
 * December 2025
 */

import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import { saleMonitor, type MarketplaceInquiry, type CompletedSale } from './SaleMonitor'
import { realEscrow, type EscrowTransaction } from '@/lib/escrow/RealEscrow'
import { realDomainTransfer, type TransferResult } from '@/lib/transfer/RealDomainTransfer'
import { negotiationBot } from '@/lib/negotiation/NegotiationBot'
import { supabaseDB } from '@/lib/database/supabase'
import { empireSettings } from '@/lib/config/EmpireSettings'
import { auditLog } from '@/lib/infrastructure/AuditLog'
import { metrics } from '@/lib/infrastructure/Metrics'
import { masterConfig } from '@/lib/config/MasterConfig'

// ==================== TYPES ====================

export interface SaleConfig {
  autoNegotiate: boolean
  autoAcceptAbove: number // Auto-accept offers above this % of asking
  autoRejectBelow: number // Auto-reject offers below this % of asking
  autoCreateEscrow: boolean
  autoTransferOnPayment: boolean
  sendNotifications: boolean
  maxNegotiationRounds: number
}

export interface ActiveSale {
  id: string
  domain: string
  inquiry: MarketplaceInquiry
  negotiation?: any
  escrow?: EscrowTransaction
  transfer?: TransferResult
  status: 'inquiry' | 'negotiating' | 'accepted' | 'escrow_created' | 'paid' | 'transferring' | 'completed' | 'failed'
  startedAt: Date
  completedAt?: Date
  finalPrice?: number
  profit?: number
}

// ==================== DEFAULT CONFIG ====================

const DEFAULT_CONFIG: SaleConfig = {
  autoNegotiate: true,
  autoAcceptAbove: 0.90, // Accept offers >= 90% of asking
  autoRejectBelow: 0.50, // Reject offers < 50% of asking
  autoCreateEscrow: true,
  autoTransferOnPayment: true,
  sendNotifications: true,
  maxNegotiationRounds: 5,
}

// ==================== AUTOMATED SALE FLOW ====================

class AutomatedSaleFlow {
  private isRunning: boolean = false
  private config: SaleConfig = DEFAULT_CONFIG
  private activeSales: Map<string, ActiveSale> = new Map()
  private listeners: Array<(sale: ActiveSale) => void> = []

  // ==================== LIFECYCLE ====================

  async start(): Promise<void> {
    if (this.isRunning) return

    this.isRunning = true
    logger.info('SALE_FLOW', 'Starting automated sale flow')

    // Start monitoring for sale events
    saleMonitor.start(30000) // Poll every 30 seconds

    // Subscribe to sale monitor events
    saleMonitor.subscribe(async (event) => {
      if (event.type === 'inquiry') {
        await this.handleNewInquiry(event.data as MarketplaceInquiry)
      } else if (event.type === 'sale_completed') {
        await this.handleExternalSale(event.data as CompletedSale)
      }
    })

    // Subscribe to escrow payments
    realEscrow.onPayment(async (transaction) => {
      await this.handlePaymentReceived(transaction)
    })

    toast.success('🤖 Auto-Sale System Active', {
      description: 'Monitoring all marketplaces for buyers',
      duration: 10000,
    })
  }

  stop(): void {
    this.isRunning = false
    saleMonitor.stop()
    logger.info('SALE_FLOW', 'Automated sale flow stopped')
  }

  // ==================== INQUIRY HANDLING ====================

  private async handleNewInquiry(inquiry: MarketplaceInquiry): Promise<void> {
    if (!this.isRunning) return

    const saleId = `sale_${inquiry.domain}_${Date.now()}`
    
    logger.info('SALE_FLOW', `New inquiry: ${inquiry.domain} from ${inquiry.buyerEmail}`)

    const sale: ActiveSale = {
      id: saleId,
      domain: inquiry.domain,
      inquiry,
      status: 'inquiry',
      startedAt: new Date(),
    }

    this.activeSales.set(saleId, sale)
    this.notifyListeners(sale)

    // Get asking price from our records
    const ownedDomain = await supabaseDB.getOwnedDomainByName(inquiry.domain)
    const askingPrice = inquiry.askingPrice || ownedDomain?.current_value || ownedDomain?.estimated_value || 0
    const purchasePrice = ownedDomain?.purchase_price || 0
    const minAcceptable = purchasePrice * 2 // At least 2x ROI

    // Evaluate the offer
    if (inquiry.offerAmount) {
      const offerRatio = inquiry.offerAmount / askingPrice

      // Auto-accept high offers
      if (offerRatio >= this.config.autoAcceptAbove) {
        logger.info('SALE_FLOW', `Auto-accepting offer: $${inquiry.offerAmount} (${(offerRatio * 100).toFixed(0)}% of asking)`)
        await this.acceptOffer(sale, inquiry.offerAmount)
        return
      }

      // Auto-reject low offers
      if (offerRatio < this.config.autoRejectBelow || inquiry.offerAmount < minAcceptable) {
        logger.info('SALE_FLOW', `Auto-rejecting offer: $${inquiry.offerAmount} (too low)`)
        await this.rejectOffer(sale, 'Offer below minimum acceptable price')
        return
      }

      // Negotiate middle-range offers
      if (this.config.autoNegotiate) {
        await this.startNegotiation(sale, inquiry, askingPrice, minAcceptable)
        return
      }
    }

    // No offer amount - start negotiation
    if (this.config.autoNegotiate) {
      await this.startNegotiation(sale, inquiry, askingPrice, minAcceptable)
    }
  }

  // ==================== NEGOTIATION ====================

  private async startNegotiation(
    sale: ActiveSale,
    inquiry: MarketplaceInquiry,
    askingPrice: number,
    minAcceptable: number
  ): Promise<void> {
    sale.status = 'negotiating'

    logger.info('SALE_FLOW', `Starting negotiation for ${inquiry.domain}`)

    try {
      // Use the negotiation bot
      const session = await negotiationBot.startNegotiation(inquiry.domain, {
        askingPrice,
        floorPrice: minAcceptable,
        targetPrice: askingPrice * 0.85, // Target 85% of asking
        initialOffer: inquiry.offerAmount || 0,
        buyerEmail: inquiry.buyerEmail,
        maxRounds: this.config.maxNegotiationRounds,
        autoAcceptAbove: askingPrice * this.config.autoAcceptAbove,
      })

      sale.negotiation = session

      // Subscribe to negotiation completion
      const checkInterval = setInterval(async () => {
        const currentSession = negotiationBot.getSession(session.id)
        
        if (!currentSession) {
          clearInterval(checkInterval)
          return
        }

        if (currentSession.state === 'deal_reached') {
          clearInterval(checkInterval)
          await this.acceptOffer(sale, currentSession.currentOffer)
        } else if (currentSession.state === 'rejected' || currentSession.state === 'expired') {
          clearInterval(checkInterval)
          sale.status = 'failed'
          this.notifyListeners(sale)
        }
      }, 5000) // Check every 5 seconds

    } catch (error: any) {
      logger.error('SALE_FLOW', 'Negotiation failed', { error: error.message })
      
      // Fall back to sending asking price
      await this.sendCounterOffer(inquiry, askingPrice)
    }

    this.notifyListeners(sale)
  }

  private async sendCounterOffer(inquiry: MarketplaceInquiry, price: number): Promise<void> {
    // Send counter offer via marketplace API
    try {
      switch (inquiry.marketplace) {
        case 'godaddy':
          await this.sendGoDaddyCounterOffer(inquiry, price)
          break
        case 'sedo':
          await this.sendSedoCounterOffer(inquiry, price)
          break
        // Add other marketplaces as needed
      }
    } catch (error: any) {
      logger.error('SALE_FLOW', 'Failed to send counter offer', { error: error.message })
    }
  }

  private async sendGoDaddyCounterOffer(inquiry: MarketplaceInquiry, price: number): Promise<void> {
    const gd = masterConfig.getGoDaddy()
    const apiKey = import.meta.env.VITE_GODADDY_KEY || gd.apiKey || 'h2eWy65jfMPV_KSxuT2Q44RY27P3n9YqiA6'
    const apiSecret = import.meta.env.VITE_GODADDY_SECRET || gd.apiSecret || 'LuKboxc1tZ3UGAFJFDvtAE'

    const offerId = inquiry.metadata?.offerId
    if (!offerId) return

    await fetch(`https://api.godaddy.com/v1/aftermarket/listings/${inquiry.metadata?.listingId}/offers/${offerId}/counter`, {
      method: 'POST',
      headers: {
        'Authorization': `sso-key ${apiKey}:${apiSecret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        price,
        message: `Thank you for your interest! I can accept $${price.toLocaleString()} for ${inquiry.domain}. This includes secure Escrow.com payment and fast transfer.`,
      }),
    })
  }

  private async sendSedoCounterOffer(inquiry: MarketplaceInquiry, price: number): Promise<void> {
    const apiKey = import.meta.env.VITE_SEDO_API_KEY
    if (!apiKey) return

    await fetch(`https://api.sedo.com/api/v1/inquiries/${inquiry.metadata?.id}/counter`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        counter_price: price,
        message: `Counter offer: $${price.toLocaleString()}`,
      }),
    })
  }

  // ==================== ACCEPTANCE ====================

  private async acceptOffer(sale: ActiveSale, finalPrice: number): Promise<void> {
    sale.status = 'accepted'
    sale.finalPrice = finalPrice
    
    logger.info('SALE_FLOW', `Offer accepted: ${sale.domain} for $${finalPrice}`)

    toast.success('✅ OFFER ACCEPTED!', {
      description: `${sale.domain}: $${finalPrice.toLocaleString()}`,
      duration: 15000,
    })

    // Mark inquiry as accepted in marketplace
    saleMonitor.markInquiryHandled(sale.inquiry.id, 'accepted')

    // Create escrow
    if (this.config.autoCreateEscrow) {
      await this.createEscrow(sale, finalPrice)
    }

    this.notifyListeners(sale)
  }

  private async rejectOffer(sale: ActiveSale, reason: string): Promise<void> {
    sale.status = 'failed'
    
    logger.info('SALE_FLOW', `Offer rejected: ${sale.domain} - ${reason}`)

    saleMonitor.markInquiryHandled(sale.inquiry.id, 'rejected')
    this.notifyListeners(sale)
  }

  // ==================== ESCROW ====================

  private async createEscrow(sale: ActiveSale, price: number): Promise<void> {
    sale.status = 'escrow_created'

    try {
      const escrow = await realEscrow.createTransaction({
        domain: sale.domain,
        price,
        buyerEmail: sale.inquiry.buyerEmail,
        inspectionDays: 3,
        description: `Premium domain: ${sale.domain}`,
      })

      sale.escrow = escrow

      logger.info('SALE_FLOW', `Escrow created: ${escrow.id} - Payment URL: ${escrow.paymentUrl}`)

      // Send payment link to buyer
      await this.sendPaymentLink(sale, escrow)

      toast.success('🔒 Escrow Created', {
        description: `Payment link sent to ${sale.inquiry.buyerEmail}`,
      })

    } catch (error: any) {
      logger.error('SALE_FLOW', 'Escrow creation failed', { error: error.message })
      sale.status = 'accepted' // Fall back
    }

    this.notifyListeners(sale)
  }

  private async sendPaymentLink(sale: ActiveSale, escrow: EscrowTransaction): Promise<void> {
    // Send via marketplace messaging API
    const message = `
Great! Here's your secure payment link for ${sale.domain}:

🔒 Secure Payment: ${escrow.paymentUrl}

Amount: $${escrow.price.toLocaleString()}
Escrow: Escrow.com (100% buyer protection)
Transfer: Within 5 minutes of payment confirmation

Thank you for your purchase!
`

    try {
      switch (sale.inquiry.marketplace) {
        case 'godaddy':
          await this.sendGoDaddyMessage(sale.inquiry, message)
          break
        case 'sedo':
          await this.sendSedoMessage(sale.inquiry, message)
          break
        // Add other marketplaces
      }
    } catch (error: any) {
      logger.error('SALE_FLOW', 'Failed to send payment link', { error: error.message })
    }
  }

  private async sendGoDaddyMessage(inquiry: MarketplaceInquiry, message: string): Promise<void> {
    const gd = masterConfig.getGoDaddy()
    const apiKey = import.meta.env.VITE_GODADDY_KEY || gd.apiKey
    const apiSecret = import.meta.env.VITE_GODADDY_SECRET || gd.apiSecret

    if (!apiKey || !apiSecret) return

    const offerId = inquiry.metadata?.offerId
    if (!offerId) return

    await fetch(`https://api.godaddy.com/v1/aftermarket/listings/${inquiry.metadata?.listingId}/offers/${offerId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `sso-key ${apiKey}:${apiSecret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message }),
    })
  }

  private async sendSedoMessage(inquiry: MarketplaceInquiry, message: string): Promise<void> {
    const apiKey = import.meta.env.VITE_SEDO_API_KEY
    if (!apiKey) return

    await fetch(`https://api.sedo.com/api/v1/inquiries/${inquiry.metadata?.id}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message }),
    })
  }

  // ==================== PAYMENT HANDLING ====================

  private async handlePaymentReceived(escrow: EscrowTransaction): Promise<void> {
    // Find the sale for this escrow
    const sale = Array.from(this.activeSales.values()).find(s => s.escrow?.id === escrow.id)
    
    if (!sale) {
      logger.warn('SALE_FLOW', 'Payment received but no matching sale found', { escrow })
      return
    }

    sale.status = 'paid'
    
    logger.info('SALE_FLOW', `💰 Payment received for ${sale.domain}!`)

    toast.success('💰 PAYMENT RECEIVED!', {
      description: `${sale.domain}: $${escrow.price.toLocaleString()} - Starting transfer...`,
      duration: 20000,
    })

    // Auto-transfer if enabled
    if (this.config.autoTransferOnPayment) {
      await this.initiateTransfer(sale)
    }

    this.notifyListeners(sale)
  }

  // ==================== TRANSFER ====================

  private async initiateTransfer(sale: ActiveSale): Promise<void> {
    sale.status = 'transferring'
    
    logger.info('SALE_FLOW', `Initiating transfer: ${sale.domain} to ${sale.inquiry.buyerEmail}`)

    try {
      const transfer = await realDomainTransfer.transfer(
        sale.domain,
        sale.inquiry.buyerEmail,
        {
          pushMethod: 'auth_code',
        }
      )

      sale.transfer = transfer

      if (transfer.success) {
        // Mark as shipped in escrow
        if (sale.escrow) {
          await realEscrow.markAsShipped(sale.escrow.id, `Auth code: ${transfer.authCode}`)
        }

        // Send transfer info to buyer
        await this.sendTransferInfo(sale, transfer)

        logger.info('SALE_FLOW', `Transfer initiated: ${sale.domain} - Auth code: ${transfer.authCode}`)

        toast.success('🚀 Transfer Initiated!', {
          description: `${sale.domain} - Auth code sent to buyer`,
        })

        // Complete the sale
        await this.completeSale(sale)
      }

    } catch (error: any) {
      logger.error('SALE_FLOW', 'Transfer failed', { error: error.message })
      sale.status = 'paid' // Fall back - still got paid
    }

    this.notifyListeners(sale)
  }

  private async sendTransferInfo(sale: ActiveSale, transfer: TransferResult): Promise<void> {
    const message = `
🚀 Your domain transfer is ready!

Domain: ${sale.domain}
Authorization Code: ${transfer.authCode}

To complete the transfer:
1. Log into your domain registrar
2. Start a domain transfer
3. Enter the authorization code above
4. The transfer will complete within 5 days

If you have any questions, just reply to this message.

Thank you!
`

    try {
      switch (sale.inquiry.marketplace) {
        case 'godaddy':
          await this.sendGoDaddyMessage(sale.inquiry, message)
          break
        case 'sedo':
          await this.sendSedoMessage(sale.inquiry, message)
          break
      }
    } catch (error: any) {
      logger.error('SALE_FLOW', 'Failed to send transfer info', { error: error.message })
    }
  }

  // ==================== COMPLETION ====================

  private async completeSale(sale: ActiveSale): Promise<void> {
    sale.status = 'completed'
    sale.completedAt = new Date()

    // Calculate profit
    const ownedDomain = await supabaseDB.getOwnedDomainByName(sale.domain)
    const purchasePrice = ownedDomain?.purchase_price || 0
    sale.profit = (sale.finalPrice || 0) - purchasePrice

    logger.info('SALE_FLOW', `🎉 SALE COMPLETED: ${sale.domain} - Profit: $${sale.profit}`)

    toast.success('🎉 SALE COMPLETED!', {
      description: `${sale.domain} sold! Profit: $${sale.profit.toLocaleString()}`,
      duration: 30000,
    })

    // Record the sale
    await supabaseDB.markDomainAsSold(sale.domain, sale.finalPrice || 0)
    
    await supabaseDB.addTransaction({
      type: 'sale',
      domain: sale.domain,
      amount: sale.finalPrice || 0,
      date: new Date().toISOString(),
      status: 'completed',
      details: {
        profit: sale.profit,
        buyer: sale.inquiry.buyerEmail,
        marketplace: sale.inquiry.marketplace,
      },
    })

    // Update empire settings (salePrice, purchasePrice)
    empireSettings.recordSale(sale.finalPrice || 0, purchasePrice)

    // Audit log
    auditLog.log('sale_completed', `Sold ${sale.domain}`, {
      domain: sale.domain,
      inputs: { purchasePrice },
      outputs: { salePrice: sale.finalPrice, profit: sale.profit },
    })

    // Metrics
    metrics.increment('sales_completed')
    metrics.histogram('sale_profit', sale.profit)

    this.notifyListeners(sale)
  }

  private async handleExternalSale(externalSale: CompletedSale): Promise<void> {
    // Sale completed externally (e.g., direct marketplace sale)
    logger.info('SALE_FLOW', `External sale detected: ${externalSale.domain}`)

    // Create a sale record
    const sale: ActiveSale = {
      id: `external_${externalSale.id}`,
      domain: externalSale.domain,
      inquiry: {
        id: externalSale.id,
        marketplace: externalSale.marketplace,
        domain: externalSale.domain,
        buyerEmail: externalSale.buyerEmail,
        message: 'External sale',
        askingPrice: externalSale.salePrice,
        status: 'accepted',
        receivedAt: externalSale.soldAt,
      },
      status: 'completed',
      startedAt: externalSale.soldAt,
      completedAt: externalSale.soldAt,
      finalPrice: externalSale.salePrice,
      profit: externalSale.profit,
    }

    this.activeSales.set(sale.id, sale)
    this.notifyListeners(sale)
  }

  // ==================== SUBSCRIPTIONS ====================

  subscribe(listener: (sale: ActiveSale) => void): () => void {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  private notifyListeners(sale: ActiveSale): void {
    this.listeners.forEach(l => l(sale))
  }

  // ==================== CONFIGURATION ====================

  setConfig(config: Partial<SaleConfig>): void {
    this.config = { ...this.config, ...config }
  }

  getConfig(): SaleConfig {
    return { ...this.config }
  }

  // ==================== PUBLIC GETTERS ====================

  getActiveSales(): ActiveSale[] {
    return Array.from(this.activeSales.values())
  }

  getSale(id: string): ActiveSale | undefined {
    return this.activeSales.get(id)
  }

  getStats() {
    const sales = Array.from(this.activeSales.values())
    const completed = sales.filter(s => s.status === 'completed')
    
    return {
      isRunning: this.isRunning,
      totalSales: sales.length,
      activeSales: sales.filter(s => !['completed', 'failed'].includes(s.status)).length,
      completedSales: completed.length,
      totalRevenue: completed.reduce((sum, s) => sum + (s.finalPrice || 0), 0),
      totalProfit: completed.reduce((sum, s) => sum + (s.profit || 0), 0),
      inquiriesMonitored: saleMonitor.getStats().totalInquiries,
    }
  }
}

export const automatedSaleFlow = new AutomatedSaleFlow()
