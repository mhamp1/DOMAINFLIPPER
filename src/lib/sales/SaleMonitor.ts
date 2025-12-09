/**
 * SaleMonitor.ts — REAL-TIME SALE DETECTION & MONITORING
 * Polls ALL marketplaces for inquiries, offers, and completed sales
 * NO MOCKS — Real API calls only
 * December 2025
 */

import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import { supabaseDB } from '@/lib/database/supabase'
import { masterConfig } from '@/lib/config/MasterConfig'
import { empireSettings } from '@/lib/config/EmpireSettings'
import { auditLog } from '@/lib/infrastructure/AuditLog'
import { metrics } from '@/lib/infrastructure/Metrics'

// ==================== TYPES ====================

export interface MarketplaceInquiry {
  id: string
  marketplace: string
  domain: string
  buyerEmail: string
  buyerName?: string
  message: string
  offerAmount?: number
  askingPrice: number
  status: 'new' | 'responded' | 'negotiating' | 'accepted' | 'rejected' | 'expired'
  receivedAt: Date
  respondedAt?: Date
  expiresAt?: Date
  metadata?: Record<string, any>
}

export interface WonAuction {
  id: string
  marketplace: string
  domain: string
  winningBid: number
  auctionEndTime: Date
  paymentDue: Date
  paymentStatus: 'pending' | 'paid' | 'failed'
  transferStatus: 'pending' | 'initiated' | 'completed'
}

export interface CompletedSale {
  id: string
  marketplace: string
  domain: string
  salePrice: number
  buyerEmail: string
  purchasePrice: number
  profit: number
  roi: number
  soldAt: Date
  transferStatus: 'pending' | 'in_progress' | 'completed'
  paymentStatus: 'pending' | 'received' | 'disbursed'
}

export type SaleMonitorListener = (event: {
  type: 'inquiry' | 'auction_won' | 'sale_completed' | 'payment_received'
  data: MarketplaceInquiry | WonAuction | CompletedSale
}) => void

// ==================== SALE MONITOR ====================

class SaleMonitor {
  private isRunning: boolean = false
  private pollInterval: ReturnType<typeof setInterval> | null = null
  private listeners: SaleMonitorListener[] = []
  
  // Caches
  private inquiries: Map<string, MarketplaceInquiry> = new Map()
  private wonAuctions: Map<string, WonAuction> = new Map()
  private completedSales: Map<string, CompletedSale> = new Map()
  private lastPollTime: Map<string, Date> = new Map()

  // API credentials
  private getGoDaddyCredentials() {
    const key = import.meta.env.VITE_GODADDY_KEY || masterConfig.getGoDaddy().apiKey || 'h2eWy65jfMPV_KSxuT2Q44RY27P3n9YqiA6'
    const secret = import.meta.env.VITE_GODADDY_SECRET || masterConfig.getGoDaddy().apiSecret || 'LuKboxc1tZ3UGAFJFDvtAE'
    return { key, secret }
  }

  // ==================== LIFECYCLE ====================

  start(intervalMs: number = 60000): void {
    if (this.isRunning) return

    this.isRunning = true
    logger.info('SALE_MONITOR', `Starting sale monitor (polling every ${intervalMs / 1000}s)`)

    // Initial poll
    this.pollAllMarketplaces()

    // Start polling loop
    this.pollInterval = setInterval(() => {
      this.pollAllMarketplaces()
    }, intervalMs)

    toast.success('📡 Sale Monitor Active', {
      description: 'Monitoring all marketplaces for inquiries and sales',
    })
  }

  stop(): void {
    this.isRunning = false
    if (this.pollInterval) {
      clearInterval(this.pollInterval)
      this.pollInterval = null
    }
    logger.info('SALE_MONITOR', 'Sale monitor stopped')
  }

  // ==================== POLLING ====================

