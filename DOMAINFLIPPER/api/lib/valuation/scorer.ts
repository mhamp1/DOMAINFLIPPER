/**
 * Domain Scoring Engine — The Brain
 * 
 * 8-factor weighted scoring with transparent breakdown.
 * Each factor: 0-15 points. Total: 0-100.
 * Confidence: 0-85 (never 100 — domain valuation is inherently uncertain).
 * 
 * Factors:
 *   1. Length (0-15)        — shorter = exponentially more valuable
 *   2. TLD (0-15)           — .com is king
 *   3. Keywords (0-15)      — high-CPC keywords = high value
 *   4. Brandability (0-15)  — pronounceable, memorable, no hyphens
 *   5. Backlinks (0-15)     — existing SEO value = immediate resale value
 *   6. Age (0-10)           — older = more authority
 *   7. Comparables (0-10)   — similar domains that sold recently
 *   8. Trademark (0-5)      — active trademark = premium buyer exists (also legal risk)
 */

// ==================== TYPES ====================

export interface RawDomain {
  domain: string
  price: number
  source: string
  auctionId?: string
  auctionEndTime?: string
  bidCount?: number
}

export interface EnrichmentData {
  referringDomains?: number
  trustFlow?: number
  citationFlow?: number
  domainAge?: number
  keywordCPC?: number
  searchVolume?: number
  comparableSales?: Array<{ domain: string; price: number; date: string }>
  hasActiveTrademark?: boolean
  trademarkDetails?: any[]
  estibotValue?: number
  goValueEstimate?: number  // GoDaddy GoValue appraisal (from inventory files)
}

export interface ScoreBreakdown {
  length: { score: number; max: 15; reason: string }
  tld: { score: number; max: 15; reason: string }
  keywords: { score: number; max: 15; reason: string }
  brandability: { score: number; max: 15; reason: string }
  backlinks: { score: number; max: 15; reason: string }
  age: { score: number; max: 10; reason: string }
  comparables: { score: number; max: 10; reason: string }
  trademark: { score: number; max: 5; reason: string }
}

export interface DomainScore {
  total: number
  confidence: number
  estimatedValue: number
  breakdown: ScoreBreakdown
  reasoning: string // Human-readable explanation of why this domain scored this way
}

export interface ScoredDomain {
  domain: string
  tld: string
  sld: string
  source: string
  currentPrice: number
  score: DomainScore
  roiMultiple: number
  auctionId?: string
  auctionEndTime?: string
  bidCount?: number
}

// ==================== SCORING ENGINE ====================

