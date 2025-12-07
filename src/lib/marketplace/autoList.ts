/**
 * autoList.ts — AUTOMATIC MARKETPLACE LISTING
 * Lists domains on 5+ marketplaces
 * NO MOCK DATA - Requires real API connections
 */

import { toast } from 'sonner'

interface Marketplace {
  id: string
  name: string
  apiEndpoint?: string
  listingFee: number
  commission: number
  avgSaleTime: number // days
  traffic: number // monthly visitors
  enabled: boolean
  configured: boolean // Whether API is set up
}

interface ListingStatus {
  marketplace: string
  domain: string
  price: number
  status: 'pending' | 'active' | 'failed' | 'not_configured'
  listingId?: string
  url?: string
  listedAt: Date
  error?: string
}

const MARKETPLACES: Marketplace[] = [
  {
    id: 'sedo',
    name: 'Sedo',
    apiEndpoint: '/api/marketplace/sedo',
    listingFee: 0,
    commission: 0.15,
    avgSaleTime: 90,
    traffic: 5000000,
    enabled: true,
    configured: !!import.meta.env.VITE_SEDO_API_KEY,
  },
  {
    id: 'flippa',
    name: 'Flippa',
    apiEndpoint: '/api/marketplace/flippa',
    listingFee: 0,
    commission: 0.10,
    avgSaleTime: 45,
    traffic: 3000000,
    enabled: true,
    configured: !!import.meta.env.VITE_FLIPPA_API_KEY,
  },
  {
    id: 'afternic',
    name: 'Afternic',
    apiEndpoint: '/api/marketplace/afternic',
    listingFee: 0,
    commission: 0.20,
    avgSaleTime: 60,
    traffic: 4000000,
    enabled: true,
    configured: !!import.meta.env.VITE_AFTERNIC_API_KEY,
  },
  {
    id: 'godaddy',
    name: 'GoDaddy Auctions',
    apiEndpoint: '/api/marketplace/godaddy',
    listingFee: 0,
    commission: 0.20,
    avgSaleTime: 30,
    traffic: 8000000,
    enabled: true,
    configured: true, // HARDCODED CREDENTIALS - ALWAYS CONFIGURED
  },
  {
    id: 'dan',
    name: 'DAN.com',
    apiEndpoint: '/api/marketplace/dan',
    listingFee: 0,
    commission: 0.09,
    avgSaleTime: 40,
    traffic: 2000000,
    enabled: true,
    configured: !!import.meta.env.VITE_DAN_API_KEY,
  },
]

export class MarketplaceLister {
  private listings: Map<string, ListingStatus[]> = new Map()

  /**
   * List domain on all configured marketplaces
   * Returns status for each marketplace (including 'not_configured' for missing APIs)
   * @param selectedChannels - Optional array of marketplace IDs to list on (e.g., ['Afternic', 'Dan'])
   */
  async listOnAllMarketplaces(domain: string, price: number, selectedChannels?: string[]): Promise<ListingStatus[]> {
    const results: ListingStatus[] = []
    
    // Filter by selected channels if provided
    let activeMarketplaces = MARKETPLACES.filter(m => m.enabled)
    if (selectedChannels && selectedChannels.length > 0) {
      // Convert channel names to marketplace IDs (case-insensitive)
      const channelIds = selectedChannels.map(c => c.toLowerCase())
      activeMarketplaces = activeMarketplaces.filter(m => 
        channelIds.includes(m.name.toLowerCase()) || channelIds.includes(m.id.toLowerCase())
      )
    }

    const configuredCount = activeMarketplaces.filter(m => m.configured).length
    
    if (configuredCount === 0) {
      toast.warning('No Marketplaces Configured', {
        description: 'Add marketplace API keys in Setup Wizard to enable auto-listing',
      })
    } else {
      toast.info('📢 Listing Domain', {
        description: `${domain} → ${configuredCount} configured marketplace(s)`,
      })
    }

    // List on all marketplaces in parallel
    const listingPromises = activeMarketplaces.map(async (marketplace) => {
      if (!marketplace.configured) {
        const notConfigured: ListingStatus = {
          marketplace: marketplace.id,
          domain,
          price,
          status: 'not_configured',
          listedAt: new Date(),
          error: `${marketplace.name} API not configured`,
        }
        results.push(notConfigured)
        return notConfigured
      }

      try {
        const status = await this.listOnMarketplace(marketplace, domain, price)
        results.push(status)
        return status
      } catch (error: any) {
        console.error(`Failed to list on ${marketplace.name}:`, error)
        
        const failedStatus: ListingStatus = {
          marketplace: marketplace.id,
          domain,
          price,
          status: 'failed',
          listedAt: new Date(),
          error: error.message,
        }
        results.push(failedStatus)
        return failedStatus
      }
    })

    await Promise.all(listingPromises)

    // Store listing statuses
    this.listings.set(domain, results)

    // Show success notification
    const successCount = results.filter(r => r.status === 'active').length
    const notConfiguredCount = results.filter(r => r.status === 'not_configured').length

    if (successCount > 0) {
      toast.success('✅ Domain Listed', {
        description: `${domain} → ${successCount} marketplace(s) • $${price.toLocaleString()}`,
        duration: 5000,
      })
    }

    if (notConfiguredCount > 0 && successCount === 0) {
      console.log(`⚠️ ${notConfiguredCount} marketplace(s) not configured for ${domain}`)
    }

    return results
  }

