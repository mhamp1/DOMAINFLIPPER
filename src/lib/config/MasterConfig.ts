/**
 * MasterConfig.ts — THE SINGLE SOURCE OF TRUTH
 * All settings, API keys, and state managed in ONE place
 * December 27, 2025
 */

import { toast } from 'sonner'

// ==================== TYPES ====================

export interface MasterConfigData {
  // API Keys - GoDaddy (PRIMARY)
  godaddy: {
    apiKey: string
    apiSecret: string
    sandbox: boolean
  }
  
  // API Keys - Namecheap
  namecheap: {
    apiUser: string
    apiKey: string
    clientIp: string
  }
  
  // Database - Supabase
  supabase: {
    url: string
    anonKey: string
  }
  
  // Intelligence APIs (for expansion)
  google: {
    apiKey: string
  }
  twitter: {
    bearerToken: string
  }
  uspto: {
    apiKey: string
  }
  stripe: {
    publishableKey: string
    secretKey: string
  }
  
  // Web3/ENS/Solana/NFT Domain Sniping
  infura: {
    projectId: string
    mainnetUrl: string
  }
  alchemy: {
    apiKey: string
    ethMainnet: string
    solanaMainnet: string
    nftApi: string
  }
  
  // Empire Settings
  empire: {
    totalCapital: number
    dailyBudget: number
    minROI: number
    targetROI: number
    maxBidPercent: number
    allStrategiesActive: boolean
    enabledStrategies: string[]
  }
  
  // Bot State
  bot: {
    isRunning: boolean
    lastStartTime: string | null
  }
  
  // Stats (persisted)
  stats: {
    totalProfit: number
    totalSpent: number
    domainsAcquired: number
    domainsSold: number
  }
  
  // Advanced Features Settings
  advanced: {
    // Brandability/NLP Scoring
    brandability: {
      enabled: boolean
      minVowelRatio: number
      maxVowelRatio: number
      maxLength: number
      minLength: number
      penalizeProfanity: boolean
      penalizeStopwords: boolean
      penalizeTrademark: boolean
      requireEnglish: boolean
      minScore: number
    }
    
    // Seasonal/Recency Trend Analysis
    seasonal: {
      enabled: boolean
      windowDays: number
      recencyDecayRate: number
      minPersistenceDays: number
      spikeFilterThreshold: number
      momentumWeight: number
      enableSpikeFilter: boolean
    }
    
    // Channel Performance Tracking
    channelPerformance: {
      enabled: boolean
      channels: Array<{
        name: string
        enabled: boolean
        commission: number
        listPriceMultiplier: number
        floorPriceMultiplier: number
        repricingCadenceDays: number
        autoReprice: boolean
      }>
    }
    
    // Outbound Buyer Suggestions (OPT-IN)
    outbound: {
      enabled: boolean              // DEFAULT: FALSE
      requireManualApproval: boolean // DEFAULT: TRUE
      minMatchScore: number
      maxSuggestionsPerDomain: number
      includeCompetitors: boolean
    }
    
    // Registrar/Marketplace Optimization
    registrar: {
      defaultRegistrar: 'GoDaddy' | 'Namecheap' | 'DropCatch'
      defaultMarketplaces: string[]
      preferredRegion?: string
      preAuthEnabled: boolean
    }
    
    // Safety Guardrails
    safety: {
      dryRun: boolean              // DEFAULT: TRUE
      dailyCapUSD: number          // DEFAULT: $200
      perDomainCapUSD: number      // DEFAULT: $20
      minMargin: number            // DEFAULT: 3.0x
      allowedTLDs: string[]        // DEFAULT: ['.com', '.ai', '.io']
      circuitBreakerThreshold: number
      requireConfirmation: boolean // DEFAULT: TRUE
    }
  }
}

// ============================================
// ENVIRONMENT-BASED CREDENTIALS
// All credentials MUST be provided via environment variables
// NEVER hardcode credentials in source code - this is a security risk!
// ============================================

/**
 * Get credentials from environment variables
 * WARNING: Returns empty strings if not configured - caller must validate!
 */
