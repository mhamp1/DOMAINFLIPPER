export interface Domain {
  id: string
  name: string
  tld: string
  age?: number
  backlinks?: number
  traffic?: number
  brandScore?: number
  length: number
  currentBid?: number
  estimatedValue: number
  aiScore: number
  strategyId: string
  status: 'available' | 'auction' | 'owned' | 'listed'
  acquiredAt?: Date
  purchasedAt?: Date // Alias for acquiredAt
  listedAt?: Date
  soldAt?: Date
  purchasePrice?: number
  salePrice?: number
  registrar?: string
  expiresAt?: Date
  timeLeft?: string
}

export interface Strategy {
  id: string
  name: string
  description: string
  targetTLD?: string
  targetTLDs?: string[]
  keywords?: string[]
  pattern?: RegExp
  minLength?: number
  maxLength?: number
  minTraffic?: number
  filters?: {
    hasTraffic?: boolean
    aged?: boolean
    brandScore?: number
  }
  budgetPerDomain: number
  expectedProfit: number
  domainsBought?: number
  totalInvested?: number
  totalProfit?: number
  roi?: number
  liveAuctions?: number
  enabled?: boolean
  priority?: number // 1 = highest priority (used for budget-based strategy selection)
}

export interface Auction {
  id: string
  domain: string
  registrar: string
  currentBid: number
  minBid: number
  estimatedValue: number
  endsAt: Date
  timeLeft: string
  bidCount: number
  watchers: number
}

export interface Transaction {
  id: string
  type: 'buy' | 'sell' | 'list'
  domain: string
  amount: number
  date: Date
  strategyId: string
  marketplace?: string
  status: 'pending' | 'completed' | 'failed'
}

export interface UserStats {
  balance: number
  domainsOwned: number
  totalProfit: number
  todayProfit: number
  monthlyProfit: number
  avgROI: number
  totalInvested: number
  activeSnipes: number
  successRate: number
}

export interface ExpiringDomain {
  name: string
  dropTime: string
  tld: string
  backlinks?: number
  age?: number
  traffic?: number
}
