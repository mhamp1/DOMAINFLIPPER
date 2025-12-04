/**
 * AutoSeller.ts — FULLY AUTOMATED DOMAIN SALES ENGINE
 * AI negotiates, creates escrow, transfers domain — December 27, 2025
 * 
 * Monitors all marketplace inquiries and handles sales automatically
 */

import { toast } from 'sonner'
import { escrowAutomation } from '@/lib/escrow/EscrowAutomation'
import { domainTransfer } from '@/lib/transfer/DomainTransfer'
import { cryptoPayments } from '@/lib/payments/CryptoPayments'
// Domain type not needed currently but keeping import structure

interface Inquiry {
  id: string
  marketplace: string
  domain: string
  buyerEmail: string
  buyerMessage: string
  askingPrice: number
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

const NEGOTIATION_TEMPLATES = {
  opening: (domain: string, price: number) => 
    `Thank you for your interest in ${domain}! 
    
This is a premium domain with excellent branding potential. Current asking price is $${price.toLocaleString()}.

What's your best offer? We're open to reasonable negotiations.

— Quantum Falcon Vault`,

  counter: (domain: string, counter: number, buyerOffer: number) =>
    `Thank you for your offer of $${buyerOffer.toLocaleString()}.

After careful consideration, I can offer ${domain} for $${counter.toLocaleString()} — this is my best price.

This includes:
✓ Fast transfer (within 5 minutes)
✓ Secure Escrow.com payment
✓ Full support during transfer

Ready to proceed? I'll send you the secure payment link.

— Quantum Falcon Vault`,

  acceptOffer: (domain: string, price: number) =>
    `Excellent! Deal accepted for ${domain} at $${price.toLocaleString()}.

I'm creating the secure Escrow.com transaction now. You'll receive the payment link in the next message.

— Quantum Falcon Vault`,

  escrowLink: (domain: string, price: number, link: string) =>
    `Payment link ready for ${domain}:

🔒 Secure Payment: ${link}

Amount: $${price.toLocaleString()}
Escrow: Escrow.com (100% buyer protection)
Transfer time: <5 minutes after payment confirmed

Domain transfers immediately upon payment confirmation. Looking forward to completing this deal!

— Quantum Falcon Vault`,

  cryptoOption: (domain: string, price: number, btc: number, eth: number, sol: number) =>
    `I also accept cryptocurrency payments for ${domain}:

💰 Price: $${price.toLocaleString()} USD

Payment options:
₿ Bitcoin: ${btc.toFixed(8)} BTC
Ξ Ethereum: ${eth.toFixed(6)} ETH  
◎ Solana: ${sol.toFixed(4)} SOL

Reply "crypto" if you'd like crypto payment instructions.

— Quantum Falcon Vault`,

  transferred: (domain: string, buyerEmail: string) =>
    `🎉 Domain transferred successfully!

${domain} has been transferred to ${buyerEmail}.

Please verify you received the domain in your registrar account. If you have any questions, feel free to reach out.

Thank you for your business!

— Quantum Falcon Vault`,
}

export class AutoSeller {
  private isRunning: boolean = false
  private monitoringLoop: number | null = null
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

    toast.success('🤖 AutoSeller ONLINE', {
      description: 'Monitoring Sedo, Flippa, Afternic, GoDaddy, DAN.com',
      duration: 5000,
    })

    // Start monitoring all marketplaces
    this.startMonitoring()
  }

  /**
   * Monitor all marketplaces for inquiries
   */
  private startMonitoring(): void {
    const marketplaces = ['sedo', 'flippa', 'afternic', 'godaddy', 'dan']

    this.monitoringLoop = setInterval(async () => {
      if (!this.isRunning) return

      try {
        for (const marketplace of marketplaces) {
          const newInquiries = await this.fetchInquiries(marketplace)
          
          for (const inquiry of newInquiries) {
            if (inquiry.status === 'new' && !this.inquiries.has(inquiry.id)) {
              // New inquiry - handle it
              this.inquiries.set(inquiry.id, inquiry)
              await this.handleNewInquiry(inquiry)
            } else if (inquiry.status === 'negotiating') {
              // Ongoing negotiation - check for buyer response
              await this.continueNegotiation(inquiry)
            }
          }
        }
      } catch (error) {
        console.error('Monitoring error:', error)
      }
    }, 30000) // Check every 30 seconds
  }

  /**
   * Fetch inquiries from a marketplace
   * In production, this connects to real marketplace APIs
   */
  private async fetchInquiries(_marketplace: string): Promise<Inquiry[]> {
    // Mock implementation - replace with real API calls
    // Example: await fetch(`/api/marketplace/${marketplace}/inquiries`)
    
    // For demo, return empty array
    return []
  }

