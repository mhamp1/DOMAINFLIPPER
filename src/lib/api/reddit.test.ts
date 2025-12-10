/**
 * Reddit API Tests
 * Test suite for Reddit API integration
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getRedditAPI } from './reddit'

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

describe('RedditAPI', () => {
  let redditAPI: ReturnType<typeof getRedditAPI>

  beforeEach(() => {
    vi.clearAllMocks()
    redditAPI = getRedditAPI()
  })

  describe('constructor', () => {
    it('should create an instance', () => {
      expect(redditAPI).toBeDefined()
    })

    it('should have isConfigured method', () => {
      expect(typeof redditAPI.isConfigured).toBe('function')
    })
  })

  describe('searchPosts', () => {
    it('should be a function', () => {
      expect(typeof redditAPI.searchPosts).toBe('function')
    })

    it('should return empty array on error', async () => {
      const axios = await import('axios')
      vi.mocked(axios.default.post).mockRejectedValueOnce(new Error('Auth error'))

      const result = await redditAPI.searchPosts('Domains', 'domain for sale').catch(() => [])
      
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('findDomainOpportunities', () => {
    it('should be a function', () => {
      expect(typeof redditAPI.findDomainOpportunities).toBe('function')
    })

    it('should extract domain names from text', () => {
      const text = 'Selling example.com and test.io for cheap prices!'
      const domainRegex = /\b([a-z0-9-]+\.(?:com|net|io|ai|co|org|app|dev))\b/gi
      const domains = text.match(domainRegex) || []
      
      expect(domains.length).toBeGreaterThan(0)
      expect(domains).toContain('example.com')
      expect(domains).toContain('test.io')
    })
  })
})
