/**
 * Auto-Sell Engine
 * Automatically finds buyers, negotiates, and sells domains
 * Handles buyer contact system for domains that were in use
 */

import type { Domain } from '@/types/domain'
import { createMarketplaceClient } from '@/lib/api/marketplaces'
import { valuationEngine } from '@/lib/ai/valuationEngine'
import { generateId } from '@/lib/utils'
import { soundEngine } from '@/lib/sounds/soundEffects'
import confetti from 'canvas-confetti'

interface BuyerContact {
  id: string
  domain: string
  buyerEmail: string
  buyerName?: string
  originalOwner: boolean // Was this domain previously owned by them?
  offerAmount: number
  message?: string
  status: 'pending' | 'negotiating' | 'accepted' | 'rejected'
  createdAt: Date
}

interface SaleOffer {
  id: string
  domain: string
  marketplace: string
  offerAmount: number
  buyerInfo?: {
    email: string
    name?: string
  }
  status: 'pending' | 'accepted' | 'rejected'
  createdAt: Date
}

export class AutoSellEngine {
  private marketplaceClient: ReturnType<typeof createMarketplaceClient>
  private buyerContacts: Map<string, BuyerContact[]> = new Map()
  private activeOffers: Map<string, SaleOffer[]> = new Map()
  private autoNegotiateEnabled: boolean = true
  private minAcceptPriceMultiplier: number = 1.2 // Accept offers 20%+ above purchase price

  constructor(marketplaceConfig: any) {
    this.marketplaceClient = createMarketplaceClient(marketplaceConfig)
  }

  /**
   * Process buyer contact - handles people who want to buy back their domain
   */
  async processBuyerContact(
    domain: string,
    buyerEmail: string,
    message: string,
    offerAmount?: number
  ): Promise<BuyerContact> {
    // Check if this is the original owner
    const isOriginalOwner = await this.checkIfOriginalOwner(domain, buyerEmail)

    // If no offer provided, generate one based on valuation
    if (!offerAmount) {
      const valuation = await valuationEngine.predictValue({ name: domain })
      offerAmount = valuation.value * 0.8 // Start at 80% of estimated value
    }

    const contact: BuyerContact = {
      id: generateId(),
      domain,
      buyerEmail,
      originalOwner: isOriginalOwner,
      offerAmount,
      message,
      status: 'pending',
      createdAt: new Date(),
    }

    // Store contact
    if (!this.buyerContacts.has(domain)) {
      this.buyerContacts.set(domain, [])
    }
    this.buyerContacts.get(domain)!.push(contact)

    // Auto-negotiate if enabled
    if (this.autoNegotiateEnabled) {
      await this.autoNegotiate(contact)
    }

    return contact
  }

  /**
   * Check if buyer was the original owner
   */
  private async checkIfOriginalOwner(domain: string, email: string): Promise<boolean> {
    // In production, check WHOIS history or domain ownership records
    // For now, check if email domain matches
    const emailDomain = email.split('@')[1]
    return domain.includes(emailDomain)
  }

  /**
   * Auto-negotiate with buyer
   */
  private async autoNegotiate(contact: BuyerContact) {
    const valuation = await valuationEngine.predictValue({ name: contact.domain })
    const fairPrice = valuation.value

    // If offer is already good (20%+ above purchase), accept immediately
    // Otherwise, counter-offer at fair price
    if (contact.offerAmount >= fairPrice * 0.9) {
      await this.acceptOffer(contact)
    } else {
      // Send counter-offer
      const counterOffer = Math.max(fairPrice * 0.95, contact.offerAmount * 1.1)
      await this.sendCounterOffer(contact, counterOffer)
    }
  }

  /**
   * Accept buyer offer
   */
  async acceptOffer(contact: BuyerContact): Promise<boolean> {
    try {
      // Process sale
      contact.status = 'accepted'
      
      // In production, this would:
      // 1. Transfer domain to buyer
      // 2. Process payment
      // 3. Update records
      
      // Cash register "cha-ching" sound
      soundEngine.cashRegister()
      
      // Gold confetti
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#D4AF37', '#FFD700', '#F0E68C', '#B8941E']
      })
      
