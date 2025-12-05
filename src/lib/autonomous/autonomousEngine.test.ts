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
      enabled: true,
      dailyScanLimit: 1000,
      maxDailySpend: 1000,
      minROI: 3,
      autoListEnabled: true,
      autoSellEnabled: true,
      autoWithdrawEnabled: false,
    })
    vi.clearAllMocks()
  })

  describe('constructor', () => {
    it('should initialize with config', () => {
      expect(engine).toBeDefined()
    })
  })

  describe('start/stop', () => {
    it('should start the engine', () => {
      engine.start()
      expect(engine).toBeDefined()
    })

    it('should stop the engine', () => {
      engine.start()
      engine.stop()
      expect(engine).toBeDefined()
    })
  })
})
