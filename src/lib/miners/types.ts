/**
 * Domain Mining Types — 2025 Expired Domain Empire
 * Type definitions for the mining system
 */

export interface MinedDomain {
  id: string
  domain: string
  tld: string
  source: MinerSource
  dropDate: string
  backlinks: number
  dr: number // Domain Rating
  traffic: number
  ageYears: number
  hasTrademark: boolean
  estValue: number
  price: number
  roi: number // Return on Investment multiplier
  minedAt: Date
  status: 'pending' | 'sniped' | 'listed' | 'sold' | 'rejected'
  priority: 'normal' | 'high' | 'gem' | 'legendary'
}

export type MinerSource = 
  | 'godaddy_closeouts'
  | 'namecheap_market'
  | 'dynadot_closeouts'
  | 'expireddomains_net'
  | 'justdropped'
  | 'domcop'
  | 'namejet'

export interface MinerStats {
  source: MinerSource
  status: 'idle' | 'mining' | 'error' | 'paused'
  lastRun: Date | null
  totalMined: number
  gemsFound: number // Domains with estValue > $1000
  legendaryFound: number // Domains with estValue > $10000
  avgRoi: number
  successRate: number
  errorCount: number
  nextRun: Date | null
}

export interface MiningConfig {
  enabled: boolean
  intervalMs: number // How often to run (default: 30-60 min)
  minValue: number // Minimum estimated value to keep
  maxPrice: number // Maximum purchase price
  minRoi: number // Minimum ROI multiplier (e.g., 50x)
  autoSnipe: boolean // Auto-buy high-value domains
  autoPrioritize: boolean // Auto-add to sniper watchlist
  trademarkFilter: boolean // Skip trademarked domains
  blockedKeywords: string[] // Words to avoid
}

export interface MiningSession {
  id: string
  startedAt: Date
  endedAt: Date | null
  totalScanned: number
  gemsFound: number
  errors: string[]
  sources: MinerSource[]
}

export interface CloseoutDomain {
  domain: string
  price: number
  auctionEnds?: string
  bids?: number
  traffic?: number
  backlinks?: number
  estValue?: number
  age?: number
}

export interface MiningEvent {
  type: 'gem_found' | 'legendary_found' | 'auto_snipe' | 'error' | 'session_complete'
  domain?: string
  value?: number
  price?: number
  roi?: number
  source?: MinerSource
  message: string
  timestamp: Date
}

