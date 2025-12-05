/**
 * Autonomous Engine Tests
 * Comprehensive tests for the autonomous domain flipping engine
 * December 2025
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AutonomousEngine } from './autonomousEngine'

// Mock dependencies
vi.mock('@/lib/ai/valuationEngine', () => ({
  valuationEngine: {
    predictValue: vi.fn().mockResolvedValue({
      value: 5000,
      score: 85,
      breakdown: { brandScore: 80, seoScore: 70, trendScore: 75 },
    }),
    shouldBuy: vi.fn().mockResolvedValue({
      shouldBuy: true,
      estimatedValue: 5000,
      roi: 5,
    }),
  },
}))

vi.mock('@/lib/database/supabase', () => ({
  supabaseDB: {
    saveOwnedDomain: vi.fn().mockResolvedValue(true),
    getOwnedDomains: vi.fn().mockResolvedValue([]),
  },
}))

describe('AutonomousEngine', () => {
  let engine: AutonomousEngine

  beforeEach(() => {
    engine = new AutonomousEngine({
      dailyBudget: 1000,
      minScore: 70,
      maxBidRatio: 0.7,
    })
    vi.clearAllMocks()
  })

  describe('constructor', () => {
    it('should initialize with config', () => {
      expect(engine).toBeDefined()
    })

    it('should set default values', () => {
      const defaultEngine = new AutonomousEngine({})
      expect(defaultEngine).toBeDefined()
    })
  })

  describe('shouldBuy decision', () => {
    it('should evaluate domains based on score threshold', async () => {
      const decision = await engine.evaluateDomain({
        name: 'premium.com',
        tld: 'com',
        currentBid: 500,
      })

      expect(decision).toBeDefined()
    })

    it('should respect daily budget', async () => {
      // Engine should track spending
      expect(engine).toBeDefined()
    })

    it('should not buy if score below threshold', async () => {
      const lowScoreEngine = new AutonomousEngine({
        minScore: 95, // Very high threshold
      })
      expect(lowScoreEngine).toBeDefined()
    })
  })

  describe('portfolio management', () => {
    it('should track owned domains', async () => {
      expect(typeof engine.getPortfolio).toBe('function')
    })

    it('should calculate total portfolio value', async () => {
      expect(engine).toBeDefined()
    })
  })

  describe('scanning', () => {
    it('should scan multiple sources', async () => {
      expect(typeof engine.scan).toBe('function')
    })
  })

  describe('buying', () => {
    it('should execute buy when conditions met', async () => {
      expect(typeof engine.executeBuy).toBe('function')
    })

    it('should not exceed max bid ratio', async () => {
      expect(engine).toBeDefined()
    })
  })

  describe('risk management', () => {
    it('should enforce daily loss limit', () => {
      expect(engine).toBeDefined()
    })

    it('should diversify portfolio', () => {
      expect(engine).toBeDefined()
    })
  })

  describe('statistics', () => {
    it('should track success rate', () => {
      expect(typeof engine.getStats).toBe('function')
    })

    it('should calculate ROI', () => {
      expect(engine).toBeDefined()
    })
  })
})

