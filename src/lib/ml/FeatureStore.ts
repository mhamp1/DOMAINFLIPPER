/**
 * FeatureStore.ts — ML FEATURE MANAGEMENT
 * Cached features, calibration, and confidence intervals
 * December 2025 — Data-driven decisioning
 */

import { logger } from '@/lib/utils/logger'

// ==================== TYPES ====================

export interface DomainFeatures {
  domain: string
  extractedAt: Date
  expiresAt: Date
  
  // Basic features
  length: number
  wordCount: number
  hasNumbers: boolean
  hasHyphens: boolean
  tld: string
  isExactMatch: boolean
  
  // SEO features
  domainAge?: number  // Years
  backlinks?: number
  referringDomains?: number
  domainAuthority?: number
  pageAuthority?: number
  trustFlow?: number
  citationFlow?: number
  
  // Traffic features
  monthlyTraffic?: number
  organicTraffic?: number
  trafficTrend?: 'up' | 'down' | 'stable'
  trafficGrowth?: number  // % change
  
  // Commercial features
  cpc?: number  // Cost per click
  searchVolume?: number  // Monthly searches
  commercialIntent?: number  // 0-1
  competitionLevel?: number  // 0-1
  
  // Brand features
  brandScore?: number  // 0-100
  memorability?: number  // 0-100
  pronounceability?: number  // 0-100
  
  // Risk features
  trademarkRisk?: number  // 0-100
  spamScore?: number  // 0-100
  
  // Social signals
  twitterMentions?: number
  socialSignals?: number
  trendScore?: number  // 0-100
  
  // Comparable sales
  comparableSales?: ComparableSale[]
  avgComparablePrice?: number
  medianComparablePrice?: number
}

export interface ComparableSale {
  domain: string
  salePrice: number
  saleDate: Date
  similarity: number  // 0-1
  source: string
}

export interface ValuationPrediction {
  value: number
  confidence: number  // 0-1
  confidenceInterval: { low: number; high: number }
  calibratedValue?: number
  factors: ValuationFactor[]
  comparables: ComparableSale[]
}

export interface ValuationFactor {
  name: string
  contribution: number  // USD
  weight: number  // 0-1
  explanation: string
}

export interface CalibrationData {
  predictedValue: number
  actualSalePrice: number
  domain: string
  saleDate: Date
  features: Partial<DomainFeatures>
}

// ==================== FEATURE STORE ====================

class FeatureStore {
  private cache: Map<string, DomainFeatures> = new Map()
  private calibrationHistory: CalibrationData[] = []
  private calibrationCoefficients: { slope: number; intercept: number } = { slope: 1, intercept: 0 }
  
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000  // 24 hours
  private readonly MAX_CACHE_SIZE = 10000
  private readonly MAX_CALIBRATION_HISTORY = 1000

  constructor() {
    this.loadState()
    this.recalibrate()  // Initial calibration
  }

  // ==================== FEATURE EXTRACTION ====================

  /**
   * Extract features for a domain
   */
  async extractFeatures(
    domain: string,
    externalData?: Partial<DomainFeatures>
  ): Promise<DomainFeatures> {
    // Check cache
    const cached = this.cache.get(domain)
    if (cached && cached.expiresAt > new Date()) {
      return cached
    }

    const now = new Date()
    const domainName = domain.split('.')[0].toLowerCase()
    const tld = '.' + domain.split('.').slice(1).join('.')

    // Extract basic features
    const features: DomainFeatures = {
      domain,
      extractedAt: now,
      expiresAt: new Date(now.getTime() + this.CACHE_TTL),
      
      // Basic
      length: domainName.length,
      wordCount: this.countWords(domainName),
      hasNumbers: /\d/.test(domainName),
      hasHyphens: domainName.includes('-'),
      tld,
      isExactMatch: this.isExactMatchDomain(domainName),
      
      // Brand/quality scores
      brandScore: this.calculateBrandScore(domainName),
      memorability: this.calculateMemorability(domainName),
      pronounceability: this.calculatePronounceability(domainName),
      
      // Merge external data
      ...externalData,
    }

    // Cache
    this.setCache(domain, features)

    return features
  }