function getEnvCredentials() {
  return {
    godaddy: {
      apiKey: import.meta.env.VITE_GODADDY_API_KEY || '',
      apiSecret: import.meta.env.VITE_GODADDY_API_SECRET || '',
    },
    supabase: {
      url: import.meta.env.VITE_SUPABASE_URL || '',
      anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
    },
    namecheap: {
      apiUser: import.meta.env.VITE_NAMECHEAP_API_USER || '',
      apiKey: import.meta.env.VITE_NAMECHEAP_API_KEY || '',
      clientIp: import.meta.env.VITE_NAMECHEAP_CLIENT_IP || '',
    },
    google: {
      apiKey: import.meta.env.VITE_GOOGLE_API_KEY || '',
    },
    twitter: {
      bearerToken: import.meta.env.VITE_TWITTER_BEARER_TOKEN || '',
    },
    uspto: {
      apiKey: import.meta.env.VITE_USPTO_API_KEY || '',
    },
    stripe: {
      publishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '',
      secretKey: import.meta.env.VITE_STRIPE_SECRET_KEY || '',
    },
    infura: {
      projectId: import.meta.env.VITE_INFURA_PROJECT_ID || '',
      mainnetUrl: import.meta.env.VITE_INFURA_MAINNET_URL || '',
    },
    alchemy: {
      apiKey: import.meta.env.VITE_ALCHEMY_API_KEY || '',
      ethMainnet: import.meta.env.VITE_ALCHEMY_ETH_MAINNET || '',
      solanaMainnet: import.meta.env.VITE_ALCHEMY_SOLANA_MAINNET || '',
      nftApi: import.meta.env.VITE_ALCHEMY_NFT_API || '',
    },
  }
}

const DEFAULT_CONFIG: MasterConfigData = {
  godaddy: {
    apiKey: '',
    apiSecret: '',
    sandbox: false,
  },
  namecheap: {
    apiUser: '',
    apiKey: '',
    clientIp: '',
  },
  supabase: {
    url: '',
    anonKey: '',
  },
  google: {
    apiKey: '',
  },
  twitter: {
    bearerToken: '',
  },
  uspto: {
    apiKey: '',
  },
  stripe: {
    publishableKey: '',
    secretKey: '',
  },
  infura: {
    projectId: '',
    mainnetUrl: '',
  },
  alchemy: {
    apiKey: '',
    ethMainnet: '',
    solanaMainnet: '',
    nftApi: '',
  },
  empire: {
    totalCapital: 500,
    dailyBudget: 50,
    minROI: 5,
    targetROI: 10,
    maxBidPercent: 30,
    allStrategiesActive: true,
    enabledStrategies: ['all'],
  },
  bot: {
    isRunning: false,
    lastStartTime: null,
  },
  stats: {
    totalProfit: 0,
    totalSpent: 0,
    domainsAcquired: 0,
    domainsSold: 0,
  },
  advanced: {
    brandability: {
      enabled: true,
      minVowelRatio: 0.25,
      maxVowelRatio: 0.5,
      maxLength: 15,
      minLength: 4,
      penalizeProfanity: true,
      penalizeStopwords: true,
      penalizeTrademark: true,
      requireEnglish: false,
      minScore: 60,
    },
    seasonal: {
      enabled: true,
      windowDays: 30,
      recencyDecayRate: 0.1,
      minPersistenceDays: 3,
      spikeFilterThreshold: 2.5,
      momentumWeight: 0.4,
      enableSpikeFilter: true,
    },
    channelPerformance: {
      enabled: true,
      channels: [
        {
          name: 'Afternic',
          enabled: true,
          commission: 0.20,
          listPriceMultiplier: 1.0,
          floorPriceMultiplier: 1.0,
          repricingCadenceDays: 30,
          autoReprice: false,
        },
        {
          name: 'Dan',
          enabled: true,
          commission: 0.09,
          listPriceMultiplier: 1.0,
          floorPriceMultiplier: 1.0,
          repricingCadenceDays: 30,
          autoReprice: false,
        },
      ],
    },
    outbound: {
      enabled: false,              // DEFAULT: DISABLED
      requireManualApproval: true, // DEFAULT: REQUIRE APPROVAL
      minMatchScore: 70,
      maxSuggestionsPerDomain: 5,
      includeCompetitors: false,
    },
    registrar: {
      defaultRegistrar: 'GoDaddy',
      defaultMarketplaces: ['Afternic', 'Dan'],
      preAuthEnabled: false,
    },
    safety: {
      dryRun: true,                // DEFAULT: DRY RUN
      dailyCapUSD: 200,            // DEFAULT: $200
      perDomainCapUSD: 20,         // DEFAULT: $20
      minMargin: 3.0,              // DEFAULT: 3.0x
      allowedTLDs: ['.com', '.ai', '.io'],
      circuitBreakerThreshold: 5,
      requireConfirmation: true,   // DEFAULT: REQUIRE CONFIRMATION
    },
  },
}

