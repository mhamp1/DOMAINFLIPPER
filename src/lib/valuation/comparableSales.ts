/**
 * Comparable Sales Service - Comp-Driven Valuation
 * Pulls comparable sales data and computes median/percentile comps
 * by length/TLD/keyword class with liquidity discount
 */

export interface ComparableSale {
  domain: string
  salePrice: number
  saleDate: Date
  length: number
  tld: string
  keywords: string[]
  marketplace: string
}

export interface CompStats {
  sampleSize: number
  median: number
  p25: number // 25th percentile
  p75: number // 75th percentile
  mean: number
  min: number
  max: number
  liquidityDiscount: number // Applied discount for quick sale (0.0-1.0)
}

export interface ComparableResult {
  estimatedValue: number
  compStats: CompStats
  comparables: ComparableSale[]
  confidence: number
}

interface CompFilter {
  length?: number
  tld?: string
  keywords?: string[]
  minSampleSize?: number
}

/**
 * Fetch comparable sales data
 * In production: integrate with NameBio API, DN Journal, etc.
 * For now: configurable stub data
 */
export async function fetchComparables(
  domain: string,
  filter: CompFilter = {}
): Promise<ComparableSale[]> {
  // Parse domain details
  const parts = domain.split('.')
  const name = parts[0].toLowerCase()
  const tld = parts.length > 1 ? parts[parts.length - 1] : 'com'
  const length = name.length
  
  // Check for external feed configuration
  // NOTE: NameBio API should be called from server-side proxy in production
  // to avoid exposing API key to client. For development, use VITE_NAMEBIO_API_KEY
  const nameBioApiKey = import.meta.env.VITE_NAMEBIO_API_KEY
  
  if (nameBioApiKey) {
    try {
      return await fetchFromNameBio(name, tld, length, nameBioApiKey)
    } catch (error) {
      console.warn('NameBio API failed, using stub data:', error)
    }
  }
  
  // Fallback to stub data with realistic patterns
  return generateStubComparables(length, tld, filter)
}

/**
 * Fetch from NameBio API (external feed)
 * SECURITY NOTE: In production, this should be called from a server-side proxy
 * to avoid exposing the API key in the client bundle
 */
async function fetchFromNameBio(
  name: string,
  tld: string,
  length: number,
  apiKey: string
): Promise<ComparableSale[]> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 5000)
  
  try {
    // Use POST with Authorization header instead of GET with query params
    const response = await fetch(
      'https://namebio.com/api/domains',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tld, length }),
        signal: controller.signal,
      }
    )
    
    clearTimeout(timeoutId)
    
    if (!response.ok) throw new Error('NameBio API error')
    
    const data = await response.json()
    return data.sales?.map((sale: any) => ({
      domain: sale.domain,
      salePrice: sale.price,
      saleDate: new Date(sale.date),
      length: sale.domain.split('.')[0].length,
      tld: sale.domain.split('.').pop() || tld,
      keywords: extractKeywords(sale.domain),
      marketplace: sale.venue || 'unknown',
    })) || []
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}

/**
 * Generate stub comparable sales data with realistic patterns
 */
function generateStubComparables(
  length: number,
  tld: string,
  filter: CompFilter
): ComparableSale[] {
  const comparables: ComparableSale[] = []
  const count = Math.max(10, Math.min(50, 100 - length * 5)) // More comps for shorter domains
  
  // Base price varies by length and TLD
  const basePrice = calculateBasePrice(length, tld)
  
  for (let i = 0; i < count; i++) {
    const variance = 0.3 + Math.random() * 0.7 // 30%-100% variance
    const price = Math.round(basePrice * variance)
    
    comparables.push({
      domain: generateSampleDomain(length, tld, i),
      salePrice: price,
      saleDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000), // Random date within last year
      length,
      tld,
      keywords: filter.keywords || [],
      marketplace: ['sedo', 'afternic', 'flippa', 'godaddy'][Math.floor(Math.random() * 4)],
    })
  }
  
  return comparables.sort((a, b) => b.salePrice - a.salePrice)
}

/**
 * Calculate base price based on length and TLD
 */
function calculateBasePrice(length: number, tld: string): number {
  let basePrice = 1000
  
  // Length-based pricing
  if (length <= 3) basePrice = 50000
  else if (length <= 5) basePrice = 15000
  else if (length <= 7) basePrice = 5000
  else if (length <= 10) basePrice = 2000
  else basePrice = 1000
  
  // TLD multipliers
  const tldMultipliers: Record<string, number> = {
    com: 1.0,
    ai: 0.8,
    io: 0.7,
    net: 0.5,
    org: 0.4,
  }
  
  return Math.round(basePrice * (tldMultipliers[tld] || 0.3))
}

