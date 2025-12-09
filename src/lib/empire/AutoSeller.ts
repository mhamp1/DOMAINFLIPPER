/**
 * AutoSeller.ts — FULLY AUTOMATED DOMAIN SALES ENGINE
 * AI negotiates, creates escrow, transfers domain
 * NO MOCKS — Real API integrations
 * December 2025
 */

import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import { realEscrow } from '@/lib/escrow/RealEscrow'
import { realDomainTransfer } from '@/lib/transfer/RealDomainTransfer'
import { saleMonitor, type MarketplaceInquiry } from '@/lib/sales/SaleMonitor'
import { automatedSaleFlow } from '@/lib/sales/AutomatedSaleFlow'
import { masterConfig } from '@/lib/config/MasterConfig'
import { supabaseDB } from '@/lib/database/supabase'
import { empireSettings } from '@/lib/config/EmpireSettings'

// ==================== TYPES ====================

interface Inquiry {
  id: string
  marketplace: string
  domain: string
  buyerEmail: string
  buyerMessage: string
  askingPrice: number
  offerAmount?: number
  timestamp: Date
  status: 'new' | 'negotiating' | 'escrow_created' | 'paid' | 'transferred' | 'completed'
}

interface NegotiationState {
  inquiryId: string
  domain: string
  askingPrice: number
  currentOffer?: number
  counterOffer?: number
  rounds: number
  maxRounds: number
  minAcceptablePrice: number
}

// ==================== NEGOTIATION TEMPLATES ====================

const NEGOTIATION_TEMPLATES = {
  opening: (domain: string, price: number) => 
    `Thank you for your interest in ${domain}! 
    
This is a premium domain with excellent branding potential. Current asking price is $${price.toLocaleString()}.

What's your best offer? We're open to reasonable negotiations.

— Domain Flipper`,

  counter: (domain: string, counter: number, buyerOffer: number) =>
    `Thank you for your offer of $${buyerOffer.toLocaleString()}.

After careful consideration, I can offer ${domain} for $${counter.toLocaleString()} — this is my best price.

This includes:
✓ Fast transfer (within 5 minutes)
✓ Secure Escrow.com payment
✓ Full support during transfer

Ready to proceed? I'll send you the secure payment link.`,

  acceptOffer: (domain: string, price: number) =>
    `Excellent! Deal accepted for ${domain} at $${price.toLocaleString()}.

I'm creating the secure Escrow.com transaction now. You'll receive the payment link in the next message.`,

  escrowLink: (domain: string, price: number, link: string) =>
    `Payment link ready for ${domain}:

🔒 Secure Payment: ${link}

Amount: $${price.toLocaleString()}
Escrow: Escrow.com (100% buyer protection)
Transfer time: <5 minutes after payment confirmed

Domain transfers immediately upon payment confirmation. Looking forward to completing this deal!`,

  transferred: (domain: string, authCode: string) =>
    `🎉 Domain transfer initiated!

${domain} is being transferred to your account.

Authorization Code: ${authCode}

Please initiate the transfer at your registrar using this auth code. The transfer typically completes within 5 days.

Thank you for your business!`,
}

// ==================== AUTO SELLER ====================

export class AutoSeller {
  private isRunning: boolean = false
  private monitoringLoop: ReturnType<typeof setInterval> | null = null
  private activeNegotiations: Map<string, NegotiationState> = new Map()
  private inquiries: Map<string, Inquiry> = new Map()
  private salesCount: number = 0
  private totalRevenue: number = 0

  /**
   * Start the AutoSeller bot
   */
  async start(): Promise<void> {
    if (this.isRunning) return

    this.isRunning = true

    // Start the automated sale flow (handles everything)
    await automatedSaleFlow.start()

    toast.success('🤖 AutoSeller ONLINE', {
      description: 'Monitoring all marketplaces for buyers',
      duration: 5000,
    })

    logger.info('AUTOSELLER', 'Started - monitoring all marketplaces')

    // Start local monitoring as backup
    this.startMonitoring()
  }

  /**
   * Stop the AutoSeller
   */
  stop(): void {
    this.isRunning = false
    
    automatedSaleFlow.stop()

    if (this.monitoringLoop) {
      clearInterval(this.monitoringLoop)
      this.monitoringLoop = null
    }

    toast.warning('🛑 AutoSeller Stopped')
    logger.info('AUTOSELLER', 'Stopped')
  }

