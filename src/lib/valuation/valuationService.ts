/**
 * Valuation Service
 * Enriches domain opportunities with estimated values
 * December 2025
 */

import { logger } from '@/lib/utils/logger'
import type { Domain } from '@/types/domain'

export interface ValuationFactors {
  lengthScore: number
  tldPremium: number
  keywordValue: number
  brandability: number
  liquidity: number
}

export interface ValuationResult {
  domain: string
  estimatedValue: number
  confidence: number // 0-100
  factors: ValuationFactors
  comps?: Array<{ domain: string; price: number }>
  timestamp: Date
}

/**
 * Valuation Service
 * Calculates estimated domain values using multiple factors
 */
class ValuationService {
  // TLD premium multipliers
  private tldPremiums: Record<string, number> = {
    com: 1.5,
    net: 1.0,
    org: 0.9,
    io: 1.3,
    ai: 1.8,
    co: 1.1,
    app: 1.2,
    dev: 1.2,
  }

  // Base value for domain length (shorter is more valuable)
  private lengthValues: Record<string, number> = {
    '2': 10000,
    '3': 5000,
    '4': 2000,
    '5': 1000,
    '6': 500,
    '7': 300,
    '8': 200,
    '9': 150,
    '10': 100,
  }

  // Liquidity discount (harder to sell domains are worth less)
  private liquidityDiscount = 0.3 // 30% discount for realistic market value

  /**
   * Calculate valuation for a domain
   */
  async valuateDomain(domain: string, tld?: string): Promise<ValuationResult> {
    const fullDomain = tld ? `${domain}.${tld}` : domain
    const domainTld = tld || fullDomain.split('.').pop() || 'com'
    const domainName = domain.split('.')[0] || domain

    logger.debug('VALUATION', `Calculating value for ${fullDomain}`)

    // Calculate individual factors
    const lengthScore = this.calculateLengthScore(domainName)
    const tldPremium = this.calculateTldPremium(domainTld)
    const keywordValue = await this.calculateKeywordValue(domainName)
    const brandability = this.calculateBrandability(domainName)
    const liquidity = this.calculateLiquidity(domainName, domainTld)

    // Combine factors for base value
    const baseValue = lengthScore * tldPremium * (1 + keywordValue + brandability)

    // Apply liquidity discount for estimated market value
    const estimatedValue = Math.round(baseValue * (1 - this.liquidityDiscount))

    // Calculate confidence (higher for shorter, .com domains)
    const confidence = this.calculateConfidence(domainName.length, domainTld)

    // Get comparable sales (placeholder for now)
    const comps = await this.findComparables(domainName, domainTld)

    const result: ValuationResult = {
      domain: fullDomain,
      estimatedValue,
      confidence,
      factors: {
        lengthScore,
        tldPremium,
        keywordValue,
        brandability,
        liquidity,
      },
      comps,
      timestamp: new Date(),
    }

    logger.info('VALUATION', `${fullDomain} valued at $${estimatedValue}`, {
      domain: fullDomain,
      estimatedValue,
      confidence,
    })

    return result
  }

  /**
   * Enrich opportunities with valuations
   */
  async enrichOpportunities(opportunities: Domain[]): Promise<Domain[]> {
    logger.info('VALUATION', `Enriching ${opportunities.length} opportunities with valuations`)

    const enriched = await Promise.all(
      opportunities.map(async (opp) => {
        try {
          const valuation = await this.valuateDomain(opp.name, opp.tld)

          return {
            ...opp,
            estimatedValue: valuation.estimatedValue,
            aiScore: valuation.confidence,
          }
        } catch (error) {
          logger.error('VALUATION', `Failed to value ${opp.name}`, error as Error)
          return opp
        }
      })
    )

    logger.info('VALUATION', `Enrichment complete`, {
      total: opportunities.length,
      valued: enriched.filter(o => o.estimatedValue > 0).length,
    })

    return enriched
  }

  /**
   * Calculate value based on domain length
   */
  private calculateLengthScore(domain: string): number {
    const length = domain.length

    // Use lookup table for short domains
    if (length <= 10) {
      const key = length.toString()
      return this.lengthValues[key] || 100
    }

    // Calculate for longer domains (diminishing returns)
    return Math.max(50, 100 - (length - 10) * 5)
  }

