import { describe, it, expect, beforeEach } from 'vitest'
import { rateLimiter } from './rateLimiter'

describe('RateLimiter', () => {
  beforeEach(() => {
    // Clear any existing rate limit tracking
    rateLimiter.clear()
  })

  describe('register', () => {
    it('should register a rate limit configuration', () => {
      expect(() => {
        rateLimiter.register('test-api', {
          maxRequests: 10,
          windowMs: 1000,
        })
      }).not.toThrow()
    })
  })

  describe('checkLimit', () => {
    it('should allow requests within limit', async () => {
      rateLimiter.register('test', {
        maxRequests: 5,
        windowMs: 1000,
      })

      for (let i = 0; i < 5; i++) {
        const allowed = await rateLimiter.checkLimit('test')
        expect(allowed).toBe(true)
      }
    })

    it('should return true for unregistered keys', async () => {
      const allowed = await rateLimiter.checkLimit('unknown-key-xyz')
      expect(allowed).toBe(true)
    })
  })

  describe('waitIfNeeded', () => {
    it('should not wait if within limit', async () => {
      rateLimiter.register('fast', {
        maxRequests: 10,
        windowMs: 1000,
      })

      const start = Date.now()
      await rateLimiter.waitIfNeeded('fast')
      const elapsed = Date.now() - start

      expect(elapsed).toBeLessThan(100) // Should be nearly instant
    })
  })

  describe('clear', () => {
    it('should clear rate limit tracking', async () => {
      rateLimiter.register('clear-test', {
        maxRequests: 2,
        windowMs: 1000,
      })

      // Make 2 requests
      await rateLimiter.checkLimit('clear-test')
      await rateLimiter.checkLimit('clear-test')
      
      // Clear and check we can make more requests
      rateLimiter.clear('clear-test')
      
      const allowed = await rateLimiter.checkLimit('clear-test')
      expect(allowed).toBe(true)
    })
  })
})
