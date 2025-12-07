/**
 * Channel Performance Tracker — Track and optimize per-channel performance
 * December 2025
 * 
 * Features:
 * - Track conversion/sell-through by channel (Afternic, Dan, lander)
 * - Adjust list price and floor based on channel performance
 * - Determine optimal repricing cadence per channel
 * - Store per-channel stats
 */

export interface ChannelConfig {
  name: string                    // Channel name (e.g., 'Afternic', 'Dan', 'Lander')
  enabled: boolean                // Whether this channel is active
  commission: number              // Commission rate (0-1)
  listPriceMultiplier: number     // Multiplier for list price (1.0 = base)
  floorPriceMultiplier: number    // Multiplier for floor price (1.0 = base)
  repricingCadenceDays: number    // How often to reprice (days)
  autoReprice: boolean            // Enable automatic repricing
}

export interface ChannelStats {
  channel: string
  totalListings: number           // Total domains listed
  totalViews: number              // Total views/impressions
  totalInquiries: number          // Total inquiries
  totalSales: number              // Total sales
  totalRevenue: number            // Total revenue generated
  avgSalePrice: number            // Average sale price
  avgDaysToSale: number           // Average days from list to sale
  conversionRate: number          // Sales / listings (%)
  inquiryRate: number             // Inquiries / views (%)
  closeRate: number               // Sales / inquiries (%)
  lastUpdated: Date
}

export interface RepricingRecommendation {
  domain: string
  channel: string
  currentPrice: number
  recommendedPrice: number
  reason: string
  confidence: number              // 0-100
  action: 'increase' | 'decrease' | 'maintain'
}

export const DEFAULT_CHANNELS: ChannelConfig[] = [
  {
    name: 'Afternic',
    enabled: true,
    commission: 0.20,              // 20% commission
    listPriceMultiplier: 1.0,
    floorPriceMultiplier: 1.0,
    repricingCadenceDays: 30,
    autoReprice: false,
  },
  {
    name: 'Dan',
    enabled: true,
    commission: 0.09,              // 9% commission
    listPriceMultiplier: 1.0,
    floorPriceMultiplier: 1.0,
    repricingCadenceDays: 30,
    autoReprice: false,
  },
  {
    name: 'Lander',
    enabled: false,                // Custom landing page
    commission: 0.0,               // No commission
    listPriceMultiplier: 1.1,      // List higher on own lander
    floorPriceMultiplier: 1.0,
    repricingCadenceDays: 14,
    autoReprice: false,
  },
]

interface ChannelListing {
  domain: string
  channel: string
  listPrice: number
  floorPrice: number
  listedDate: Date
  lastRepricedDate?: Date
  views: number
  inquiries: number
  sold: boolean
  salePrice?: number
  saleDate?: Date
}

export class ChannelPerformanceTracker {
  private channels: Map<string, ChannelConfig> = new Map()
  private stats: Map<string, ChannelStats> = new Map()
  private listings: Map<string, ChannelListing[]> = new Map() // domain -> channel listings

  constructor(channels: ChannelConfig[] = DEFAULT_CHANNELS) {
    for (const channel of channels) {
      this.channels.set(channel.name, channel)
      this.initializeStats(channel.name)
    }
  }

  /**
   * Initialize stats for a channel
   */
  private initializeStats(channel: string): void {
    this.stats.set(channel, {
      channel,
      totalListings: 0,
      totalViews: 0,
      totalInquiries: 0,
      totalSales: 0,
      totalRevenue: 0,
      avgSalePrice: 0,
      avgDaysToSale: 0,
      conversionRate: 0,
      inquiryRate: 0,
      closeRate: 0,
      lastUpdated: new Date(),
    })
  }

  /**
   * Add or update a listing
   */
  addListing(
    domain: string,
    channel: string,
    listPrice: number,
    floorPrice: number
  ): void {
    const channelConfig = this.channels.get(channel)
    if (!channelConfig || !channelConfig.enabled) {
      console.warn(`Channel ${channel} not enabled`)
      return
    }

    // Apply channel-specific multipliers
    const adjustedListPrice = listPrice * channelConfig.listPriceMultiplier
    const adjustedFloorPrice = floorPrice * channelConfig.floorPriceMultiplier

    const listing: ChannelListing = {
      domain,
      channel,
      listPrice: adjustedListPrice,
      floorPrice: adjustedFloorPrice,
      listedDate: new Date(),
      views: 0,
      inquiries: 0,
      sold: false,
    }

    if (!this.listings.has(domain)) {
      this.listings.set(domain, [])
    }

    this.listings.get(domain)!.push(listing)

    // Update stats
    const stats = this.stats.get(channel)!
    stats.totalListings++
    stats.lastUpdated = new Date()
  }

  /**
   * Record a view/impression
   */
  recordView(domain: string, channel: string): void {
    const listing = this.findListing(domain, channel)
    if (listing) {
      listing.views++
      const stats = this.stats.get(channel)!
      stats.totalViews++
      this.updateRates(channel)
    }
  }

  /**
   * Record an inquiry
   */
  recordInquiry(domain: string, channel: string): void {
    const listing = this.findListing(domain, channel)
    if (listing) {
      listing.inquiries++
      const stats = this.stats.get(channel)!
      stats.totalInquiries++
      this.updateRates(channel)
    }
  }