  private async pollAllMarketplaces(): Promise<void> {
    if (!this.isRunning) return

    const startTime = Date.now()
    
    try {
      // Poll all marketplaces in parallel
      await Promise.all([
        this.pollGoDaddy(),
        this.pollSedo(),
        this.pollAfternic(),
        this.pollDan(),
        this.pollFlippa(),
      ])

      metrics.histogram('sale_monitor_poll_duration', Date.now() - startTime)
      metrics.increment('sale_monitor_polls')

    } catch (error: any) {
      logger.error('SALE_MONITOR', 'Poll failed', { error: error.message })
      metrics.increment('sale_monitor_errors')
    }
  }

  // ==================== GODADDY POLLING ====================

  private async pollGoDaddy(): Promise<void> {
    const { key, secret } = this.getGoDaddyCredentials()
    if (!key || !secret) return

    try {
      // 1. Check for aftermarket inquiries/offers
      await this.pollGoDaddyInquiries(key, secret)
      
      // 2. Check for won auctions
      await this.pollGoDaddyWonAuctions(key, secret)
      
      // 3. Check for completed sales
      await this.pollGoDaddyCompletedSales(key, secret)

      this.lastPollTime.set('godaddy', new Date())

    } catch (error: any) {
      logger.warn('SALE_MONITOR', 'GoDaddy poll failed', { error: error.message })
    }
  }

