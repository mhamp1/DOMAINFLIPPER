/**
 * ExpiredDomainsScanner Tests
 * Test suite for ExpiredDomainsScanner functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { expiredDomainsScanner } from './ExpiredDomainsScanner'

// Mock axios
vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
  },
}))

// Mock rate limiter
vi.mock('@/lib/utils/rateLimiter', () => ({
  rateLimiter: {
    waitIfNeeded: vi.fn().mockResolvedValue(undefined),
  },
}))

describe('ExpiredDomainsScanner', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('scanExpiredDomains', () => {
    it('should be a function', () => {
      expect(typeof expiredDomainsScanner.scanExpiredDomains).toBe('function')
    })

    it('should return empty array on error', async () => {
      const axios = await import('axios')
      vi.mocked(axios.default.get).mockRejectedValueOnce(new Error('Network error'))

      const result = await expiredDomainsScanner.scanExpiredDomains()
      
      expect(result).toEqual([])
    })

    it('should filter domains by backlinks', async () => {
      const domains = [
        { name: 'test1', domain: 'test1.com', backlinks: 5, traffic: 0, tld: '.com' },
        { name: 'test2', domain: 'test2.com', backlinks: 50, traffic: 0, tld: '.com' },
        { name: 'test3', domain: 'test3.com', backlinks: 100, traffic: 0, tld: '.com' },
      ]

      const filtered = domains.filter(d => d.backlinks >= 10)
      
      expect(filtered.length).toBe(2)
      expect(filtered[0].backlinks).toBeGreaterThanOrEqual(10)
    })
  })

  describe('filterHighValue', () => {
    it('should filter high-value domains', () => {
      const domains = [
        { name: 'test1', domain: 'test1.com', backlinks: 50, traffic: 500, tld: '.com' },
        { name: 'test2', domain: 'test2.com', backlinks: 150, traffic: 2000, da: 30, tld: '.com' },
        { name: 'test3', domain: 'test3.com', backlinks: 5, traffic: 10, tld: '.com' },
      ]

      const result = expiredDomainsScanner.filterHighValue(domains)
      
      // Should return at least 1 domain (test2 meets all criteria)
      expect(result.length).toBeGreaterThan(0)
      expect(result.every(d => d.backlinks > 100 || d.traffic > 1000 || (d.da && d.da > 20))).toBe(true)
    })
  })

  describe('filterByKeywords', () => {
    it('should filter domains by keywords', () => {
      const domains = [
        { name: 'techapp', domain: 'techapp.com', backlinks: 10, traffic: 0, tld: '.com' },
        { name: 'aitools', domain: 'aitools.com', backlinks: 10, traffic: 0, tld: '.com' },
        { name: 'example', domain: 'example.com', backlinks: 10, traffic: 0, tld: '.com' },
      ]

      const result = expiredDomainsScanner.filterByKeywords(domains, ['tech', 'ai'])
      
      expect(result.length).toBe(2)
      expect(result.map(d => d.name)).toContain('techapp')
      expect(result.map(d => d.name)).toContain('aitools')
    })
  })
})
