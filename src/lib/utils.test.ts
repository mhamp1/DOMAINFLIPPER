import { describe, it, expect } from 'vitest'
import { formatCurrency, formatNumber, formatPercentage, generateId, sleep } from './utils'

describe('Utils', () => {
  describe('formatCurrency', () => {
    it('should format positive numbers as currency', () => {
      expect(formatCurrency(1000)).toBe('$1,000')
      expect(formatCurrency(1234567)).toBe('$1,234,567')
    })

    it('should format zero', () => {
      expect(formatCurrency(0)).toBe('$0')
    })

    it('should format negative numbers', () => {
      expect(formatCurrency(-500)).toBe('-$500')
    })
  })

  describe('formatNumber', () => {
    it('should format numbers with commas', () => {
      expect(formatNumber(1000)).toBe('1,000')
      expect(formatNumber(1234567)).toBe('1,234,567')
    })
  })

  describe('formatPercentage', () => {
    it('should format percentages with 2 decimal places', () => {
      expect(formatPercentage(50.5)).toBe('50.50%')
      expect(formatPercentage(100)).toBe('100.00%')
    })
  })

  describe('generateId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateId()
      const id2 = generateId()
      expect(id1).not.toBe(id2)
    })

    it('should return a string', () => {
      expect(typeof generateId()).toBe('string')
    })
  })

  describe('sleep', () => {
    it('should wait for specified milliseconds', async () => {
      const start = Date.now()
      await sleep(100)
      const elapsed = Date.now() - start
      expect(elapsed).toBeGreaterThanOrEqual(90) // Allow some tolerance
    })
  })
})