export function scoreDomain(raw: RawDomain, enrichment: EnrichmentData = {}): ScoredDomain {
  const dotIndex = raw.domain.lastIndexOf('.')
  const sld = raw.domain.substring(0, dotIndex).toLowerCase()
  const tld = raw.domain.substring(dotIndex + 1).toLowerCase()
  let confidence = 0

  // === FACTOR 1: LENGTH (0-15) ===
  let lengthScore: number
  if (sld.length <= 3) lengthScore = 15
  else if (sld.length <= 4) lengthScore = 13
  else if (sld.length <= 5) lengthScore = 11
  else if (sld.length <= 6) lengthScore = 9
  else if (sld.length <= 8) lengthScore = 7
  else if (sld.length <= 10) lengthScore = 5
  else if (sld.length <= 15) lengthScore = 3
  else lengthScore = 1
  const lengthReason = `${sld.length} chars`

  // === FACTOR 2: TLD (0-15) ===
  const TLD_MAP: Record<string, number> = {
    com: 15, ai: 12, io: 10, co: 8, net: 7, org: 7,
    app: 6, dev: 6, gg: 5, xyz: 4, me: 4, info: 3, cc: 3,
  }
  const tldScore = TLD_MAP[tld] || 2

  // === FACTOR 3: KEYWORDS (0-15) ===
  let keywordScore = 0
  let keywordReason = 'No high-value keywords'
  if (enrichment.keywordCPC !== undefined && enrichment.keywordCPC > 0) {
    // Real CPC data from EstiBot or Google
    const cpc = enrichment.keywordCPC
    if (cpc >= 20) keywordScore = 15
    else if (cpc >= 10) keywordScore = 12
    else if (cpc >= 5) keywordScore = 9
    else if (cpc >= 2) keywordScore = 6
    else keywordScore = 3
    keywordReason = `CPC $${cpc.toFixed(2)}`
    confidence += 15
  } else {
    // Heuristic fallback
    const kw = estimateKeywordValueHeuristic(sld)
    keywordScore = kw.score
    keywordReason = kw.reason
  }

  // === FACTOR 4: BRANDABILITY (0-15) ===
  let brandScore = 15
  let brandReasons: string[] = []
  if (sld.includes('-')) { brandScore -= 5; brandReasons.push('has hyphen') }
  if (/\d/.test(sld)) { brandScore -= 3; brandReasons.push('has numbers') }
  if (sld.length > 12) { brandScore -= 3; brandReasons.push('long') }
  if (!isPronounceable(sld)) { brandScore -= 4; brandReasons.push('hard to pronounce') }
  if (isLikelyWord(sld)) { brandScore = Math.min(15, brandScore + 2); brandReasons.push('real word') }
  brandScore = Math.max(0, Math.min(15, brandScore))
  const brandReason = brandReasons.length ? brandReasons.join(', ') : 'Clean, brandable'

  // === FACTOR 5: BACKLINKS (0-15) ===
  let backlinkScore = 0
  let blReason = 'No backlink data'
  if (enrichment.referringDomains !== undefined) {
    const rd = enrichment.referringDomains
    if (rd >= 500) backlinkScore = 15
    else if (rd >= 100) backlinkScore = 12
    else if (rd >= 50) backlinkScore = 10
    else if (rd >= 20) backlinkScore = 7
    else if (rd >= 5) backlinkScore = 4
    else backlinkScore = 1
    blReason = `${rd} referring domains`
    confidence += 20
  }
  if (enrichment.trustFlow !== undefined && enrichment.trustFlow > 0) {
    backlinkScore = Math.min(15, backlinkScore + Math.floor(enrichment.trustFlow / 10))
    blReason += `, TF ${enrichment.trustFlow}`
    confidence += 10
  }

  // === FACTOR 6: AGE (0-10) ===
  let ageScore = 0
  let ageReason = 'Age unknown'
  if (enrichment.domainAge !== undefined) {
    const age = enrichment.domainAge
    if (age >= 15) ageScore = 10
    else if (age >= 10) ageScore = 8
    else if (age >= 5) ageScore = 6
    else if (age >= 2) ageScore = 4
    else ageScore = 2
    ageReason = `${age} years`
    confidence += 10
  }

  // === FACTOR 7: COMPARABLES (0-10) ===
  let compScore = 0
  let compReason = 'No comparable data'
  if (enrichment.comparableSales && enrichment.comparableSales.length > 0) {
    const avg = enrichment.comparableSales.reduce((s, c) => s + c.price, 0) / enrichment.comparableSales.length
    if (avg >= 10000) compScore = 10
    else if (avg >= 5000) compScore = 8
    else if (avg >= 1000) compScore = 6
    else if (avg >= 500) compScore = 4
    else compScore = 2
    compReason = `${enrichment.comparableSales.length} comps, avg $${Math.round(avg)}`
    confidence += 25
  }

  // === FACTOR 8: TRADEMARK (0-5 bonus) ===
  let tmScore = 0
  let tmReason = 'No trademark found'
  if (enrichment.hasActiveTrademark) {
    tmScore = 5
    tmReason = 'Active trademark — high value but review for legal risk'
    confidence += 5
  }

  // === TOTALS ===
  const total = lengthScore + tldScore + keywordScore + brandScore + backlinkScore + ageScore + compScore + tmScore
  confidence = Math.min(85, confidence) // Cap at 85

  const estimatedValue = estimateDollarValue(total, sld, tld, enrichment)
  const roiMultiple = raw.price > 0 ? estimatedValue / raw.price : 0

  const breakdown: ScoreBreakdown = {
    length: { score: lengthScore, max: 15, reason: lengthReason },
    tld: { score: tldScore, max: 15, reason: `.${tld}` },
    keywords: { score: keywordScore, max: 15, reason: keywordReason },
    brandability: { score: brandScore, max: 15, reason: brandReason },
    backlinks: { score: backlinkScore, max: 15, reason: blReason },
    age: { score: ageScore, max: 10, reason: ageReason },
    comparables: { score: compScore, max: 10, reason: compReason },
    trademark: { score: tmScore, max: 5, reason: tmReason },
  }

  const reasoning = buildReasoning(breakdown, sld, tld, total, confidence, estimatedValue)

  return {
    domain: raw.domain,
    tld: `.${tld}`,
    sld,
    source: raw.source,
    currentPrice: raw.price,
    score: { total, confidence, estimatedValue, breakdown, reasoning },
    roiMultiple,
    auctionId: raw.auctionId,
    auctionEndTime: raw.auctionEndTime,
    bidCount: raw.bidCount,
  }
}

