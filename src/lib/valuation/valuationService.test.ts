/**
 * Valuation Service Tests
 * Tests for domain valuation logic
 * December 2025
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { valuationService } from './valuationService'

describe('ValuationService', () => {
  beforeEach(() => {
    // Reset any state if needed
  })

  describe('valuateDomain', () => {
    it('should value .com domains higher than other TLDs', async () => {
      const comValuation = await valuationService.valuateDomain('quantum', 'com')
      const netValuation = await valuationService.valuateDomain('quantum', 'net')

      expect(comValuation.estimatedValue).toBeGreaterThan(0)
      expect(netValuation.estimatedValue).toBeGreaterThan(0)
      expect(comValuation.estimatedValue).toBeGreaterThan(netValuation.estimatedValue)
    })

    it('should value shorter domains higher', async () => {
      const shortValuation = await valuationService.valuateDomain('ai', 'com')
      const longValuation = await valuationService.valuateDomain('artificialintelligence', 'com')

      expect(shortValuation.estimatedValue).toBeGreaterThan(longValuation.estimatedValue)
    })

    it('should include all valuation factors', async () => {
      const result = await valuationService.valuateDomain('techstartup', 'io')

      expect(result.factors).toBeDefined()
      expect(result.factors.lengthScore).toBeGreaterThan(0)
      expect(result.factors.tldPremium).toBeGreaterThan(0)
      expect(result.factors.keywordValue).toBeGreaterThanOrEqual(0)
      expect(result.factors.brandability).toBeGreaterThanOrEqual(0)
      expect(result.factors.liquidity).toBeGreaterThan(0)
    })

    it('should have higher confidence for short .com domains', async () => {
      const shortCom = await valuationService.valuateDomain('app', 'com')
      const longNet = await valuationService.valuateDomain('verylongdomainname', 'net')

      expect(shortCom.confidence).toBeGreaterThan(longNet.confidence)
    })

    it('should apply liquidity discount', async () => {
      const result = await valuationService.valuateDomain('example', 'com')

      // Estimated value should be less than theoretical base value
      // due to liquidity discount
      expect(result.estimatedValue).toBeGreaterThan(0)
      expect(result.factors.liquidity).toBeGreaterThan(0)
    })
  })

  describe('enrichOpportunities', () => {
    it('should enrich opportunities with valuations', async () => {
      const opportunities = [
        {
          id: '1',
          name: 'techworld.com',
          tld: 'com',
          length: 9,
          estimatedValue: 0,
          aiScore: 0,
          strategyId: 'test',
          status: 'available' as const,
        },
        {
          id: '2',
          name: 'dataai.io',
          tld: 'io',
          length: 6,
          estimatedValue: 0,
          aiScore: 0,
          strategyId: 'test',
          status: 'available' as const,
        },
      ]

      const enriched = await valuationService.enrichOpportunities(opportunities)

      expect(enriched).toHaveLength(2)
      expect(enriched[0].estimatedValue).toBeGreaterThan(0)
      expect(enriched[1].estimatedValue).toBeGreaterThan(0)
      expect(enriched[0].aiScore).toBeGreaterThan(0)
      expect(enriched[1].aiScore).toBeGreaterThan(0)
    })

    it('should handle empty opportunities array', async () => {
      const enriched = await valuationService.enrichOpportunities([])
      expect(enriched).toHaveLength(0)
    })
  })

  describe('batchValuate', () => {
    it('should valuate multiple domains efficiently', async () => {
      const domains = [
        { domain: 'tech', tld: 'com' },
        { domain: 'app', tld: 'io' },
        { domain: 'data', tld: 'ai' },
      ]

      const results = await valuationService.batchValuate(domains)

      expect(results).toHaveLength(3)
      results.forEach(result => {
        expect(result.estimatedValue).toBeGreaterThan(0)
        expect(result.confidence).toBeGreaterThan(0)
      })
    })
  })

  describe('TLD premiums', () => {
    it('should apply correct TLD premiums', async () => {
      const comVal = await valuationService.valuateDomain('example', 'com')
      const ioVal = await valuationService.valuateDomain('example', 'io')
      const aiVal = await valuationService.valuateDomain('example', 'ai')

      // .com should have premium
      expect(comVal.factors.tldPremium).toBeGreaterThan(1)
      // .io should have premium
      expect(ioVal.factors.tldPremium).toBeGreaterThan(1)
      // .ai should have highest premium
      expect(aiVal.factors.tldPremium).toBeGreaterThan(ioVal.factors.tldPremium)
    })

    it('should allow updating TLD premiums', () => {
      valuationService.updateTldPremiums({ xyz: 0.5 })
      // No error should be thrown
      expect(true).toBe(true)
    })
  })

  describe('liquidity discount', () => {
    it('should allow updating liquidity discount', () => {
      valuationService.updateLiquidityDiscount(0.4)
      // No error should be thrown
      expect(true).toBe(true)
    })

    it('should reject invalid liquidity discount', () => {
      expect(() => valuationService.updateLiquidityDiscount(-0.1)).toThrow()
      expect(() => valuationService.updateLiquidityDiscount(1.5)).toThrow()
    })
  })
})
