/**
 * Tests for Momentum and Negative Filters
 */

import { describe, it, expect } from 'vitest'
import {
  calculateMomentumScore,
  checkProfanity,
  checkTrademarkRisk,
  checkScamRisk,
  applyFilters,
  generateMockHistoricalData,
  DEFAULT_FILTER_SETTINGS,
} from './filters'

describe('Momentum and Negative Filters', () => {
  describe('Momentum Scoring', () => {
    it('should calculate rising momentum', () => {
      const data = generateMockHistoricalData('test', 10, 'rising')
      const momentum = calculateMomentumScore('test', data)
      
      expect(momentum.trend).toBe('rising')
      expect(momentum.velocity).toBeGreaterThan(0)
      expect(momentum.score).toBeGreaterThan(50)
    })

    it('should calculate falling momentum', () => {
      const data = generateMockHistoricalData('test', 10, 'falling')
      const momentum = calculateMomentumScore('test', data)
      
      expect(momentum.trend).toBe('falling')
      expect(momentum.velocity).toBeLessThan(0)
      expect(momentum.score).toBeLessThan(50)
    })

    it('should handle stable trend', () => {
      const data = generateMockHistoricalData('test', 10, 'stable')
      const momentum = calculateMomentumScore('test', data)
      
      expect(momentum.trend).toBe('stable')
      expect(Math.abs(momentum.velocity)).toBeLessThan(10)
    })

    it('should handle insufficient data', () => {
      const momentum = calculateMomentumScore('test', [])
      
      expect(momentum.score).toBe(50)
      expect(momentum.confidence).toBe(20)
    })
  })

  describe('Profanity Filter', () => {
    it('should block profane terms', () => {
      const result = checkProfanity('pornsite.com', DEFAULT_FILTER_SETTINGS)
      
      expect(result.passed).toBe(false)
      expect(result.flags.length).toBeGreaterThan(0)
    })

    it('should allow clean terms', () => {
      const result = checkProfanity('cleansite.com', DEFAULT_FILTER_SETTINGS)
      
      expect(result.passed).toBe(true)
      expect(result.flags.length).toBe(0)
    })

    it('should respect disabled filter', () => {
      const settings = { ...DEFAULT_FILTER_SETTINGS, enableProfanityFilter: false }
      const result = checkProfanity('pornsite.com', settings)
      
      expect(result.passed).toBe(true)
    })
  })

  describe('Trademark Risk Filter', () => {
    it('should flag trademark risks', () => {
      const result = checkTrademarkRisk('google-clone.com', DEFAULT_FILTER_SETTINGS)
      
      expect(result.passed).toBe(false)
      expect(result.flags.length).toBeGreaterThan(0)
    })

    it('should allow non-trademark terms', () => {
      const result = checkTrademarkRisk('mywebsite.com', DEFAULT_FILTER_SETTINGS)
      
      expect(result.passed).toBe(true)
    })

    it('should handle compound words correctly', () => {
      const result = checkTrademarkRisk('pineapple.com', DEFAULT_FILTER_SETTINGS)
      
      expect(result.passed).toBe(true) // "apple" is embedded, not separate
    })
  })

  describe('Scam Risk Filter', () => {
    it('should flag scammy keywords', () => {
      const result = checkScamRisk('getrichquick.com', DEFAULT_FILTER_SETTINGS)
      
      expect(result.passed).toBe(false)
      expect(result.flags.length).toBeGreaterThan(0)
    })

    it('should allow legitimate terms', () => {
      const result = checkScamRisk('businessgrowth.com', DEFAULT_FILTER_SETTINGS)
      
      expect(result.passed).toBe(true)
    })
  })

  describe('Combined Filters', () => {
    it('should pass all filters for good domain', () => {
      const data = generateMockHistoricalData('test', 14, 'rising') // More days for persistence
      const momentum = calculateMomentumScore('test', data)
      const result = applyFilters('gooddomain.com', momentum, DEFAULT_FILTER_SETTINGS)
      
      expect(result.passed).toBe(true)
      expect(result.reasons.length).toBe(0)
    })

    it('should fail on profanity', () => {
      const data = generateMockHistoricalData('test', 10, 'rising')
      const momentum = calculateMomentumScore('test', data)
      const result = applyFilters('badword.xxx', momentum, DEFAULT_FILTER_SETTINGS)
      
      expect(result.passed).toBe(false)
      expect(result.reasons.length).toBeGreaterThan(0)
    })

    it('should fail on low momentum', () => {
      const data = generateMockHistoricalData('test', 10, 'falling')
      const momentum = calculateMomentumScore('test', data)
      const result = applyFilters('gooddomain.com', momentum, DEFAULT_FILTER_SETTINGS)
      
      expect(result.passed).toBe(false)
      expect(result.reasons.some(r => r.includes('momentum'))).toBe(true)
    })

    it('should calculate overall score', () => {
      const result = applyFilters('gooddomain.com', null, DEFAULT_FILTER_SETTINGS)
      
      expect(result.overallScore).toBeGreaterThan(0)
      expect(result.overallScore).toBeLessThanOrEqual(100)
    })
  })
})
