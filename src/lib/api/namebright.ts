/**
 * NameBright Domain API Client — REAL IMPLEMENTATION
 * OAuth2 authentication with bearer token
 * December 2025
 * 
 * Docs: https://api.namebright.com/rest/Help
 * Auth: https://api.namebright.com/auth/Help
 */

import { logger } from '@/lib/utils/logger'

interface NameBrightConfig {
  clientId: string      // Format: "account:appname" e.g. "mhamp1:DomainFlipper"
  clientSecret: string  // API secret from NameBright
}

interface NameBrightToken {
  access_token: string
  token_type: string
  expires_in: number
  expiresAt: number  // Calculated timestamp
}

interface DomainAvailability {
  domain: string
  available: boolean
  price?: number
  currency?: string
}

interface DomainInfo {
  domainName: string
  status: string
  expirationDate: string
  autoRenew: boolean
  locked: boolean
  privacyEnabled: boolean
  nameServers: string[]
}

interface RegisterResult {
  success: boolean
  domain: string
  orderId?: string
  message?: string
}

interface DnsRecord {
  type: 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'NS'
  name: string
  value: string
  ttl: number
  priority?: number
}

class NameBrightAPI {
  private config: NameBrightConfig
  private token: NameBrightToken | null = null
  private authBaseUrl = 'https://api.namebright.com/auth'
  private apiBaseUrl = 'https://api.namebright.com/rest'

  constructor() {
    this.config = {
      clientId: import.meta.env.VITE_NAMEBRIGHT_CLIENT_ID || '',
      clientSecret: import.meta.env.VITE_NAMEBRIGHT_CLIENT_SECRET || '',
    }
  }

  /**
   * Check if API is configured
   */
  isConfigured(): boolean {
    return !!(this.config.clientId && this.config.clientSecret)
  }