const STORAGE_KEY = 'domainFlipper_masterConfig'

// ==================== MASTER CONFIG CLASS ====================

class MasterConfig {
  private config: MasterConfigData
  private listeners: Array<(config: MasterConfigData) => void> = []
  private initialized = false

  constructor() {
    this.config = this.loadConfig()
    this.ensureAllCredentials() // ALWAYS ensure credentials are present
    this.initialized = true
    
    // Log what we loaded - should ALWAYS show true for all APIs
    console.log('🔧 MasterConfig INITIALIZED — All APIs Ready:', {
      '1. GoDaddy': this.isGoDaddyConfigured() ? '✅ READY' : '❌ MISSING',
      '2. Namecheap': this.isNamecheapConfigured() ? '✅ READY' : '❌ MISSING',
      '3. Supabase': this.isSupabaseConfigured() ? '✅ READY' : '❌ MISSING',
      '4. Google': this.isGoogleConfigured() ? '✅ READY' : '❌ MISSING',
      '5. Twitter/X': this.isTwitterConfigured() ? '✅ READY' : '❌ MISSING',
      '6. USPTO': this.isUSPTOConfigured() ? '✅ READY' : '❌ MISSING',
      '7. Stripe': this.isStripeConfigured() ? '✅ READY' : '❌ MISSING',
      '8. Infura': this.isInfuraConfigured() ? '✅ READY' : '❌ MISSING',
      '9. Alchemy': this.isAlchemyConfigured() ? '✅ READY' : '❌ MISSING',
      'Capital': `$${this.config.empire.totalCapital}`,
    })
  }

  /**
   * Load credentials from environment variables
   * Called on initialization to populate config from env vars
   */
  private ensureAllCredentials(): void {
    const envCreds = getEnvCredentials()
    
    // 1. GoDaddy - Load from env vars if available
    if (envCreds.godaddy.apiKey && !this.config.godaddy?.apiKey) {
      this.config.godaddy = { 
        apiKey: envCreds.godaddy.apiKey,
        apiSecret: envCreds.godaddy.apiSecret,
        sandbox: false 
      }
    }

    // 2. Namecheap - Load from env vars if available
    if (envCreds.namecheap.apiKey && !this.config.namecheap?.apiKey) {
      this.config.namecheap = {
        apiUser: envCreds.namecheap.apiUser,
        apiKey: envCreds.namecheap.apiKey,
        clientIp: envCreds.namecheap.clientIp,
      }
    }

    // 3. Supabase - Load from env vars if available
    if (envCreds.supabase.url && !this.config.supabase?.url) {
      this.config.supabase = {
        url: envCreds.supabase.url,
        anonKey: envCreds.supabase.anonKey,
      }
    }

    // 4. Google - Load from env vars if available
    if (envCreds.google.apiKey && !this.config.google?.apiKey) {
      this.config.google = { apiKey: envCreds.google.apiKey }
    }

    // 5. Twitter/X - Load from env vars if available
    if (envCreds.twitter.bearerToken && !this.config.twitter?.bearerToken) {
      this.config.twitter = { bearerToken: envCreds.twitter.bearerToken }
    }

    // 6. USPTO - Load from env vars if available
    if (envCreds.uspto.apiKey && !this.config.uspto?.apiKey) {
      this.config.uspto = { apiKey: envCreds.uspto.apiKey }
    }

    // 7. Stripe - Load from env vars if available
    if (envCreds.stripe.publishableKey && !this.config.stripe?.publishableKey) {
      this.config.stripe = {
        publishableKey: envCreds.stripe.publishableKey,
        secretKey: envCreds.stripe.secretKey,
      }
    }

    // 8. Infura - Load from env vars if available
    if (envCreds.infura.projectId && !this.config.infura?.projectId) {
      this.config.infura = {
        projectId: envCreds.infura.projectId,
        mainnetUrl: envCreds.infura.mainnetUrl,
      }
    }

    // 9. Alchemy - Load from env vars if available
    if (envCreds.alchemy.apiKey && !this.config.alchemy?.apiKey) {
      this.config.alchemy = {
        apiKey: envCreds.alchemy.apiKey,
        ethMainnet: envCreds.alchemy.ethMainnet,
        solanaMainnet: envCreds.alchemy.solanaMainnet,
        nftApi: envCreds.alchemy.nftApi,
      }
    }

    // Save to localStorage so they persist
    this.saveConfig()
  }

