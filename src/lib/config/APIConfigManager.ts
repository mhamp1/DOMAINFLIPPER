/**
 * APIConfigManager.ts — Centralized API Key Storage & Validation
 * Saves all API keys securely and makes them available across the app
 * December 2025
 */

import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'

// ==================== TYPES ====================

export interface APIConfig {
  // Database
  supabase: {
    url: string
    anonKey: string
  }
  
  // Domain Registrars
  godaddy: {
    apiKey: string
    apiSecret: string
    sandbox: boolean
  }
  namecheap: {
    apiUser: string
    apiKey: string
    clientIp: string
  }
  // FREE ALTERNATIVE: Namecheap Beast Mode ($99/mo - full auctions API)
  namecheapBeast: {
    apiUser: string
    apiKey: string
    clientIp: string
  }
  dropcatch: {
    apiKey: string
    apiSecret: string
  }
  // FREE: Afternic (GoDaddy's marketplace) - free API for listing/bidding
  afternic: {
    accountId: string
    apiKey: string
  }
  
  // Intelligence APIs
  uspto: {
    apiKey: string
  }
  google: {
    apiKey: string
  }
  twitter: {
    bearerToken: string
  }
  reddit: {
    clientId: string
    clientSecret: string
  }
  
  // Payment
  stripe: {
    publishableKey: string
    secretKey: string
  }
  
  // Web3
  web3: {
    infuraId: string
    alchemyKey: string
    privateKey: string // For signing transactions
  }
  
  // Optional APIs
  semrush: { apiKey: string }
  ahrefs: { apiKey: string }
  apify: { token: string }
  producthunt: { token: string }
}

export interface APIStatus {
  name: string
  key: keyof APIConfig
  configured: boolean
  required: boolean
  description: string
}

// ==================== STORAGE KEYS ====================

const STORAGE_KEY = 'domainFlipper_apiConfig'
const ENCRYPTED_STORAGE_KEY = 'domainFlipper_apiConfig_encrypted'

// ==================== API CONFIG MANAGER ====================

class APIConfigManager {
  private config: Partial<APIConfig> = {}
  private listeners: Array<(config: Partial<APIConfig>) => void> = []

  constructor() {
    this.loadConfig()
  }

