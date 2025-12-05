/**
 * OAuth 2.0 Integration
 * GoDaddy uses OAuth 2.0 (client credentials flow)
 * Namecheap uses HMAC-SHA-1 (no OAuth)
 * December 27, 2025
 */

import axios from 'axios'

interface OAuthToken {
  access_token: string
  token_type: string
  expires_in: number
  scope?: string
}

interface GoDaddyOAuthConfig {
  clientId: string
  clientSecret: string
  sandbox?: boolean
}

/**
 * GoDaddy OAuth 2.0 Client
 * Gets access tokens for GoDaddy API
 */
export class GoDaddyOAuth {
  private config: GoDaddyOAuthConfig
  private token: OAuthToken | null = null
  private tokenExpiry: number = 0
  private baseUrl: string

  constructor(config: GoDaddyOAuthConfig) {
    this.config = config
    this.baseUrl = config.sandbox
      ? 'https://api.ote-godaddy.com/v1'
      : 'https://api.godaddy.com/v1'
  }

  /**
   * Get access token (auto-refreshes if expired)
   */
  async getAccessToken(): Promise<string> {
    // Check if token is still valid (with 5 minute buffer)
    if (this.token && Date.now() < this.tokenExpiry - 5 * 60 * 1000) {
      return this.token.access_token
    }

    // Get new token
    try {
      const response = await axios.post(
        `${this.baseUrl}/oauth2/token`,
        new URLSearchParams({
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          grant_type: 'client_credentials',
          scope: 'domains:read domains:write auctions:read auctions:write',
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: 10000,
        }
      )

      this.token = response.data
      this.tokenExpiry = Date.now() + ((this.token?.expires_in || 3600) * 1000)

      return this.token?.access_token || ''
    } catch (error: any) {
      throw new Error(`GoDaddy OAuth Error: ${error.response?.status || 'Network'} - ${error.message}`)
    }
  }

  /**
   * Clear cached token (force refresh)
   */
  clearToken() {
    this.token = null
    this.tokenExpiry = 0
  }
}

export const createGoDaddyOAuth = (config: GoDaddyOAuthConfig) => new GoDaddyOAuth(config)

