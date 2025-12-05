/**
 * Rate Limiter
 * Prevents API spam and ensures we stay within rate limits
 * Hardwired for 90%+ success rate
 */

interface RateLimitConfig {
  maxRequests: number
  windowMs: number
  retryAfter?: number
}

class RateLimiter {
  private requests: Map<string, number[]> = new Map()
  private configs: Map<string, RateLimitConfig> = new Map()

  /**
   * Register a rate limit configuration
   */
  register(key: string, config: RateLimitConfig) {
    this.configs.set(key, config)
  }

  /**
   * Check if request is allowed
   */
  async checkLimit(key: string): Promise<boolean> {
    const config = this.configs.get(key)
    if (!config) return true // No limit configured

    const now = Date.now()
    const requests = this.requests.get(key) || []
    
    // Remove old requests outside window
    const validRequests = requests.filter(time => now - time < config.windowMs)
    
    // Check if we're at limit
    if (validRequests.length >= config.maxRequests) {
      const oldestRequest = Math.min(...validRequests)
      const waitTime = config.windowMs - (now - oldestRequest)
      
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime))
        return this.checkLimit(key) // Retry after waiting
      }
    }

    // Record this request
    validRequests.push(now)
    this.requests.set(key, validRequests)
    
    return true
  }

  /**
   * Wait if needed to respect rate limit
   */
  async waitIfNeeded(key: string) {
    await this.checkLimit(key)
  }

  /**
   * Clear rate limit history
   */
  clear(key?: string) {
    if (key) {
      this.requests.delete(key)
    } else {
      this.requests.clear()
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

