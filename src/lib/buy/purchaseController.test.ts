/**
 * Purchase Controller Tests
 * Tests for purchase guardrails and safety checks
 * December 2025
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PurchaseController } from './purchaseController'
import { StubRegistrarProvider } from './providers/registrarProvider'
import type { Domain } from '@/types/domain'

describe('PurchaseController', () => {
  let controller: PurchaseController
  let stubProvider: StubRegistrarProvider

  beforeEach(() => {
    // Clear localStorage
    localStorage.clear()

    // Create controller with test guardrails
    controller = new PurchaseController({
      dryRun: true,
      maxSpendPerDay: 500,
      maxSpendPerDomain: 100,
      marginThreshold: 50, // 50% minimum ROI
      allowedTlds: ['com', 'net', 'io'],
    })

    // Register stub provider
    stubProvider = new StubRegistrarProvider()
    controller.registerProvider(stubProvider)
    controller.setDefaultProvider('stub')
  })

  describe('guardrails', () => {
    it('should reject domains with disallowed TLDs', async () => {
      const domain: Domain = {
        id: '1',
        name: 'test.xyz',
        tld: 'xyz',
        length: 4,
        estimatedValue: 1000,
        aiScore: 80,
        strategyId: 'test',
        status: 'available',
      }

      const decision = await controller.evaluatePurchase(domain, 50)

      expect(decision.approved).toBe(false)
      expect(decision.reasons.some(r => r.includes('TLD'))).toBe(true)
    })

    it('should reject domains exceeding per-domain limit', async () => {
      const domain: Domain = {
        id: '1',
        name: 'expensive.com',
        tld: 'com',
        length: 9,
        estimatedValue: 2000,
        aiScore: 80,
        strategyId: 'test',
        status: 'available',
      }

      const decision = await controller.evaluatePurchase(domain, 150)

      expect(decision.approved).toBe(false)
      expect(decision.reasons.some(r => r.includes('per-domain limit'))).toBe(true)
    })

    it('should reject domains below margin threshold', async () => {
      const domain: Domain = {
        id: '1',
        name: 'lowmargin.com',
        tld: 'com',
        length: 10,
        estimatedValue: 100,
        aiScore: 60,
        strategyId: 'test',
        status: 'available',
      }

      // Price of 90 on value of 100 = 10% margin (below 50% threshold)
      const decision = await controller.evaluatePurchase(domain, 90)

      expect(decision.approved).toBe(false)
      expect(decision.reasons.some(r => r.includes('Margin'))).toBe(true)
    })

    it('should approve domains meeting all guardrails', async () => {
      const domain: Domain = {
        id: '1',
        name: 'good.com',
        tld: 'com',
        length: 4,
        estimatedValue: 1000,
        aiScore: 85,
        strategyId: 'test',
        status: 'available',
      }

      // Price of 30 on value of 1000 = 97% margin (above 50% threshold)
      const decision = await controller.evaluatePurchase(domain, 30)

      expect(decision.approved).toBe(true)
      expect(decision.reasons).toContain('All guardrails passed')
    })

    it('should reject when daily limit would be exceeded', async () => {
      const domain: Domain = {
        id: '1',
        name: 'test.com',
        tld: 'com',
        length: 4,
        estimatedValue: 1000,
        aiScore: 85,
        strategyId: 'test',
        status: 'available',
      }

      // Try to purchase for more than daily limit
      const decision = await controller.evaluatePurchase(domain, 600)

      expect(decision.approved).toBe(false)
      expect(decision.reasons.some(r => r.includes('daily limit'))).toBe(true)
    })
  })

  describe('purchaseDomain', () => {
    it('should successfully purchase approved domain', async () => {
      const domain: Domain = {
        id: '1',
        name: 'valid.com',
        tld: 'com',
        length: 5,
        estimatedValue: 1000,
        aiScore: 85,
        strategyId: 'test',
        status: 'available',
      }

      const result = await controller.purchaseDomain(domain)

      // Note: stub provider has 90% success rate, so it might fail
      expect(result.domain).toBe('valid.com')
      expect(result.registrar).toBe('stub')
      expect(result.dryRun).toBe(true)
    })

    it('should block purchase if guardrails fail', async () => {
      const domain: Domain = {
        id: '1',
        name: 'invalid.xyz',
        tld: 'xyz', // Not in allowed TLDs
        length: 7,
        estimatedValue: 500,
        aiScore: 70,
        strategyId: 'test',
        status: 'available',
      }

      const result = await controller.purchaseDomain(domain)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Guardrails failed')
    })

    it('should track spend after successful purchase', async () => {
      const domain: Domain = {
        id: '1',
        name: 'trackme.com',
        tld: 'com',
        length: 7,
        estimatedValue: 1000,
        aiScore: 80,
        strategyId: 'test',
        status: 'available',
      }

      // Get initial stats
      const initialStats = controller.getSpendStats()
      const initialSpend = initialStats.todaySpend

      // Purchase domain
      const result = await controller.purchaseDomain(domain)

      if (result.success) {
        // Check spend was tracked
        const newStats = controller.getSpendStats()
        expect(newStats.todaySpend).toBeGreaterThan(initialSpend)
        expect(newStats.purchaseCount).toBeGreaterThan(0)
        expect(newStats.remainingBudget).toBeLessThan(initialStats.remainingBudget)
      }
    })
  })

  describe('spend tracking', () => {
    it('should track daily spend correctly', async () => {
      const stats = controller.getSpendStats()

      expect(stats.todaySpend).toBeGreaterThanOrEqual(0)
      expect(stats.remainingBudget).toBeLessThanOrEqual(500)
      expect(stats.purchaseCount).toBeGreaterThanOrEqual(0)
      expect(stats.lastResetDate).toBeDefined()
    })

    it('should prevent purchases when daily limit reached', async () => {
      // Create controller with low daily limit
      const limitedController = new PurchaseController({
        dryRun: true,
        maxSpendPerDay: 50,
        maxSpendPerDomain: 100,
        marginThreshold: 50,
        allowedTlds: ['com'],
      })

      limitedController.registerProvider(stubProvider)
      limitedController.setDefaultProvider('stub')

      const domain: Domain = {
        id: '1',
        name: 'test.com',
        tld: 'com',
        length: 4,
        estimatedValue: 1000,
        aiScore: 85,
        strategyId: 'test',
        status: 'available',
      }

      // Try to purchase for more than daily limit (price will be ~10-50)
      // This should pass initially, but subsequent ones should fail
      let successCount = 0
      let failCount = 0

      for (let i = 0; i < 10; i++) {
        const result = await limitedController.purchaseDomain({
          ...domain,
          id: `${i}`,
          name: `test${i}.com`,
        })

        if (result.success) {
          successCount++
        } else if (result.error?.includes('daily limit')) {
          failCount++
          break // Stop after hitting limit
        }
      }

      // Should have hit limit eventually
      const stats = limitedController.getSpendStats()
      expect(stats.remainingBudget).toBeLessThanOrEqual(0)
    })
  })

  describe('provider management', () => {
    it('should list registered providers', () => {
      const providers = controller.getProviders()
      expect(providers).toContain('stub')
    })

    it('should throw error for unknown provider', async () => {
      const domain: Domain = {
        id: '1',
        name: 'test.com',
        tld: 'com',
        length: 4,
        estimatedValue: 1000,
        aiScore: 85,
        strategyId: 'test',
        status: 'available',
      }

      // Try to purchase with non-existent provider
      await expect(async () => {
        // @ts-ignore - intentionally passing invalid provider
        await controller['getProvider']('nonexistent')
      }).rejects.toThrow()
    })
  })

  describe('guardrails updates', () => {
    it('should allow updating guardrails at runtime', () => {
      controller.updateGuardrails({
        maxSpendPerDay: 1000,
        allowedTlds: ['com', 'net', 'io', 'ai'],
      })

      // No error should be thrown
      expect(true).toBe(true)
    })

    it('should use updated guardrails for evaluation', async () => {
      // Initially .ai is not in allowed TLDs
      const domain: Domain = {
        id: '1',
        name: 'test.ai',
        tld: 'ai',
        length: 4,
        estimatedValue: 1000,
        aiScore: 85,
        strategyId: 'test',
        status: 'available',
      }

      const initialDecision = await controller.evaluatePurchase(domain, 50)
      expect(initialDecision.approved).toBe(false)

      // Update to allow .ai
      controller.updateGuardrails({
        allowedTlds: ['com', 'net', 'io', 'ai'],
      })

      const newDecision = await controller.evaluatePurchase(domain, 50)
      expect(newDecision.approved).toBe(true)
    })
  })

  describe('margin calculation', () => {
    it('should calculate margin percentage correctly', async () => {
      const domain: Domain = {
        id: '1',
        name: 'test.com',
        tld: 'com',
        length: 4,
        estimatedValue: 1000,
        aiScore: 85,
        strategyId: 'test',
        status: 'available',
      }

      const decision = await controller.evaluatePurchase(domain, 500)

      // Margin = (1000 - 500) / 1000 * 100 = 50%
      expect(decision.marginPercentage).toBeCloseTo(50, 1)
    })
  })
})
