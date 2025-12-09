/**
 * Rate Limiter — Enhanced Production Version
 * Prevents API spam and ensures we stay within rate limits
 * With backoff, debouncing, and metrics integration
 * December 2025
 */

import { logger } from './logger'

interface RateLimitConfig {
  maxRequests: number
  windowMs: number
  retryAfter?: number
  burstLimit?: number  // Allow short bursts
  backoffMultiplier?: number  // Exponential backoff
}

interface RateLimitStats {
  totalRequests: number
  throttledRequests: number
  avgWaitTime: number
  lastRequest?: Date
}

class RateLimiter {
  private requests: Map<string, number[]> = new Map()
  private configs: Map<string, RateLimitConfig> = new Map()
  private stats: Map<string, RateLimitStats> = new Map()
  private debounceTimers: Map<string, ReturnType<typeof setTimeout>> = new Map()
  private backoffCounts: Map<string, number> = new Map()

  /**
   * Register a rate limit configuration
   */
  register(key: string, config: RateLimitConfig) {
    this.configs.set(key, {
      burstLimit: config.maxRequests,
      backoffMultiplier: 2,
      ...config,
    })
    this.stats.set(key, {
      totalRequests: 0,
      throttledRequests: 0,
      avgWaitTime: 0,
    })
  }

  /**
   * Check if request is allowed with enhanced backoff
   */
  async checkLimit(key: string): Promise<boolean> {
    const config = this.configs.get(key)
    if (!config) return true // No limit configured

    const stats = this.stats.get(key)!
    stats.totalRequests++

    const now = Date.now()
    const requests = this.requests.get(key) || []
    
    // Remove old requests outside window
    const validRequests = requests.filter(time => now - time < config.windowMs)
    
    // Check if we're at limit
    if (validRequests.length >= config.maxRequests) {
      stats.throttledRequests++
      
      const oldestRequest = Math.min(...validRequests)
      let waitTime = config.windowMs - (now - oldestRequest)
      
      // Apply exponential backoff if repeated throttling
      const backoffCount = this.backoffCounts.get(key) || 0
      if (backoffCount > 0 && config.backoffMultiplier) {
        waitTime *= Math.pow(config.backoffMultiplier, Math.min(backoffCount, 5))
      }
      
      if (waitTime > 0) {
        logger.debug('RATE_LIMIT', `Throttled ${key}: waiting ${waitTime}ms`, {
          backoff: backoffCount,
          queueLength: validRequests.length,
        })
        
        this.backoffCounts.set(key, backoffCount + 1)
        stats.avgWaitTime = (stats.avgWaitTime + waitTime) / 2
        
        await new Promise(resolve => setTimeout(resolve, waitTime))
        return this.checkLimit(key) // Retry after waiting
      }
    } else {
      // Reset backoff on successful request
      this.backoffCounts.set(key, 0)
    }

    // Record this request
    validRequests.push(now)
    this.requests.set(key, validRequests)
    stats.lastRequest = new Date()
    
    return true
  }

  /**
   * Wait if needed to respect rate limit
   */
  async waitIfNeeded(key: string) {
    await this.checkLimit(key)
  }

  /**
   * Debounced request - combines rapid requests into one
   */
  async debounce<T>(key: string, fn: () => Promise<T>, delayMs: number = 100): Promise<T> {
    return new Promise((resolve, reject) => {
      // Clear existing timer
      const existing = this.debounceTimers.get(key)
      if (existing) clearTimeout(existing)
      
      // Set new timer
      const timer = setTimeout(async () => {
        try {
          await this.checkLimit(key)
          const result = await fn()
          resolve(result)
        } catch (error) {
          reject(error)
        } finally {
          this.debounceTimers.delete(key)
        }
      }, delayMs)
      
      this.debounceTimers.set(key, timer)
    })
  }

  /**
   * Get stats for a rate limiter
   */
  getStats(key: string): RateLimitStats | undefined {
    return this.stats.get(key)
  }

  /**
   * Get all stats
   */
  getAllStats(): Map<string, RateLimitStats> {
    return new Map(this.stats)
  }

  /**
   * Get current usage percentage
   */
  getUsage(key: string): number {
    const config = this.configs.get(key)
    if (!config) return 0

    const now = Date.now()
    const requests = this.requests.get(key) || []
    const validRequests = requests.filter(time => now - time < config.windowMs)
    
    return (validRequests.length / config.maxRequests) * 100
  }

  /**
   * Check if near limit (>80%)
   */
  isNearLimit(key: string): boolean {
    return this.getUsage(key) > 80
  }

  /**
   * Clear rate limit history
   */
  clear(key?: string) {
    if (key) {
      this.requests.delete(key)
      this.backoffCounts.delete(key)
    } else {
      this.requests.clear()
      this.backoffCounts.clear()
    }
  }

  /**
   * Reset stats
   */
  resetStats(key?: string) {
    if (key) {
      this.stats.set(key, {
        totalRequests: 0,
        throttledRequests: 0,
        avgWaitTime: 0,
      })
    } else {
      for (const k of this.stats.keys()) {
        this.stats.set(k, {
          totalRequests: 0,
          throttledRequests: 0,
          avgWaitTime: 0,
        })
      }
    }
  }
}

// Pre-configured rate limiters for each API
export const rateLimiter = new RateLimiter()

// GoDaddy: 100 calls/min
rateLimiter.register('godaddy', {
  maxRequests: 100,
  windowMs: 60 * 1000, // 1 minute
})

// Namecheap: 100 calls/min
rateLimiter.register('namecheap', {
  maxRequests: 100,
  windowMs: 60 * 1000,
})

// DropCatch: 1000 calls/day
rateLimiter.register('dropcatch', {
  maxRequests: 1000,
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
})

// USPTO: 1000 calls/day
rateLimiter.register('uspto', {
  maxRequests: 1000,
  windowMs: 24 * 60 * 60 * 1000,
})

// ExpiredDomains.net (Apify): 1000 calls/day
rateLimiter.register('expireddomains', {
  maxRequests: 1000,
  windowMs: 24 * 60 * 60 * 1000,
})

// Twitter/X API v2: 1500 calls/month free tier (50/day average)
// Basic $100/mo: 10,000 calls/month (333/day average)
rateLimiter.register('twitter', {
  maxRequests: 50,
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
})