// ==================== REASONING BUILDER ====================

function buildReasoning(
  b: ScoreBreakdown, sld: string, tld: string,
  total: number, confidence: number, estimatedValue: number
): string {
  const parts: string[] = []

  // Lead with the strongest signals
  if (b.length.score >= 13) parts.push(`Very short (${sld.length} chars) — short domains command premium prices`)
  if (b.tld.score >= 12) parts.push(`.${tld} is a high-demand TLD`)
  if (b.keywords.score >= 10) parts.push(`Contains high-value keyword (${b.keywords.reason})`)
  if (b.brandability.score >= 12) parts.push(`Highly brandable — ${b.brandability.reason}`)
  if (b.backlinks.score >= 7) parts.push(`Strong backlink profile (${b.backlinks.reason})`)
  if (b.age.score >= 6) parts.push(`Established domain (${b.age.reason})`)
  if (b.comparables.score >= 4) parts.push(`Comparable sales support value (${b.comparables.reason})`)
  if (b.trademark.score > 0) parts.push(`⚠️ Active trademark — high demand but UDRP risk`)

  // Add negatives if score is middling
  if (total < 60) {
    if (b.length.score <= 3) parts.push(`Long domain (${sld.length} chars) — harder to resell`)
    if (b.brandability.score <= 5) parts.push(`Low brandability (${b.brandability.reason})`)
    if (b.tld.score <= 5) parts.push(`.${tld} has limited aftermarket demand`)
  }

  if (parts.length === 0) parts.push('Average domain with no standout factors')

  return `Score ${total}/100 (${confidence}% confidence). Est. value $${estimatedValue}. ${parts.join('. ')}.`
}

// ==================== HELPER FUNCTIONS ====================

function isPronounceable(str: string): boolean {
  const s = str.toLowerCase()
  const vowels = (s.match(/[aeiou]/g) || []).length
  const ratio = vowels / s.length
  if (ratio < 0.15 || ratio > 0.8) return false
  if (/[^aeiou]{4,}/i.test(s)) return false // 4+ consecutive consonants
  if (/[aeiou]{3,}/i.test(s)) return false   // 3+ consecutive vowels
  return true
}

const COMMON_WORDS = new Set([
  'app','hub','net','pro','web','tech','data','cloud','code','dev','pay',
  'shop','deal','sale','hire','work','task','sync','flow','dash','core',
  'link','node','bolt','snap','beam','grid','dock','wave','vibe','glow',
  'base','mint','vault','stack','forge','craft','spark','shift','pixel',
  'scout','rally','scout','fleet','trail','quest','pulse','bloom','crest',
])

function isLikelyWord(sld: string): boolean {
  if (COMMON_WORDS.has(sld)) return true
  // Two-word combos where each part ≥ 3 chars are often brandable
  for (let i = 3; i < sld.length - 2; i++) {
    if (COMMON_WORDS.has(sld.slice(0, i)) || COMMON_WORDS.has(sld.slice(i))) return true
  }
  return false
}

/** Keyword CPC heuristic when no real data is available */
const KEYWORD_CPC_MAP: Record<string, number> = {
  // Finance/Legal (highest CPC sectors)
  insurance: 50, lawyer: 45, attorney: 42, mortgage: 40, loan: 35,
  credit: 30, invest: 28, trading: 25, finance: 22, bank: 20, tax: 18,
  // Tech
  cloud: 18, saas: 16, cyber: 15, data: 14, api: 12, ai: 25,
  crypto: 11, blockchain: 10, software: 12, hosting: 14, vpn: 15,
  // Health
  health: 15, dental: 20, rehab: 35, medical: 18, pharma: 22, therapy: 16,
  // Real estate
  realty: 15, homes: 12, property: 14, rental: 10,
  // E-commerce
  shop: 8, store: 7, buy: 9, deal: 6, cart: 5,
}

function estimateKeywordValueHeuristic(sld: string): { score: number; reason: string } {
  let bestCPC = 0
  let bestKeyword = ''
  for (const [kw, cpc] of Object.entries(KEYWORD_CPC_MAP)) {
    if (sld === kw) { bestCPC = cpc; bestKeyword = kw; break }
    if (sld.includes(kw) && cpc > bestCPC) { bestCPC = cpc * 0.5; bestKeyword = kw }
  }
  if (bestCPC <= 0) return { score: 0, reason: 'No high-value keywords' }
  let score: number
  if (bestCPC >= 20) score = 15
  else if (bestCPC >= 10) score = 12
  else if (bestCPC >= 5) score = 9
  else if (bestCPC >= 2) score = 6
  else score = 3
  return { score, reason: `Keyword "${bestKeyword}" ~$${bestCPC.toFixed(0)} CPC (heuristic)` }
}