/**
 * Generate sample domain name
 */
function generateSampleDomain(length: number, tld: string, index: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz'
  let name = ''
  
  for (let i = 0; i < length; i++) {
    name += chars[Math.floor(Math.random() * chars.length)]
  }
  
  return `${name}${index}.${tld}`
}

/**
 * Extract keywords from domain name
 */
function extractKeywords(domain: string): string[] {
  const name = domain.split('.')[0].toLowerCase()
  const keywords: string[] = []
  
  // Common valuable keywords
  const valuableKeywords = [
    'ai', 'app', 'tech', 'cloud', 'web', 'data', 'crypto',
    'nft', 'meta', 'shop', 'buy', 'sell', 'pay', 'trade'
  ]
  
  valuableKeywords.forEach(keyword => {
    if (name.includes(keyword)) {
      keywords.push(keyword)
    }
  })
  
  return keywords
}

/**
 * Calculate comparable sales statistics
 */
export function calculateCompStats(
  comparables: ComparableSale[],
  liquidityFactor: number = 0.85 // 15% discount for liquidity
): CompStats {
  if (comparables.length === 0) {
    return {
      sampleSize: 0,
      median: 0,
      p25: 0,
      p75: 0,
      mean: 0,
      min: 0,
      max: 0,
      liquidityDiscount: liquidityFactor,
    }
  }
  
  const prices = comparables.map(c => c.salePrice).sort((a, b) => a - b)
  const sampleSize = prices.length
  
  // Calculate percentiles
  const p25Index = Math.floor(sampleSize * 0.25)
  const medianIndex = Math.floor(sampleSize * 0.5)
  const p75Index = Math.floor(sampleSize * 0.75)
  
  const p25 = prices[p25Index]
  const median = prices[medianIndex]
  const p75 = prices[p75Index]
  const mean = Math.round(prices.reduce((sum, p) => sum + p, 0) / sampleSize)
  const min = prices[0]
  const max = prices[sampleSize - 1]
  
  return {
    sampleSize,
    median: Math.round(median * liquidityFactor),
    p25: Math.round(p25 * liquidityFactor),
    p75: Math.round(p75 * liquidityFactor),
    mean: Math.round(mean * liquidityFactor),
    min: Math.round(min * liquidityFactor),
    max: Math.round(max * liquidityFactor),
    liquidityDiscount: liquidityFactor,
  }
}

/**
 * Get comp-driven valuation with stats
 */
export async function getCompDrivenValuation(
  domain: string,
  options: {
    liquidityDiscount?: number
    minSampleSize?: number
  } = {}
): Promise<ComparableResult> {
  const parts = domain.split('.')
  const name = parts[0]
  const tld = parts.length > 1 ? parts[parts.length - 1] : 'com'
  
  const filter: CompFilter = {
    length: name.length,
    tld,
    minSampleSize: options.minSampleSize || 10,
  }
  
  // Fetch comparables
  const comparables = await fetchComparables(domain, filter)
  
  // Calculate stats
  const liquidityDiscount = options.liquidityDiscount ?? 0.85
  const compStats = calculateCompStats(comparables, liquidityDiscount)
  
  // Use median as estimated value (conservative approach)
  const estimatedValue = compStats.median
  
  // Calculate confidence based on sample size
  let confidence = 50 // Base confidence
  if (compStats.sampleSize >= 50) confidence = 95
  else if (compStats.sampleSize >= 30) confidence = 85
  else if (compStats.sampleSize >= 20) confidence = 75
  else if (compStats.sampleSize >= 10) confidence = 65
  
  return {
    estimatedValue,
    compStats,
    comparables: comparables.slice(0, 10), // Return top 10 comps
    confidence,
  }
}

/**
 * Enhanced valuation service that integrates comp data
 * This extends the existing valuation with comp-driven insights
 */
export async function enhanceValuationWithComps(
  domain: string,
  baseValuation: number,
  options: {
    liquidityDiscount?: number
    weight?: number // How much to weight comps vs base valuation (0-1)
  } = {}
): Promise<{
  finalValue: number
  compDriven: number
  baseValue: number
  compStats: CompStats
  confidence: number
}> {
  const compResult = await getCompDrivenValuation(domain, {
    liquidityDiscount: options.liquidityDiscount,
  })
  
  // Weight between base valuation and comp-driven
  const weight = options.weight ?? 0.6 // 60% weight to comps, 40% to base
  const finalValue = Math.round(
    baseValuation * (1 - weight) + compResult.estimatedValue * weight
  )
  
  return {
    finalValue,
    compDriven: compResult.estimatedValue,
    baseValue: baseValuation,
    compStats: compResult.compStats,
    confidence: compResult.confidence,
  }
}