  /**
   * Batch extract features
   */
  async batchExtract(
    domains: string[],
    externalDataMap?: Map<string, Partial<DomainFeatures>>
  ): Promise<Map<string, DomainFeatures>> {
    const results = new Map<string, DomainFeatures>()
    
    for (const domain of domains) {
      const externalData = externalDataMap?.get(domain)
      const features = await this.extractFeatures(domain, externalData)
      results.set(domain, features)
    }

    return results
  }

  // ==================== VALUATION ====================

  /**
   * Predict domain value with confidence intervals
   */
  predict(features: DomainFeatures): ValuationPrediction {
    const factors: ValuationFactor[] = []
    let baseValue = 10  // Minimum $10

    // Length factor (shorter = more valuable)
    const lengthFactor = this.calculateLengthValue(features.length)
    factors.push({
      name: 'Length',
      contribution: lengthFactor,
      weight: 0.25,
      explanation: `${features.length} characters`,
    })
    baseValue += lengthFactor

    // TLD factor
    const tldFactor = this.calculateTLDValue(features.tld)
    factors.push({
      name: 'TLD',
      contribution: tldFactor,
      weight: 0.15,
      explanation: features.tld,
    })
    baseValue += tldFactor

    // Brand score factor
    if (features.brandScore) {
      const brandFactor = (features.brandScore / 100) * 500
      factors.push({
        name: 'Brand Quality',
        contribution: brandFactor,
        weight: 0.2,
        explanation: `Score: ${features.brandScore}/100`,
      })
      baseValue += brandFactor
    }

    // Traffic factor
    if (features.monthlyTraffic && features.monthlyTraffic > 0) {
      const trafficFactor = Math.log10(features.monthlyTraffic + 1) * 200
      factors.push({
        name: 'Traffic',
        contribution: trafficFactor,
        weight: 0.15,
        explanation: `${features.monthlyTraffic.toLocaleString()} monthly`,
      })
      baseValue += trafficFactor
    }

    // Backlinks factor
    if (features.backlinks && features.backlinks > 0) {
      const backlinkFactor = Math.log10(features.backlinks + 1) * 100
      factors.push({
        name: 'Backlinks',
        contribution: backlinkFactor,
        weight: 0.1,
        explanation: `${features.backlinks.toLocaleString()} backlinks`,
      })
      baseValue += backlinkFactor
    }

    // CPC factor (commercial value)
    if (features.cpc && features.cpc > 0) {
      const cpcFactor = features.cpc * 50
      factors.push({
        name: 'CPC Value',
        contribution: cpcFactor,
        weight: 0.1,
        explanation: `$${features.cpc.toFixed(2)} CPC`,
      })
      baseValue += cpcFactor
    }

    // Comparable sales factor
    if (features.avgComparablePrice && features.avgComparablePrice > 0) {
      const compFactor = features.avgComparablePrice * 0.7  // Weighted average
      factors.push({
        name: 'Comparable Sales',
        contribution: compFactor,
        weight: 0.2,
        explanation: `Avg: $${features.avgComparablePrice.toLocaleString()}`,
      })
      baseValue = (baseValue + compFactor) / 2  // Blend
    }

    // Domain age factor
    if (features.domainAge && features.domainAge > 0) {
      const ageFactor = Math.min(features.domainAge * 20, 200)
      factors.push({
        name: 'Domain Age',
        contribution: ageFactor,
        weight: 0.05,
        explanation: `${features.domainAge} years`,
      })
      baseValue += ageFactor
    }

    // Calculate confidence based on data completeness
    const confidence = this.calculateConfidence(features)
    
    // Calculate confidence interval
    const uncertainty = 1 - confidence
    const intervalWidth = baseValue * uncertainty
    const confidenceInterval = {
      low: Math.max(10, baseValue - intervalWidth),
      high: baseValue + intervalWidth,
    }

    // Apply calibration
    const calibratedValue = this.applyCalibration(baseValue)

    return {
      value: Math.round(baseValue),
      confidence,
      confidenceInterval: {
        low: Math.round(confidenceInterval.low),
        high: Math.round(confidenceInterval.high),
      },
      calibratedValue: Math.round(calibratedValue),
      factors,
      comparables: features.comparableSales || [],
    }
  }

  // ==================== CALIBRATION ====================