  /**
   * Load configuration from localStorage
   */
  private loadConfig(): void {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        this.config = JSON.parse(saved)
        logger.info('API_CONFIG', 'Configuration loaded', { 
          configuredAPIs: this.getConfiguredAPIs().length 
        })
      }
    } catch (error) {
      logger.warn('API_CONFIG', 'Failed to load configuration')
    }
  }

  /**
   * Save configuration to localStorage
   */
  private saveConfig(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.config))
      logger.info('API_CONFIG', 'Configuration saved')
      this.notifyListeners()
    } catch (error) {
      logger.error('API_CONFIG', 'Failed to save configuration', error as Error)
    }
  }

  /**
   * Set a specific API configuration
   */
  set<K extends keyof APIConfig>(key: K, value: APIConfig[K]): void {
    this.config[key] = value
    this.saveConfig()
    
    toast.success(`${this.getAPIName(key)} Configured`, {
      description: 'API key saved successfully',
    })
  }

  /**
   * Get a specific API configuration
   */
  get<K extends keyof APIConfig>(key: K): APIConfig[K] | undefined {
    return this.config[key] as APIConfig[K] | undefined
  }

  /**
   * Get all configuration
   */
  getAll(): Partial<APIConfig> {
    return { ...this.config }
  }

  /**
   * Check if a specific API is configured
   */
  isConfigured(key: keyof APIConfig): boolean {
    const value = this.config[key]
    if (!value) return false
    
    // Check if all required fields have values
    return Object.values(value).every(v => v && v.toString().trim() !== '')
  }

  /**
   * Get list of configured APIs
   */
  getConfiguredAPIs(): string[] {
    return Object.keys(this.config).filter(key => 
      this.isConfigured(key as keyof APIConfig)
    )
  }

  /**
   * Get API status for all APIs
   */
  getAPIStatus(): APIStatus[] {
    return [
      {
        name: 'Supabase (Database)',
        key: 'supabase',
        configured: this.isConfigured('supabase'),
        required: false,
        description: 'Stores your portfolio and transactions',
      },
      {
        name: 'GoDaddy',
        key: 'godaddy',
        configured: this.isConfigured('godaddy'),
        required: false, // Not required if using alternatives
        description: 'Domain auctions and registration',
      },
      {
        name: 'Afternic (FREE)',
        key: 'afternic',
        configured: this.isConfigured('afternic'),
        required: false,
        description: 'FREE - GoDaddy marketplace for listing/bidding',
      },
      {
        name: 'Namecheap',
        key: 'namecheap',
        configured: this.isConfigured('namecheap'),
        required: false,
        description: 'Alternative registrar for sniping',
      },
      {
        name: 'Namecheap Beast Mode',
        key: 'namecheapBeast',
        configured: this.isConfigured('namecheapBeast'),
        required: false,
        description: '$99/mo - Full auctions API without upgrade',
      },
      {
        name: 'DropCatch',
        key: 'dropcatch',
        configured: this.isConfigured('dropcatch'),
        required: false,
        description: 'Drop catching service',
      },
      {
        name: 'USPTO',
        key: 'uspto',
        configured: this.isConfigured('uspto'),
        required: false,
        description: 'Trademark checking (free)',
      },
      {
        name: 'Google API',
        key: 'google',
        configured: this.isConfigured('google'),
        required: false,
        description: 'Trends and search data',
      },
      {
        name: 'Twitter/X',
        key: 'twitter',
        configured: this.isConfigured('twitter'),
        required: false,
        description: 'Trending topics for leads',
      },
      {
        name: 'Reddit',
        key: 'reddit',
        configured: this.isConfigured('reddit'),
        required: false,
        description: 'r/startups monitoring',
      },
      {
        name: 'Stripe',
        key: 'stripe',
        configured: this.isConfigured('stripe'),
        required: false,
        description: 'Payment processing',
      },
      {
        name: 'Web3 (Infura/Alchemy)',
        key: 'web3',
        configured: this.isConfigured('web3'),
        required: false,
        description: 'ENS, Solana, Handshake',
      },
    ]
  }

  /**
   * Get human-readable API name
   */
  private getAPIName(key: keyof APIConfig): string {
    const names: Record<keyof APIConfig, string> = {
      supabase: 'Supabase',
      godaddy: 'GoDaddy',
      namecheap: 'Namecheap',
      namecheapBeast: 'Namecheap Beast Mode',
      dropcatch: 'DropCatch',
      afternic: 'Afternic (FREE)',
      uspto: 'USPTO',
      google: 'Google',
      twitter: 'Twitter/X',
      reddit: 'Reddit',
      stripe: 'Stripe',
      web3: 'Web3',
      semrush: 'SEMrush',
      ahrefs: 'Ahrefs',
      apify: 'Apify',
      producthunt: 'ProductHunt',
    }
    return names[key] || key
  }

  /**
   * Bulk set configuration (for setup wizard)
   */
  setAll(config: Partial<APIConfig>): void {
    this.config = { ...this.config, ...config }
    this.saveConfig()
    
    const count = this.getConfiguredAPIs().length
    toast.success('Configuration Saved', {
      description: `${count} API${count !== 1 ? 's' : ''} configured`,
    })
  }

  /**
   * Clear all configuration
   */
  clearAll(): void {
    this.config = {}
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(ENCRYPTED_STORAGE_KEY)
    this.notifyListeners()
    
    toast.info('Configuration Cleared', {
      description: 'All API keys have been removed',
    })
  }

  /**
   * Export configuration (for backup)
   */
  exportConfig(): string {
    return JSON.stringify(this.config, null, 2)
  }

  /**
   * Import configuration (from backup)
   */
  importConfig(json: string): boolean {
    try {
      const imported = JSON.parse(json)
      this.config = imported
      this.saveConfig()
      return true
    } catch {
      toast.error('Import Failed', { description: 'Invalid configuration format' })
      return false
    }
  }

  /**
   * Subscribe to configuration changes
   */
  subscribe(listener: (config: Partial<APIConfig>) => void): () => void {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(l => l({ ...this.config }))
  }

  /**
   * Get API key value for a specific service (for use in code)
   */
  getKey(service: string): string | undefined {
    switch (service) {
      case 'GODADDY_KEY':
        return this.config.godaddy?.apiKey
      case 'GODADDY_SECRET':
        return this.config.godaddy?.apiSecret
      case 'NAMECHEAP_API_USER':
        return this.config.namecheap?.apiUser
      case 'NAMECHEAP_API_KEY':
        return this.config.namecheap?.apiKey
      case 'NAMECHEAP_CLIENT_IP':
        return this.config.namecheap?.clientIp
      case 'SUPABASE_URL':
        return this.config.supabase?.url
      case 'SUPABASE_ANON_KEY':
        return this.config.supabase?.anonKey
      case 'USPTO_API_KEY':
        return this.config.uspto?.apiKey
      case 'TWITTER_BEARER_TOKEN':
        return this.config.twitter?.bearerToken
      case 'STRIPE_SECRET_KEY':
        return this.config.stripe?.secretKey
      default:
        return undefined
    }
  }

  /**
   * Check if minimum required APIs are configured
   */
  hasMinimumConfig(): boolean {
    // At minimum, need ONE auction/registrar API to function
    return (
      this.isConfigured('godaddy') || 
      this.isConfigured('namecheap') ||
      this.isConfigured('afternic') ||       // FREE option
      this.isConfigured('namecheapBeast') || // $99/mo option
      this.isConfigured('dropcatch')
    )
  }

  /**
   * Get configuration health status
   */
  getHealthStatus(): { healthy: boolean; message: string; details: string[] } {
    const status = this.getAPIStatus()
    const requiredMissing = status.filter(s => s.required && !s.configured)
    const optionalConfigured = status.filter(s => !s.required && s.configured)
    const totalConfigured = status.filter(s => s.configured).length

    if (requiredMissing.length > 0) {
      return {
        healthy: false,
        message: 'Required APIs not configured',
        details: requiredMissing.map(s => `${s.name}: Not configured`),
      }
    }

    if (totalConfigured === 0) {
      return {
        healthy: false,
        message: 'No APIs configured',
        details: ['Configure at least GoDaddy or Namecheap to start'],
      }
    }

    return {
      healthy: true,
      message: `${totalConfigured} API${totalConfigured !== 1 ? 's' : ''} configured`,
      details: [
        ...status.filter(s => s.configured).map(s => `✓ ${s.name}`),
        ...status.filter(s => !s.configured && !s.required).map(s => `○ ${s.name} (optional)`),
      ],
    }
  }
}

// Export singleton
export const apiConfigManager = new APIConfigManager()

