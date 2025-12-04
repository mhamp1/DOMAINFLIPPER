/**
 * Valuation Worker Helper
 * Wrapper for Web Worker communication
 * December 27, 2025
 */

import type { Domain } from '@/types/domain'

let worker: Worker | null = null
let messageId = 0
const pendingMessages = new Map<number, {
  resolve: (value: any) => void
  reject: (error: any) => void
}>()

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('@/workers/valuationWorker.ts', import.meta.url), {
      type: 'module',
    })

    worker.onmessage = (e) => {
      const { type, id, results, error } = e.data

      const pending = pendingMessages.get(id)
      if (!pending) return

      pendingMessages.delete(id)

      if (type === 'error') {
        pending.reject(new Error(error))
      } else {
        pending.resolve(results)
      }
    }

    worker.onerror = (error) => {
      console.error('Valuation worker error:', error)
      // Reject all pending messages
      for (const [id, pending] of pendingMessages.entries()) {
        pending.reject(error)
        pendingMessages.delete(id)
      }
    }
  }

  return worker
}

/**
 * Batch valuate domains in Web Worker (non-blocking)
 */
export async function batchValuateInWorker(
  domains: Partial<Domain>[]
): Promise<Array<{
  domain: Partial<Domain>
  valuation: {
    value: number
    score: number
    confidence: number
    trademarkBoost: number
    breakdown: {
      brandScore: number
      seoScore: number
      trendScore: number
      lengthScore: number
      tldScore: number
      sentimentScore: number
      keywordScore: number
    }
  }
}>> {
  return new Promise((resolve, reject) => {
    const id = messageId++
    pendingMessages.set(id, { resolve, reject })

    const worker = getWorker()
    worker.postMessage({
      type: 'batchValuate',
      domains,
      id,
    })

    // Timeout after 60 seconds
    setTimeout(() => {
      if (pendingMessages.has(id)) {
        pendingMessages.delete(id)
        reject(new Error('Valuation worker timeout'))
      }
    }, 60000)
  })
}

/**
 * Cleanup worker
 */
export function cleanupWorker() {
  if (worker) {
    worker.terminate()
    worker = null
    pendingMessages.clear()
  }
}