function estimateDollarValue(score: number, sld: string, tld: string, enrichment: EnrichmentData): number {
  // If we have comparable sales, weight them heavily
  if (enrichment.comparableSales && enrichment.comparableSales.length >= 3) {
    const sorted = enrichment.comparableSales.map(c => c.price).sort((a, b) => a - b)
    const median = sorted[Math.floor(sorted.length / 2)]
    return Math.round(median * 0.6) // 60% of retail = wholesale value
  }

  // Triangulate from multiple appraisal sources
  const appraisals: number[] = []
  if (enrichment.goValueEstimate && enrichment.goValueEstimate > 0) appraisals.push(enrichment.goValueEstimate * 0.7)
  if (enrichment.estibotValue && enrichment.estibotValue > 0) appraisals.push(enrichment.estibotValue * 0.5)
  if (appraisals.length >= 2) return Math.round(appraisals.reduce((a, b) => a + b, 0) / appraisals.length)
  if (appraisals.length === 1) return Math.round(appraisals[0])

  // Fall back to score-based tiers (conservative)
  let base: number
  if (score >= 80) base = 5000
  else if (score >= 70) base = 2000
  else if (score >= 60) base = 800
  else if (score >= 50) base = 300
  else if (score >= 40) base = 100
  else base = 50

  // Premium adjustments
  if (tld === 'com' && sld.length <= 4) base *= 3
  if (tld === 'ai' && sld.length <= 5) base *= 2
  if (enrichment.referringDomains && enrichment.referringDomains >= 100) base *= 1.5

  return Math.round(base)
}

// ==================== SMART BID CALCULATION ====================

export interface BidDecision {
  shouldBid: boolean
  bidAmount: number
  maxProxyBid: number
  reason: string
  requiresReview: boolean
}

export function calculateBid(
  scored: ScoredDomain,
  settings: { minRoi: number; perDomainCap: number; reviewThreshold: number }
): BidDecision {
  const { estimatedValue, confidence, total } = scored.score
  const price = scored.currentPrice

  // Max bid = estimated value / min ROI
  const maxBidByROI = estimatedValue / settings.minRoi
  const maxBid = Math.min(maxBidByROI, settings.perDomainCap)

  // Adjust by confidence — lower confidence = bid less
  const confMult = confidence / 100 // 0.0 to 0.85
  const adjustedMax = maxBid * confMult

  if (price >= adjustedMax) {
    return {
      shouldBid: false,
      bidAmount: 0,
      maxProxyBid: 0,
      reason: `Price $${price} >= max bid $${Math.round(adjustedMax)} (est $${estimatedValue}, ${confidence}% conf, ${settings.minRoi}x min ROI)`,
      requiresReview: false,
    }
  }

  if (total < 40) {
    return {
      shouldBid: false,
      bidAmount: 0,
      maxProxyBid: 0,
      reason: `Score ${total} below minimum threshold (40)`,
      requiresReview: false,
    }
  }

  // Optimal bid: minimum increment above current
  const increment = getBidIncrement(price)
  const optimalBid = price + increment

  return {
    shouldBid: true,
    bidAmount: Math.round(optimalBid * 100) / 100,
    maxProxyBid: Math.round(adjustedMax * 100) / 100,
    reason: `Score ${total}, est $${estimatedValue}, conf ${confidence}%, max proxy $${Math.round(adjustedMax)}`,
    requiresReview: adjustedMax > settings.reviewThreshold,
  }
}

function getBidIncrement(price: number): number {
  if (price < 5) return 1
  if (price < 100) return 5
  if (price < 500) return 5
  if (price < 1000) return 10
  if (price < 2500) return 25
  if (price < 5000) return 50
  return 100
}

// ==================== LISTING PRICE CALCULATION ====================

export function calculateListingPrice(purchasePrice: number, score: DomainScore): number {
  const minPrice = purchasePrice * 3
  const targetPrice = score.estimatedValue
  const listPrice = Math.max(minPrice, targetPrice)
  return roundToNicePrice(listPrice)
}

function roundToNicePrice(price: number): number {
  if (price < 100) return Math.ceil(price / 5) * 5
  if (price < 500) return Math.ceil(price / 25) * 25
  if (price < 2000) return Math.ceil(price / 100) * 100
  if (price < 10000) return Math.ceil(price / 500) * 500
  return Math.ceil(price / 1000) * 1000
}