  /**
   * Force refresh credentials from environment variables
   * Call this to reload env var changes
   */
  forceRefreshCredentials(): void {
    console.log('🔄 Force refreshing credentials from environment variables...')
    const envCreds = getEnvCredentials()
    
    if (envCreds.godaddy.apiKey) {
      this.config.godaddy = { 
        apiKey: envCreds.godaddy.apiKey,
        apiSecret: envCreds.godaddy.apiSecret,
        sandbox: false 
      }
    }
    if (envCreds.namecheap.apiKey) {
      this.config.namecheap = {
        apiUser: envCreds.namecheap.apiUser,
        apiKey: envCreds.namecheap.apiKey,
        clientIp: envCreds.namecheap.clientIp,
      }
    }
    if (envCreds.supabase.url) {
      this.config.supabase = {
        url: envCreds.supabase.url,
        anonKey: envCreds.supabase.anonKey,
      }
    }
    if (envCreds.google.apiKey) {
      this.config.google = { apiKey: envCreds.google.apiKey }
    }
    if (envCreds.twitter.bearerToken) {
      this.config.twitter = { bearerToken: envCreds.twitter.bearerToken }
    }
    if (envCreds.uspto.apiKey) {
      this.config.uspto = { apiKey: envCreds.uspto.apiKey }
    }
    if (envCreds.stripe.publishableKey) {
      this.config.stripe = {
        publishableKey: envCreds.stripe.publishableKey,
        secretKey: envCreds.stripe.secretKey,
      }
    }
    if (envCreds.infura.projectId) {
      this.config.infura = {
        projectId: envCreds.infura.projectId,
        mainnetUrl: envCreds.infura.mainnetUrl,
      }
    }
    if (envCreds.alchemy.apiKey) {
      this.config.alchemy = {
        apiKey: envCreds.alchemy.apiKey,
        ethMainnet: envCreds.alchemy.ethMainnet,
        solanaMainnet: envCreds.alchemy.solanaMainnet,
        nftApi: envCreds.alchemy.nftApi,
      }
    }
    this.saveConfig()
    console.log('✅ Credentials refreshed from environment variables!')
    toast.success('Credentials Refreshed', { description: 'Loaded from environment variables' })
  }

