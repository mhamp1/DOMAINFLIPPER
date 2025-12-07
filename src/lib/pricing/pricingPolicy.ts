/**
 * Pricing Policy Module
 * Implements liquidation vs aspirational pricing with auto-reprice rules
 */

import { toast } from 'sonner'

export interface PricingStrategy {
  liquidationPrice: number  // Quick sale price (conservative)
  aspirationalPrice: number // Optimistic market price
  listPrice: number         // Current asking price
  floorPrice: number        // Minimum acceptable price
  daysOnMarket: number
  channelPerformance: Record<string, ChannelPerformance>
}

export interface ChannelPerformance {
  channel: string
  views: number
  inquiries: number
  offers: number
  highestOffer: number
  lastActivity: Date
}

export interface RepriceRule {
  trigger: 'days_on_market' | 'low_interest' | 'channel_performance' | 'market_change'
  condition: {
    daysThreshold?: number
    viewsThreshold?: number
    offersThreshold?: number
  }
  action: 'reduce_to_liquidation' | 'reduce_percent' | 'increase_percent' | 'set_floor'
  value?: number // Percentage or fixed value
}

export interface PricingPolicyOptions {
  liquidationDiscount: number // e.g., 0.7 = 70% of aspirational
  floorDiscount: number       // e.g., 0.5 = 50% of aspirational (absolute minimum)
  autoRepriceEnabled: boolean
  repriceRules: RepriceRule[]
}

// Default pricing policy
export const DEFAULT_PRICING_POLICY: PricingPolicyOptions = {
  liquidationDiscount: 0.75,  // Liquidation at 75% of aspirational
  floorDiscount: 0.55,        // Floor at 55% of aspirational
  autoRepriceEnabled: true,
  repriceRules: [
    {
      trigger: 'days_on_market',
      condition: { daysThreshold: 30 },
      action: 'reduce_percent',
      value: 10, // Reduce by 10% after 30 days
    },
    {
      trigger: 'days_on_market',
      condition: { daysThreshold: 60 },
      action: 'reduce_to_liquidation',
    },
    {
      trigger: 'days_on_market',
      condition: { daysThreshold: 90 },
      action: 'set_floor',
    },
    {
      trigger: 'low_interest',
      condition: { viewsThreshold: 10, daysThreshold: 14 },
      action: 'reduce_percent',
      value: 15, // Reduce by 15% if < 10 views in 14 days
    },
    {
      trigger: 'channel_performance',
      condition: { offersThreshold: 2 },
      action: 'increase_percent',
      value: 5, // Increase by 5% if multiple offers
    },
  ],
}

/**
 * Calculate pricing strategy from base valuation
 */
export function calculatePricingStrategy(
  domain: string,
  baseValuation: number,
  options: PricingPolicyOptions = DEFAULT_PRICING_POLICY
): PricingStrategy {
  // Calculate aspirational price (optimistic market value)
  // Typically 1.2-1.5x base valuation
  const aspirationalPrice = Math.round(baseValuation * 1.3)
  
  // Calculate liquidation price (quick sale)
  const liquidationPrice = Math.round(aspirationalPrice * options.liquidationDiscount)
  
  // Calculate floor price (absolute minimum)
  const floorPrice = Math.round(aspirationalPrice * options.floorDiscount)
  
  // Start with aspirational price as list price
  const listPrice = aspirationalPrice
  
  return {
    liquidationPrice,
    aspirationalPrice,
    listPrice,
    floorPrice,
    daysOnMarket: 0,
    channelPerformance: {},
  }
}

/**
 * Apply auto-reprice rules based on market performance
 */