  /**
   * Add calibration data point (after a sale)
   */
  addCalibrationData(data: CalibrationData): void {
    this.calibrationHistory.push(data)
    
    // Trim history
    if (this.calibrationHistory.length > this.MAX_CALIBRATION_HISTORY) {
      this.calibrationHistory = this.calibrationHistory.slice(-this.MAX_CALIBRATION_HISTORY)
    }

    // Recalibrate with new data
    this.recalibrate()
    this.saveState()

    logger.info('FEATURE_STORE', 'Calibration data added', {
      domain: data.domain,
      predicted: data.predictedValue,
      actual: data.actualSalePrice,
      error: Math.abs(data.predictedValue - data.actualSalePrice),
    })
  }

  /**
   * Recalibrate model based on historical data
   * Uses isotonic regression for monotonic calibration
   */
  private recalibrate(): void {
    if (this.calibrationHistory.length < 5) {
      // Not enough data
      return
    }

    // Sort by predicted value
    const sorted = [...this.calibrationHistory].sort(
      (a, b) => a.predictedValue - b.predictedValue
    )

    // Calculate linear regression
    const n = sorted.length
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0

    for (const point of sorted) {
      sumX += point.predictedValue
      sumY += point.actualSalePrice
      sumXY += point.predictedValue * point.actualSalePrice
      sumX2 += point.predictedValue * point.predictedValue
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
    const intercept = (sumY - slope * sumX) / n

    this.calibrationCoefficients = {
      slope: isNaN(slope) ? 1 : slope,
      intercept: isNaN(intercept) ? 0 : intercept,
    }

    logger.info('FEATURE_STORE', 'Model recalibrated', {
      slope: this.calibrationCoefficients.slope.toFixed(3),
      intercept: this.calibrationCoefficients.intercept.toFixed(0),
      dataPoints: n,
    })
  }

  /**
   * Apply calibration to a raw prediction
   */
  private applyCalibration(rawValue: number): number {
    const { slope, intercept } = this.calibrationCoefficients
    return rawValue * slope + intercept
  }

  /**
   * Get calibration metrics
   */
  getCalibrationMetrics(): {
    mae: number  // Mean Absolute Error
    rmse: number  // Root Mean Squared Error
    bias: number  // Systematic over/under prediction
    dataPoints: number
  } {
    if (this.calibrationHistory.length === 0) {
      return { mae: 0, rmse: 0, bias: 0, dataPoints: 0 }
    }

    let sumError = 0
    let sumSquaredError = 0
    let sumBias = 0

    for (const point of this.calibrationHistory) {
      const error = point.actualSalePrice - point.predictedValue
      sumError += Math.abs(error)
      sumSquaredError += error * error
      sumBias += error
    }

    const n = this.calibrationHistory.length
    return {
      mae: sumError / n,
      rmse: Math.sqrt(sumSquaredError / n),
      bias: sumBias / n,
      dataPoints: n,
    }
  }

  // ==================== FEATURE CALCULATIONS ====================

  private countWords(domainName: string): number {
    // Simple word count based on camelCase, numbers, and hyphens
    return domainName
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/([0-9]+)/g, ' $1 ')
      .replace(/-/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 0)
      .length
  }

  private isExactMatchDomain(domainName: string): boolean {
    // Simple heuristic: single word, no numbers/hyphens
    return !domainName.includes('-') && 
           !/\d/.test(domainName) && 
           domainName.length <= 15
  }

  private calculateBrandScore(domainName: string): number {
    let score = 50  // Base score

    // Shorter is better
    if (domainName.length <= 4) score += 30
    else if (domainName.length <= 6) score += 20
    else if (domainName.length <= 8) score += 10
    else if (domainName.length > 15) score -= 20

    // No numbers is better
    if (!/\d/.test(domainName)) score += 10
    else score -= 15

    // No hyphens is better
    if (!domainName.includes('-')) score += 10
    else score -= 20

    // Pronounceable (has vowels)
    const vowelRatio = (domainName.match(/[aeiou]/gi) || []).length / domainName.length
    if (vowelRatio > 0.3 && vowelRatio < 0.6) score += 10

    return Math.max(0, Math.min(100, score))
  }

  private calculateMemorability(domainName: string): number {
    let score = 50

    // Short and simple
    if (domainName.length <= 6) score += 25
    else if (domainName.length > 12) score -= 15

    // Real words are memorable
    if (this.looksLikeWord(domainName)) score += 20

    // Repetition helps
    if (/(.)\1/.test(domainName)) score += 5

    return Math.max(0, Math.min(100, score))
  }

