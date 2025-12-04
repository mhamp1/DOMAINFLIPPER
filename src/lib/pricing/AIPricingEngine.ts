/**
 * AIPricingEngine.ts — DYNAMIC AI PRICING ENGINE
 * Real-time market analysis + sentiment + competition — December 27, 2025
 * 
 * Automatically adjusts prices based on market conditions to maximize profit
 */

import { toast } from 'sonner'

interface PricingFactors {
  marketSentiment?: number // -1.0 (bear) to 1.0 (bull)
  competitorAnalysis?: boolean
  dynamicAdjustment?: boolean
  urgency?: number // 0.0 (no rush) to 1.0 (urgent sale)
  inquiryVolume?: number // Number of inquiries in last 24h
}

interface MarketData {
  sentiment: number
  trendingKeywords: string[]
  averagePrice: number
  competitorCount: number
  demandScore: number
}

interface PricingHistory {
  domain: string
  timestamp: Date
  price: number
  reason: string
  factors: PricingFactors
}

export class AIPricingEngine {
  private pricingHistory: Map<string, PricingHistory[]> = new Map()
  private marketCache: Map<string, { data: MarketData; timestamp: Date }> = new Map()
  private cacheTimeout = 300000 // 5 minutes

  /**
   * Calculate optimal price using AI and market analysis
   */
  async calculateOptimalPrice(
    domain: string,
    baseValue: number,
    factors: PricingFactors = {}
  ): Promise<number> {
    // Get market data
    const marketData = await this.getMarketData(domain)

    // Start with base value
    let price = baseValue
    let multiplier = 1.0
    const adjustments: string[] = []

    // Factor 1: Market Sentiment
    if (factors.marketSentiment !== undefined || marketData.sentiment) {
      const sentiment = factors.marketSentiment ?? marketData.sentiment
      
      if (sentiment > 0.7) {
        multiplier += 0.30 // +30% in bull market
        adjustments.push(`Bull market (+30%)`)
      } else if (sentiment > 0.5) {
        multiplier += 0.15 // +15% in positive market
        adjustments.push(`Positive market (+15%)`)
      } else if (sentiment < -0.3) {
        multiplier -= 0.10 // -10% in bear market
        adjustments.push(`Bear market (-10%)`)
      }
    }

    // Factor 2: Inquiry Volume (high interest = higher price)
    if (factors.inquiryVolume) {
      if (factors.inquiryVolume > 10) {
        multiplier += 0.25 // +25% for high interest
        adjustments.push(`High interest (+25%)`)
      } else if (factors.inquiryVolume > 5) {
        multiplier += 0.15 // +15% for medium interest
        adjustments.push(`Medium interest (+15%)`)
      }
    }

    // Factor 3: Competitor Analysis
    if (factors.competitorAnalysis && marketData.competitorCount > 0) {
      const avgCompetitorPrice = marketData.averagePrice

      if (avgCompetitorPrice > baseValue * 1.5) {
        // Competitors pricing high - we can too
        multiplier += 0.20
        adjustments.push(`Low competition (+20%)`)
      } else if (avgCompetitorPrice < baseValue * 0.8) {
        // Competitors pricing low - adjust down slightly
        multiplier -= 0.05
        adjustments.push(`High competition (-5%)`)
      }
    }

    // Factor 4: Urgency (need to sell fast)
    if (factors.urgency) {
      if (factors.urgency > 0.8) {
        multiplier -= 0.15 // -15% for urgent sale
        adjustments.push(`Urgent sale (-15%)`)
      } else if (factors.urgency > 0.5) {
        multiplier -= 0.08 // -8% for moderate urgency
        adjustments.push(`Moderate urgency (-8%)`)
      }
    }

    // Factor 5: Demand Score (from market trends)
    if (marketData.demandScore > 80) {
      multiplier += 0.20
      adjustments.push(`High demand (+20%)`)
    } else if (marketData.demandScore > 60) {
      multiplier += 0.10
      adjustments.push(`Medium demand (+10%)`)
    }

    // Factor 6: Trending keywords bonus
    const domainLower = domain.toLowerCase()
    const hasTrendingKeyword = marketData.trendingKeywords.some(
      keyword => domainLower.includes(keyword)
    )
    if (hasTrendingKeyword) {
      multiplier += 0.15
      adjustments.push(`Trending keyword (+15%)`)
    }

    // Factor 7: Time-based optimization
    const dayOfWeek = new Date().getDay()
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      // Weekend - buyers more relaxed, willing to pay more
      multiplier += 0.05
      adjustments.push(`Weekend premium (+5%)`)
    }

    // Calculate final price
    price = baseValue * multiplier

    // Ensure minimum 8% profit margin over base
    const minPrice = baseValue * 1.08
    price = Math.max(price, minPrice)

    // Round to nearest $100 for cleaner pricing
    price = Math.round(price / 100) * 100

    // Record pricing decision
    this.recordPricing(domain, price, adjustments.join(', '), factors)

    // Log pricing decision
    if (adjustments.length > 0) {
      console.log(`[AI Pricing] ${domain}: $${price.toLocaleString()} (${adjustments.join(', ')})`)
    }