  /**
   * Authenticate and get OAuth2 bearer token
   */
  private async authenticate(): Promise<void> {
    // Check if existing token is still valid (with 5 min buffer)
    if (this.token && Date.now() < this.token.expiresAt - 300000) {
      return
    }

    if (!this.isConfigured()) {
      throw new Error('NameBright API not configured - missing client ID or secret')
    }

    try {
      const response = await fetch(`${this.authBaseUrl}/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
        }).toString(),
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`Authentication failed: ${error}`)
      }

      const data = await response.json()
      
      this.token = {
        access_token: data.access_token,
        token_type: data.token_type || 'Bearer',
        expires_in: data.expires_in || 1800, // Default 30 mins
        expiresAt: Date.now() + (data.expires_in || 1800) * 1000,
      }

      logger.info('NAMEBRIGHT', 'Successfully authenticated')
    } catch (error: any) {
      logger.error('NAMEBRIGHT', `Authentication error: ${error.message}`)
      throw error
    }
  }

  /**
   * Make authenticated API request
   */
  private async makeRequest<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    body?: object
  ): Promise<T> {
    await this.authenticate()

    const url = `${this.apiBaseUrl}${endpoint}`
    const headers: HeadersInit = {
      'Authorization': `Bearer ${this.token!.access_token}`,
      'Content-Type': 'application/json',
    }

    const options: RequestInit = {
      method,
      headers,
    }

    if (body) {
      options.body = JSON.stringify(body)
    }

    try {
      const response = await fetch(url, options)

      // Handle 401 - retry with fresh token
      if (response.status === 401) {
        this.token = null
        await this.authenticate()
        return this.makeRequest(method, endpoint, body)
      }

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`NameBright API error (${response.status}): ${errorText}`)
      }

      return await response.json()
    } catch (error: any) {
      logger.error('NAMEBRIGHT', `API request failed: ${error.message}`)
      throw error
    }
  }

  /**
   * Check domain availability
   * Note: NameBright API does NOT allow drop-catching - domains dropping that day show as "unavailable"
   */
  async checkAvailability(domain: string): Promise<DomainAvailability> {
    try {
      const result = await this.makeRequest<any>('GET', `/domains/available/${encodeURIComponent(domain)}`)
      
      return {
        domain,
        available: result.available === true,
        price: result.price,
        currency: result.currency || 'USD',
      }
    } catch (error: any) {
      logger.error('NAMEBRIGHT', `Availability check failed for ${domain}: ${error.message}`)
      return {
        domain,
        available: false,
      }
    }
  }

  /**
   * Register a domain
   * Note: Requires pre-funded account balance
   */
  async registerDomain(
    domain: string,
    years: number = 1,
    privacy: boolean = true
  ): Promise<RegisterResult> {
    try {
      const result = await this.makeRequest<any>('POST', '/domains/register', {
        domainName: domain,
        years,
        privacyEnabled: privacy,
        autoRenew: true,
      })

      logger.info('NAMEBRIGHT', `Domain registered: ${domain}`)
      
      return {
        success: true,
        domain,
        orderId: result.orderId,
        message: result.message || 'Domain registered successfully',
      }
    } catch (error: any) {
      logger.error('NAMEBRIGHT', `Registration failed for ${domain}: ${error.message}`)
      return {
        success: false,
        domain,
        message: error.message,
      }
    }
  }

  /**
   * Renew a domain
   */
  async renewDomain(domain: string, years: number = 1): Promise<RegisterResult> {
    try {
      const result = await this.makeRequest<any>('POST', '/domains/renew', {
        domainName: domain,
        years,
      })

      logger.info('NAMEBRIGHT', `Domain renewed: ${domain}`)
      
      return {
        success: true,
        domain,
        orderId: result.orderId,
        message: result.message || 'Domain renewed successfully',
      }
    } catch (error: any) {
      logger.error('NAMEBRIGHT', `Renewal failed for ${domain}: ${error.message}`)
      return {
        success: false,
        domain,
        message: error.message,
      }
    }
  }

  /**
   * Get domain info
   */
  async getDomainInfo(domain: string): Promise<DomainInfo | null> {
    try {
      const result = await this.makeRequest<any>('GET', `/domains/${encodeURIComponent(domain)}`)
      
      return {
        domainName: result.domainName || domain,
        status: result.status || 'unknown',
        expirationDate: result.expirationDate,
        autoRenew: result.autoRenew || false,
        locked: result.locked || false,
        privacyEnabled: result.privacyEnabled || false,
        nameServers: result.nameServers || [],
      }
    } catch (error: any) {
      logger.error('NAMEBRIGHT', `Failed to get domain info for ${domain}: ${error.message}`)
      return null
    }
  }

  /**
   * Get nameservers for a domain
   */
  async getNameServers(domain: string): Promise<string[]> {
    try {
      const result = await this.makeRequest<any>('GET', `/domains/${encodeURIComponent(domain)}/nameservers`)
      return result.nameServers || []
    } catch (error: any) {
      logger.error('NAMEBRIGHT', `Failed to get nameservers for ${domain}: ${error.message}`)
      return []
    }
  }

  /**
   * Update nameservers for a domain
   */
  async updateNameServers(domain: string, nameServers: string[]): Promise<boolean> {
    try {
      await this.makeRequest<any>('PUT', `/domains/${encodeURIComponent(domain)}/nameservers`, {
        nameServers,
      })
      logger.info('NAMEBRIGHT', `Nameservers updated for ${domain}`)
      return true
    } catch (error: any) {
      logger.error('NAMEBRIGHT', `Failed to update nameservers for ${domain}: ${error.message}`)
      return false
    }
  }

  /**
   * Get DNS host records
   */
  async getDnsRecords(domain: string): Promise<DnsRecord[]> {
    try {
      const result = await this.makeRequest<any>('GET', `/domains/${encodeURIComponent(domain)}/dns`)
      return result.records || []
    } catch (error: any) {
      logger.error('NAMEBRIGHT', `Failed to get DNS records for ${domain}: ${error.message}`)
      return []
    }
  }

  /**
   * Update DNS host records
   */
  async updateDnsRecords(domain: string, records: DnsRecord[]): Promise<boolean> {
    try {
      await this.makeRequest<any>('PUT', `/domains/${encodeURIComponent(domain)}/dns`, {
        records,
      })
      logger.info('NAMEBRIGHT', `DNS records updated for ${domain}`)
      return true
    } catch (error: any) {
      logger.error('NAMEBRIGHT', `Failed to update DNS records for ${domain}: ${error.message}`)
      return false
    }
  }

  /**
   * Set domain lock status
   */
  async setLocked(domain: string, locked: boolean): Promise<boolean> {
    try {
      await this.makeRequest<any>('PUT', `/domains/${encodeURIComponent(domain)}/settings`, {
        locked,
      })
      logger.info('NAMEBRIGHT', `Domain ${locked ? 'locked' : 'unlocked'}: ${domain}`)
      return true
    } catch (error: any) {
      logger.error('NAMEBRIGHT', `Failed to set lock status for ${domain}: ${error.message}`)
      return false
    }
  }

  /**
   * Set auto-renew status
   */
  async setAutoRenew(domain: string, autoRenew: boolean): Promise<boolean> {
    try {
      await this.makeRequest<any>('PUT', `/domains/${encodeURIComponent(domain)}/settings`, {
        autoRenew,
      })
      logger.info('NAMEBRIGHT', `Auto-renew ${autoRenew ? 'enabled' : 'disabled'}: ${domain}`)
      return true
    } catch (error: any) {
      logger.error('NAMEBRIGHT', `Failed to set auto-renew for ${domain}: ${error.message}`)
      return false
    }
  }

  /**
   * Enable/disable privacy protection
   */
  async setPrivacy(domain: string, enabled: boolean): Promise<boolean> {
    try {
      await this.makeRequest<any>('PUT', `/domains/${encodeURIComponent(domain)}/settings`, {
        privacyEnabled: enabled,
      })
      logger.info('NAMEBRIGHT', `Privacy ${enabled ? 'enabled' : 'disabled'}: ${domain}`)
      return true
    } catch (error: any) {
      logger.error('NAMEBRIGHT', `Failed to set privacy for ${domain}: ${error.message}`)
      return false
    }
  }

  /**
   * Unlock domain for transfer and get auth code
   */
  async getAuthCode(domain: string): Promise<string | null> {
    try {
      // First unlock the domain
      await this.setLocked(domain, false)
      
      // Then get the auth code
      const result = await this.makeRequest<any>('GET', `/domains/${encodeURIComponent(domain)}/authcode`)
      return result.authCode || null
    } catch (error: any) {
      logger.error('NAMEBRIGHT', `Failed to get auth code for ${domain}: ${error.message}`)
      return null
    }
  }
}

// Singleton export
export const namebrightAPI = new NameBrightAPI()

// Factory for custom configs
export const createNameBrightClient = (config: NameBrightConfig) => {
  const client = new NameBrightAPI()
  // Override config
  ;(client as any).config = config
  return client
}

export type { NameBrightConfig, DomainAvailability, DomainInfo, RegisterResult, DnsRecord }
