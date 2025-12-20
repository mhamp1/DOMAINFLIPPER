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

    it('should return empty array when disabled', async () => {
      const result = await redditAPI.searchPosts('test query')
      
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBe(0)
    })
  })

  describe('disabled methods', () => {
    it('should return false for isConfigured', () => {
      expect(redditAPI.isConfigured()).toBe(false)
    })

    it('should return empty array for getSubredditPosts', async () => {
      const result = await redditAPI.getSubredditPosts('test')
      expect(result).toEqual([])
    })

    it('should return empty array for getTrendingTopics', async () => {
      const result = await redditAPI.getTrendingTopics()
      expect(result).toEqual([])
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
