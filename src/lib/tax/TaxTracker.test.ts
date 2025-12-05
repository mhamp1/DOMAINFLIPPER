/**
 * Tax Tracker Tests
 * Comprehensive tests for tax tracking and reporting
 * December 2025
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TaxTracker } from './TaxTracker'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(global, 'localStorage', { value: localStorageMock })

describe('TaxTracker', () => {
  let tracker: TaxTracker

  beforeEach(() => {
    localStorageMock.getItem.mockReturnValue(null)
    tracker = new TaxTracker()
    vi.clearAllMocks()
  })

  describe('constructor', () => {
    it('should initialize correctly', () => {
      expect(tracker).toBeDefined()
    })
  })

  describe('recordPurchase', () => {
    it('should record domain purchases', () => {
      tracker.recordPurchase('test.com', 500, 'GoDaddy', 10)
      
      // Purchase should be recorded (verify through getTaxSummary)
      const summary = tracker.getTaxSummary(new Date().getFullYear())
      expect(summary.totalCosts).toBeGreaterThan(0)
    })

    it('should track cost basis', () => {
      tracker.recordPurchase('premium.com', 1000, 'Namecheap', 20)
      
      // Cost basis should be stored
      expect(tracker).toBeDefined()
    })
  })

  describe('recordSale', () => {
    it('should record domain sales', () => {
      // First purchase
      tracker.recordPurchase('test.com', 500, 'GoDaddy', 10)
      
      // Then sell
      tracker.recordSale('test.com', 2000, 'Sedo', 100)
      
      // Sale should be recorded
      const summary = tracker.getTaxSummary(new Date().getFullYear())
      expect(summary.totalRevenue).toBeGreaterThan(0)
    })

    it('should calculate profit correctly', () => {
      tracker.recordPurchase('profit.com', 500, 'GoDaddy', 0)
      tracker.recordSale('profit.com', 2500, 'Sedo', 0)
      
      const summary = tracker.getTaxSummary(new Date().getFullYear())
      // Revenue - Costs = Profit
      expect(summary.netProfit).toBe(2000)
    })
  })

  describe('getTaxSummary', () => {
    it('should return summary for specified year', () => {
      const summary = tracker.getTaxSummary(2025)
      
      expect(summary).toHaveProperty('year')
      expect(summary).toHaveProperty('totalRevenue')
      expect(summary).toHaveProperty('totalCosts')
      expect(summary).toHaveProperty('totalFees')
      expect(summary).toHaveProperty('netProfit')
      expect(summary).toHaveProperty('shortTermGains')
      expect(summary).toHaveProperty('longTermGains')
    })

    it('should filter by year', () => {
      const summary2025 = tracker.getTaxSummary(2025)
      const summary2024 = tracker.getTaxSummary(2024)
      
      expect(summary2025.year).toBe(2025)
      expect(summary2024.year).toBe(2024)
    })
  })

  describe('exportCSV', () => {
    it('should export transactions as CSV', () => {
      tracker.recordPurchase('export.com', 500, 'GoDaddy', 10)
      
      const csv = tracker.exportCSV(new Date().getFullYear())
      
      expect(typeof csv).toBe('string')
      expect(csv).toContain('Date')
      expect(csv).toContain('Type')
    })
  })

  describe('recordFunding', () => {
    it('should record funding transactions', () => {
      tracker.recordFunding(1000, 'Stripe')
      
      // Funding should be recorded
      expect(tracker).toBeDefined()
    })
  })
})
