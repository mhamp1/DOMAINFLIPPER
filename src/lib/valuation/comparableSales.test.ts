/**
 * Tests for Comparable Sales Service
 */

import { describe, it, expect } from 'vitest'
import {
  calculateCompStats,
  getCompDrivenValuation,
  enhanceValuationWithComps,
  type ComparableSale,
} from './comparableSales'

describe('Comparable Sales Service', () => {
  it('should calculate comp stats correctly', () => {
    const comparables: ComparableSale[] = [
      { domain: 'test1.com', salePrice: 1000, saleDate: new Date(), length: 5, tld: 'com', keywords: [], marketplace: 'sedo' },
      { domain: 'test2.com', salePrice: 2000, saleDate: new Date(), length: 5, tld: 'com', keywords: [], marketplace: 'sedo' },
      { domain: 'test3.com', salePrice: 3000, saleDate: new Date(), length: 5, tld: 'com', keywords: [], marketplace: 'sedo' },
      { domain: 'test4.com', salePrice: 4000, saleDate: new Date(), length: 5, tld: 'com', keywords: [], marketplace: 'sedo' },
      { domain: 'test5.com', salePrice: 5000, saleDate: new Date(), length: 5, tld: 'com', keywords: [], marketplace: 'sedo' },
    ]
    
    const stats = calculateCompStats(comparables, 0.85)
    
    expect(stats.sampleSize).toBe(5)
    expect(stats.median).toBeGreaterThan(0)
    expect(stats.mean).toBeGreaterThan(0)
    expect(stats.min).toBeLessThan(stats.max)
    expect(stats.liquidityDiscount).toBe(0.85)
  })

  it('should handle empty comparables', () => {
    const stats = calculateCompStats([])
    
    expect(stats.sampleSize).toBe(0)
    expect(stats.median).toBe(0)
    expect(stats.mean).toBe(0)
  })

  it('should get comp-driven valuation', async () => {
    const result = await getCompDrivenValuation('test.com', {
      liquidityDiscount: 0.8,
      minSampleSize: 5,
    })
    
    expect(result.estimatedValue).toBeGreaterThan(0)
    expect(result.compStats.sampleSize).toBeGreaterThanOrEqual(5)
    expect(result.comparables.length).toBeGreaterThan(0)
    expect(result.confidence).toBeGreaterThan(0)
  })

  it('should enhance valuation with comps', async () => {
    const baseValuation = 10000
    const result = await enhanceValuationWithComps('test.com', baseValuation, {
      liquidityDiscount: 0.85,
      weight: 0.6,
    })
    
    expect(result.finalValue).toBeGreaterThan(0)
    expect(result.baseValue).toBe(baseValuation)
    expect(result.compDriven).toBeGreaterThan(0)
    expect(result.confidence).toBeGreaterThan(0)
  })

  it('should apply liquidity discount', () => {
    const comparables: ComparableSale[] = [
      { domain: 'test1.com', salePrice: 1000, saleDate: new Date(), length: 5, tld: 'com', keywords: [], marketplace: 'sedo' },
    ]
    
    const stats90 = calculateCompStats(comparables, 0.9)
    const stats70 = calculateCompStats(comparables, 0.7)
    
    expect(stats90.median).toBeGreaterThan(stats70.median)
  })
})
