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
}

// ============================================
// OWNER'S PERMANENT API CREDENTIALS
// These are HARDCODED and will NEVER need to be entered again
// ============================================
const OWNER_CREDENTIALS = {
  godaddy: {
    apiKey: 'h2eWy65jfMPV_KSxuT2Q44RY27P3n9YqiA6',
    apiSecret: 'LuKboxc1tZ3UGAFJFDvtAE',
  },
  supabase: {
    url: 'https://gipcuhnjbzcnkclemopv.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpcGN1aG5qYnpjbmtjbGVtb3B2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5NTU4MjcsImV4cCI6MjA4MDUzMTgyN30.8F1JWsoplrS6NC7aQnCj722uWQz4x10E_Y2xQfn0Mnk',
    serviceKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpcGN1aG5qYnpjbmtjbGVtb3B2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDk1NTgyNywiZXhwIjoyMDgwNTMxODI3fQ.hU5BDKiknfNIC6DKTHOcV2fFUZg9fazhvmX0_Y6ax3s',
  },
  namecheap: {
    apiUser: 'mhamp1',
    apiKey: 'c2cd72c359c74ac49b15e32bb98b4143',
    clientIp: '68.106.44.20',
  },
  google: {
    apiKey: 'AIzaSyAkPgSOHvrlSdxTXoPGUcUqws_Mc2GbNI8',
  },
  twitter: {
    apiKey: 'FkyzaXINcWW7uj1ietIzHBmkI',
    apiSecret: '1yWdKsS0Tnznb2kPDRaA487fQZeM7Pchy5vHqdfFMMo3VU1iWn',
    bearerToken: 'AAAAAAAAAAAAAAAAAAAAAIpw5wEAAAAA%2Bo6RyR0%2BidGzehjdNLqfIkGr0mk%3DH5n2hBn65TtyLztrNmCIeeL220t48KF245Xvpz7EKQ6kFKFIZP',
    accessToken: '1692022250466312193-d9dkC5rJbRU5k5KiWir3YzBGdM4Pt8',
    accessTokenSecret: 'wKm9IUuJrqDStwgnevzXIb2Zv8JcyWKAzGiV6oxLfj4m5',
  },
  uspto: {
    apiKey: 'xqdufhsmpwfxsmdtsmvlmzqmgyxukr',
  },
  stripe: {
    publishableKey: 'pk_live_51SYgQHGXpC5vPDcRSrWHvEgsmawP2QrrqrjXX1Yqbkj3vlqKG5GiSKfZApgLMj7K74Ove09HeW82OVpjORTJMZWb00XxLJ4cCd',
    secretKey: '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',
  },
  // Web3/ENS/Solana/NFT Domain Sniping
  infura: {
    projectId: '61f7969cca424b2a9325683fdb5916a1',
    mainnetUrl: 'https://mainnet.infura.io/v3/61f7969cca424b2a9325683fdb5916a1',
  },
  alchemy: {
    apiKey: 'NMEtxHS4m9mZTnYbKM5Yj',
    ethMainnet: 'https://eth-mainnet.g.alchemy.com/v2/NMEtxHS4m9mZTnYbKM5Yj',
    solanaMainnet: 'https://solana-mainnet.g.alchemy.com/v2/NMEtxHS4m9mZTnYbKM5Yj',
    nftApi: 'https://eth-mainnet.g.alchemy.com/nft/v3/NMEtxHS4m9mZTnYbKM5Yj',
  },
}

