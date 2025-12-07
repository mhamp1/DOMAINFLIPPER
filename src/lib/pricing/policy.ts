/**
 * Pricing Policy
 * Derives listing and floor prices from valuations
 * December 2025
 */

import { logger } from '@/lib/utils/logger'
import type { Domain } from '@/types/domain'

export interface PricingStrategy {
  name: string
  listPriceMultiplier: number // Multiplier of estimated value for listing
  floorPriceMultiplier: number // Minimum acceptable price multiplier
  description: string
}

export interface PricingResult {
  domain: string
  estimatedValue: number
  listPrice: number
  floorPrice: number
  strategy: string
  timestamp: Date
}

/**
 * Pricing Policy
 * Calculates listing and floor prices based on valuation and strategy
 */
class PricingPolicy {
  // Predefined pricing strategies
  private strategies: Record<string, PricingStrategy> = {
    aggressive: {
      name: 'Aggressive',
      listPriceMultiplier: 1.5, // List at 50% markup
      floorPriceMultiplier: 1.1, // Accept minimum 10% profit
      description: 'Fast turnover with lower margins',
    },
    balanced: {
      name: 'Balanced',
      listPriceMultiplier: 2.0, // List at 2x value
      floorPriceMultiplier: 1.3, // Accept minimum 30% profit
      description: 'Balance between speed and profit',
    },
    premium: {
      name: 'Premium',
      listPriceMultiplier: 3.0, // List at 3x value
      floorPriceMultiplier: 1.8, // Accept minimum 80% profit
      description: 'High margins, longer hold times',
    },
    market: {
      name: 'Market',
      listPriceMultiplier: 0.87, // List at 13% below market (competitive)
      floorPriceMultiplier: 0.75, // Accept 25% below estimated value
      description: 'Price to match or beat market average',
    },
  }

  private defaultStrategy: string = 'balanced'

  /**
   * Calculate pricing for a domain
   */
  calculatePricing(
    domain: string,
    estimatedValue: number,
    purchasePrice?: number,
    strategyName?: string
  ): PricingResult {
    const strategy = this.getStrategy(strategyName)

    // Calculate list price based on estimated value
    let listPrice = Math.round(estimatedValue * strategy.listPriceMultiplier)

    // Calculate floor price (minimum acceptable)
    let floorPrice = Math.round(estimatedValue * strategy.floorPriceMultiplier)

    // Ensure floor price covers purchase cost with minimum margin
    if (purchasePrice) {
      const minFloor = Math.round(purchasePrice * 1.2) // Minimum 20% profit
      floorPrice = Math.max(floorPrice, minFloor)

      // Ensure list price is above floor price
      listPrice = Math.max(listPrice, Math.round(floorPrice * 1.2))
    }

    // Apply market adjustments
    const adjusted = this.applyMarketAdjustments(listPrice, floorPrice, domain)

    logger.debug('PRICING', `Calculated pricing for ${domain}`, {
      domain,
      estimatedValue,
      listPrice: adjusted.listPrice,
      floorPrice: adjusted.floorPrice,
      strategy: strategy.name,
    })

    return {
      domain,
      estimatedValue,
      listPrice: adjusted.listPrice,
      floorPrice: adjusted.floorPrice,
      strategy: strategy.name,
      timestamp: new Date(),
    }
  }

  /**
   * Enrich opportunities with pricing
   */
  enrichOpportunitiesWithPricing(
    opportunities: Domain[],
    strategyName?: string
  ): Array<Domain & { listPrice?: number; floorPrice?: number }> {
    logger.info('PRICING', `Calculating pricing for ${opportunities.length} opportunities`)

    return opportunities.map(opp => {
      const pricing = this.calculatePricing(
        opp.name,
        opp.estimatedValue,
        opp.purchasePrice,
        strategyName
      )

      return {
        ...opp,
        listPrice: pricing.listPrice,
        floorPrice: pricing.floorPrice,
      }
    })
  }

  /**
   * Apply market-based adjustments
   */
  private applyMarketAdjustments(
    listPrice: number,
    floorPrice: number,
    domain: string
  ): { listPrice: number; floorPrice: number } {
    // Extract TLD
    const tld = domain.split('.').pop() || 'com'

    // Adjust for TLD popularity
    const tldAdjustments: Record<string, number> = {
      com: 1.0,
      net: 0.9,
      org: 0.85,
      io: 1.1,
      ai: 1.2,
    }

    const adjustment = tldAdjustments[tld] || 0.9

    // Adjust for domain length (shorter = more premium pricing viable)
    const domainName = domain.split('.')[0]
    let lengthAdjustment = 1.0

    if (domainName.length <= 5) {
      lengthAdjustment = 1.3
    } else if (domainName.length <= 8) {
      lengthAdjustment = 1.1
    } else if (domainName.length >= 15) {
      lengthAdjustment = 0.8
    }

    // Apply adjustments
    const adjustedListPrice = Math.round(listPrice * adjustment * lengthAdjustment)
    const adjustedFloorPrice = Math.round(floorPrice * adjustment)

    return {
      listPrice: adjustedListPrice,
      floorPrice: adjustedFloorPrice,
    }
  }

