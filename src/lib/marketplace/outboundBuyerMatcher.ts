/**
 * Outbound Buyer Matcher — Match domains to potential buyers (OPT-IN ONLY)
 * December 2025
 * 
 * Features:
 * - Match domains to potential buyers based on keywords/company names
 * - Export/list view of suggestions
 * - NO auto-send without explicit opt-in
 * - Requires user confirmation before any outreach
 */

export interface BuyerMatchConfig {
  enabled: boolean                // Master opt-in switch (DEFAULT: FALSE)
  requireManualApproval: boolean  // Require approval per-send (DEFAULT: TRUE)
  minMatchScore: number           // Minimum match score (0-100)
  maxSuggestionsPerDomain: number // Max suggestions per domain
  includeCompetitors: boolean     // Include competitor matches
}

export interface PotentialBuyer {
  id: string
  name: string                    // Company/person name
  industry: string                // Industry/sector
  keywords: string[]              // Keywords of interest
  website?: string
  email?: string
  matchScore: number              // 0-100 match score
  matchReasons: string[]          // Why this is a match
  lastContacted?: Date
  responded: boolean
}

export interface BuyerMatch {
  domain: string
  buyer: PotentialBuyer
  matchScore: number              // 0-100
  matchType: 'keyword' | 'industry' | 'competitor' | 'similar'
  suggestedPrice: number
  reasoning: string
  confidence: number              // 0-100
  approved: boolean               // Approved for outreach
  contacted: boolean              // Already contacted
  contactedDate?: Date
}

export const DEFAULT_BUYER_MATCH_CONFIG: BuyerMatchConfig = {
  enabled: false,                 // DEFAULT: DISABLED
  requireManualApproval: true,    // DEFAULT: REQUIRE APPROVAL
  minMatchScore: 70,
  maxSuggestionsPerDomain: 5,
  includeCompetitors: false,
}

// Sample buyer database 
// TODO: Replace with real database/API integration before production use
// This is placeholder data for development and testing only
const SAMPLE_BUYERS: PotentialBuyer[] = [
  {
    id: 'buyer-1',
    name: 'TechCorp Inc',
    industry: 'Technology',
    keywords: ['tech', 'software', 'cloud', 'ai', 'saas'],
    matchScore: 0,
    matchReasons: [],
    responded: false,
  },
  {
    id: 'buyer-2',
    name: 'HealthPlus Solutions',
    industry: 'Healthcare',
    keywords: ['health', 'medical', 'care', 'wellness', 'fitness'],
    matchScore: 0,
    matchReasons: [],
    responded: false,
  },
  {
    id: 'buyer-3',
    name: 'FinanceHub',
    industry: 'Finance',
    keywords: ['finance', 'money', 'pay', 'bank', 'invest', 'crypto'],
    matchScore: 0,
    matchReasons: [],
    responded: false,
  },
]

export class OutboundBuyerMatcher {
  private config: BuyerMatchConfig
  private buyers: PotentialBuyer[]
  private matches: Map<string, BuyerMatch[]> = new Map()

  constructor(
    config: BuyerMatchConfig = DEFAULT_BUYER_MATCH_CONFIG,
    buyers: PotentialBuyer[] = SAMPLE_BUYERS
  ) {
    this.config = config
    this.buyers = buyers
  }

  /**
   * Find potential buyers for a domain
   * NOTE: Does NOT send any messages, only generates suggestions
   */
  findBuyersForDomain(
    domain: string,
    estimatedValue: number
  ): BuyerMatch[] {
    if (!this.config.enabled) {
      console.warn('Outbound buyer matching is disabled')
      return []
    }

    const domainName = this.extractDomainName(domain)
    const domainKeywords = this.extractKeywords(domainName)
    
    const matches: BuyerMatch[] = []

    for (const buyer of this.buyers) {
      // Skip if recently contacted
      if (buyer.lastContacted) {
        const daysSinceContact = (Date.now() - buyer.lastContacted.getTime()) / (1000 * 60 * 60 * 24)
        if (daysSinceContact < 90) {
          continue // Don't suggest same buyer within 90 days
        }
      }

      const matchResult = this.calculateMatch(domainKeywords, buyer)
      
      if (matchResult.score >= this.config.minMatchScore) {
        const suggestedPrice = this.calculateSuggestedPrice(
          estimatedValue,
          matchResult.score,
          buyer.industry
        )

        matches.push({
          domain,
          buyer,
          matchScore: matchResult.score,
          matchType: matchResult.type,
          suggestedPrice,
          reasoning: matchResult.reasoning,
          confidence: matchResult.confidence,
          approved: false,           // DEFAULT: NOT APPROVED
          contacted: false,
        })
      }
    }

    // Sort by match score descending
    matches.sort((a, b) => b.matchScore - a.matchScore)

    // Limit to max suggestions
    const limited = matches.slice(0, this.config.maxSuggestionsPerDomain)

    // Store for later retrieval
    this.matches.set(domain, limited)

    return limited
  }

  /**
   * Get suggestions for a domain (cached)
   */
  getSuggestions(domain: string): BuyerMatch[] {
    return this.matches.get(domain) || []
  }

