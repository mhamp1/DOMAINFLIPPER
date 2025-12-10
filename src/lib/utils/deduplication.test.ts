/**
 * Tests for Clustered De-duplication Utility
 */

import { describe, it, expect } from 'vitest'
import {
  editDistance,
  isPluralVariant,
  isHyphenVariant,
  isCloseEditDistance,
  areSimilarDomains,
  deduplicateDomains,
  getDeduplicationReport,
  type DomainCandidate,
} from './deduplication'

describe('Clustered De-duplication', () => {
  describe('Edit Distance', () => {
    it('should calculate edit distance correctly', () => {
      expect(editDistance('cat', 'cat')).toBe(0)
      expect(editDistance('cat', 'cut')).toBe(1)
      expect(editDistance('cat', 'dog')).toBe(3)
      expect(editDistance('kitten', 'sitting')).toBe(3)
    })
  })

  describe('Plural Variant Detection', () => {
    it('should detect plural variants', () => {
      expect(isPluralVariant('apple.com', 'apples.com')).toBe(true)
      expect(isPluralVariant('box.com', 'boxes.com')).toBe(true)
      expect(isPluralVariant('city.com', 'cities.com')).toBe(true)
    })

    it('should not flag non-plurals', () => {
      expect(isPluralVariant('apple.com', 'banana.com')).toBe(false)
      expect(isPluralVariant('test.com', 'tester.com')).toBe(false)
    })
  })

  describe('Hyphen Variant Detection', () => {
    it('should detect hyphen variants', () => {
      expect(isHyphenVariant('webapp.com', 'web-app.com')).toBe(true)
      expect(isHyphenVariant('ecommerce.com', 'e-commerce.com')).toBe(true)
    })

    it('should not flag different domains', () => {
      expect(isHyphenVariant('webapp.com', 'website.com')).toBe(false)
    })
  })

  describe('Close Edit Distance', () => {
    it('should detect close variants', () => {
      expect(isCloseEditDistance('apple.com', 'aple.com', 2)).toBe(true)
      expect(isCloseEditDistance('banana.com', 'bananna.com', 2)).toBe(true)
    })

    it('should not flag distant variants', () => {
      expect(isCloseEditDistance('apple.com', 'orange.com', 2)).toBe(false)
    })
  })

  describe('Similar Domains', () => {
    it('should detect identical domains', () => {
      const result = areSimilarDomains('test.com', 'test.com')
      expect(result.similar).toBe(true)
      expect(result.reason).toBe('identical')
    })

    it('should detect plural variants', () => {
      const result = areSimilarDomains('apple.com', 'apples.com')
      expect(result.similar).toBe(true)
      expect(result.reason).toBe('plural-variant')
    })

    it('should detect hyphen variants', () => {
      const result = areSimilarDomains('webapp.com', 'web-app.com')
      expect(result.similar).toBe(true)
      expect(result.reason).toBe('hyphen-variant')
    })

    it('should detect close edit distance', () => {
      const result = areSimilarDomains('apple.com', 'aple.com')
      expect(result.similar).toBe(true)
      expect(result.reason).toBe('close-edit-distance')
    })
  })

  describe('Domain Deduplication', () => {
    const candidates: DomainCandidate[] = [
      { domain: 'apple.com', score: 90, estimatedValue: 10000 },
      { domain: 'apples.com', score: 85, estimatedValue: 8000 },
      { domain: 'app-le.com', score: 75, estimatedValue: 5000 },
      { domain: 'aple.com', score: 70, estimatedValue: 4000 },
      { domain: 'banana.com', score: 88, estimatedValue: 9000 },
      { domain: 'bananas.com', score: 82, estimatedValue: 7000 },
      { domain: 'cherry.com', score: 95, estimatedValue: 12000 },
    ]

    it('should deduplicate domains', () => {
      const result = deduplicateDomains(candidates)
      
      expect(result.length).toBeLessThan(candidates.length)
      expect(result.some(d => d.domain === 'apple.com')).toBe(true)
      expect(result.some(d => d.domain === 'banana.com')).toBe(true)
      expect(result.some(d => d.domain === 'cherry.com')).toBe(true)
    })

    it('should keep highest scoring representative', () => {
      const result = deduplicateDomains(candidates)
      const appleCluster = result.find(d => d.domain.includes('apple') || d.domain.includes('aple'))
      
      expect(appleCluster).toBeDefined()
      expect(appleCluster!.score).toBe(90) // Highest score in apple cluster
    })

    it('should generate detailed report', () => {
      const report = getDeduplicationReport(candidates)
      
      expect(report.totalCandidates).toBe(candidates.length)
      expect(report.totalClusters).toBeGreaterThan(0)
      expect(report.totalSaved).toBeGreaterThan(0)
    })

    it('should count duplicate types', () => {
      const report = getDeduplicationReport(candidates)
      
      expect(report.duplicatesFound.plural).toBeGreaterThanOrEqual(0)
      expect(report.duplicatesFound.hyphen).toBeGreaterThanOrEqual(0)
      expect(report.duplicatesFound.editDistance).toBeGreaterThanOrEqual(0)
    })

    it('should handle no duplicates', () => {
      const uniqueCandidates: DomainCandidate[] = [
        { domain: 'alpha.com', score: 90, estimatedValue: 10000 },
        { domain: 'beta.com', score: 85, estimatedValue: 8000 },
        { domain: 'gamma.com', score: 80, estimatedValue: 6000 },
      ]
      
      const result = deduplicateDomains(uniqueCandidates)
      expect(result.length).toBe(uniqueCandidates.length)
    })
  })
})