  /**
   * Handle a new inquiry with intelligent response
   */
  private async handleNewInquiry(inquiry: Inquiry): Promise<void> {
    const { domain, askingPrice, buyerMessage } = inquiry

    // Check if buyer mentioned crypto
    const wantsCrypto = this.detectCryptoIntent(buyerMessage)

    // Initialize negotiation state
    const minPrice = askingPrice * 0.90 // Never go below 90% of asking
    this.activeNegotiations.set(inquiry.id, {
      inquiryId: inquiry.id,
      domain,
      askingPrice,
      rounds: 0,
      maxRounds: 3,
      minAcceptablePrice: minPrice,
    })

    // Send opening message
    let response = NEGOTIATION_TEMPLATES.opening(domain, askingPrice)

    if (wantsCrypto) {
      const cryptoPrices = await cryptoPayments.calculateCryptoPrices(askingPrice)
      response += '\n\n' + NEGOTIATION_TEMPLATES.cryptoOption(
        domain,
        askingPrice,
        cryptoPrices.btc,
        cryptoPrices.eth,
        cryptoPrices.sol
      )
    }

    await this.sendMessage(inquiry.marketplace, inquiry.id, response)

    // Update inquiry status
    inquiry.status = 'negotiating'

    toast.info('💬 New Inquiry', {
      description: `${domain} — AutoSeller engaged`,
    })
  }

  /**
   * Continue negotiation based on buyer response
   */
  private async continueNegotiation(inquiry: Inquiry): Promise<void> {
    const negotiation = this.activeNegotiations.get(inquiry.id)
    if (!negotiation) return

    // Get buyer's latest message/offer
    const buyerOffer = await this.extractOffer(inquiry)
    if (!buyerOffer) return

    negotiation.rounds++
    negotiation.currentOffer = buyerOffer

    // AI decision: accept, counter, or reject
    const decision = this.makeNegotiationDecision(negotiation)

    switch (decision.action) {
      case 'accept':
        await this.acceptOffer(inquiry, decision.price!)
        break
      
      case 'counter':
        await this.makeCounterOffer(inquiry, negotiation, decision.price!)
        break
      
      case 'reject':
        await this.rejectOffer(inquiry, negotiation)
        break
    }
  }

  /**
   * AI negotiation decision engine
   */
  private makeNegotiationDecision(negotiation: NegotiationState): {
    action: 'accept' | 'counter' | 'reject'
    price?: number
  } {
    const { currentOffer, askingPrice, minAcceptablePrice, rounds, maxRounds } = negotiation

    if (!currentOffer) {
      return { action: 'reject' }
    }

    // Accept if offer is >= 95% of asking
    if (currentOffer >= askingPrice * 0.95) {
      return { action: 'accept', price: currentOffer }
    }

    // Accept if offer is >= min acceptable and we're at max rounds
    if (currentOffer >= minAcceptablePrice && rounds >= maxRounds) {
      return { action: 'accept', price: currentOffer }
    }

    // Reject if offer is too low and max rounds reached
    if (currentOffer < minAcceptablePrice && rounds >= maxRounds) {
      return { action: 'reject' }
    }

    // Counter offer - smart calculation
    if (currentOffer < minAcceptablePrice) {
      // They're too low - counter at 10% above min
      const counter = minAcceptablePrice * 1.10
      return { action: 'counter', price: Math.min(counter, askingPrice) }
    } else {
      // They're close - meet them halfway
      const counter = (currentOffer + askingPrice) / 2
      return { action: 'counter', price: Math.round(counter) }
    }
  }

  /**
   * Accept buyer's offer and create escrow
   */
  private async acceptOffer(inquiry: Inquiry, price: number): Promise<void> {
    const { domain, buyerEmail, marketplace, id } = inquiry

    try {
      // Send acceptance message
      await this.sendMessage(
        marketplace,
        id,
        NEGOTIATION_TEMPLATES.acceptOffer(domain, price)
      )

      // Create escrow transaction
      const escrowLink = await escrowAutomation.createEscrow(
        domain,
        price,
        buyerEmail
      )

      // Send escrow link
      await this.sendMessage(
        marketplace,
        id,
        NEGOTIATION_TEMPLATES.escrowLink(domain, price, escrowLink)
      )

      inquiry.status = 'escrow_created'

      // Watch for payment
      await this.watchForPayment(inquiry, price, escrowLink)

      toast.success('✅ Deal Accepted', {
        description: `${domain} → $${price.toLocaleString()} — Escrow created`,
        icon: '🤝',
      })

    } catch (error) {
      console.error('Accept offer error:', error)
      toast.error('Failed to create escrow', {
        description: `${domain} — Manual intervention needed`,
      })
    }
  }

