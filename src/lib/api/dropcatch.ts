/**
 * DropCatch API Integration
 * Real API client for DropCatch domain drop-catching service
 */

interface DropCatchConfig {
  apiKey: string
  apiSecret: string
  sandbox?: boolean
}

interface DropCatchDomain {
  domain: string
  dropTime: string
  estimatedValue?: number
  backorderPrice?: number
  status?: 'available' | 'backordered' | 'dropped'
}

export class DropCatchAPI {
  private config: DropCatchConfig
  private baseUrl: string

  constructor(config: DropCatchConfig) {
    this.config = config
    this.baseUrl = config.sandbox
      ? 'https://api-sandbox.dropcatch.com/v1'
      : 'https://api.dropcatch.com/v1'
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`
    const headers = {
      'Authorization': `Bearer ${this.config.apiKey}`,
      'X-API-Secret': this.config.apiSecret,
      'Content-Type': 'application/json',
      ...options.headers,
    }

    const response = await fetch(url, { ...options, headers })
    
    if (!response.ok) {
      const error = await response.text()
      throw new Error(`DropCatch API Error: ${response.status} - ${error}`)
    }

    return response.json()
  }

  /**
   * Search for dropping domains
   */
  async searchDroppingDomains(options: {
    query?: string
    tlds?: string[]
    dropDate?: string
    minValue?: number
    limit?: number
  } = {}): Promise<DropCatchDomain[]> {
    const params = new URLSearchParams()
    if (options.query) params.append('query', options.query)
    if (options.tlds) params.append('tlds', options.tlds.join(','))
    if (options.dropDate) params.append('dropDate', options.dropDate)
    if (options.minValue) params.append('minValue', options.minValue.toString())
    if (options.limit) params.append('limit', options.limit.toString())

    return this.request(`/domains/dropping?${params.toString()}`)
  }

  /**
   * Place a backorder
   */
  async placeBackorder(domain: string, priority: 'high' | 'medium' | 'low' = 'high'): Promise<{ success: boolean; backorderId?: string }> {
    return this.request('/backorders', {
      method: 'POST',
      body: JSON.stringify({ domain, priority }),
    })
  }

  /**
   * Get exact drop time for a domain
   */
  async getDropTime(domain: string): Promise<{ dropTime: string; timezone: string }> {
    return this.request(`/domains/${domain}/droptime`)
  }

  /**
   * Get my backorders
   */
  async getMyBackorders(): Promise<DropCatchDomain[]> {
    return this.request('/backorders/my')
  }

  /**
   * Cancel a backorder
   */
  async cancelBackorder(backorderId: string): Promise<{ success: boolean }> {
    return this.request(`/backorders/${backorderId}`, {
      method: 'DELETE',
    })
  }
}

export const createDropCatchClient = (config: DropCatchConfig) => new DropCatchAPI(config)

