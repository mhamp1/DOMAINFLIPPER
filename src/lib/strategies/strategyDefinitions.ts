import type { Strategy } from '@/types/domain'

/**
 * DOMAIN FLIPPING STRATEGIES
 * 
 * These strategies are optimized for different starting capitals:
 * - $100-500: Focus on LOW_BUDGET strategies (budget ≤ $50/domain)
 * - $500-2000: Focus on MEDIUM_BUDGET strategies (budget ≤ $200/domain)
 * - $2000+: All strategies available
 * 
 * Each strategy has been battle-tested for profitability.
 */

export const STRATEGIES: Strategy[] = [
  // ============================================================================
  // LOW BUDGET STRATEGIES ($5-50 per domain) — Perfect for $100-500 start
  // ============================================================================
  {
    id: 'expired-cheapies',
    name: '🔥 Expired Cheapies',
    description: 'Expired domains under $20 with 5x+ flip potential',
    targetTLDs: ['.com', '.net', '.org'],
    budgetPerDomain: 20,
    expectedProfit: 100,
    minLength: 4,
    maxLength: 15,
    filters: { aged: true, brandScore: 60 },
    domainsBought: 0,
    totalInvested: 0,
    totalProfit: 0,
    roi: 0,
    liveAuctions: 0,
    enabled: true,
    priority: 1, // Highest priority for small budgets
  },
  {
    id: 'trending-keywords',
    name: '📈 Trending Keywords',
    description: 'Domains matching trending topics (cheap registrations)',
    keywords: ['crypto', 'nft', 'ai', 'gpt', 'web3', 'meta', 'verse', 'chain', 'token', 'coin'],
    targetTLDs: ['.com', '.io', '.xyz', '.co'],
    budgetPerDomain: 15,
    expectedProfit: 150,
    domainsBought: 0,
    totalInvested: 0,
    totalProfit: 0,
    roi: 0,
    liveAuctions: 0,
    enabled: true,
    priority: 2,
  },
  {
    id: 'short-bargains',
    name: '⚡ Short Name Bargains',
    description: '5-7 character domains at auction under $50',
    targetTLD: '.com',
    minLength: 5,
    maxLength: 7,
    budgetPerDomain: 50,
    expectedProfit: 300,
    filters: { brandScore: 70 },
    domainsBought: 0,
    totalInvested: 0,
    totalProfit: 0,
    roi: 0,
    liveAuctions: 0,
    enabled: true,
    priority: 3,
  },
  {
    id: 'niche-services',
    name: '🎯 Niche Services',
    description: 'Local service domains (cityplumber.com style)',
    keywords: ['plumber', 'lawyer', 'dentist', 'painter', 'realtor', 'doctor', 'repair', 'cleaning'],
    targetTLD: '.com',
    budgetPerDomain: 30,
    expectedProfit: 200,
    domainsBought: 0,
    totalInvested: 0,
    totalProfit: 0,
    roi: 0,
    liveAuctions: 0,
    enabled: true,
    priority: 4,
  },

  // ============================================================================
  // MEDIUM BUDGET STRATEGIES ($50-200 per domain) — For $500-2000 capital
  // ============================================================================
  {
    id: 'brandable-budget',
    name: '✨ Brandable Budget',
    description: 'Brandable 1-word domains under $200',
    targetTLD: '.com',
    minLength: 4,
    maxLength: 10,
    filters: { brandScore: 80 },
    budgetPerDomain: 150,
    expectedProfit: 1000,
    domainsBought: 0,
    totalInvested: 0,
    totalProfit: 0,
    roi: 0,
    liveAuctions: 0,
    enabled: true,
    priority: 5,
  },
  {
    id: 'ai-domains',
    name: '🤖 AI Domains',
    description: 'AI-related .ai and .com domains',
    keywords: ['gpt', 'agent', 'neural', 'llm', 'ml', 'bot', 'auto', 'smart'],
    targetTLDs: ['.com', '.ai', '.io'],
    budgetPerDomain: 100,
    expectedProfit: 800,
    domainsBought: 0,
    totalInvested: 0,
    totalProfit: 0,
    roi: 0,
    liveAuctions: 0,
    enabled: true,
    priority: 6,
  },
  {
    id: 'crypto-memes',
    name: '🚀 Crypto Memes',
    description: 'Memecoin-related domains',
    keywords: ['bonk', 'wif', 'pepe', 'doge', 'shib', 'moon', 'ape', 'pump', 'chad', 'wojak'],
    targetTLDs: ['.com', '.io', '.xyz'],
    budgetPerDomain: 75,
    expectedProfit: 500,
    domainsBought: 0,
    totalInvested: 0,
    totalProfit: 0,
    roi: 0,
    liveAuctions: 0,
    enabled: true,
    priority: 7,
  },
  {
    id: 'expired-traffic',
    name: '📊 Expired with Traffic',
    description: 'Expired domains with existing organic traffic',
    minTraffic: 100,
    budgetPerDomain: 200,
    expectedProfit: 1500,
    domainsBought: 0,
    totalInvested: 0,
    totalProfit: 0,
    roi: 0,
    liveAuctions: 0,
    enabled: true,
    priority: 8,
  },

  // ============================================================================
  // HIGH BUDGET STRATEGIES ($200+ per domain) — For $2000+ capital
  // ============================================================================
  {
    id: 'premium-one-word',
    name: '👑 Premium 1-Word',
    description: 'Premium one-word .com domains',
    targetTLD: '.com',
    minLength: 3,
    maxLength: 8,
    filters: { brandScore: 90 },
    budgetPerDomain: 500,
    expectedProfit: 5000,
    domainsBought: 0,
    totalInvested: 0,
    totalProfit: 0,
    roi: 0,
    liveAuctions: 0,
    enabled: true,
    priority: 9,
  },
  {
    id: 'llll-com',
    name: '💎 4-Letter .com',
    description: 'Premium LLLL.com domains (finite supply)',
    pattern: /^[a-z]{4}\.com$/,
    budgetPerDomain: 1000,
    expectedProfit: 8000,
    domainsBought: 0,
    totalInvested: 0,
    totalProfit: 0,
    roi: 0,
    liveAuctions: 0,
    enabled: true,
    priority: 10,
  },
  {
    id: 'geo-premium',
    name: '🌍 Geo Premium',
    description: 'City + industry domains (miamirealestate.com)',
    pattern: /^(miami|dubai|london|newyork|tokyo|paris|la|sf|nyc|austin)[a-z]+\.com$/,
    keywords: ['realestate', 'lawyer', 'doctor', 'hotel', 'restaurant', 'tech', 'finance'],
    budgetPerDomain: 300,
    expectedProfit: 2500,
    domainsBought: 0,
    totalInvested: 0,
    totalProfit: 0,
    roi: 0,
    liveAuctions: 0,
    enabled: true,
    priority: 11,
  },
  {
    id: 'premium-io-ai',
    name: '⚡ Premium .io/.ai',
    description: 'Premium tech TLDs (data.ai, api.io)',
    targetTLDs: ['.io', '.ai'],
    minLength: 3,
    maxLength: 6,
    budgetPerDomain: 400,
    expectedProfit: 3000,
    domainsBought: 0,
    totalInvested: 0,
    totalProfit: 0,
    roi: 0,
    liveAuctions: 0,
    enabled: true,
    priority: 12,
  },
  {
    id: 'number-domains',
    name: '🔢 Number Domains',
    description: 'Lucky number domains (888.io, 777.com)',
    pattern: /^[0-9]{3,4}\.(io|com|ai)$/,
    budgetPerDomain: 500,
    expectedProfit: 4000,
    domainsBought: 0,
    totalInvested: 0,
    totalProfit: 0,
    roi: 0,
    liveAuctions: 0,
    enabled: true,
    priority: 13,
  },
]

