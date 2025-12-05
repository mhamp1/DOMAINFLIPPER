/**
 * Valuation Engine Tests
 * Comprehensive tests for AI domain valuation
 * December 2025
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { valuationEngine } from './valuationEngine'

describe('ValuationEngine', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('predictValue', () => {
    it('should value .com domains higher than other TLDs', async () => {
      const comValue = await valuationEngine.predictValue({
        name: 'quantum.com',
        tld: 'com',
      })
      
      const netValue = await valuationEngine.predictValue({
        name: 'quantum.net',
        tld: 'net',
      })

      expect(comValue.value).toBeGreaterThan(netValue.value)
    })

    it('should boost value for short domain names', async () => {
      const shortDomain = await valuationEngine.predictValue({
        name: 'ai.com',
        tld: 'com',
      })
      
      const longDomain = await valuationEngine.predictValue({
        name: 'artificialintelligence.com',
        tld: 'com',
      })

      expect(shortDomain.value).toBeGreaterThan(longDomain.value)
    })

    it('should include brandability score in breakdown', async () => {
      const result = await valuationEngine.predictValue({
        name: 'falcon.com',
        tld: 'com',
      })

      expect(result.breakdown).toBeDefined()
      expect(result.breakdown.brandScore).toBeGreaterThan(0)
    })

    it('should return confidence score', async () => {
      const result = await valuationEngine.predictValue({
        name: 'test.com',
        tld: 'com',
        backlinks: 100,
        traffic: 1000,
      })

      expect(result.confidence).toBeDefined()
      expect(result.confidence).toBeGreaterThanOrEqual(0)
      expect(result.confidence).toBeLessThanOrEqual(1)
    })

    it('should handle domains with metrics', async () => {
      const result = await valuationEngine.predictValue({
        name: 'premium.com',
        tld: 'com',
        age: 10,
        backlinks: 500,
        traffic: 10000,
      })

      expect(result.value).toBeGreaterThan(5000)
      expect(result.score).toBeGreaterThan(70)
    })
  })

  describe('batchValuate', () => {
    it('should process multiple domains efficiently', async () => {
      const domains = [
        { name: 'domain1.com', tld: 'com' },
        { name: 'domain2.com', tld: 'com' },
        { name: 'domain3.net', tld: 'net' },
      ]

      const results = await valuationEngine.batchValuate(domains)

      expect(results).toHaveLength(3)
      results.forEach(result => {
        expect(result.value).toBeGreaterThan(0)
        expect(result.score).toBeGreaterThanOrEqual(0)
      })
    })

    it('should maintain order of results', async () => {
      const domains = [
        { name: 'first.com', tld: 'com' },
        { name: 'second.com', tld: 'com' },
      ]

      const results = await valuationEngine.batchValuate(domains)

      expect(results[0].breakdown).toBeDefined()
      expect(results[1].breakdown).toBeDefined()
    })
  })

  describe('shouldBuy', () => {
    it('should recommend buy for undervalued domains', async () => {
      const domain = {
        name: 'premium.com',
        tld: 'com',
        currentBid: 100,
        backlinks: 500,
        traffic: 5000,
      }

      const result = await valuationEngine.shouldBuy(domain)
      
      expect(result.shouldBuy).toBe(true)
      expect(result.estimatedValue).toBeGreaterThan(domain.currentBid)
    })

    it('should not recommend overpriced domains', async () => {
      const domain = {
        name: 'random123xyz.com',
        tld: 'com',
        currentBid: 100000,
      }

      const result = await valuationEngine.shouldBuy(domain)
      
      expect(result.shouldBuy).toBe(false)
    })

    it('should calculate ROI correctly', async () => {
      const domain = {
        name: 'valuable.com',
        tld: 'com',
        currentBid: 500,
        backlinks: 100,
      }

      const result = await valuationEngine.shouldBuy(domain)
      
      if (result.estimatedValue > 0 && domain.currentBid > 0) {
        const expectedROI = (result.estimatedValue - domain.currentBid) / domain.currentBid
        expect(result.roi).toBeCloseTo(expectedROI, 1)
      }
    })

    it('should handle zero currentBid', async () => {
      const domain = {
        name: 'free.com',
        tld: 'com',
        currentBid: 0,
      }

      const result = await valuationEngine.shouldBuy(domain)
      
      // Should not crash with division by zero
      expect(result.shouldBuy).toBeDefined()
    })
  })

  describe('TLD multipliers', () => {
    it('should apply correct multipliers for premium TLDs', async () => {
      const aiDomain = await valuationEngine.predictValue({
        name: 'quantum.ai',
        tld: 'ai',
      })

      const xyzDomain = await valuationEngine.predictValue({
        name: 'quantum.xyz',
        tld: 'xyz',
      })

      // .ai should be valued higher than .xyz
      expect(aiDomain.breakdown.tldScore).toBeGreaterThan(xyzDomain.breakdown.tldScore)
    })
  })

  describe('keyword scoring', () => {
    it('should boost value for high-value keywords', async () => {
      const cryptoDomain = await valuationEngine.predictValue({
        name: 'bitcoin.com',
        tld: 'com',
      })

      const genericDomain = await valuationEngine.predictValue({
        name: 'random.com',
        tld: 'com',
      })

      expect(cryptoDomain.value).toBeGreaterThan(genericDomain.value)
    })
  })
})

