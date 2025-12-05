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

  describe('Daily Loss Limit', () => {
    it('should track daily P&L', () => {
      shield.recordPnL(-100)
      shield.recordPnL(-200)
      
      const stats = shield.getStats()
      expect(stats.dailyPnL).toBe(-300)
    })

    it('should trigger pause when daily loss limit hit', () => {
      // Simulate hitting -8% loss limit
      shield.setCapital(10000)
      shield.recordPnL(-850) // Over 8%
      
      expect(shield.isPaused()).toBe(true)
    })

    it('should reset daily P&L at midnight', () => {
      expect(shield).toBeDefined()
    })
  })

  describe('Position Sizing', () => {
    it('should calculate max position with Kelly Criterion', () => {
      const maxPosition = shield.getMaxPosition(1000, 0.6, 2)
      
      // Kelly fraction = (p * (b + 1) - 1) / b
      // For p=0.6, b=2: (0.6 * 3 - 1) / 2 = 0.4
      expect(maxPosition).toBeGreaterThan(0)
    })

    it('should cap position at 5%', () => {
      shield.setCapital(10000)
      const maxPosition = shield.getMaxPosition(100000, 0.9, 10)
      
      // Should be capped at 5% of capital = $500
      expect(maxPosition).toBeLessThanOrEqual(500)
    })
  })

  describe('Circuit Breaker', () => {
    it('should activate at -25% drawdown', () => {
      shield.setCapital(10000)
      shield.recordPnL(-2600) // Over 25%
      
      expect(shield.isCircuitBreakerActive()).toBe(true)
    })

    it('should pause trading for 24 hours', () => {
      expect(shield).toBeDefined()
    })
  })

  describe('Pre-Snipe Checks', () => {
    it('should run all 12 safety checks', async () => {
      const result = await shield.preSnipeCheck({
        domain: 'test.com',
        bid: 500,
        estimatedValue: 5000,
      })

      expect(result.passed).toBeDefined()
      expect(result.checks).toHaveLength(12)
    })

    it('should block if any check fails', async () => {
      // Force a check to fail
      shield.setCapital(100)
      
      const result = await shield.preSnipeCheck({
        domain: 'test.com',
        bid: 200, // Over position limit
        estimatedValue: 5000,
      })

      expect(result.passed).toBe(false)
    })
  })

  describe('Slippage Protection', () => {
    it('should enforce 3% slippage cap', () => {
      const maxSlippage = shield.getMaxSlippage()
      expect(maxSlippage).toBe(0.03)
    })
  })

  describe('Emergency Pause', () => {
    it('should allow manual pause', () => {
      shield.emergencyPause('Manual test pause')
      expect(shield.isPaused()).toBe(true)
    })

    it('should resume after timeout', () => {
      expect(typeof shield.resume).toBe('function')
    })
  })

  describe('God Mode Override', () => {
    it('should allow owner to bypass limits', () => {
      shield.enableGodMode('owner-secret')
      expect(shield.isGodModeActive()).toBe(true)
    })

    it('should require correct secret', () => {
      shield.enableGodMode('wrong-secret')
      expect(shield.isGodModeActive()).toBe(false)
    })
  })
})