  /**
   * Calculate TLD premium multiplier
   */
  private calculateTldPremium(tld: string): number {
    return this.tldPremiums[tld.toLowerCase()] || 0.8
  }

  /**
   * Calculate keyword value (placeholder - TODO: integrate keyword research API)
   */
  private async calculateKeywordValue(domain: string): Promise<number> {
    // TODO: Integrate with keyword research API (e.g., Google Trends, Ahrefs)
    
    // For now, use simple heuristics
    const commonKeywords = ['tech', 'ai', 'web', 'app', 'digital', 'cloud', 'crypto', 'data']
    const hasCommonKeyword = commonKeywords.some(keyword => 
      domain.toLowerCase().includes(keyword)
    )

    // Dictionary words are more valuable
    const isDictionaryWord = /^[a-z]+$/i.test(domain) && domain.length >= 4

    let score = 0
    if (hasCommonKeyword) score += 0.3
    if (isDictionaryWord) score += 0.2

    return score
  }

  /**
   * Calculate brandability score
   */
  private calculateBrandability(domain: string): number {
    let score = 0

    // Easy to pronounce (no consonant clusters)
    const hasVowels = /[aeiou]/i.test(domain)
    const consonantCluster = /[bcdfghjklmnpqrstvwxyz]{4,}/i.test(domain)
    
    if (hasVowels && !consonantCluster) {
      score += 0.2
    }

    // No numbers or hyphens (cleaner)
    if (!/[\d-]/.test(domain)) {
      score += 0.1
    }

    // Memorable (short and catchy)
    if (domain.length <= 6) {
      score += 0.15
    }

    return score
  }

  /**
   * Calculate liquidity factor (how easy to sell)
   */
  private calculateLiquidity(domain: string, tld: string): number {
    let score = 1.0

    // .com is most liquid
    if (tld === 'com') {
      score *= 1.2
    } else if (['net', 'org', 'io'].includes(tld)) {
      score *= 1.0
    } else {
      score *= 0.8
    }

    // Shorter domains are more liquid
    if (domain.length <= 5) {
      score *= 1.3
    } else if (domain.length <= 8) {
      score *= 1.1
    }

    // Numbers and hyphens reduce liquidity
    if (/[\d-]/.test(domain)) {
      score *= 0.7
    }

    return score
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(length: number, tld: string): number {
    let confidence = 50 // Base confidence

    // Length affects confidence
    if (length <= 5) {
      confidence += 30
    } else if (length <= 8) {
      confidence += 20
    } else if (length <= 12) {
      confidence += 10
    }

    // TLD affects confidence
    if (tld === 'com') {
      confidence += 20
    } else if (['net', 'org', 'io'].includes(tld)) {
      confidence += 10
    }

    return Math.min(100, confidence)
  }

  /**
   * Find comparable domain sales (placeholder - TODO: integrate with NameBio or similar)
   */
  private async findComparables(
    domain: string,
    tld: string
  ): Promise<Array<{ domain: string; price: number }>> {
    // TODO: Integrate with NameBio API or similar sales database
    
    // Return empty array for now
    return []
  }

  /**
   * Batch valuations for efficiency
   */
  async batchValuate(domains: Array<{ domain: string; tld?: string }>): Promise<ValuationResult[]> {
    logger.info('VALUATION', `Batch valuating ${domains.length} domains`)

    // Process in parallel with some concurrency limit
    const results = await Promise.all(
      domains.map(({ domain, tld }) => this.valuateDomain(domain, tld))
    )

    return results
  }

  /**
   * Update TLD premiums (useful for configuration)
   */
  updateTldPremiums(premiums: Record<string, number>): void {
    this.tldPremiums = { ...this.tldPremiums, ...premiums }
    logger.info('VALUATION', 'TLD premiums updated', premiums)
  }

  /**
   * Update liquidity discount
   */
  updateLiquidityDiscount(discount: number): void {
    if (discount < 0 || discount > 1) {
      throw new Error('Liquidity discount must be between 0 and 1')
    }
    this.liquidityDiscount = discount
    logger.info('VALUATION', `Liquidity discount updated to ${discount * 100}%`)
  }
}

// Export singleton instance
export const valuationService = new ValuationService()
