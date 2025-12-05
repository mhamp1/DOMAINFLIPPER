/**
 * Quantum Shield Risk Engine Tests
 * Comprehensive tests for 12-layer risk protection
 * December 2025
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QuantumShield } from './QuantumShield'

describe('QuantumShield', () => {
  let shield: QuantumShield

  beforeEach(() => {
    shield = new QuantumShield()
    vi.clearAllMocks()
  })

  describe('constructor', () => {
    it('should initialize with default config', () => {
      expect(shield).toBeDefined()
      const stats = shield.getStats()
      expect(stats.dailyPnL).toBe(0)
      expect(stats.riskScore).toBe(100)
      expect(stats.isPaused).toBe(false)
    })

    it('should accept custom config', () => {
      const customShield = new QuantumShield({
        dailyLossLimit: 0.05,
        maxPositionSize: 0.03,
      })
      expect(customShield).toBeDefined()
    })
  })

  describe('getStats', () => {
    it('should return current stats', () => {
      const stats = shield.getStats()
      
      expect(stats).toHaveProperty('dailyPnL')
      expect(stats).toHaveProperty('totalDrawdown')
      expect(stats).toHaveProperty('consecutiveLosses')
      expect(stats).toHaveProperty('blockedTrades')
      expect(stats).toHaveProperty('riskScore')
      expect(stats).toHaveProperty('isPaused')
    })
  })

  describe('preSnipeCheck', () => {
    it('should run safety checks', async () => {
      const result = await shield.preSnipeCheck(
        {
          name: 'test.com',
          currentBid: 500,
          estimatedValue: 5000,
        },
        500,
        10000
      )

      expect(result).toHaveProperty('passed')
      expect(result).toHaveProperty('checks')
      expect(Array.isArray(result.checks)).toBe(true)
    })

    it('should return check results', async () => {
      const result = await shield.preSnipeCheck(
        {
          name: 'premium.com',
          currentBid: 100,
          estimatedValue: 10000, // 100x ROI
        },
        100,
        10000
      )

      // Result should have proper structure
      expect(result).toHaveProperty('passed')
      expect(result).toHaveProperty('checks')
    })
  })

  describe('risk scoring', () => {
    it('should start with max risk score', () => {
      const stats = shield.getStats()
      expect(stats.riskScore).toBe(100)
    })
  })
})