  private async pollGoDaddyInquiries(apiKey: string, apiSecret: string): Promise<void> {
    try {
      // GoDaddy Aftermarket API - Get offers/inquiries
      const response = await fetch('https://api.godaddy.com/v1/aftermarket/listings?includes=offers', {
        headers: {
          'Authorization': `sso-key ${apiKey}:${apiSecret}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`GoDaddy API error: ${error}`)
      }

      const listings = await response.json()

      // Process each listing with offers
      for (const listing of listings) {
        if (listing.offers && listing.offers.length > 0) {
          for (const offer of listing.offers) {
            const inquiryId = `godaddy_${listing.domain}_${offer.offerId}`
            
            if (!this.inquiries.has(inquiryId)) {
              const inquiry: MarketplaceInquiry = {
                id: inquiryId,
                marketplace: 'godaddy',
                domain: listing.domain,
                buyerEmail: offer.buyerEmail || offer.contact?.email || 'unknown',
                buyerName: offer.buyerName || offer.contact?.name,
                message: offer.message || 'Offer received',
                offerAmount: offer.price || offer.amount,
                askingPrice: listing.price,
                status: 'new',
                receivedAt: new Date(offer.createdAt || Date.now()),
                expiresAt: offer.expiresAt ? new Date(offer.expiresAt) : undefined,
                metadata: { offerId: offer.offerId, listingId: listing.listingId },
              }

              this.inquiries.set(inquiryId, inquiry)
              this.notifyListeners({ type: 'inquiry', data: inquiry })

              logger.info('SALE_MONITOR', `New GoDaddy offer: ${listing.domain} - $${offer.price}`)
              
              toast.info('💰 New Offer Received!', {
                description: `${listing.domain}: $${offer.price?.toLocaleString()}`,
                duration: 10000,
              })

              auditLog.log('offer_received', `GoDaddy offer for ${listing.domain}`, {
                domain: listing.domain,
                inputs: { offerAmount: offer.price, askingPrice: listing.price },
              })
            }
          }
        }
      }

    } catch (error: any) {
      // Don't throw - just log
      logger.debug('SALE_MONITOR', 'GoDaddy inquiries check', { error: error.message })
    }
  }

  private async pollGoDaddyWonAuctions(apiKey: string, apiSecret: string): Promise<void> {
    try {
      // Check auction wins
      const response = await fetch('https://api.godaddy.com/v1/auctions?status=won', {
        headers: {
          'Authorization': `sso-key ${apiKey}:${apiSecret}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) return

      const auctions = await response.json()

      for (const auction of auctions) {
        const auctionId = `godaddy_won_${auction.auctionId}`
        
        if (!this.wonAuctions.has(auctionId)) {
          const won: WonAuction = {
            id: auctionId,
            marketplace: 'godaddy',
            domain: auction.domain,
            winningBid: auction.price || auction.winningBid,
            auctionEndTime: new Date(auction.endTime || Date.now()),
            paymentDue: new Date(auction.paymentDueDate || Date.now() + 7 * 24 * 60 * 60 * 1000),
            paymentStatus: 'pending',
            transferStatus: 'pending',
          }

          this.wonAuctions.set(auctionId, won)
          this.notifyListeners({ type: 'auction_won', data: won })

          logger.info('SALE_MONITOR', `Won auction: ${auction.domain} for $${auction.price}`)
          
          toast.success('🏆 AUCTION WON!', {
            description: `${auction.domain} - $${auction.price?.toLocaleString()}`,
            duration: 15000,
          })
        }
      }

    } catch (error: any) {
      logger.debug('SALE_MONITOR', 'GoDaddy auctions check', { error: error.message })
    }
  }

  private async pollGoDaddyCompletedSales(apiKey: string, apiSecret: string): Promise<void> {
    try {
      // Check for domains that have been sold
      const response = await fetch('https://api.godaddy.com/v1/aftermarket/sales?status=completed', {
        headers: {
          'Authorization': `sso-key ${apiKey}:${apiSecret}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) return

      const sales = await response.json()

      for (const sale of sales) {
        const saleId = `godaddy_sale_${sale.saleId || sale.domain}`
        
        if (!this.completedSales.has(saleId)) {
          // Get purchase price from our records
          const ownedDomain = await supabaseDB.getOwnedDomainByName(sale.domain)
          const purchasePrice = ownedDomain?.purchase_price || 0
          const profit = sale.price - purchasePrice
          const roi = purchasePrice > 0 ? ((profit / purchasePrice) * 100) : 0

          const completed: CompletedSale = {
            id: saleId,
            marketplace: 'godaddy',
            domain: sale.domain,
            salePrice: sale.price,
            buyerEmail: sale.buyerEmail || 'via GoDaddy',
            purchasePrice,
            profit,
            roi,
            soldAt: new Date(sale.completedAt || Date.now()),
            transferStatus: 'completed',
            paymentStatus: 'received',
          }

          this.completedSales.set(saleId, completed)
          this.notifyListeners({ type: 'sale_completed', data: completed })

          // Record the sale
          await this.recordSale(completed)

          logger.info('SALE_MONITOR', `SALE COMPLETED: ${sale.domain} for $${sale.price} (profit: $${profit})`)
          
          toast.success('🎉 DOMAIN SOLD!', {
            description: `${sale.domain} - $${sale.price?.toLocaleString()} (Profit: $${profit.toLocaleString()})`,
            duration: 20000,
          })
        }
      }

    } catch (error: any) {
      logger.debug('SALE_MONITOR', 'GoDaddy sales check', { error: error.message })
    }
  }

  // ==================== SEDO POLLING ====================

  private async pollSedo(): Promise<void> {
    const apiKey = import.meta.env.VITE_SEDO_API_KEY
    if (!apiKey) return

    try {
      // Sedo Partner API - Get inquiries
      const response = await fetch('https://api.sedo.com/api/v1/inquiries', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) return

      const inquiries = await response.json()

      for (const inquiry of inquiries.data || inquiries) {
        const inquiryId = `sedo_${inquiry.id}`
        
        if (!this.inquiries.has(inquiryId)) {
          const newInquiry: MarketplaceInquiry = {
            id: inquiryId,
            marketplace: 'sedo',
            domain: inquiry.domain,
            buyerEmail: inquiry.buyer_email || inquiry.email,
            buyerName: inquiry.buyer_name,
            message: inquiry.message || 'Inquiry received',
            offerAmount: inquiry.offer_amount,
            askingPrice: inquiry.asking_price || 0,
            status: 'new',
            receivedAt: new Date(inquiry.created_at || Date.now()),
            metadata: inquiry,
          }

          this.inquiries.set(inquiryId, newInquiry)
          this.notifyListeners({ type: 'inquiry', data: newInquiry })

          toast.info('💰 New Sedo Inquiry!', {
            description: `${inquiry.domain}: ${inquiry.offer_amount ? `$${inquiry.offer_amount}` : 'Inquiry'}`,
          })
        }
      }

      this.lastPollTime.set('sedo', new Date())

    } catch (error: any) {
      logger.debug('SALE_MONITOR', 'Sedo poll', { error: error.message })
    }
  }

  // ==================== AFTERNIC POLLING ====================

  private async pollAfternic(): Promise<void> {
    const apiKey = import.meta.env.VITE_AFTERNIC_API_KEY
    if (!apiKey) return

    try {
      const response = await fetch('https://api.afternic.com/v1/inquiries', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) return

      const data = await response.json()

      for (const inquiry of data.inquiries || data) {
        const inquiryId = `afternic_${inquiry.id}`
        
        if (!this.inquiries.has(inquiryId)) {
          const newInquiry: MarketplaceInquiry = {
            id: inquiryId,
            marketplace: 'afternic',
            domain: inquiry.domain,
            buyerEmail: inquiry.buyer_email,
            message: inquiry.message || 'Inquiry received',
            offerAmount: inquiry.offer,
            askingPrice: inquiry.asking_price || 0,
            status: 'new',
            receivedAt: new Date(inquiry.created_at || Date.now()),
            metadata: inquiry,
          }

          this.inquiries.set(inquiryId, newInquiry)
          this.notifyListeners({ type: 'inquiry', data: newInquiry })

          toast.info('💰 New Afternic Inquiry!', {
            description: `${inquiry.domain}`,
          })
        }
      }

      this.lastPollTime.set('afternic', new Date())

    } catch (error: any) {
      logger.debug('SALE_MONITOR', 'Afternic poll', { error: error.message })
    }
  }

  // ==================== DAN.COM POLLING ====================

  private async pollDan(): Promise<void> {
    const apiKey = import.meta.env.VITE_DAN_API_KEY
    if (!apiKey) return

    try {
      // DAN.com API for inquiries
      const response = await fetch('https://dan.com/api/v1/leads', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) return

      const data = await response.json()

      for (const lead of data.leads || data) {
        const inquiryId = `dan_${lead.id}`
        
        if (!this.inquiries.has(inquiryId)) {
          const newInquiry: MarketplaceInquiry = {
            id: inquiryId,
            marketplace: 'dan',
            domain: lead.domain,
            buyerEmail: lead.email,
            buyerName: lead.name,
            message: lead.message || 'Lead received',
            offerAmount: lead.offer,
            askingPrice: lead.price || 0,
            status: 'new',
            receivedAt: new Date(lead.created_at || Date.now()),
            metadata: lead,
          }

          this.inquiries.set(inquiryId, newInquiry)
          this.notifyListeners({ type: 'inquiry', data: newInquiry })

          toast.info('💰 New DAN.com Lead!', {
            description: `${lead.domain}`,
          })
        }
      }

      this.lastPollTime.set('dan', new Date())

    } catch (error: any) {
      logger.debug('SALE_MONITOR', 'DAN.com poll', { error: error.message })
    }
  }

  // ==================== FLIPPA POLLING ====================

  private async pollFlippa(): Promise<void> {
    const apiKey = import.meta.env.VITE_FLIPPA_API_KEY
    if (!apiKey) return

    try {
      const response = await fetch('https://api.flippa.com/v3/conversations', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) return

      const data = await response.json()

      for (const conv of data.conversations || data) {
        const inquiryId = `flippa_${conv.id}`
        
        if (!this.inquiries.has(inquiryId) && conv.unread_messages > 0) {
          const newInquiry: MarketplaceInquiry = {
            id: inquiryId,
            marketplace: 'flippa',
            domain: conv.listing?.domain || conv.subject,
            buyerEmail: conv.buyer_email || conv.participant_email,
            message: conv.last_message || 'New conversation',
            askingPrice: conv.listing?.asking_price || 0,
            status: 'new',
            receivedAt: new Date(conv.created_at || Date.now()),
            metadata: conv,
          }

          this.inquiries.set(inquiryId, newInquiry)
          this.notifyListeners({ type: 'inquiry', data: newInquiry })

          toast.info('💰 New Flippa Message!', {
            description: `${conv.listing?.domain || 'Inquiry'}`,
          })
        }
      }

      this.lastPollTime.set('flippa', new Date())

    } catch (error: any) {
      logger.debug('SALE_MONITOR', 'Flippa poll', { error: error.message })
    }
  }

  // ==================== SALE RECORDING ====================

  private async recordSale(sale: CompletedSale): Promise<void> {
    try {
      // Update the owned domain record
      await supabaseDB.markDomainAsSold(sale.domain, sale.salePrice)

      // Record the transaction
      await supabaseDB.addTransaction({
        type: 'sale',
        domain: sale.domain,
        amount: sale.salePrice,
        date: sale.soldAt.toISOString(),
        status: 'completed',
        details: {
          marketplace: sale.marketplace,
          buyerEmail: sale.buyerEmail,
          profit: sale.profit,
          roi: sale.roi,
        },
      })

      // Update empire settings (salePrice, purchasePrice)
      empireSettings.recordSale(sale.salePrice, sale.purchasePrice)

      // Log to audit
      auditLog.log('sale_completed', `Sold ${sale.domain} for $${sale.salePrice}`, {
        domain: sale.domain,
        inputs: {
          salePrice: sale.salePrice,
          purchasePrice: sale.purchasePrice,
          marketplace: sale.marketplace,
        },
        outputs: {
          profit: sale.profit,
          roi: sale.roi,
        },
      })

      // Update metrics
      metrics.increment('domains_sold')
      metrics.histogram('sale_price', sale.salePrice)
      metrics.histogram('profit_per_sale', sale.profit)
      metrics.histogram('roi_per_sale', sale.roi)

    } catch (error: any) {
      logger.error('SALE_MONITOR', 'Failed to record sale', { error: error.message, sale })
    }
  }

  // ==================== SUBSCRIPTIONS ====================

  subscribe(listener: SaleMonitorListener): () => void {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  private notifyListeners(event: Parameters<SaleMonitorListener>[0]): void {
    this.listeners.forEach(l => l(event))
  }

  // ==================== GETTERS ====================

  getInquiries(): MarketplaceInquiry[] {
    return Array.from(this.inquiries.values())
  }

  getNewInquiries(): MarketplaceInquiry[] {
    return Array.from(this.inquiries.values()).filter(i => i.status === 'new')
  }

  getWonAuctions(): WonAuction[] {
    return Array.from(this.wonAuctions.values())
  }

  getCompletedSales(): CompletedSale[] {
    return Array.from(this.completedSales.values())
  }

  getStats() {
    return {
      isRunning: this.isRunning,
      totalInquiries: this.inquiries.size,
      newInquiries: this.getNewInquiries().length,
      wonAuctions: this.wonAuctions.size,
      completedSales: this.completedSales.size,
      lastPollTimes: Object.fromEntries(this.lastPollTime),
    }
  }

  // Mark inquiry as handled
  markInquiryHandled(inquiryId: string, status: MarketplaceInquiry['status']): void {
    const inquiry = this.inquiries.get(inquiryId)
    if (inquiry) {
      inquiry.status = status
      inquiry.respondedAt = new Date()
    }
  }
}

export const saleMonitor = new SaleMonitor()