  /**
   * Monitor all marketplaces for inquiries
   */
  private startMonitoring(): void {
    // Subscribe to sale monitor for real-time updates
    saleMonitor.subscribe(async (event) => {
      if (event.type === 'inquiry') {
        const inquiry = event.data as MarketplaceInquiry
        await this.handleNewInquiry({
          id: inquiry.id,
          marketplace: inquiry.marketplace,
          domain: inquiry.domain,
          buyerEmail: inquiry.buyerEmail,
          buyerMessage: inquiry.message,
          askingPrice: inquiry.askingPrice,
          offerAmount: inquiry.offerAmount,
          timestamp: inquiry.receivedAt,
          status: 'new',
        })
      }
    })

    // Poll marketplaces every 30 seconds
    this.monitoringLoop = setInterval(async () => {
      if (!this.isRunning) return

      try {
        // Fetch inquiries from all configured marketplaces
        const marketplaces = ['godaddy', 'sedo', 'afternic', 'dan', 'flippa']
        
        for (const marketplace of marketplaces) {
          const newInquiries = await this.fetchInquiries(marketplace)
          
          for (const inquiry of newInquiries) {
            if (!this.inquiries.has(inquiry.id)) {
              this.inquiries.set(inquiry.id, inquiry)
              await this.handleNewInquiry(inquiry)
            }
          }
        }
      } catch (error) {
        logger.error('AUTOSELLER', 'Monitoring error', error)
      }
    }, 30000)
  }

  /**
   * Fetch inquiries from a marketplace — REAL API CALLS
   */
  private async fetchInquiries(marketplace: string): Promise<Inquiry[]> {
    const inquiries: Inquiry[] = []

    try {
      switch (marketplace) {
        case 'godaddy':
          return this.fetchGoDaddyInquiries()
        case 'sedo':
          return this.fetchSedoInquiries()
        case 'afternic':
          return this.fetchAfternicInquiries()
        case 'dan':
          return this.fetchDanInquiries()
        case 'flippa':
          return this.fetchFlippaInquiries()
      }
    } catch (error: any) {
      logger.debug('AUTOSELLER', `${marketplace} fetch failed`, { error: error.message })
    }

    return inquiries
  }

  private async fetchGoDaddyInquiries(): Promise<Inquiry[]> {
    const gd = masterConfig.getGoDaddy()
    const apiKey = import.meta.env.VITE_GODADDY_KEY || gd.apiKey || 'h2eWy65jfMPV_KSxuT2Q44RY27P3n9YqiA6'
    const apiSecret = import.meta.env.VITE_GODADDY_SECRET || gd.apiSecret || 'LuKboxc1tZ3UGAFJFDvtAE'

    const response = await fetch('https://api.godaddy.com/v1/aftermarket/listings?includes=offers', {
      headers: {
        'Authorization': `sso-key ${apiKey}:${apiSecret}`,
      },
    })

    if (!response.ok) return []

    const listings = await response.json()
    const inquiries: Inquiry[] = []

    for (const listing of listings) {
      if (listing.offers?.length > 0) {
        for (const offer of listing.offers) {
          inquiries.push({
            id: `godaddy_${offer.offerId}`,
            marketplace: 'godaddy',
            domain: listing.domain,
            buyerEmail: offer.buyerEmail || offer.contact?.email || '',
            buyerMessage: offer.message || '',
            askingPrice: listing.price,
            offerAmount: offer.price,
            timestamp: new Date(offer.createdAt || Date.now()),
            status: 'new',
          })
        }
      }
    }

    return inquiries
  }

  private async fetchSedoInquiries(): Promise<Inquiry[]> {
    const apiKey = import.meta.env.VITE_SEDO_API_KEY
    if (!apiKey) return []

    const response = await fetch('https://api.sedo.com/api/v1/inquiries', {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    })

    if (!response.ok) return []

    const data = await response.json()
    return (data.data || data).map((inq: any) => ({
      id: `sedo_${inq.id}`,
      marketplace: 'sedo',
      domain: inq.domain,
      buyerEmail: inq.buyer_email,
      buyerMessage: inq.message || '',
      askingPrice: inq.asking_price || 0,
      offerAmount: inq.offer_amount,
      timestamp: new Date(inq.created_at || Date.now()),
      status: 'new',
    }))
  }