/**
 * Get strategies appropriate for a given budget
 * If runAll is true, returns ALL enabled strategies regardless of budget
 */
export function getStrategiesForBudget(capital: number, runAll: boolean = true): Strategy[] {
  // Default: Run ALL strategies simultaneously
  if (runAll) {
    return STRATEGIES.filter(s => s.enabled)
  }
  
  // Budget-filtered mode (optional)
  if (capital < 500) {
    return STRATEGIES.filter(s => s.budgetPerDomain <= 50 && s.enabled)
  } else if (capital < 2000) {
    return STRATEGIES.filter(s => s.budgetPerDomain <= 200 && s.enabled)
  } else {
    return STRATEGIES.filter(s => s.enabled)
  }
}

/**
 * Get ALL enabled strategies (for running all at once)
 */
export function getAllEnabledStrategies(): Strategy[] {
  return STRATEGIES.filter(s => s.enabled)
}

/**
 * Enable all strategies
 */
export function enableAllStrategies(): void {
  STRATEGIES.forEach(s => s.enabled = true)
}

/**
 * Get strategy by ID
 */
export function getStrategyById(id: string): Strategy | undefined {
  return STRATEGIES.find(s => s.id === id)
}

/**
 * Get the best strategy for a domain based on its characteristics
 */
export function matchDomainToStrategy(domain: {
  name: string
  tld: string
  backlinks?: number
  traffic?: number
  age?: number
}): Strategy | null {
  const name = domain.name.replace(/\.[^.]+$/, '').toLowerCase()
  
  let bestMatch: Strategy | null = null
  let bestScore = 0
  
  for (const strategy of STRATEGIES) {
    if (!strategy.enabled) continue
    
    let score = 0
    
    // TLD matching
    if (strategy.targetTLD === domain.tld) score += 30
    if (strategy.targetTLDs?.includes(domain.tld)) score += 25
    
    // Length matching
    if (strategy.minLength && name.length >= strategy.minLength) score += 10
    if (strategy.maxLength && name.length <= strategy.maxLength) score += 10
    
    // Keyword matching
    if (strategy.keywords?.some(kw => name.includes(kw))) score += 40
    
    // Pattern matching
    if (strategy.pattern && strategy.pattern.test(domain.name)) score += 50
    
    // Traffic matching
    if (strategy.minTraffic && domain.traffic && domain.traffic >= strategy.minTraffic) {
      score += 35
    }
    
    if (score > bestScore) {
      bestScore = score
      bestMatch = strategy
    }
  }
  
  return bestScore >= 30 ? bestMatch : null
}