  /**
   * Calculate recommended price drop schedule
   */
  calculatePriceDropSchedule(
    initialPrice: number,
    floorPrice: number,
    daysOnMarket: number
  ): number {
    // No drops in first 30 days
    if (daysOnMarket <= 30) {
      return initialPrice
    }

    // Calculate how many 30-day periods have passed
    const periods = Math.floor(daysOnMarket / 30)

    // Drop 10% every 30 days, but never below floor
    const dropPercentage = Math.min(periods * 0.1, 0.5) // Max 50% drop
    const droppedPrice = Math.round(initialPrice * (1 - dropPercentage))

    return Math.max(droppedPrice, floorPrice)
  }

  /**
   * Evaluate if an offer should be accepted
   */
  shouldAcceptOffer(
    offerPrice: number,
    floorPrice: number,
    daysOnMarket: number
  ): { accept: boolean; reason: string } {
    // Calculate current minimum based on days on market
    const urgencyMultiplier = daysOnMarket > 180 ? 0.9 : 1.0 // More flexible after 6 months
    const adjustedFloor = Math.round(floorPrice * urgencyMultiplier)

    if (offerPrice >= adjustedFloor) {
      return {
        accept: true,
        reason: `Offer meets floor price of $${adjustedFloor}`,
      }
    } else {
      const shortfall = adjustedFloor - offerPrice
      const percentage = ((shortfall / adjustedFloor) * 100).toFixed(1)
      return {
        accept: false,
        reason: `Offer is $${shortfall} (${percentage}%) below floor price`,
      }
    }
  }

  /**
   * Get strategy by name or default
   */
  private getStrategy(name?: string): PricingStrategy {
    const strategyName = name || this.defaultStrategy
    const strategy = this.strategies[strategyName]

    if (!strategy) {
      logger.warn('PRICING', `Unknown strategy ${strategyName}, using default`)
      return this.strategies[this.defaultStrategy]
    }

    return strategy
  }

  /**
   * Register custom pricing strategy
   */
  registerStrategy(name: string, strategy: PricingStrategy): void {
    this.strategies[name] = strategy
    logger.info('PRICING', `Registered pricing strategy: ${name}`)
  }

  /**
   * Set default strategy
   */
  setDefaultStrategy(name: string): void {
    if (!this.strategies[name]) {
      throw new Error(`Strategy ${name} not found`)
    }
    this.defaultStrategy = name
    logger.info('PRICING', `Default pricing strategy set to: ${name}`)
  }

  /**
   * Get all available strategies
   */
  getStrategies(): Record<string, PricingStrategy> {
    return { ...this.strategies }
  }

  /**
   * Calculate ROI for a domain purchase and sale
   */
  calculateROI(purchasePrice: number, salePrice: number, holdingDays: number): {
    profit: number
    roiPercentage: number
    annualizedROI: number
  } {
    const profit = salePrice - purchasePrice
    const roiPercentage = (profit / purchasePrice) * 100

    // Annualize ROI
    const holdingYears = holdingDays / 365
    const annualizedROI = holdingYears > 0 ? roiPercentage / holdingYears : roiPercentage

    return {
      profit,
      roiPercentage,
      annualizedROI,
    }
  }

  /**
   * Calculate breakeven analysis
   */
  calculateBreakeven(
    purchasePrice: number,
    estimatedValue: number,
    listPrice: number
  ): {
    breakevenPrice: number
    listingDiscount: number
    profitAtList: number
    profitMarginAtList: number
  } {
    // Add typical costs (registration, marketplace fees, etc.)
    const typicalCosts = purchasePrice * 0.15 // 15% for fees, renewals, etc.
    const breakevenPrice = Math.round(purchasePrice + typicalCosts)

    const listingDiscount = ((estimatedValue - listPrice) / estimatedValue) * 100
    const profitAtList = listPrice - breakevenPrice
    const profitMarginAtList = (profitAtList / listPrice) * 100

    return {
      breakevenPrice,
      listingDiscount,
      profitAtList,
      profitMarginAtList,
    }
  }
}

// Export singleton instance
export const pricingPolicy = new PricingPolicy()