export function applyRepriceRules(
  strategy: PricingStrategy,
  options: PricingPolicyOptions = DEFAULT_PRICING_POLICY
): {
  newPrice: number
  appliedRules: string[]
  changed: boolean
} {
  if (!options.autoRepriceEnabled) {
    return {
      newPrice: strategy.listPrice,
      appliedRules: [],
      changed: false,
    }
  }
  
  let newPrice = strategy.listPrice
  const appliedRules: string[] = []
  
  // Check each rule
  for (const rule of options.repriceRules) {
    const shouldApply = checkRuleCondition(rule, strategy)
    
    if (shouldApply) {
      const adjustment = applyRuleAction(rule, strategy, newPrice)
      
      if (adjustment.changed) {
        newPrice = adjustment.price
        appliedRules.push(adjustment.reason)
      }
    }
  }
  
  // Ensure price doesn't go below floor
  if (newPrice < strategy.floorPrice) {
    newPrice = strategy.floorPrice
    appliedRules.push('floor-price-enforced')
  }
  
  // Ensure price doesn't exceed aspirational by too much
  if (newPrice > strategy.aspirationalPrice * 1.5) {
    newPrice = Math.round(strategy.aspirationalPrice * 1.5)
    appliedRules.push('max-price-cap-enforced')
  }
  
  const changed = newPrice !== strategy.listPrice
  
  return {
    newPrice: Math.round(newPrice),
    appliedRules,
    changed,
  }
}

/**
 * Check if a reprice rule condition is met
 */
function checkRuleCondition(rule: RepriceRule, strategy: PricingStrategy): boolean {
  switch (rule.trigger) {
    case 'days_on_market':
      return strategy.daysOnMarket >= (rule.condition.daysThreshold || 0)
    
    case 'low_interest': {
      const totalViews = Object.values(strategy.channelPerformance)
        .reduce((sum, ch) => sum + ch.views, 0)
      
      const meetsViewThreshold = totalViews < (rule.condition.viewsThreshold || 0)
      const meetsDaysThreshold = strategy.daysOnMarket >= (rule.condition.daysThreshold || 0)
      
      return meetsViewThreshold && meetsDaysThreshold
    }
    
    case 'channel_performance': {
      const totalOffers = Object.values(strategy.channelPerformance)
        .reduce((sum, ch) => sum + ch.offers, 0)
      
      return totalOffers >= (rule.condition.offersThreshold || 0)
    }
    
    case 'market_change':
      // Placeholder for market sentiment changes
      return false
    
    default:
      return false
  }
}

/**
 * Apply a reprice rule action
 */
function applyRuleAction(
  rule: RepriceRule,
  strategy: PricingStrategy,
  currentPrice: number
): { price: number; changed: boolean; reason: string } {
  switch (rule.action) {
    case 'reduce_to_liquidation':
      return {
        price: strategy.liquidationPrice,
        changed: currentPrice !== strategy.liquidationPrice,
        reason: `Reduced to liquidation price after ${strategy.daysOnMarket} days`,
      }
    
    case 'reduce_percent': {
      const reduction = (rule.value || 10) / 100
      const newPrice = Math.round(currentPrice * (1 - reduction))
      return {
        price: newPrice,
        changed: newPrice !== currentPrice,
        reason: `Reduced by ${rule.value}% due to ${rule.trigger}`,
      }
    }
    
    case 'increase_percent': {
      const increase = (rule.value || 5) / 100
      const newPrice = Math.round(currentPrice * (1 + increase))
      return {
        price: newPrice,
        changed: newPrice !== currentPrice,
        reason: `Increased by ${rule.value}% due to strong ${rule.trigger}`,
      }
    }
    
    case 'set_floor':
      return {
        price: strategy.floorPrice,
        changed: currentPrice !== strategy.floorPrice,
        reason: `Set to floor price after ${strategy.daysOnMarket} days`,
      }
    
    default:
      return { price: currentPrice, changed: false, reason: 'no-action' }
  }
}

/**
 * Update strategy with new channel performance data
 */
export function updateChannelPerformance(
  strategy: PricingStrategy,
  channel: string,
  performance: Partial<ChannelPerformance>
): PricingStrategy {
  const existing = strategy.channelPerformance[channel] || {
    channel,
    views: 0,
    inquiries: 0,
    offers: 0,
    highestOffer: 0,
    lastActivity: new Date(),
  }
  
  return {
    ...strategy,
    channelPerformance: {
      ...strategy.channelPerformance,
      [channel]: {
        ...existing,
        ...performance,
        lastActivity: new Date(),
      },
    },
  }
}

/**
 * Evaluate pricing strategy and suggest adjustments
 */
