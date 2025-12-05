/**
 * apiWrapper.ts — Production API Call Wrapper
 * Handles retries, logging, rate limiting, and error handling
 * December 2025
 */

import { logger } from './logger'
import { retry, type RetryOptions } from './retry'
import { rateLimiter } from './rateLimiter'

export interface APIResponse<T> {
  success: boolean
  data?: T
  error?: string
  statusCode?: number
  retries?: number
}

export interface APICallOptions extends RetryOptions {
  service: string  // e.g., 'godaddy', 'namecheap'
  action: string   // e.g., 'searchAuctions', 'placeBid'
  rateLimit?: boolean
  timeout?: number
}

/**
 * Wrapper for all external API calls
 * Provides consistent error handling, retries, and logging
 */
export async function apiCall<T>(
  fn: () => Promise<T>,
  options: APICallOptions
): Promise<APIResponse<T>> {
  const { service, action, rateLimit = true, timeout = 30000, ...retryOptions } = options
  const startTime = Date.now()
  let attempts = 0

  try {
    // Wait for rate limiter if enabled
    if (rateLimit) {
      await rateLimiter.waitIfNeeded(service)
    }

    // Execute with retry logic
    const data = await retry(async () => {
      attempts++
      
      // Add timeout wrapper
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Request timeout after ${timeout}ms`)), timeout)
      })

      return Promise.race([fn(), timeoutPromise])
    }, {
      maxRetries: retryOptions.maxRetries ?? 3,
      initialDelay: retryOptions.initialDelay ?? 1000,
      maxDelay: retryOptions.maxDelay ?? 10000,
      backoffFactor: retryOptions.backoffFactor ?? 2,
      retryable: (error) => {
        const status = error?.response?.status || error?.status
        // Retry on rate limit, server errors, or network errors
        return status === 429 || 
               status === 500 || 
               status === 502 || 
               status === 503 || 
               status === 504 ||
               error?.code === 'ECONNRESET' ||
               error?.code === 'ETIMEDOUT' ||
               error?.message?.includes('timeout')
      },
    })

    const duration = Date.now() - startTime
    logger.api(`${service}.${action} completed`, { duration: `${duration}ms`, attempts })

    return {
      success: true,
      data,
      retries: attempts - 1,
    }

  } catch (error: any) {
    const duration = Date.now() - startTime
    const statusCode = error?.response?.status || error?.status

    logger.apiError(`${service}.${action}`, error, {
      duration: `${duration}ms`,
      attempts,
      statusCode,
      message: error.message,
    })

    return {
      success: false,
      error: error.message || 'Unknown error',
      statusCode,
      retries: attempts - 1,
    }
  }
}

/**
 * Batch API calls with concurrency control
 */
export async function batchApiCall<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  options: {
    service: string
    action: string
    concurrency?: number
    continueOnError?: boolean
  }
): Promise<{ results: R[]; errors: Array<{ item: T; error: string }> }> {
  const { service, action, concurrency = 5, continueOnError = true } = options
  const results: R[] = []
  const errors: Array<{ item: T; error: string }> = []

  logger.info('BATCH', `Starting batch ${service}.${action}`, { total: items.length, concurrency })

  // Process in chunks
  for (let i = 0; i < items.length; i += concurrency) {
    const chunk = items.slice(i, i + concurrency)
    
    const chunkResults = await Promise.allSettled(
      chunk.map(async (item) => {
        const response = await apiCall(() => fn(item), { service, action })
        if (!response.success) {
          throw new Error(response.error)
        }
        return response.data!
      })
    )

    chunkResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results.push(result.value)
      } else {
        const item = chunk[index]
        errors.push({ item, error: result.reason?.message || 'Unknown error' })
        
        if (!continueOnError) {
          throw new Error(`Batch failed at item ${i + index}: ${result.reason?.message}`)
        }
      }
    })

    // Small delay between chunks to avoid overwhelming APIs
    if (i + concurrency < items.length) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }

  logger.info('BATCH', `Completed batch ${service}.${action}`, {
    successful: results.length,
    failed: errors.length,
    total: items.length,
  })

  return { results, errors }
}

/**
 * Health check for an API service
 */
export async function checkApiHealth(
  service: string,
  healthCheckFn: () => Promise<boolean>
): Promise<{ healthy: boolean; latency: number; error?: string }> {
  const startTime = Date.now()

  try {
    const result = await Promise.race([
      healthCheckFn(),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Health check timeout')), 5000)
      ),
    ])

    return {
      healthy: result,
      latency: Date.now() - startTime,
    }
  } catch (error: any) {
    return {
      healthy: false,
      latency: Date.now() - startTime,
      error: error.message,
    }
  }
}