    return price
  }

  /**
   * Get market data for a domain
   */
  private async getMarketData(domain: string): Promise<MarketData> {
    // Check cache first
    const cached = this.marketCache.get(domain)
    if (cached && (Date.now() - cached.timestamp.getTime()) < this.cacheTimeout) {
      return cached.data
    }

    // In production, this would fetch real market data
    // For now, generate intelligent mock data
    const marketData = await this.fetchMarketData(domain)

    // Cache it
    this.marketCache.set(domain, {
      data: marketData,
      timestamp: new Date(),
    })

    return marketData
  }

  /**
   * Fetch real-time market data
   * In production: scrape competitors, analyze sentiment, check trends
   */
  private async fetchMarketData(domain: string): Promise<MarketData> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 100))

    // Extract TLD and keywords
    const tld = domain.substring(domain.lastIndexOf('.'))
    const name = domain.substring(0, domain.lastIndexOf('.')).toLowerCase()

    // Calculate sentiment based on TLD and keywords
    let sentiment = 0.5 // Neutral default

    // Trending keywords boost sentiment
    const trendingKeywords = ['ai', 'gpt', 'quantum', 'neural', 'crypto', 'nft', 'web3', 'meta']
    const hasTrending = trendingKeywords.some(kw => name.includes(kw))
    if (hasTrending) {
      sentiment = 0.8 // Bull market for trending domains
    }

    // Premium TLDs boost sentiment
    if (['.com', '.ai', '.io'].includes(tld)) {
      sentiment += 0.1
    }

    // Mock competitor analysis
    const competitorCount = Math.floor(Math.random() * 20) + 5
    const averagePrice = Math.floor(Math.random() * 100000) + 10000

    // Calculate demand score
    let demandScore = 50
    if (hasTrending) demandScore += 30
    if (name.length <= 7) demandScore += 10
    if (tld === '.com') demandScore += 10

    return {
      sentiment: Math.min(1.0, sentiment),
      trendingKeywords: hasTrending ? trendingKeywords.filter(kw => name.includes(kw)) : [],
      averagePrice,
      competitorCount,
      demandScore: Math.min(100, demandScore),
    }
  }

  /**
   * Get crypto market sentiment (for crypto-related domains)
   */
  async getCryptoSentiment(): Promise<number> {
    try {
      // In production: fetch from CoinGecko or similar
      // For demo: return bullish sentiment
      return 0.7 // Bullish
    } catch (error) {
      console.error('Error fetching crypto sentiment:', error)
      return 0.5 // Neutral fallback
    }
  }

  /**
   * Scrape competitor prices for similar domains
   */
  async scrapeCompetitors(_domain: string): Promise<{ average: number; count: number }> {
    try {
      // In production: scrape Sedo, Afternic, etc.
      // For demo: return mock data
      const count = Math.floor(Math.random() * 15) + 5
      const average = Math.floor(Math.random() * 150000) + 20000

      return { average, count }
    } catch (error) {
      console.error('Error scraping competitors:', error)
      return { average: 0, count: 0 }
    }
  }

  /**
   * Get inquiry volume for a domain
   */
  async getInquiryVolume(_domain: string): Promise<number> {
    // In production: query database for inquiry count in last 24h
    // For demo: return random
    return Math.floor(Math.random() * 15)
  }

  /**
   * Record pricing decision for learning
   */
  private recordPricing(
    domain: string,
    price: number,
    reason: string,
    factors: PricingFactors
  ): void {
    const history = this.pricingHistory.get(domain) || []
    
    history.push({
      domain,
      timestamp: new Date(),
      price,
      reason,
      factors,
    })

    // Keep only last 30 pricing decisions per domain
    if (history.length > 30) {
      history.shift()
    }

    this.pricingHistory.set(domain, history)
  }

  /**
   * Get pricing history for a domain
   */
  getPricingHistory(domain: string): PricingHistory[] {
    return this.pricingHistory.get(domain) || []
  }

  /**
   * Analyze pricing performance
   * Returns insights on whether prices are converting to sales
   */
  async analyzePricingPerformance(domain: string): Promise<{
    averagePrice: number
    priceChanges: number
    recommendation: string
  }> {
    const history = this.getPricingHistory(domain)
    
    if (history.length === 0) {
      return {
        averagePrice: 0,
        priceChanges: 0,
        recommendation: 'No pricing history available',
      }
    }

    const prices = history.map(h => h.price)
    const averagePrice = prices.reduce((a, b) => a + b, 0) / prices.length
    const priceChanges = history.length - 1

    // Simple recommendation logic
    let recommendation = 'Current pricing is optimal'
    
    const latestPrice = prices[prices.length - 1]
    if (latestPrice < averagePrice * 0.9) {
      recommendation = 'Price decreased significantly - may sell faster'
    } else if (latestPrice > averagePrice * 1.1) {
      recommendation = 'Price increased - testing market ceiling'
    }

    return {
      averagePrice: Math.round(averagePrice),
      priceChanges,
      recommendation,
    }
  }

  /**
   * Batch price optimization for entire portfolio
   */
  async optimizePortfolio(domains: Array<{ name: string; baseValue: number }>): Promise<
    Array<{ domain: string; oldPrice: number; newPrice: number; change: number }>
  > {
    const results = []

    for (const { name, baseValue } of domains) {
      const oldPrice = baseValue
      const newPrice = await this.calculateOptimalPrice(name, baseValue, {
        competitorAnalysis: true,
        dynamicAdjustment: true,
      })

      const change = ((newPrice - oldPrice) / oldPrice) * 100

      results.push({
        domain: name,
        oldPrice,
        newPrice,
        change: Math.round(change * 10) / 10,
      })
    }

    // Show summary
    const totalChange = results.reduce((sum, r) => sum + r.change, 0) / results.length
    
    toast.success('📊 Portfolio Optimized', {
      description: `${results.length} domains repriced • Avg change: ${totalChange > 0 ? '+' : ''}${totalChange.toFixed(1)}%`,
    })

    return results
  }

  /**
   * Clear cache (useful for testing or forced refresh)
   */
  clearCache(): void {
    this.marketCache.clear()
  }
}

// Export singleton
export const aiPricingEngine = new AIPricingEngine()