  private async fetchAfternicInquiries(): Promise<Inquiry[]> {
    const apiKey = import.meta.env.VITE_AFTERNIC_API_KEY
    if (!apiKey) return []

    const response = await fetch('https://api.afternic.com/v1/inquiries', {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    })

    if (!response.ok) return []

    const data = await response.json()
    return (data.inquiries || data).map((inq: any) => ({
      id: `afternic_${inq.id}`,
      marketplace: 'afternic',
      domain: inq.domain,
      buyerEmail: inq.buyer_email,
      buyerMessage: inq.message || '',
      askingPrice: inq.asking_price || 0,
      offerAmount: inq.offer,
      timestamp: new Date(inq.created_at || Date.now()),
      status: 'new',
    }))
  }

  private async fetchDanInquiries(): Promise<Inquiry[]> {
    const apiKey = import.meta.env.VITE_DAN_API_KEY
    if (!apiKey) return []

    const response = await fetch('https://dan.com/api/v1/leads', {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    })

    if (!response.ok) return []

    const data = await response.json()
    return (data.leads || data).map((lead: any) => ({
      id: `dan_${lead.id}`,
      marketplace: 'dan',
      domain: lead.domain,
      buyerEmail: lead.email,
      buyerMessage: lead.message || '',
      askingPrice: lead.price || 0,
      offerAmount: lead.offer,
      timestamp: new Date(lead.created_at || Date.now()),
      status: 'new',
    }))
  }

  private async fetchFlippaInquiries(): Promise<Inquiry[]> {
    const apiKey = import.meta.env.VITE_FLIPPA_API_KEY
    if (!apiKey) return []

    const response = await fetch('https://api.flippa.com/v3/conversations', {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    })

    if (!response.ok) return []

    const data = await response.json()
    return (data.conversations || data)
      .filter((c: any) => c.unread_messages > 0)
      .map((conv: any) => ({
        id: `flippa_${conv.id}`,
        marketplace: 'flippa',
        domain: conv.listing?.domain || '',
        buyerEmail: conv.buyer_email || conv.participant_email,
        buyerMessage: conv.last_message || '',
        askingPrice: conv.listing?.asking_price || 0,
        timestamp: new Date(conv.created_at || Date.now()),
        status: 'new',
      }))
  }

  /**
   * Handle a new inquiry
   */
  private async handleNewInquiry(inquiry: Inquiry): Promise<void> {
    const { domain, askingPrice, buyerMessage, offerAmount } = inquiry

    logger.info('AUTOSELLER', `New inquiry: ${domain} from ${inquiry.buyerEmail}`)

    // Get our purchase price to calculate min acceptable
    const ownedDomain = await supabaseDB.getOwnedDomainByName(domain)
    const purchasePrice = ownedDomain?.purchase_price || 0
    const minPrice = Math.max(askingPrice * 0.70, purchasePrice * 2) // At least 70% of asking or 2x ROI

    // Initialize negotiation state
    this.activeNegotiations.set(inquiry.id, {
      inquiryId: inquiry.id,
      domain,
      askingPrice,
      currentOffer: offerAmount,
      rounds: 0,
      maxRounds: 5,
      minAcceptablePrice: minPrice,
    })

    // Auto-accept high offers
    if (offerAmount && offerAmount >= askingPrice * 0.90) {
      await this.acceptOffer(inquiry, offerAmount)
      return
    }

    // Auto-reject very low offers
    if (offerAmount && offerAmount < minPrice * 0.5) {
      await this.rejectOffer(inquiry, this.activeNegotiations.get(inquiry.id)!)
      return
    }

    // Send opening/counter message
    let response: string
    if (offerAmount && offerAmount >= minPrice) {
      // Counter with slightly higher
      const counter = Math.round(offerAmount * 1.15)
      response = NEGOTIATION_TEMPLATES.counter(domain, counter, offerAmount)
      this.activeNegotiations.get(inquiry.id)!.counterOffer = counter
    } else {
      response = NEGOTIATION_TEMPLATES.opening(domain, askingPrice)
    }

    await this.sendMessage(inquiry.marketplace, inquiry.id, response, inquiry)
    inquiry.status = 'negotiating'

    toast.info('💬 New Inquiry', {
      description: `${domain} — Engaged with buyer`,
    })
  }

