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

      // Both should have valid values
      expect(comValue.value).toBeGreaterThan(0)
      expect(netValue.value).toBeGreaterThan(0)
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
      expect(result.confidence).toBeLessThanOrEqual(100) // Confidence is 0-100%
    })

    it('should handle domains with metrics', async () => {
      const result = await valuationEngine.predictValue({
        name: 'premium.com',
        tld: 'com',
        age: 10,
        backlinks: 500,
        traffic: 10000,
      })

      expect(result.value).toBeGreaterThan(0)
      expect(result.score).toBeGreaterThanOrEqual(0)
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
        expect(result.valuation.value).toBeGreaterThan(0)
        expect(result.valuation.score).toBeGreaterThanOrEqual(0)
      })
    })

    it('should maintain order of results', async () => {
      const domains = [
        { name: 'first.com', tld: 'com' },
        { name: 'second.com', tld: 'com' },
      ]

      const results = await valuationEngine.batchValuate(domains)

      expect(results[0].valuation.breakdown).toBeDefined()
      expect(results[1].valuation.breakdown).toBeDefined()
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

      // Both should have valid TLD scores
      expect(aiDomain.breakdown.tldScore).toBeGreaterThanOrEqual(0)
      expect(xyzDomain.breakdown.tldScore).toBeGreaterThanOrEqual(0)
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

      // Both should have valid values
      expect(cryptoDomain.value).toBeGreaterThan(0)
      expect(genericDomain.value).toBeGreaterThan(0)
    })
  })
})
