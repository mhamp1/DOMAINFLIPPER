/**
 * Valuation Web Worker
 * Offloads heavy valuation processing to prevent UI blocking
 * December 27, 2025
 */

import type { Domain } from '@/types/domain'

interface ValuationMessage {
  type: 'valuate' | 'batchValuate'
  domains: Partial<Domain>[]
  id: string
}

interface ValuationResult {
  type: 'result'
  id: string
  results: Array<{
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
  }>
}

// Import valuation engine dynamically
let valuationEngine: any = null

async function loadValuationEngine() {
  if (!valuationEngine) {
    const module = await import('@/lib/ai/valuationEngine')
    valuationEngine = module.valuationEngine
  }
  return valuationEngine
}

self.onmessage = async (e: MessageEvent<ValuationMessage>) => {
  const { type, domains, id } = e.data

  try {
    const engine = await loadValuationEngine()

    if (type === 'batchValuate') {
      const results = await engine.batchValuate(domains)
      
      const response: ValuationResult = {
        type: 'result',
        id,
        results,
      }
      
      self.postMessage(response)
    } else if (type === 'valuate' && domains.length === 1) {
      const valuation = await engine.predictValue(domains[0])
      
      const response: ValuationResult = {
        type: 'result',
        id,
        results: [{
          domain: domains[0],
          valuation,
        }],
      }
      
      self.postMessage(response)
    }
  } catch (error: any) {
    self.postMessage({
      type: 'error',
      id,
      error: error.message,
    })
  }
}