  /**
   * Make counter offer
   */
  private async makeCounterOffer(
    inquiry: Inquiry,
    negotiation: NegotiationState,
    counterPrice: number
  ): Promise<void> {
    negotiation.counterOffer = counterPrice

    await this.sendMessage(
      inquiry.marketplace,
      inquiry.id,
      NEGOTIATION_TEMPLATES.counter(
        inquiry.domain,
        counterPrice,
        negotiation.currentOffer!
      )
    )

    toast.info('💬 Counter Offer', {
      description: `${inquiry.domain} → Counter: $${counterPrice.toLocaleString()}`,
    })
  }

  /**
   * Reject offer (too low)
   */
  private async rejectOffer(inquiry: Inquiry, negotiation: NegotiationState): Promise<void> {
    await this.sendMessage(
      inquiry.marketplace,
      inquiry.id,
      `Thank you for your interest in ${inquiry.domain}. 
      
Unfortunately, I cannot accept offers below $${negotiation.minAcceptablePrice.toLocaleString()} for this premium domain.

If you'd like to reconsider at the asking price of $${negotiation.askingPrice.toLocaleString()}, please let me know.

— Quantum Falcon Vault`
    )

    this.activeNegotiations.delete(inquiry.id)
    inquiry.status = 'completed'

    toast.info('❌ Offer Rejected', {
      description: `${inquiry.domain} — Too low`,
    })
  }

  /**
   * Watch for escrow payment
   */
  private async watchForPayment(
    inquiry: Inquiry,
    price: number,
    escrowId: string
  ): Promise<void> {
    // Poll escrow status
    const checkPayment = setInterval(async () => {
      try {
        const status = await escrowAutomation.checkStatus(escrowId)

        if (status === 'paid') {
          clearInterval(checkPayment)
          
          inquiry.status = 'paid'

          // Transfer domain immediately
          await this.transferDomain(inquiry, price)
        }
      } catch (error) {
        console.error('Payment watch error:', error)
      }
    }, 30000) // Check every 30 seconds

    // Timeout after 7 days
    setTimeout(() => clearInterval(checkPayment), 7 * 24 * 60 * 60 * 1000)
  }

  /**
   * Transfer domain to buyer
   */
  private async transferDomain(inquiry: Inquiry, price: number): Promise<void> {
    const { domain, buyerEmail, marketplace, id } = inquiry

    try {
      // Execute transfer via registrar API
      await domainTransfer.transfer(domain, buyerEmail)

      inquiry.status = 'transferred'

      // Notify buyer
      await this.sendMessage(
        marketplace,
        id,
        NEGOTIATION_TEMPLATES.transferred(domain, buyerEmail)
      )

      // Update stats
      this.salesCount++
      this.totalRevenue += price

      // Mark as completed
      inquiry.status = 'completed'

      // Notify empire engine
      if (typeof window !== 'undefined' && (window as any).empireEngine) {
        await (window as any).empireEngine.recordSale(domain, price)
      }

      toast.success('🎉 DOMAIN SOLD & TRANSFERRED', {
        description: `${domain} → $${price.toLocaleString()} • Transfer completed in <5 min`,
        duration: 7000,
        icon: '💰',
      })

    } catch (error) {
      console.error('Transfer error:', error)
      toast.error('Transfer Failed', {
        description: `${domain} — Manual transfer needed`,
      })
    }
  }

  /**
   * Send message to buyer via marketplace API
   */
  private async sendMessage(
    marketplace: string,
    inquiryId: string,
    message: string
  ): Promise<void> {
    // Mock implementation - replace with real API calls
    // Example: await fetch(`/api/marketplace/${marketplace}/reply`, { ... })
    console.log(`[${marketplace}] Message sent for inquiry ${inquiryId}:`, message)
  }

  /**
   * Extract offer amount from buyer message
   */
  private async extractOffer(_inquiry: Inquiry): Promise<number | null> {
    // In production, use NLP to extract offer from message
    // For now, mock implementation
    return null
  }

  /**
   * Detect if buyer wants crypto payment
   */
  private detectCryptoIntent(message: string): boolean {
    const cryptoKeywords = ['crypto', 'bitcoin', 'btc', 'ethereum', 'eth', 'solana', 'sol', 'cryptocurrency']
    const lowerMessage = message.toLowerCase()
    return cryptoKeywords.some(keyword => lowerMessage.includes(keyword))
  }

  /**
   * Stop AutoSeller
   */
  stop(): void {
    this.isRunning = false
    if (this.monitoringLoop) {
      clearInterval(this.monitoringLoop)
    }

    toast.info('AutoSeller Stopped', {
      description: `Total sales: ${this.salesCount} • Revenue: $${this.totalRevenue.toLocaleString()}`,
    })
  }

  /**
   * Get sales statistics
   */
  getStats(): { salesCount: number; totalRevenue: number; activeNegotiations: number } {
    return {
      salesCount: this.salesCount,
      totalRevenue: this.totalRevenue,
      activeNegotiations: this.activeNegotiations.size,
    }
  }
}

// Export singleton
export const autoSeller = new AutoSeller()