  /**
   * Record a sale
   */
  recordSale(domain: string, channel: string, salePrice: number): void {
    const listing = this.findListing(domain, channel)
    if (!listing) return

    listing.sold = true
    listing.salePrice = salePrice
    listing.saleDate = new Date()

    const daysToSale = Math.max(1,
      (listing.saleDate.getTime() - listing.listedDate.getTime()) / (1000 * 60 * 60 * 24)
    )

    const stats = this.stats.get(channel)!
    stats.totalSales++
    stats.totalRevenue += salePrice

    // Update averages
    stats.avgSalePrice = stats.totalRevenue / stats.totalSales
    
    // Update avg days to sale (running average)
    const oldTotal = stats.avgDaysToSale * (stats.totalSales - 1)
    stats.avgDaysToSale = (oldTotal + daysToSale) / stats.totalSales

    this.updateRates(channel)
    stats.lastUpdated = new Date()
  }

  /**
   * Get repricing recommendations for a domain
   */
  getRepricingRecommendations(domain: string): RepricingRecommendation[] {
    const recommendations: RepricingRecommendation[] = []
    const domainListings = this.listings.get(domain) || []

    for (const listing of domainListings) {
      if (listing.sold) continue

      const channel = listing.channel
      const config = this.channels.get(channel)!
      const stats = this.stats.get(channel)!

      // Check if repricing is due
      const daysSinceListing = (Date.now() - listing.listedDate.getTime()) / (1000 * 60 * 60 * 24)
      const daysSinceReprice = listing.lastRepricedDate
        ? (Date.now() - listing.lastRepricedDate.getTime()) / (1000 * 60 * 60 * 24)
        : daysSinceListing

      if (daysSinceReprice < config.repricingCadenceDays && !config.autoReprice) {
        continue
      }

      // Determine repricing action based on performance
      let action: 'increase' | 'decrease' | 'maintain' = 'maintain'
      let recommendedPrice = listing.listPrice
      let reason = 'No change needed'
      let confidence = 50

      // High interest but no sale = increase price
      if (listing.inquiries > 3 && daysSinceListing > 14) {
        action = 'increase'
        recommendedPrice = listing.listPrice * 1.15
        reason = 'High interest, increase price by 15%'
        confidence = 75
      }
      // No interest = decrease price
      else if (listing.views > 10 && listing.inquiries === 0 && daysSinceListing > 30) {
        action = 'decrease'
        recommendedPrice = listing.listPrice * 0.85
        reason = 'Low interest, decrease price by 15%'
        confidence = 80
      }
      // Channel performing well = maintain or slight increase
      else if (stats.conversionRate > 10 && stats.closeRate > 20) {
        action = 'increase'
        recommendedPrice = listing.listPrice * 1.05
        reason = 'Channel performing well, slight increase'
        confidence = 60
      }
      // Channel performing poorly = decrease
      else if (stats.conversionRate < 2 && daysSinceListing > 60) {
        action = 'decrease'
        recommendedPrice = listing.listPrice * 0.90
        reason = 'Channel underperforming, decrease by 10%'
        confidence = 70
      }

      // Don't go below floor
      recommendedPrice = Math.max(recommendedPrice, listing.floorPrice)

      recommendations.push({
        domain,
        channel,
        currentPrice: listing.listPrice,
        recommendedPrice: Math.round(recommendedPrice),
        reason,
        confidence,
        action,
      })
    }

    return recommendations
  }

  /**
   * Apply repricing recommendation
   */
  applyRepricing(domain: string, channel: string, newPrice: number): void {
    const listing = this.findListing(domain, channel)
    if (listing && !listing.sold) {
      listing.listPrice = newPrice
      listing.lastRepricedDate = new Date()
    }
  }

  /**
   * Get stats for a channel
   */
  getChannelStats(channel: string): ChannelStats | null {
    return this.stats.get(channel) || null
  }

  /**
   * Get all channel stats
   */
  getAllChannelStats(): ChannelStats[] {
    return Array.from(this.stats.values())
  }

  /**
   * Get best performing channel
   */
  getBestChannel(): string | null {
    let bestChannel: string | null = null
    let bestScore = 0

    for (const [channel, stats] of this.stats.entries()) {
      // Score based on conversion rate and close rate
      const score = stats.conversionRate * 0.6 + stats.closeRate * 0.4
      if (score > bestScore) {
        bestScore = score
        bestChannel = channel
      }
    }

    return bestChannel
  }

  /**
   * Update channel configuration
   */
  updateChannelConfig(channel: string, config: Partial<ChannelConfig>): void {
    const existing = this.channels.get(channel)
    if (existing) {
      this.channels.set(channel, { ...existing, ...config })
    }
  }

  /**
   * Get channel configuration
   */
  getChannelConfig(channel: string): ChannelConfig | null {
    return this.channels.get(channel) || null
  }

  /**
   * Get all channels
   */
  getAllChannels(): ChannelConfig[] {
    return Array.from(this.channels.values())
  }

  /**
   * Helper: find listing for domain and channel
   */
  private findListing(domain: string, channel: string): ChannelListing | null {
    const domainListings = this.listings.get(domain) || []
    return domainListings.find(l => l.channel === channel && !l.sold) || null
  }

  /**
   * Helper: update conversion rates
   */
  private updateRates(channel: string): void {
    const stats = this.stats.get(channel)!
    
    if (stats.totalListings > 0) {
      stats.conversionRate = (stats.totalSales / stats.totalListings) * 100
    }
    
    if (stats.totalViews > 0) {
      stats.inquiryRate = (stats.totalInquiries / stats.totalViews) * 100
    }
    
    if (stats.totalInquiries > 0) {
      stats.closeRate = (stats.totalSales / stats.totalInquiries) * 100
    }
  }
}

// Singleton instance
export const channelPerformanceTracker = new ChannelPerformanceTracker()
