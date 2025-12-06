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

  constructor() {
    this.config = this.loadConfig()
    
    // Log what we loaded
    console.log('🔧 MasterConfig loaded:', {
      hasGoDaddy: !!this.config.godaddy.apiKey,
      hasNamecheap: !!this.config.namecheap.apiKey,
      capital: this.config.empire.totalCapital,
    })
  }

  private loadConfig(): MasterConfigData {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        // Merge with defaults - BUT ALWAYS use hardcoded credentials if localStorage has empty values
        const merged = this.deepMerge(DEFAULT_CONFIG, parsed)
        
        // CRITICAL: Ensure owner credentials are ALWAYS present
        // If localStorage has empty API keys, use the hardcoded ones
        if (!merged.godaddy.apiKey) merged.godaddy.apiKey = OWNER_CREDENTIALS.godaddy.apiKey
        if (!merged.godaddy.apiSecret) merged.godaddy.apiSecret = OWNER_CREDENTIALS.godaddy.apiSecret
        if (!merged.supabase.url) merged.supabase.url = OWNER_CREDENTIALS.supabase.url
        if (!merged.supabase.anonKey) merged.supabase.anonKey = OWNER_CREDENTIALS.supabase.anonKey
        if (!merged.namecheap.apiUser) merged.namecheap.apiUser = OWNER_CREDENTIALS.namecheap.apiUser
        if (!merged.namecheap.apiKey) merged.namecheap.apiKey = OWNER_CREDENTIALS.namecheap.apiKey
        if (!merged.namecheap.clientIp) merged.namecheap.clientIp = OWNER_CREDENTIALS.namecheap.clientIp
        if (!merged.google.apiKey) merged.google.apiKey = OWNER_CREDENTIALS.google.apiKey
        if (!merged.twitter.bearerToken) merged.twitter.bearerToken = OWNER_CREDENTIALS.twitter.bearerToken
        if (!merged.uspto.apiKey) merged.uspto.apiKey = OWNER_CREDENTIALS.uspto.apiKey
        if (!merged.stripe?.publishableKey) merged.stripe = { ...OWNER_CREDENTIALS.stripe }
        
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

  hasAnyAPIConfigured(): boolean {
    return this.isGoDaddyConfigured() || this.isNamecheapConfigured()
  }

  getConfiguredCount(): number {
    let count = 0
    if (this.isGoDaddyConfigured()) count++
    if (this.isNamecheapConfigured()) count++
    if (this.isSupabaseConfigured()) count++
    if (this.isGoogleConfigured()) count++
    if (this.isTwitterConfigured()) count++
    if (this.isUSPTOConfigured()) count++
    return count
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

