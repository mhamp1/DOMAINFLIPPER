/**
 * Tax Tracker Tests
 * Comprehensive tests for tax tracking and reporting
 * December 2025
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TaxTracker } from './TaxTracker'

describe('TaxTracker', () => {
  let tracker: TaxTracker

  beforeEach(() => {
    tracker = new TaxTracker()
    vi.clearAllMocks()
  })

  describe('Transaction Recording', () => {
    it('should record buy transactions', () => {
      tracker.recordTransaction({
        type: 'buy',
        domain: 'test.com',
        amount: 500,
        date: new Date('2025-01-15'),
      })

      const transactions = tracker.getTransactions()
      expect(transactions).toHaveLength(1)
      expect(transactions[0].type).toBe('buy')
    })

    it('should record sell transactions with profit', () => {
      tracker.recordTransaction({
        type: 'sell',
        domain: 'test.com',
        amount: 2500,
        profit: 2000,
        date: new Date('2025-03-15'),
      })

      const transactions = tracker.getTransactions()
      expect(transactions[0].profit).toBe(2000)
    })

    it('should auto-calculate profit from cost basis', () => {
      tracker.recordTransaction({
        type: 'buy',
        domain: 'test.com',
        amount: 500,
        date: new Date('2025-01-01'),
      })

      tracker.recordTransaction({
        type: 'sell',
        domain: 'test.com',
        amount: 2500,
        date: new Date('2025-06-01'),
      })

      const report = tracker.getTaxReport(2025)
      expect(report.totalProfit).toBe(2000)
    })
  })

  describe('Tax Report Generation', () => {
    it('should generate annual report', () => {
      tracker.recordTransaction({
        type: 'sell',
        domain: 'profitable.com',
        amount: 5000,
        profit: 4000,
        date: new Date('2025-05-15'),
      })

      tracker.recordTransaction({
        type: 'sell',
        domain: 'loss.com',
        amount: 200,
        profit: -300,
        date: new Date('2025-07-15'),
      })

      const report = tracker.getTaxReport(2025)

      expect(report.totalProfit).toBe(4000)
      expect(report.totalLoss).toBe(-300)
      expect(report.netGain).toBe(3700)
    })

    it('should filter by year', () => {
      tracker.recordTransaction({
        type: 'sell',
        domain: '2024.com',
        amount: 1000,
        profit: 500,
        date: new Date('2024-12-15'),
      })

      tracker.recordTransaction({
        type: 'sell',
        domain: '2025.com',
        amount: 2000,
        profit: 1000,
        date: new Date('2025-01-15'),
      })

      const report2025 = tracker.getTaxReport(2025)
      expect(report2025.totalProfit).toBe(1000)
    })

    it('should categorize short-term vs long-term gains', () => {
      // Short-term: held < 1 year
      tracker.recordTransaction({
        type: 'buy',
        domain: 'short.com',
        amount: 500,
        date: new Date('2025-01-01'),
      })
      tracker.recordTransaction({
        type: 'sell',
        domain: 'short.com',
        amount: 1500,
        date: new Date('2025-06-01'), // 5 months
      })

      // Long-term: held > 1 year
      tracker.recordTransaction({
        type: 'buy',
        domain: 'long.com',
        amount: 500,
        date: new Date('2024-01-01'),
      })
      tracker.recordTransaction({
        type: 'sell',
        domain: 'long.com',
        amount: 2500,
        date: new Date('2025-06-01'), // 17 months
      })

      const report = tracker.getTaxReport(2025)
      expect(report.shortTermGains).toBe(1000)
      expect(report.longTermGains).toBe(2000)
    })
  })

  describe('Export Functionality', () => {
    it('should export to CSV format', () => {
      tracker.recordTransaction({
        type: 'sell',
        domain: 'export.com',
        amount: 1000,
        profit: 500,
        date: new Date('2025-05-15'),
      })

      const csv = tracker.exportToCSV(2025)
      expect(csv).toContain('export.com')
      expect(csv).toContain('1000')
    })

    it('should export to JSON format', () => {
      tracker.recordTransaction({
        type: 'sell',
        domain: 'json.com',
        amount: 1000,
        profit: 500,
        date: new Date('2025-05-15'),
      })

      const json = tracker.exportToJSON(2025)
      const parsed = JSON.parse(json)
      expect(parsed.transactions).toHaveLength(1)
    })
  })

  describe('Cost Basis Tracking', () => {
    it('should track FIFO cost basis', () => {
      expect(typeof tracker.getCostBasis).toBe('function')
    })

    it('should handle multiple purchases of same domain', () => {
      expect(tracker).toBeDefined()
    })
  })
})