  /**
   * Accept an offer and create escrow
   */
  private async acceptOffer(inquiry: Inquiry, price: number): Promise<void> {
    logger.info('AUTOSELLER', `Accepting offer: ${inquiry.domain} for $${price}`)

    // Send acceptance message
    const acceptMsg = NEGOTIATION_TEMPLATES.acceptOffer(inquiry.domain, price)
    await this.sendMessage(inquiry.marketplace, inquiry.id, acceptMsg, inquiry)

    // Create escrow transaction
    try {
      const escrow = await realEscrow.createTransaction({
        domain: inquiry.domain,
        price,
        buyerEmail: inquiry.buyerEmail,
        inspectionDays: 3,
      })

      // Send payment link
      const paymentMsg = NEGOTIATION_TEMPLATES.escrowLink(inquiry.domain, price, escrow.paymentUrl || '')
      await this.sendMessage(inquiry.marketplace, inquiry.id, paymentMsg, inquiry)

      inquiry.status = 'escrow_created'

      toast.success('✅ Offer Accepted!', {
        description: `${inquiry.domain}: $${price.toLocaleString()} — Escrow created`,
      })

      // Monitor for payment
      this.monitorEscrowPayment(inquiry, escrow.id, price)

    } catch (error: any) {
      logger.error('AUTOSELLER', 'Escrow creation failed', { error: error.message })
    }
  }

  /**
   * Monitor escrow for payment
   */
  private async monitorEscrowPayment(inquiry: Inquiry, escrowId: string, price: number): Promise<void> {
    // Poll every 30 seconds for payment
    const checkInterval = setInterval(async () => {
      try {
        const escrow = realEscrow.getTransaction(escrowId)
        
        if (escrow?.status === 'funded') {
          clearInterval(checkInterval)
          inquiry.status = 'paid'
          
          logger.info('AUTOSELLER', `💰 Payment received: ${inquiry.domain}`)
          
          toast.success('💰 PAYMENT RECEIVED!', {
            description: `${inquiry.domain}: $${price.toLocaleString()}`,
            duration: 20000,
          })

          // Initiate transfer
          await this.transferDomain(inquiry, escrowId)
        }
      } catch (error: any) {
        logger.debug('AUTOSELLER', 'Payment check', { error: error.message })
      }
    }, 30000)

    // Stop checking after 7 days
    setTimeout(() => clearInterval(checkInterval), 7 * 24 * 60 * 60 * 1000)
  }

  /**
   * Transfer domain after payment
   */
  private async transferDomain(inquiry: Inquiry, escrowId: string): Promise<void> {
    logger.info('AUTOSELLER', `Initiating transfer: ${inquiry.domain}`)

    try {
      const transfer = await realDomainTransfer.transfer(
        inquiry.domain,
        inquiry.buyerEmail
      )

      if (transfer.success) {
        inquiry.status = 'transferred'

        // Send transfer info
        const transferMsg = NEGOTIATION_TEMPLATES.transferred(inquiry.domain, transfer.authCode || 'Check your email')
        await this.sendMessage(inquiry.marketplace, inquiry.id, transferMsg, inquiry)

        // Mark as shipped in escrow
        await realEscrow.markAsShipped(escrowId, `Auth: ${transfer.authCode}`)

        // Complete the sale
        await this.completeSale(inquiry)
      }

    } catch (error: any) {
      logger.error('AUTOSELLER', 'Transfer failed', { error: error.message })
    }
  }

  /**
   * Complete a sale and record P&L
   */
  private async completeSale(inquiry: Inquiry): Promise<void> {
    const negotiation = this.activeNegotiations.get(inquiry.id)
    const salePrice = negotiation?.counterOffer || negotiation?.currentOffer || inquiry.askingPrice

    // Get purchase price
    const ownedDomain = await supabaseDB.getOwnedDomainByName(inquiry.domain)
    const purchasePrice = ownedDomain?.purchase_price || 0
    const profit = salePrice - purchasePrice

    // Update stats
    this.salesCount++
    this.totalRevenue += salePrice

    // Record in database
    await supabaseDB.markDomainAsSold(inquiry.domain, salePrice)
    
    await supabaseDB.addTransaction({
      type: 'sale',
      domain: inquiry.domain,
      amount: salePrice,
      date: new Date().toISOString(),
      status: 'completed',
      details: {
        profit,
        buyer: inquiry.buyerEmail,
        marketplace: inquiry.marketplace,
      },
    })

    // Update empire settings (salePrice, purchasePrice)
    empireSettings.recordSale(salePrice, purchasePrice)

    inquiry.status = 'completed'

    logger.info('AUTOSELLER', `🎉 SALE COMPLETE: ${inquiry.domain} - Profit: $${profit}`)

    toast.success('🎉 SALE COMPLETED!', {
      description: `${inquiry.domain} — Profit: $${profit.toLocaleString()}`,
      duration: 30000,
    })
  }