  /**
   * Approve a match for outreach
   * REQUIRED before any contact can be made
   */
  approveMatch(domain: string, buyerId: string): boolean {
    const matches = this.matches.get(domain)
    if (!matches) return false

    const match = matches.find(m => m.buyer.id === buyerId)
    if (match) {
      match.approved = true
      return true
    }

    return false
  }

  /**
   * Mark a match as contacted
   * This should only be called AFTER user explicitly sends message
   */
  markContacted(domain: string, buyerId: string): void {
    const matches = this.matches.get(domain)
    if (!matches) return

    const match = matches.find(m => m.buyer.id === buyerId)
    if (match) {
      match.contacted = true
      match.contactedDate = new Date()
      
      // Update buyer's last contacted date
      const buyer = this.buyers.find(b => b.id === buyerId)
      if (buyer) {
        buyer.lastContacted = new Date()
      }
    }
  }

  /**
   * Export matches for a domain to CSV/JSON
   */
  exportMatches(domain: string, format: 'csv' | 'json' = 'json'): string {
    const matches = this.matches.get(domain) || []
    
    if (format === 'json') {
      return JSON.stringify(matches, null, 2)
    } else {
      // CSV format
      const headers = 'Domain,Buyer,Industry,Match Score,Suggested Price,Match Type,Reasoning'
      const rows = matches.map(m => 
        `"${m.domain}","${m.buyer.name}","${m.buyer.industry}",${m.matchScore},${m.suggestedPrice},"${m.matchType}","${m.reasoning}"`
      )
      return [headers, ...rows].join('\n')
    }
  }

  /**
   * Get all approved but not yet contacted matches
   */
  getApprovedMatches(): BuyerMatch[] {
    const approved: BuyerMatch[] = []
    
    for (const matches of this.matches.values()) {
      for (const match of matches) {
        if (match.approved && !match.contacted) {
          approved.push(match)
        }
      }
    }
    
    return approved
  }

  /**
   * Calculate match between domain and buyer
   */
  private calculateMatch(
    domainKeywords: string[],
    buyer: PotentialBuyer
  ): { score: number; type: BuyerMatch['matchType']; reasoning: string; confidence: number } {
    let score = 0
    let matchType: BuyerMatch['matchType'] = 'keyword'
    const reasons: string[] = []

    // Keyword matching
    const keywordMatches = domainKeywords.filter(dk =>
      buyer.keywords.some(bk => dk.includes(bk) || bk.includes(dk))
    )

    if (keywordMatches.length > 0) {
      score += keywordMatches.length * 30
      reasons.push(`${keywordMatches.length} keyword match(es)`)
      matchType = 'keyword'
    }

    // Industry relevance
    const industryKeywords = buyer.industry.toLowerCase().split(' ')
    const industryMatch = domainKeywords.some(dk =>
      industryKeywords.some(ik => dk.includes(ik) || ik.includes(dk))
    )

    if (industryMatch) {
      score += 25
      reasons.push('Industry relevant')
      matchType = 'industry'
    }

    // Domain quality bonus (shorter = better for businesses)
    const domainLength = domainKeywords.join('').length
    if (domainLength <= 8) {
      score += 15
      reasons.push('Short, memorable domain')
    }

    // Cap at 100
    score = Math.min(100, score)

    const confidence = score >= 80 ? 90 : score >= 60 ? 70 : 50

    return {
      score,
      type: matchType,
      reasoning: reasons.join(', '),
      confidence,
    }
  }

  /**
   * Calculate suggested outreach price
   */
  private calculateSuggestedPrice(
    estimatedValue: number,
    matchScore: number,
    industry: string
  ): number {
    let multiplier = 1.0

    // Higher match score = higher price
    if (matchScore >= 90) multiplier = 1.5
    else if (matchScore >= 80) multiplier = 1.3
    else if (matchScore >= 70) multiplier = 1.15

    // Industry-specific adjustments
    const highValueIndustries = ['Technology', 'Finance', 'Healthcare']
    if (highValueIndustries.includes(industry)) {
      multiplier *= 1.2
    }

    return Math.round(estimatedValue * multiplier)
  }

  /**
   * Extract domain name without TLD
   */
  private extractDomainName(domain: string): string {
    domain = domain.replace(/^https?:\/\//, '')
    domain = domain.replace(/^www\./, '')
    const parts = domain.split('.')
    return parts[0] || domain
  }

  /**
   * Extract keywords from domain name
   */
  private extractKeywords(domainName: string): string[] {
    // Split on common separators
    const keywords = domainName
      .toLowerCase()
      .split(/[-_]/)
      .filter(k => k.length > 2) // Filter out very short parts

    return keywords
  }

  /**
   * Add a buyer to the database
   */
  addBuyer(buyer: Omit<PotentialBuyer, 'matchScore' | 'matchReasons' | 'responded'>): void {
    this.buyers.push({
      ...buyer,
      matchScore: 0,
      matchReasons: [],
      responded: false,
    })
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<BuyerMatchConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * Get configuration
   */
  getConfig(): BuyerMatchConfig {
    return { ...this.config }
  }

  /**
   * Check if outbound is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled
  }
}

// Singleton instance (DEFAULT: DISABLED)
export const outboundBuyerMatcher = new OutboundBuyerMatcher()
