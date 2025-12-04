/**
 * Retry utility with exponential backoff
 * Handles API rate limits and transient errors
 */

export interface RetryOptions {
  maxRetries?: number
  initialDelay?: number
  maxDelay?: number
  backoffFactor?: number
  retryable?: (error: any) => boolean
}

export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    backoffFactor = 2,
    retryable = (error) => {
      const status = error?.response?.status
      return status === 429 || status === 500 || status === 502 || status === 503
    },
  } = options

  let lastError: any
  let delay = initialDelay

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error: any) {
      lastError = error

      // Don't retry if not retryable or last attempt
      if (attempt === maxRetries || !retryable(error)) {
        throw error
      }

      // Wait before retry with exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay))
      delay = Math.min(delay * backoffFactor, maxDelay)
    }
  }

  throw lastError
}