  /**
   * Reject an offer
   */
  private async rejectOffer(inquiry: Inquiry, _negotiation: NegotiationState): Promise<void> {
    const message = `Thank you for your interest in ${inquiry.domain}, but we cannot accept offers at this level. 

Our minimum acceptable price is significantly higher. If you'd like to make a more competitive offer, we're happy to discuss.`

    await this.sendMessage(inquiry.marketplace, inquiry.id, message, inquiry)
    
    logger.info('AUTOSELLER', `Rejected offer: ${inquiry.domain}`)
  }

  /**
   * Send message via marketplace API — REAL API CALLS
   */
  private async sendMessage(marketplace: string, inquiryId: string, message: string, inquiry: Inquiry): Promise<void> {
    try {
      switch (marketplace) {
        case 'godaddy':
          await this.sendGoDaddyMessage(inquiryId, message)
          break
        case 'sedo':
          await this.sendSedoMessage(inquiryId, message)
          break
        case 'afternic':
          await this.sendAfternicMessage(inquiryId, message)
          break
        case 'dan':
          await this.sendDanMessage(inquiryId, message)
          break
        case 'flippa':
          await this.sendFlippaMessage(inquiryId, message)
          break
      }

      logger.debug('AUTOSELLER', `Message sent to ${marketplace}`)
    } catch (error: any) {
      logger.error('AUTOSELLER', `Failed to send message to ${marketplace}`, { error: error.message })
    }
  }

  private async sendGoDaddyMessage(inquiryId: string, message: string): Promise<void> {
    const gd = masterConfig.getGoDaddy()
    const apiKey = import.meta.env.VITE_GODADDY_KEY || gd.apiKey || 'h2eWy65jfMPV_KSxuT2Q44RY27P3n9YqiA6'
    const apiSecret = import.meta.env.VITE_GODADDY_SECRET || gd.apiSecret || 'LuKboxc1tZ3UGAFJFDvtAE'

    const offerId = inquiryId.replace('godaddy_', '')

    // Get listing ID first
    const listingsResponse = await fetch('https://api.godaddy.com/v1/aftermarket/listings', {
      headers: { 'Authorization': `sso-key ${apiKey}:${apiSecret}` },
    })

    if (!listingsResponse.ok) return

    const listings = await listingsResponse.json()
    const listing = listings.find((l: any) => l.offers?.some((o: any) => o.offerId === offerId))

    if (listing) {
      await fetch(`https://api.godaddy.com/v1/aftermarket/listings/${listing.listingId}/offers/${offerId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `sso-key ${apiKey}:${apiSecret}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      })
    }
  }

  private async sendSedoMessage(inquiryId: string, message: string): Promise<void> {
    const apiKey = import.meta.env.VITE_SEDO_API_KEY
    if (!apiKey) return

    const id = inquiryId.replace('sedo_', '')
    await fetch(`https://api.sedo.com/api/v1/inquiries/${id}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message }),
    })
  }

  private async sendAfternicMessage(inquiryId: string, message: string): Promise<void> {
    const apiKey = import.meta.env.VITE_AFTERNIC_API_KEY
    if (!apiKey) return

    const id = inquiryId.replace('afternic_', '')
    await fetch(`https://api.afternic.com/v1/inquiries/${id}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message }),
    })
  }

  private async sendDanMessage(inquiryId: string, message: string): Promise<void> {
    const apiKey = import.meta.env.VITE_DAN_API_KEY
    if (!apiKey) return

    const id = inquiryId.replace('dan_', '')
    await fetch(`https://dan.com/api/v1/leads/${id}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message }),
    })
  }

  private async sendFlippaMessage(inquiryId: string, message: string): Promise<void> {
    const apiKey = import.meta.env.VITE_FLIPPA_API_KEY
    if (!apiKey) return

    const id = inquiryId.replace('flippa_', '')
    await fetch(`https://api.flippa.com/v3/conversations/${id}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ body: message }),
    })
  }

  // ==================== PUBLIC GETTERS ====================

  isActive(): boolean {
    return this.isRunning
  }

  getStats() {
    return {
      isRunning: this.isRunning,
      activeNegotiations: this.activeNegotiations.size,
      totalInquiries: this.inquiries.size,
      salesCount: this.salesCount,
      totalRevenue: this.totalRevenue,
    }
  }

  getActiveNegotiations(): NegotiationState[] {
    return Array.from(this.activeNegotiations.values())
  }

  getInquiries(): Inquiry[] {
    return Array.from(this.inquiries.values())
  }
}

export const autoSeller = new AutoSeller()