export function evaluatePricingStrategy(
  domain: string,
  strategy: PricingStrategy,
  options: PricingPolicyOptions = DEFAULT_PRICING_POLICY
): {
  recommendation: string
  shouldReprice: boolean
  suggestedPrice?: number
  reasoning: string[]
} {
  const analysis = applyRepriceRules(strategy, options)
  
  const reasoning: string[] = []
  
  // Analyze performance
  const totalViews = Object.values(strategy.channelPerformance)
    .reduce((sum, ch) => sum + ch.views, 0)
  const totalOffers = Object.values(strategy.channelPerformance)
    .reduce((sum, ch) => sum + ch.offers, 0)
  const highestOffer = Math.max(
    0,
    ...Object.values(strategy.channelPerformance).map(ch => ch.highestOffer)
  )
  
  // Build reasoning
  if (strategy.daysOnMarket > 60) {
    reasoning.push(`Listed for ${strategy.daysOnMarket} days - consider price reduction`)
  }
  
  if (totalViews > 50 && totalOffers === 0) {
    reasoning.push('High views but no offers - price may be too high')
  }
  
  if (totalOffers > 2) {
    reasoning.push('Multiple offers received - strong interest')
  }
  
  if (highestOffer > strategy.liquidationPrice) {
    reasoning.push(`Highest offer ($${highestOffer}) exceeds liquidation price`)
  }
  
  if (strategy.listPrice < strategy.liquidationPrice) {
    reasoning.push('Price below liquidation target - consider accepting offers')
  }
  
  // Generate recommendation
  let recommendation = 'Current pricing is optimal'
  
  if (analysis.changed) {
    recommendation = `Reprice to $${analysis.newPrice.toLocaleString()}`
  } else if (totalOffers > 0 && highestOffer >= strategy.floorPrice) {
    recommendation = `Consider accepting offer of $${highestOffer.toLocaleString()}`
  } else if (strategy.daysOnMarket > 90) {
    recommendation = 'Consider removing from market or major price adjustment'
  }
  
  return {
    recommendation,
    shouldReprice: analysis.changed,
    suggestedPrice: analysis.changed ? analysis.newPrice : undefined,
    reasoning,
  }
}

/**
 * Auto-reprice domain based on market performance
 */
export function autoRepriceDomain(
  domain: string,
  strategy: PricingStrategy,
  options: PricingPolicyOptions = DEFAULT_PRICING_POLICY
): {
  success: boolean
  oldPrice: number
  newPrice: number
  appliedRules: string[]
  message: string
} {
  const result = applyRepriceRules(strategy, options)
  
  if (!result.changed) {
    return {
      success: false,
      oldPrice: strategy.listPrice,
      newPrice: strategy.listPrice,
      appliedRules: [],
      message: 'No repricing needed',
    }
  }
  
  const message = `${domain} repriced: $${strategy.listPrice.toLocaleString()} → $${result.newPrice.toLocaleString()}`
  
  toast.info('Auto-Reprice Applied', {
    description: message,
  })
  
  console.log(`[Auto-Reprice] ${message}`)
  console.log(`  Rules applied: ${result.appliedRules.join(', ')}`)
  
  return {
    success: true,
    oldPrice: strategy.listPrice,
    newPrice: result.newPrice,
    appliedRules: result.appliedRules,
    message,
  }
}

/**
 * Batch auto-reprice multiple domains
 */
export function batchAutoReprice(
  domains: Array<{ domain: string; strategy: PricingStrategy }>,
  options: PricingPolicyOptions = DEFAULT_PRICING_POLICY
): {
  totalProcessed: number
  totalRepriced: number
  results: Array<ReturnType<typeof autoRepriceDomain>>
} {
  const results = domains.map(({ domain, strategy }) =>
    autoRepriceDomain(domain, strategy, options)
  )
  
  const totalRepriced = results.filter(r => r.success).length
  
  if (totalRepriced > 0) {
    toast.success('Batch Reprice Complete', {
      description: `${totalRepriced} of ${domains.length} domains repriced`,
    })
  }
  
  return {
    totalProcessed: domains.length,
    totalRepriced,
    results,
  }
}
