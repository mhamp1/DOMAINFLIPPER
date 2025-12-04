/**
 * GoDaddy API Integration
 * Real API client for GoDaddy Auctions and Domain Management
 */

interface GoDaddyConfig {
  apiKey: string
  apiSecret: string
  sandbox?: boolean
}

interface GoDaddyDomain {
  domain: string
  auctionId?: string
  currentBid?: number
  minBid?: number
  endTime?: string
  status?: string
}

export class GoDaddyAPI {
  private config: GoDaddyConfig
  private baseUrl: string

  constructor(config: GoDaddyConfig) {
    this.config = config
    this.baseUrl = config.sandbox 
      ? 'https://api.ote-godaddy.com/v1'
      : 'https://api.godaddy.com/v1'
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`
    const headers = {
      'Authorization': `sso-key ${this.config.apiKey}:${this.config.apiSecret}`,
      'Content-Type': 'application/json',
      ...options.headers,
    }

    const response = await fetch(url, { ...options, headers })
    
    if (!response.ok) {
      const error = await response.text()
      throw new Error(`GoDaddy API Error: ${response.status} - ${error}`)
    }

    return response.json()
  }

  /**
   * Search for expiring/expired domains
   */
  async searchExpiringDomains(options: {
    query?: string
    tlds?: string[]
    minPrice?: number
    maxPrice?: number
    limit?: number
  } = {}): Promise<GoDaddyDomain[]> {
    const params = new URLSearchParams()
    if (options.query) params.append('query', options.query)
    if (options.tlds) params.append('tlds', options.tlds.join(','))
    if (options.minPrice) params.append('minPrice', options.minPrice.toString())
    if (options.maxPrice) params.append('maxPrice', options.maxPrice.toString())
    if (options.limit) params.append('limit', options.limit.toString())

    return this.request(`/domains/available?${params.toString()}`)
  }

  /**
   * Get auction details
   */
  async getAuction(auctionId: string): Promise<GoDaddyDomain> {
    return this.request(`/auctions/${auctionId}`)
  }

  /**
   * Place a bid on an auction
   */
  async placeBid(auctionId: string, bidAmount: number): Promise<{ success: boolean; transactionId?: string }> {
    return this.request(`/auctions/${auctionId}/bids`, {
      method: 'POST',
      body: JSON.stringify({ amount: bidAmount }),
    })
  }

  /**
   * Get my active bids
   */
  async getMyBids(): Promise<GoDaddyDomain[]> {
    return this.request('/auctions/my-bids')
  }

  /**
   * Get my won auctions
   */
  async getMyWonAuctions(): Promise<GoDaddyDomain[]> {
    return this.request('/auctions/my-won')
  }

  /**
   * Transfer domain to my account
   */
  async transferDomain(domain: string, authCode: string): Promise<{ success: boolean }> {
    return this.request(`/domains/${domain}/transfer`, {
      method: 'POST',
      body: JSON.stringify({ authCode }),
    })
  }
}

export const createGoDaddyClient = (config: GoDaddyConfig) => new GoDaddyAPI(config)