      console.log(`✅ SALE ACCEPTED: ${contact.domain} to ${contact.buyerEmail} for $${contact.offerAmount}`)
      
      return true
    } catch (error) {
      console.error(`Failed to accept offer for ${contact.domain}:`, error)
      return false
    }
  }

  /**
   * Send counter-offer to buyer
   */
  private async sendCounterOffer(contact: BuyerContact, counterAmount: number) {
    contact.status = 'negotiating'
    contact.offerAmount = counterAmount
    
    // In production, send email to buyer with counter-offer
    console.log(`📧 COUNTER-OFFER SENT: ${contact.domain} - $${counterAmount}`)
  }

  /**
   * Check marketplace offers and auto-negotiate
   * NO FALLBACK - Returns empty if no real API configured
   */
  async checkMarketplaceOffers(domain: string): Promise<SaleOffer[]> {
    const offers: SaleOffer[] = []
    
    // TODO: Integrate real marketplace APIs
    // - Afternic API: Check for offers/inquiries
    // - Sedo API: Poll for buyer interest
    // - Flippa API: Monitor auction bids
    // - GoDaddy Marketplace API: Check buy now offers
    // - Namecheap Marketplace API: Check make offer requests
    
    // For now, return empty - NO SIMULATION/FALLBACK
    // User must configure real marketplace APIs
    
    if (offers.length === 0) {
      console.warn(`[AutoSellEngine] No marketplace APIs configured for ${domain}. Configure APIs in Settings to enable offer monitoring.`)
    }

    return offers
  }

  /**
   * Auto-accept good offers and store them properly
   */
  async processOffers(domain: string, purchasePrice: number) {
    const offers = await this.checkMarketplaceOffers(domain)
    
    // Store offers in activeOffers map
    if (offers.length > 0) {
      if (!this.activeOffers.has(domain)) {
        this.activeOffers.set(domain, [])
      }
      this.activeOffers.get(domain)!.push(...offers)
    }
    
    for (const offer of offers) {
      const minAcceptPrice = purchasePrice * this.minAcceptPriceMultiplier
      
      if (offer.offerAmount >= minAcceptPrice) {
        await this.acceptMarketplaceOffer(offer)
      } else if (this.autoNegotiateEnabled) {
        // Counter-offer
        const counterOffer = Math.max(minAcceptPrice, offer.offerAmount * 1.15)
        await this.sendMarketplaceCounterOffer(offer, counterOffer)
        
        // Log counter-offer for persistence (TODO: Store in database)
        console.log(`[AutoSellEngine] Counter-offered ${domain}: $${offer.offerAmount} → $${counterOffer}`)
      }
    }
  }

  /**
   * Accept marketplace offer
   */
  private async acceptMarketplaceOffer(offer: SaleOffer): Promise<boolean> {
    try {
      offer.status = 'accepted'
      
      // Cash register "cha-ching" sound
      soundEngine.cashRegister()
      
      // Gold confetti
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#D4AF37', '#FFD700', '#F0E68C', '#B8941E']
      })
      
      console.log(`✅ MARKETPLACE SALE: ${offer.domain} for $${offer.offerAmount}`)
      return true
    } catch (error) {
      console.error(`Failed to accept marketplace offer:`, error)
      return false
    }
  }

  /**
   * Send marketplace counter-offer
   */
  private async sendMarketplaceCounterOffer(offer: SaleOffer, counterAmount: number) {
    // In production, send counter-offer through marketplace API
    console.log(`📧 MARKETPLACE COUNTER: ${offer.domain} - $${counterAmount}`)
  }

  /**
   * Get buyer contacts for a domain
   */
  getBuyerContacts(domain: string): BuyerContact[] {
    return this.buyerContacts.get(domain) || []
  }

  /**
   * Get all active offers
   */
  getActiveOffers(domain: string): SaleOffer[] {
    return this.activeOffers.get(domain) || []
  }

  /**
   * Enable/disable auto-negotiation
   */
  setAutoNegotiate(enabled: boolean) {
    this.autoNegotiateEnabled = enabled
  }
}

export const createAutoSellEngine = (marketplaceConfig: any) => 
  new AutoSellEngine(marketplaceConfig)

