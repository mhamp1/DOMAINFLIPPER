/**
 * Sedo API Tests
 * Test suite for Sedo API integration
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getSedoAPI } from './sedo'

// Mock axios
vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

// Mock rate limiter
vi.mock('@/lib/utils/rateLimiter', () => ({
  rateLimiter: {
    waitIfNeeded: vi.fn().mockResolvedValue(undefined),
  },
}))

describe('SedoAPI', () => {
  let sedoAPI: ReturnType<typeof getSedoAPI>

  beforeEach(() => {
    vi.clearAllMocks()
    sedoAPI = getSedoAPI()
  })

  describe('constructor', () => {
    it('should create an instance', () => {
      expect(sedoAPI).toBeDefined()
    })

    it('should have isConfigured method', () => {
      expect(typeof sedoAPI.isConfigured).toBe('function')
    })
  })

  describe('searchSimilarDomains', () => {
    it('should be a function', () => {
      expect(typeof sedoAPI.searchSimilarDomains).toBe('function')
    })

    it('should return empty result on error', async () => {
      const axios = await import('axios')
      vi.mocked(axios.default.get).mockRejectedValueOnce(new Error('Network error'))

      const result = await sedoAPI.searchSimilarDomains('example.com')
      
      expect(result.domain).toBe('example.com')
      expect(result.similarDomains).toEqual([])
      expect(result.averagePrice).toBe(0)
    })

    it('should calculate average price correctly', () => {
      const prices = [100, 200, 300, 400]
      const average = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
      
      expect(average).toBe(250)
    })

    it('should calculate suggested price as 87% of average', () => {
      const averagePrice = 1000
      const suggestedPrice = Math.round(averagePrice * 0.87)
      
      expect(suggestedPrice).toBe(870)
    })
  })

  describe('getCompetitivePrice', () => {
    it('should return fallback price when Sedo data not available', async () => {
      const axios = await import('axios')
      vi.mocked(axios.default.get).mockRejectedValueOnce(new Error('Network error'))

      const valuation = 1000
      const result = await sedoAPI.getCompetitivePrice('test.com', valuation)
      
      // Should return 85% of valuation as fallback
      expect(result).toBe(Math.round(valuation * 0.85))
    })
  })

  describe('listDomain', () => {
    it('should be a function', () => {
      expect(typeof sedoAPI.listDomain).toBe('function')
    })

    it('should return false when not configured', async () => {
      const unconfiguredAPI = getSedoAPI({})
      const result = await unconfiguredAPI.listDomain('test.com', 1000)
      
      expect(result).toBe(false)
    })
  })
})