  private loadConfig(): MasterConfigData {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        // Merge saved settings with defaults
        const merged = this.deepMerge(DEFAULT_CONFIG, parsed)
        return merged
      }
    } catch (e) {
      console.error('Failed to load master config:', e)
    }
    
    // Return defaults with ALL owner credentials
    return { ...DEFAULT_CONFIG }
  }

  private deepMerge(target: any, source: any): any {
    const result = { ...target }
    for (const key of Object.keys(source)) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(target[key] || {}, source[key])
      } else {
        result[key] = source[key]
      }
    }
    return result
  }

  private saveConfig(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.config))
      this.notifyListeners()
    } catch (e) {
      console.error('Failed to save master config:', e)
    }
  }

  // ==================== GETTERS ====================

  getAll(): MasterConfigData {
    return { ...this.config }
  }

  getGoDaddy() {
    return { ...this.config.godaddy }
  }

  getNamecheap() {
    return { ...this.config.namecheap }
  }

  getSupabase() {
    return { ...this.config.supabase }
  }

  getGoogle() {
    return { ...this.config.google }
  }

  getTwitter() {
    return { ...this.config.twitter }
  }

  getUSPTO() {
    return { ...this.config.uspto }
  }

  getStripe() {
    return { ...this.config.stripe }
  }

  getInfura() {
    return { ...this.config.infura }
  }

  getAlchemy() {
    return { ...this.config.alchemy }
  }

  // Get credentials from environment variables
  getOwnerCredentials() {
    return getEnvCredentials()
  }

  getEmpire() {
    return { ...this.config.empire }
  }

  getStats() {
    return { ...this.config.stats }
  }

  getBotState() {
    return { ...this.config.bot }
  }

  // ==================== API KEY SETTERS ====================

  setGoDaddy(apiKey: string, apiSecret: string): void {
    this.config.godaddy.apiKey = apiKey
    this.config.godaddy.apiSecret = apiSecret
    this.saveConfig()
    
    console.log('✅ GoDaddy API saved:', { hasKey: !!apiKey, hasSecret: !!apiSecret })
    toast.success('GoDaddy API Saved', { 
      description: apiKey && apiSecret ? '✓ Credentials stored' : '✗ Missing credentials' 
    })
  }

  setNamecheap(apiUser: string, apiKey: string, clientIp: string): void {
    this.config.namecheap.apiUser = apiUser
    this.config.namecheap.apiKey = apiKey
    this.config.namecheap.clientIp = clientIp
    this.saveConfig()
    
    console.log('✅ Namecheap API saved:', { hasUser: !!apiUser, hasKey: !!apiKey })
    toast.success('Namecheap API Saved', { 
      description: apiUser && apiKey ? '✓ Credentials stored' : '✗ Missing credentials' 
    })
  }

  setSupabase(url: string, anonKey: string): void {
    this.config.supabase.url = url
    this.config.supabase.anonKey = anonKey
    this.saveConfig()
    
    console.log('✅ Supabase saved:', { hasUrl: !!url, hasKey: !!anonKey })
    toast.success('Supabase Saved', { 
      description: url && anonKey ? '✓ Database connected' : '✗ Missing credentials' 
    })
  }

  setGoogle(apiKey: string): void {
    this.config.google.apiKey = apiKey
    this.saveConfig()
    toast.success('Google API Saved')
  }

  setTwitter(bearerToken: string): void {
    this.config.twitter.bearerToken = bearerToken
    this.saveConfig()
    toast.success('Twitter API Saved')
  }

  setUSPTO(apiKey: string): void {
    this.config.uspto.apiKey = apiKey
    this.saveConfig()
    toast.success('USPTO API Saved')
  }

  setStripe(publishableKey: string, secretKey: string): void {
    this.config.stripe.publishableKey = publishableKey
    this.config.stripe.secretKey = secretKey
    this.saveConfig()
    console.log('✅ Stripe API saved:', { hasPublishable: !!publishableKey, hasSecret: !!secretKey })
    toast.success('Stripe API Saved', { 
      description: publishableKey && secretKey ? '✓ Payment processing ready' : '✗ Missing credentials' 
    })
  }

  setInfura(projectId: string, mainnetUrl: string): void {
    this.config.infura.projectId = projectId
    this.config.infura.mainnetUrl = mainnetUrl
    this.saveConfig()
    console.log('✅ Infura API saved:', { hasProjectId: !!projectId })
    toast.success('Infura API Saved', { description: 'Web3/ENS enabled' })
  }

  setAlchemy(apiKey: string, ethMainnet: string, solanaMainnet: string, nftApi: string): void {
    this.config.alchemy.apiKey = apiKey
    this.config.alchemy.ethMainnet = ethMainnet
    this.config.alchemy.solanaMainnet = solanaMainnet
    this.config.alchemy.nftApi = nftApi
    this.saveConfig()
    console.log('✅ Alchemy API saved:', { hasApiKey: !!apiKey })
    toast.success('Alchemy API Saved', { description: 'Solana/NFT domains enabled' })
  }

  // ==================== EMPIRE SETTINGS SETTERS ====================

  setCapital(amount: number): void {
    this.config.empire.totalCapital = Math.max(0, amount)
    this.config.empire.dailyBudget = Math.round(amount * 0.1) // 10% default
    this.saveConfig()
  }

  setDailyBudget(amount: number): void {
    this.config.empire.dailyBudget = Math.max(0, amount)
    this.saveConfig()
  }

  setMinROI(roi: number): void {
    this.config.empire.minROI = Math.max(1, roi)
    this.saveConfig()
  }

  // ==================== BOT STATE ====================

  setBotRunning(running: boolean): void {
    this.config.bot.isRunning = running
    if (running) {
      this.config.bot.lastStartTime = new Date().toISOString()
    }
    this.saveConfig()
  }

  wasBotRunning(): boolean {
    return this.config.bot.isRunning
  }

  // ==================== STATS ====================

  recordPurchase(amount: number): void {
    this.config.stats.totalSpent += amount
    this.config.stats.domainsAcquired++
    this.saveConfig()
  }

  recordSale(salePrice: number, purchasePrice: number): void {
    const profit = salePrice - purchasePrice
    this.config.stats.totalProfit += profit
    this.config.stats.domainsSold++
    this.saveConfig()
  }

  // ==================== API STATUS CHECKS ====================

  isGoDaddyConfigured(): boolean {
    return !!(this.config.godaddy.apiKey && this.config.godaddy.apiSecret)
  }

  isNamecheapConfigured(): boolean {
    return !!(this.config.namecheap.apiUser && this.config.namecheap.apiKey)
  }

  isSupabaseConfigured(): boolean {
    return !!(this.config.supabase.url && this.config.supabase.anonKey)
  }

  isGoogleConfigured(): boolean {
    return !!this.config.google.apiKey
  }

  isTwitterConfigured(): boolean {
    return !!this.config.twitter.bearerToken
  }

  isUSPTOConfigured(): boolean {
    return !!this.config.uspto.apiKey
  }

  isStripeConfigured(): boolean {
    return !!(this.config.stripe?.publishableKey && this.config.stripe?.secretKey)
  }

  isInfuraConfigured(): boolean {
    return !!this.config.infura?.projectId
  }

  isAlchemyConfigured(): boolean {
    return !!this.config.alchemy?.apiKey
  }

  hasAnyAPIConfigured(): boolean {
    return this.isGoDaddyConfigured() || this.isNamecheapConfigured()
  }

  /**
   * Returns count of configured APIs - should ALWAYS be 9/9 for owner
   */
  getConfiguredCount(): number {
    let count = 0
    if (this.isGoDaddyConfigured()) count++
    if (this.isNamecheapConfigured()) count++
    if (this.isSupabaseConfigured()) count++
    if (this.isGoogleConfigured()) count++
    if (this.isTwitterConfigured()) count++
    if (this.isUSPTOConfigured()) count++
    if (this.isStripeConfigured()) count++
    if (this.isInfuraConfigured()) count++
    if (this.isAlchemyConfigured()) count++
    return count
  }

  /**
   * Get all API statuses at once for display
   */
  getAllAPIStatuses(): Record<string, { name: string; configured: boolean; key: string }> {
    return {
      godaddy: { 
        name: 'GoDaddy (Primary)', 
        configured: this.isGoDaddyConfigured(),
        key: this.config.godaddy.apiKey ? `${this.config.godaddy.apiKey.slice(0, 8)}...` : 'Not set'
      },
      namecheap: { 
        name: 'Namecheap', 
        configured: this.isNamecheapConfigured(),
        key: this.config.namecheap.apiUser || 'Not set'
      },
      supabase: { 
        name: 'Supabase (Database)', 
        configured: this.isSupabaseConfigured(),
        key: this.config.supabase.url ? 'Connected' : 'Not set'
      },
      google: { 
        name: 'Google Trends', 
        configured: this.isGoogleConfigured(),
        key: this.config.google.apiKey ? `${this.config.google.apiKey.slice(0, 8)}...` : 'Not set'
      },
      twitter: { 
        name: 'Twitter/X', 
        configured: this.isTwitterConfigured(),
        key: this.config.twitter.bearerToken ? 'Bearer Token Set' : 'Not set'
      },
      uspto: { 
        name: 'USPTO (Trademark)', 
        configured: this.isUSPTOConfigured(),
        key: this.config.uspto.apiKey ? `${this.config.uspto.apiKey.slice(0, 8)}...` : 'Not set'
      },
      stripe: { 
        name: 'Stripe (Payments)', 
        configured: this.isStripeConfigured(),
        key: this.config.stripe?.publishableKey ? 'Live Keys Set' : 'Not set'
      },
      infura: { 
        name: 'Infura (Web3)', 
        configured: this.isInfuraConfigured(),
        key: this.config.infura?.projectId ? `${this.config.infura.projectId.slice(0, 8)}...` : 'Not set'
      },
      alchemy: { 
        name: 'Alchemy (Solana/NFT)', 
        configured: this.isAlchemyConfigured(),
        key: this.config.alchemy?.apiKey ? `${this.config.alchemy.apiKey.slice(0, 8)}...` : 'Not set'
      },
    }
  }

  /**
   * Total number of API integrations available
   */
  getTotalAPICount(): number {
    return 9 // GoDaddy, Namecheap, Supabase, Google, Twitter, USPTO, Stripe, Infura, Alchemy
  }

  // ==================== SUBSCRIPTIONS ====================

  subscribe(listener: (config: MasterConfigData) => void): () => void {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(l => l({ ...this.config }))
  }

  // ==================== ADVANCED SETTINGS ====================
  
  getAdvancedSettings() {
    return { ...this.config.advanced }
  }
  
  getBrandabilitySettings() {
    return { ...this.config.advanced.brandability }
  }
  
  getSeasonalSettings() {
    return { ...this.config.advanced.seasonal }
  }
  
  getChannelPerformanceSettings() {
    return { ...this.config.advanced.channelPerformance }
  }
  
  getOutboundSettings() {
    return { ...this.config.advanced.outbound }
  }
  
  getRegistrarSettings() {
    return { ...this.config.advanced.registrar }
  }
  
  getSafetySettings() {
    return { ...this.config.advanced.safety }
  }
  
  updateBrandabilitySettings(settings: Partial<typeof this.config.advanced.brandability>): void {
    this.config.advanced.brandability = { ...this.config.advanced.brandability, ...settings }
    this.saveConfig()
  }
  
  updateSeasonalSettings(settings: Partial<typeof this.config.advanced.seasonal>): void {
    this.config.advanced.seasonal = { ...this.config.advanced.seasonal, ...settings }
    this.saveConfig()
  }
  
  updateChannelPerformanceSettings(settings: Partial<typeof this.config.advanced.channelPerformance>): void {
    this.config.advanced.channelPerformance = { ...this.config.advanced.channelPerformance, ...settings }
    this.saveConfig()
  }
  
  updateOutboundSettings(settings: Partial<typeof this.config.advanced.outbound>): void {
    this.config.advanced.outbound = { ...this.config.advanced.outbound, ...settings }
    this.saveConfig()
    
    if (settings.enabled !== undefined) {
      if (settings.enabled) {
        toast.warning('⚠️ Outbound Enabled', { 
          description: 'Buyer suggestions enabled. No auto-send - manual approval required.' 
        })
      } else {
        toast.success('Outbound Disabled', { description: 'Buyer suggestions disabled' })
      }
    }
  }
  
  updateRegistrarSettings(settings: Partial<typeof this.config.advanced.registrar>): void {
    this.config.advanced.registrar = { ...this.config.advanced.registrar, ...settings }
    this.saveConfig()
  }
  
  updateSafetySettings(settings: Partial<typeof this.config.advanced.safety>): void {
    const oldDryRun = this.config.advanced.safety.dryRun
    this.config.advanced.safety = { ...this.config.advanced.safety, ...settings }
    this.saveConfig()
    
    // Show warning when DRY_RUN is disabled
    if (settings.dryRun !== undefined && !settings.dryRun && oldDryRun) {
      toast.error('🚨 DRY_RUN DISABLED', { 
        description: 'Real purchases enabled. Be careful!' 
      })
    } else if (settings.dryRun !== undefined && settings.dryRun && !oldDryRun) {
      toast.success('✅ DRY_RUN Enabled', { 
        description: 'Safe mode - no real purchases' 
      })
    }
  }

  // ==================== RESET ====================

  reset(): void {
    this.config = { ...DEFAULT_CONFIG }
    this.saveConfig()
    toast.info('Configuration Reset', { description: 'All settings restored to defaults' })
  }
}

// ==================== SINGLETON EXPORT ====================

export const masterConfig = new MasterConfig()

// Also export for backwards compatibility with existing code
export default masterConfig

