/**
 * Pricing Policy Tests
 * Tests for pricing calculations and strategies
 * December 2025
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { pricingPolicy } from './policy'

describe('PricingPolicy', () => {
  beforeEach(() => {
    // Reset to default strategy
    pricingPolicy.setDefaultStrategy('balanced')
  })

  describe('calculatePricing', () => {
    it('should calculate list and floor prices', () => {
      const result = pricingPolicy.calculatePricing('example.com', 1000)

      expect(result.listPrice).toBeGreaterThan(0)
      expect(result.floorPrice).toBeGreaterThan(0)
      expect(result.listPrice).toBeGreaterThan(result.floorPrice)
      expect(result.domain).toBe('example.com')
      expect(result.estimatedValue).toBe(1000)
    })

    it('should ensure floor price covers purchase cost with margin', () => {
      const purchasePrice = 100
      const estimatedValue = 500

      const result = pricingPolicy.calculatePricing('test.com', estimatedValue, purchasePrice)

      // Floor should be at least 20% above purchase price
      expect(result.floorPrice).toBeGreaterThanOrEqual(purchasePrice * 1.2)
      // List should be above floor
      expect(result.listPrice).toBeGreaterThan(result.floorPrice)
    })

    it('should apply different strategies correctly', () => {
      const estimatedValue = 1000

      const aggressive = pricingPolicy.calculatePricing('test.com', estimatedValue, undefined, 'aggressive')
      const balanced = pricingPolicy.calculatePricing('test.com', estimatedValue, undefined, 'balanced')
      const premium = pricingPolicy.calculatePricing('test.com', estimatedValue, undefined, 'premium')

      // Aggressive should have lowest markup
      expect(aggressive.listPrice).toBeLessThan(balanced.listPrice)
      // Premium should have highest markup
      expect(premium.listPrice).toBeGreaterThan(balanced.listPrice)
    })

    it('should use default strategy when not specified', () => {
      const result = pricingPolicy.calculatePricing('test.com', 1000)
      expect(result.strategy).toBe('Balanced')
    })
  })

  describe('enrichOpportunitiesWithPricing', () => {
    it('should add pricing to opportunities', () => {
      const opportunities = [
        {
          id: '1',
          name: 'test1.com',
          tld: 'com',
          length: 5,
          estimatedValue: 1000,
          aiScore: 80,
          strategyId: 'test',
          status: 'available' as const,
        },
        {
          id: '2',
          name: 'test2.io',
          tld: 'io',
          length: 5,
          estimatedValue: 800,
          aiScore: 75,
          strategyId: 'test',
          status: 'available' as const,
        },
      ]

      const enriched = pricingPolicy.enrichOpportunitiesWithPricing(opportunities)

      expect(enriched).toHaveLength(2)
      expect(enriched[0].listPrice).toBeGreaterThan(0)
      expect(enriched[0].floorPrice).toBeGreaterThan(0)
      expect(enriched[1].listPrice).toBeGreaterThan(0)
      expect(enriched[1].floorPrice).toBeGreaterThan(0)
    })

    it('should handle empty array', () => {
      const enriched = pricingPolicy.enrichOpportunitiesWithPricing([])
      expect(enriched).toHaveLength(0)
    })
  })

  describe('calculatePriceDropSchedule', () => {
    it('should not drop price in first 30 days', () => {
      const initialPrice = 1000
      const floorPrice = 500

      const price = pricingPolicy.calculatePriceDropSchedule(initialPrice, floorPrice, 15)
      expect(price).toBe(initialPrice)
    })

    it('should drop price after 30 days', () => {
      const initialPrice = 1000
      const floorPrice = 500

      const price = pricingPolicy.calculatePriceDropSchedule(initialPrice, floorPrice, 60)
      expect(price).toBeLessThan(initialPrice)
      expect(price).toBeGreaterThanOrEqual(floorPrice)
    })

    it('should not drop below floor price', () => {
      const initialPrice = 1000
      const floorPrice = 500

      const price = pricingPolicy.calculatePriceDropSchedule(initialPrice, floorPrice, 365)
      expect(price).toBeGreaterThanOrEqual(floorPrice)
    })

    it('should cap drops at 50%', () => {
      const initialPrice = 1000
      const floorPrice = 100

      const price = pricingPolicy.calculatePriceDropSchedule(initialPrice, floorPrice, 365)
      expect(price).toBeGreaterThanOrEqual(initialPrice * 0.5)
    })
  })

  describe('shouldAcceptOffer', () => {
    it('should accept offer at or above floor price', () => {
      const result = pricingPolicy.shouldAcceptOffer(500, 500, 30)
      expect(result.accept).toBe(true)
    })

    it('should reject offer below floor price', () => {
      const result = pricingPolicy.shouldAcceptOffer(400, 500, 30)
      expect(result.accept).toBe(false)
      expect(result.reason).toContain('below floor price')
    })

    it('should be more flexible after 180 days', () => {
      const offerPrice = 450
      const floorPrice = 500

      const early = pricingPolicy.shouldAcceptOffer(offerPrice, floorPrice, 30)
      const late = pricingPolicy.shouldAcceptOffer(offerPrice, floorPrice, 200)

      // Early should reject
      expect(early.accept).toBe(false)
      // Late might accept (90% of floor)
      // 450 >= 500 * 0.9 = 450, so should accept
      expect(late.accept).toBe(true)
    })
  })

  describe('calculateROI', () => {
    it('should calculate profit and ROI correctly', () => {
      const result = pricingPolicy.calculateROI(100, 300, 365)

      expect(result.profit).toBe(200)
      expect(result.roiPercentage).toBe(200) // 200% ROI
      expect(result.annualizedROI).toBeCloseTo(200, 1) // ~200% annualized over 1 year
    })

    it('should calculate annualized ROI for different holding periods', () => {
      const shortHold = pricingPolicy.calculateROI(100, 200, 30)
      const longHold = pricingPolicy.calculateROI(100, 200, 730)

      // Short hold should have higher annualized ROI
      expect(shortHold.annualizedROI).toBeGreaterThan(longHold.annualizedROI)
    })
  })

  describe('calculateBreakeven', () => {
    it('should calculate breakeven with fees', () => {
      const result = pricingPolicy.calculateBreakeven(100, 500, 600)

      expect(result.breakevenPrice).toBeGreaterThan(100) // More than purchase due to fees
      expect(result.profitAtList).toBeGreaterThan(0)
      expect(result.profitMarginAtList).toBeGreaterThan(0)
    })

    it('should calculate listing discount', () => {
      const result = pricingPolicy.calculateBreakeven(100, 1000, 800)

      // Listing at 800 vs estimated 1000 is 20% discount
      expect(result.listingDiscount).toBeCloseTo(20, 0)
    })
  })

  describe('strategy management', () => {
    it('should register custom strategy', () => {
      const customStrategy = {
        name: 'Custom',
        listPriceMultiplier: 2.5,
        floorPriceMultiplier: 1.5,
        description: 'Custom test strategy',
      }

      pricingPolicy.registerStrategy('custom', customStrategy)
      
      const result = pricingPolicy.calculatePricing('test.com', 1000, undefined, 'custom')
      expect(result.strategy).toBe('Custom')
    })

    it('should list all strategies', () => {
      const strategies = pricingPolicy.getStrategies()
      
      expect(strategies.aggressive).toBeDefined()
      expect(strategies.balanced).toBeDefined()
      expect(strategies.premium).toBeDefined()
      expect(strategies.market).toBeDefined()
    })

    it('should change default strategy', () => {
      pricingPolicy.setDefaultStrategy('aggressive')
      
      const result = pricingPolicy.calculatePricing('test.com', 1000)
      expect(result.strategy).toBe('Aggressive')
    })

    it('should throw error for invalid strategy', () => {
      expect(() => pricingPolicy.setDefaultStrategy('nonexistent')).toThrow()
    })
  })
})