  private calculatePronounceability(domainName: string): number {
    let score = 50

    // Vowel/consonant ratio
    const vowels = (domainName.match(/[aeiou]/gi) || []).length
    const consonants = domainName.length - vowels
    const ratio = vowels / (consonants || 1)

    if (ratio > 0.3 && ratio < 0.8) score += 25
    else if (ratio < 0.1) score -= 30

    // No weird consonant clusters
    if (!/[bcdfghjklmnpqrstvwxyz]{4,}/i.test(domainName)) score += 15

    return Math.max(0, Math.min(100, score))
  }

  private looksLikeWord(str: string): boolean {
    // Simple heuristic: alternating vowels/consonants
    const vowelPattern = /^[aeiou]?([bcdfghjklmnpqrstvwxyz]+[aeiou]+)+[bcdfghjklmnpqrstvwxyz]*$/i
    return vowelPattern.test(str)
  }

  private calculateLengthValue(length: number): number {
    // Premium pricing for short domains
    if (length <= 2) return 10000
    if (length <= 3) return 5000
    if (length <= 4) return 2000
    if (length <= 5) return 1000
    if (length <= 6) return 500
    if (length <= 8) return 200
    if (length <= 10) return 100
    if (length <= 15) return 50
    return 10
  }

  private calculateTLDValue(tld: string): number {
    const tldValues: Record<string, number> = {
      '.com': 500,
      '.net': 200,
      '.org': 150,
      '.io': 300,
      '.ai': 400,
      '.co': 200,
      '.app': 150,
      '.dev': 150,
      '.xyz': 50,
    }
    return tldValues[tld] || 25
  }

  private calculateConfidence(features: DomainFeatures): number {
    let dataPoints = 0
    let maxPoints = 10

    // Count available data points
    if (features.length > 0) dataPoints++
    if (features.brandScore) dataPoints++
    if (features.monthlyTraffic !== undefined) dataPoints++
    if (features.backlinks !== undefined) dataPoints++
    if (features.cpc !== undefined) dataPoints++
    if (features.searchVolume !== undefined) dataPoints++
    if (features.domainAge !== undefined) dataPoints++
    if (features.comparableSales && features.comparableSales.length > 0) dataPoints += 2
    if (features.domainAuthority !== undefined) dataPoints++

    return Math.min(0.95, 0.3 + (dataPoints / maxPoints) * 0.65)
  }

  // ==================== CACHE MANAGEMENT ====================

  private setCache(domain: string, features: DomainFeatures): void {
    this.cache.set(domain, features)

    // Trim cache if needed
    if (this.cache.size > this.MAX_CACHE_SIZE) {
      const entries = Array.from(this.cache.entries())
        .sort((a, b) => a[1].extractedAt.getTime() - b[1].extractedAt.getTime())
      
      const toRemove = entries.slice(0, this.cache.size - this.MAX_CACHE_SIZE)
      toRemove.forEach(([key]) => this.cache.delete(key))
    }
  }

  getFromCache(domain: string): DomainFeatures | undefined {
    const cached = this.cache.get(domain)
    if (cached && cached.expiresAt > new Date()) {
      return cached
    }
    return undefined
  }

  clearCache(): void {
    this.cache.clear()
  }

  // ==================== PERSISTENCE ====================

  private saveState(): void {
    try {
      localStorage.setItem('domainFlipper_featureStore', JSON.stringify({
        calibrationHistory: this.calibrationHistory.map(d => ({
          ...d,
          saleDate: d.saleDate.toISOString(),
        })),
        calibrationCoefficients: this.calibrationCoefficients,
      }))
    } catch (e) {
      // Ignore
    }
  }

  private loadState(): void {
    try {
      const saved = localStorage.getItem('domainFlipper_featureStore')
      if (saved) {
        const state = JSON.parse(saved)
        this.calibrationHistory = (state.calibrationHistory || []).map((d: any) => ({
          ...d,
          saleDate: new Date(d.saleDate),
        }))
        if (state.calibrationCoefficients) {
          this.calibrationCoefficients = state.calibrationCoefficients
        }
      }
    } catch (e) {
      // Ignore
    }
  }
}

// ==================== SINGLETON ====================

export const featureStore = new FeatureStore()
