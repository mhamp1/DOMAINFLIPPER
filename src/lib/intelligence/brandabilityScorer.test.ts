/**
 * Tests for Brandability Scorer
 */

import { describe, it, expect } from 'vitest'
import { BrandabilityScorer, DEFAULT_BRANDABILITY_CONFIG } from './brandabilityScorer'

describe('BrandabilityScorer', () => {
  const scorer = new BrandabilityScorer()

  describe('scoreDomain', () => {
    it('should score a good brandable domain highly', () => {
      const result = scorer.scoreDomain('techly.com')
      expect(result.score).toBeGreaterThan(60)
      expect(result.isClean).toBe(true)
      expect(result.hasNumbers).toBe(false)
      expect(result.hasHyphens).toBe(false)
    })

    it('should penalize domains with numbers', () => {
      const withNumbers = scorer.scoreDomain('tech123.com')
      const without = scorer.scoreDomain('techly.com')
      expect(withNumbers.score).toBeLessThan(without.score)
      expect(withNumbers.hasNumbers).toBe(true)
    })

    it('should penalize domains with hyphens', () => {
      const withHyphens = scorer.scoreDomain('tech-ly.com')
      const without = scorer.scoreDomain('techly.com')
      expect(withHyphens.score).toBeLessThan(without.score)
      expect(withHyphens.hasHyphens).toBe(true)
    })

    it('should detect language correctly', () => {
      const english = scorer.scoreDomain('hello.com')
      const spanish = scorer.scoreDomain('señor.com')
      expect(english.language).toBe('english')
      expect(spanish.language).toBe('spanish')
    })

    it('should calculate syllables', () => {
      const result = scorer.scoreDomain('technology.com')
      expect(result.syllableCount).toBeGreaterThan(2)
    })

    it('should calculate vowel ratio', () => {
      const result = scorer.scoreDomain('aeiou.com')
      expect(result.vowelRatio).toBeGreaterThan(0.8)
    })

    it('should flag profanity', () => {
      const result = scorer.scoreDomain('damn.com')
      expect(result.isClean).toBe(false)
      expect(result.warnings).toContain('Contains profanity')
    })

    it('should flag trademark risks', () => {
      const result = scorer.scoreDomain('google.com')
      expect(result.isClean).toBe(false)
      expect(result.warnings).toContain('Potential trademark conflict')
    })

    it('should handle very short domains', () => {
      const result = scorer.scoreDomain('ab.com')
      expect(result.warnings.some(w => w.includes('short'))).toBe(true)
    })

    it('should handle very long domains', () => {
      const result = scorer.scoreDomain('verylongdomainname.com')
      expect(result.warnings.some(w => w.includes('long'))).toBe(true)
    })
  })

  describe('configuration', () => {
    it('should allow updating config', () => {
      const customScorer = new BrandabilityScorer()
      customScorer.updateConfig({ minScore: 80 })
      const config = customScorer.getConfig()
      expect(config.minScore).toBe(80)
    })
  })

  describe('CVCV pattern scoring', () => {
    it('should score alternating consonant-vowel highly', () => {
      const result = scorer.scoreDomain('banana.com')
      expect(result.cvcvScore).toBeGreaterThan(70)
    })
  })
})