const DEFAULT_CONFIG: MasterConfigData = {
  godaddy: {
    apiKey: OWNER_CREDENTIALS.godaddy.apiKey,
    apiSecret: OWNER_CREDENTIALS.godaddy.apiSecret,
    sandbox: false,
  },
  namecheap: {
    apiUser: OWNER_CREDENTIALS.namecheap.apiUser,
    apiKey: OWNER_CREDENTIALS.namecheap.apiKey,
    clientIp: OWNER_CREDENTIALS.namecheap.clientIp,
  },
  supabase: {
    url: OWNER_CREDENTIALS.supabase.url,
    anonKey: OWNER_CREDENTIALS.supabase.anonKey,
  },
  google: {
    apiKey: OWNER_CREDENTIALS.google.apiKey,
  },
  twitter: {
    bearerToken: OWNER_CREDENTIALS.twitter.bearerToken,
  },
  uspto: {
    apiKey: OWNER_CREDENTIALS.uspto.apiKey,
  },
  stripe: {
    publishableKey: OWNER_CREDENTIALS.stripe.publishableKey,
    secretKey: OWNER_CREDENTIALS.stripe.secretKey,
  },
  infura: {
    projectId: OWNER_CREDENTIALS.infura.projectId,
    mainnetUrl: OWNER_CREDENTIALS.infura.mainnetUrl,
  },
  alchemy: {
    apiKey: OWNER_CREDENTIALS.alchemy.apiKey,
    ethMainnet: OWNER_CREDENTIALS.alchemy.ethMainnet,
    solanaMainnet: OWNER_CREDENTIALS.alchemy.solanaMainnet,
    nftApi: OWNER_CREDENTIALS.alchemy.nftApi,
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
   * ENSURES ALL OWNER CREDENTIALS ARE ALWAYS PRESENT
   * Called on every load and can be called manually to force refresh
   */
  private ensureAllCredentials(): void {
    // 1. GoDaddy - PRIMARY
    if (!this.config.godaddy?.apiKey) {
      this.config.godaddy = { 
        apiKey: OWNER_CREDENTIALS.godaddy.apiKey,
        apiSecret: OWNER_CREDENTIALS.godaddy.apiSecret,
        sandbox: false 
      }
    }
    if (!this.config.godaddy.apiSecret) {
      this.config.godaddy.apiSecret = OWNER_CREDENTIALS.godaddy.apiSecret
    }

    // 2. Namecheap
    if (!this.config.namecheap?.apiKey) {
      this.config.namecheap = {
        apiUser: OWNER_CREDENTIALS.namecheap.apiUser,
        apiKey: OWNER_CREDENTIALS.namecheap.apiKey,
        clientIp: OWNER_CREDENTIALS.namecheap.clientIp,
      }
    }

    // 3. Supabase
    if (!this.config.supabase?.url || !this.config.supabase?.anonKey) {
      this.config.supabase = {
        url: OWNER_CREDENTIALS.supabase.url,
        anonKey: OWNER_CREDENTIALS.supabase.anonKey,
      }
    }

    // 4. Google Trends
    if (!this.config.google?.apiKey) {
      this.config.google = { apiKey: OWNER_CREDENTIALS.google.apiKey }
    }

    // 5. Twitter/X
    if (!this.config.twitter?.bearerToken) {
      this.config.twitter = { bearerToken: OWNER_CREDENTIALS.twitter.bearerToken }
    }

    // 6. USPTO
    if (!this.config.uspto?.apiKey) {
      this.config.uspto = { apiKey: OWNER_CREDENTIALS.uspto.apiKey }
    }

    // 7. Stripe
    if (!this.config.stripe?.publishableKey || !this.config.stripe?.secretKey) {
      this.config.stripe = {
        publishableKey: OWNER_CREDENTIALS.stripe.publishableKey,
        secretKey: OWNER_CREDENTIALS.stripe.secretKey,
      }
    }

    // 8. Infura
    if (!this.config.infura?.projectId) {
      this.config.infura = {
        projectId: OWNER_CREDENTIALS.infura.projectId,
        mainnetUrl: OWNER_CREDENTIALS.infura.mainnetUrl,
      }
    }

    // 9. Alchemy (Web3/Solana/NFT)
    if (!this.config.alchemy?.apiKey) {
      this.config.alchemy = {
        apiKey: OWNER_CREDENTIALS.alchemy.apiKey,
        ethMainnet: OWNER_CREDENTIALS.alchemy.ethMainnet,
        solanaMainnet: OWNER_CREDENTIALS.alchemy.solanaMainnet,
        nftApi: OWNER_CREDENTIALS.alchemy.nftApi,
      }
    }

    // Save to localStorage so they persist
    this.saveConfig()
  }

  /**
   * Force refresh all credentials from hardcoded values
   * Call this if anything ever seems wrong
   */
  forceRefreshCredentials(): void {
    console.log('🔄 Force refreshing ALL credentials from hardcoded values...')
    this.config.godaddy = { 
      apiKey: OWNER_CREDENTIALS.godaddy.apiKey,
      apiSecret: OWNER_CREDENTIALS.godaddy.apiSecret,
      sandbox: false 
    }
    this.config.namecheap = {
      apiUser: OWNER_CREDENTIALS.namecheap.apiUser,
      apiKey: OWNER_CREDENTIALS.namecheap.apiKey,
      clientIp: OWNER_CREDENTIALS.namecheap.clientIp,
    }
    this.config.supabase = {
      url: OWNER_CREDENTIALS.supabase.url,
      anonKey: OWNER_CREDENTIALS.supabase.anonKey,
    }
    this.config.google = { apiKey: OWNER_CREDENTIALS.google.apiKey }
    this.config.twitter = { bearerToken: OWNER_CREDENTIALS.twitter.bearerToken }
    this.config.uspto = { apiKey: OWNER_CREDENTIALS.uspto.apiKey }
    this.config.stripe = {
      publishableKey: OWNER_CREDENTIALS.stripe.publishableKey,
      secretKey: OWNER_CREDENTIALS.stripe.secretKey,
    }
    this.config.infura = {
      projectId: OWNER_CREDENTIALS.infura.projectId,
      mainnetUrl: OWNER_CREDENTIALS.infura.mainnetUrl,
    }
    this.config.alchemy = {
      apiKey: OWNER_CREDENTIALS.alchemy.apiKey,
      ethMainnet: OWNER_CREDENTIALS.alchemy.ethMainnet,
      solanaMainnet: OWNER_CREDENTIALS.alchemy.solanaMainnet,
      nftApi: OWNER_CREDENTIALS.alchemy.nftApi,
    }
    this.saveConfig()
    console.log('✅ All 9 API credentials refreshed and saved!')
    toast.success('All APIs Restored', { description: 'All 9 API credentials are now active' })
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

  // Get ALL owner credentials (hardcoded, permanent)
  getOwnerCredentials() {
    return { ...OWNER_CREDENTIALS }
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