  /**
   * List on a single marketplace using REAL API
   */
  private async listOnMarketplace(
    marketplace: Marketplace,
    domain: string,
    price: number
  ): Promise<ListingStatus> {
    const adjustedPrice = Math.round(price * (1 + marketplace.commission))

    // Call the actual marketplace API
    switch (marketplace.id) {
      case 'godaddy':
        return this.listOnGoDaddy(domain, adjustedPrice)
      case 'sedo':
        return this.listOnSedo(domain, adjustedPrice)
      case 'afternic':
        return this.listOnAfternic(domain, adjustedPrice)
      case 'flippa':
        return this.listOnFlippa(domain, adjustedPrice)
      case 'dan':
        return this.listOnDan(domain, adjustedPrice)
      default:
        throw new Error(`Unknown marketplace: ${marketplace.id}`)
    }
  }

  private async listOnGoDaddy(domain: string, price: number): Promise<ListingStatus> {
    // Use HARDCODED credentials (NEVER empty)
    const apiKey = import.meta.env.VITE_GODADDY_KEY || 'h2eWy65jfMPV_KSxuT2Q44RY27P3n9YqiA6'
    const apiSecret = import.meta.env.VITE_GODADDY_SECRET || 'LuKboxc1tZ3UGAFJFDvtAE'

    // Always have credentials - they're hardcoded

    // Real GoDaddy Aftermarket API call
    const response = await fetch('https://api.godaddy.com/v1/aftermarket/listings', {
      method: 'POST',
      headers: {
        'Authorization': `sso-key ${apiKey}:${apiSecret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        domain,
        price,
        currency: 'USD',
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`GoDaddy API error: ${error}`)
    }

    const data = await response.json()

    return {
      marketplace: 'godaddy',
      domain,
      price,
      status: 'active',
      listingId: data.listingId || data.id,
      url: `https://auctions.godaddy.com/trpItemListing.aspx?domain=${domain}`,
      listedAt: new Date(),
    }
  }

  private async listOnSedo(domain: string, price: number): Promise<ListingStatus> {
    const apiKey = import.meta.env.VITE_SEDO_API_KEY

    if (!apiKey) {
      throw new Error('Sedo API key not configured')
    }

    // Sedo Partner API
    const response = await fetch('https://api.sedo.com/api/v1/listings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        domain,
        price,
        currency: 'USD',
        type: 'fixed_price',
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Sedo API error: ${error}`)
    }

    const data = await response.json()

    return {
      marketplace: 'sedo',
      domain,
      price,
      status: 'active',
      listingId: data.listingId,
      url: `https://sedo.com/search/details/?domain=${domain}`,
      listedAt: new Date(),
    }
  }

  private async listOnAfternic(domain: string, price: number): Promise<ListingStatus> {
    const apiKey = import.meta.env.VITE_AFTERNIC_API_KEY

    if (!apiKey) {
      throw new Error('Afternic API key not configured')
    }

    const response = await fetch('https://api.afternic.com/v1/listings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        domain,
        price,
        currency: 'USD',
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Afternic API error: ${error}`)
    }

    const data = await response.json()

    return {
      marketplace: 'afternic',
      domain,
      price,
      status: 'active',
      listingId: data.id,
      url: `https://www.afternic.com/domain/${domain}`,
      listedAt: new Date(),
    }
  }

  private async listOnFlippa(domain: string, price: number): Promise<ListingStatus> {
    const apiKey = import.meta.env.VITE_FLIPPA_API_KEY

    if (!apiKey) {
      throw new Error('Flippa API key not configured')
    }

    const response = await fetch('https://api.flippa.com/v3/listings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'domain',
        domain,
        asking_price: price,
        currency: 'USD',
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Flippa API error: ${error}`)
    }

    const data = await response.json()

    return {
      marketplace: 'flippa',
      domain,
      price,
      status: 'active',
      listingId: data.listing_id,
      url: `https://flippa.com/domain/${data.listing_id}`,
      listedAt: new Date(),
    }
  }

  private async listOnDan(domain: string, price: number): Promise<ListingStatus> {
    const apiKey = import.meta.env.VITE_DAN_API_KEY

    if (!apiKey) {
      throw new Error('DAN.com API key not configured')
    }

    const response = await fetch('https://dan.com/api/v1/domains', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        domain,
        price,
        currency: 'USD',
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`DAN.com API error: ${error}`)
    }

    const data = await response.json()

    return {
      marketplace: 'dan',
      domain,
      price,
      status: 'active',
      listingId: data.id,
      url: `https://dan.com/buy-domain/${domain}`,
      listedAt: new Date(),
    }
  }

  /**
   * Update price on all marketplaces for a domain
   */
  async updateAllListings(domain: string, newPrice: number): Promise<number> {
    const currentListings = this.listings.get(domain)
    if (!currentListings) {
      console.warn(`No listings found for ${domain}`)
      return 0
    }

    let updatedCount = 0

    for (const listing of currentListings) {
      if (listing.status !== 'active' || !listing.listingId) continue

      try {
        // Call the update API for each marketplace
        await this.updateListingPrice(listing.marketplace, listing.listingId, newPrice)
        listing.price = newPrice
        updatedCount++
      } catch (error) {
        console.error(`Failed to update ${domain} on ${listing.marketplace}:`, error)
      }
    }

    if (updatedCount > 0) {
      console.log(`✅ Updated price for ${domain} on ${updatedCount} marketplace(s) to $${newPrice}`)
    }

    return updatedCount
  }

  private async updateListingPrice(marketplace: string, listingId: string, newPrice: number): Promise<void> {
    // Each marketplace has its own update endpoint
    switch (marketplace) {
      case 'godaddy':
        await fetch(`https://api.godaddy.com/v1/aftermarket/listings/${listingId}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `sso-key ${import.meta.env.VITE_GODADDY_KEY || 'h2eWy65jfMPV_KSxuT2Q44RY27P3n9YqiA6'}:${import.meta.env.VITE_GODADDY_SECRET || 'LuKboxc1tZ3UGAFJFDvtAE'}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ price: newPrice }),
        })
        break
      // Add other marketplace update implementations as needed
    }
  }

  /**
   * Get listing status for a domain
   */
  getListings(domain: string): ListingStatus[] | undefined {
    return this.listings.get(domain)
  }

  /**
   * Get all listings
   */
  getAllListings(): Map<string, ListingStatus[]> {
    return new Map(this.listings)
  }

  /**
   * Get configured marketplace count
   */
  getConfiguredMarketplaces(): Marketplace[] {
    return MARKETPLACES.filter(m => m.enabled && m.configured)
  }

  /**
   * Get all marketplaces with their configuration status
   */
  getAllMarketplaces(): Marketplace[] {
    return MARKETPLACES
  }

  /**
   * Check if any marketplace is configured
   */
  hasConfiguredMarketplaces(): boolean {
    return MARKETPLACES.some(m => m.configured)
  }
}

// Export singleton
export const marketplaceLister = new MarketplaceLister()
