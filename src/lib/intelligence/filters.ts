/**
 * Momentum and Negative Filters for Intelligence/Selection
 * Adds momentum scoring and filters out negative signals
 */

export interface MomentumScore {
  score: number // 0-100
  velocity: number // Rate of change
  persistence: number // How long the trend has persisted
  confidence: number
  trend: 'rising' | 'falling' | 'stable'
}

export interface FilterResult {
  passed: boolean
  reason?: string
  score: number
  flags: string[]
}

export interface FilterSettings {
  momentumThreshold: number // Minimum momentum score (0-100)
  persistenceThreshold: number // Minimum days of persistence
  enableProfanityFilter: boolean
  enableTMFilter: boolean
  enableScamFilter: boolean
  customBlocklist?: string[]
}

// Default filter settings (exposed in config)
export const DEFAULT_FILTER_SETTINGS: FilterSettings = {
  momentumThreshold: 50,
  persistenceThreshold: 3, // 3 days
  enableProfanityFilter: true,
  enableTMFilter: true,
  enableScamFilter: true,
  customBlocklist: [],
}

/**
 * Profanity and offensive terms blocklist
 * NOTE: This is a minimal list. Some terms like 'casino' may have legitimate uses.
 * Use the customBlocklist in FilterSettings for domain-specific filtering.
 * In production, consider using a professional content filtering service.
 */
const PROFANITY_LIST = [
  // Common profanity (keep list minimal and professional)
  'porn', 'xxx', 'sex', 'nude', 'naked', 'escort', 'drug', 'weed', 'casino',
  'gambling', 'pills', 'viagra', 'cialis', 'penis', 'breast', 'ass', 'fuck',
  'shit', 'damn', 'hell', 'bitch', 'bastard', 'crap', 'piss',
]

/**
 * Trademark risk keywords (high-risk brands)
 */
const TM_RISK_KEYWORDS = [
  // Major tech brands
  'google', 'facebook', 'amazon', 'apple', 'microsoft', 'netflix', 'tesla',
  'twitter', 'instagram', 'youtube', 'tiktok', 'snapchat', 'linkedin',
  
  // Financial/payment brands
  'paypal', 'visa', 'mastercard', 'amex', 'stripe', 'square', 'venmo',
  'coinbase', 'binance', 'robinhood',
  
  // Retail brands
  'walmart', 'target', 'costco', 'bestbuy', 'homedepot', 'lowes',
  'macys', 'nordstrom', 'ikea',
  
  // Entertainment brands
  'disney', 'marvel', 'starwars', 'pokemon', 'nintendo', 'playstation',
  'xbox', 'sony', 'samsung',
  
  // Food/beverage brands
  'mcdonalds', 'starbucks', 'cocacola', 'pepsi', 'subway', 'burgerking',
  
  // Generic TM indicators
  'trademark', 'copyright', 'patent', 'registered',
]

/**
 * Scammy niche keywords
 */
const SCAM_KEYWORDS = [
  // Get-rich-quick schemes
  'getrichquick', 'makemoney', 'earnfast', 'freemoney', 'easycash',
  'workfromhome', 'millionaire', 'overnight', 'guarantee', 'nowork',
  
  // Pyramid/MLM indicators
  'mlm', 'pyramid', 'downline', 'recruit', 'referral',
  
  // Fake credentials
  'diploma', 'degree', 'certificate', 'credential', 'fake',
  
  // Illegal activities
  'hack', 'crack', 'pirate', 'torrent', 'keygen', 'warez',
  'cheat', 'fraud', 'scam', 'phishing', 'spoof',
  
  // Dubious health claims
  'miracle', 'cure', 'lose', 'weight', 'supplement', 'diet',
  'antiaging', 'wrinkle', 'penis', 'enlargement',
]

/**
 * Calculate momentum score for a keyword/domain
 * Tracks rate of change and persistence over time
 */
export function calculateMomentumScore(
  keyword: string,
  historicalData: Array<{ date: Date; volume: number; score: number }>
): MomentumScore {
  if (historicalData.length < 2) {
    return {
      score: 50,
      velocity: 0,
      persistence: 0,
      confidence: 20,
      trend: 'stable',
    }
  }
  
  // Sort by date
  const sorted = [...historicalData].sort((a, b) => a.date.getTime() - b.date.getTime())
  
  // Calculate velocity (rate of change)
  const recent = sorted.slice(-7) // Last 7 data points
  let velocity = 0
  
  for (let i = 1; i < recent.length; i++) {
    const change = recent[i].score - recent[i - 1].score
    velocity += change
  }
  velocity = velocity / (recent.length - 1)
  
  // Calculate persistence (how long trend has been consistent)
  let persistence = 0
  let currentTrend: 'rising' | 'falling' | 'stable' = 'stable'
  
  if (velocity > 2) currentTrend = 'rising'
  else if (velocity < -2) currentTrend = 'falling'
  
  // Count consecutive days with same trend
  for (let i = recent.length - 1; i > 0; i--) {
    const dayChange = recent[i].score - recent[i - 1].score
    const dayTrend = dayChange > 2 ? 'rising' : dayChange < -2 ? 'falling' : 'stable'
    
    if (dayTrend === currentTrend) {
      persistence++
    } else {
      break
    }
  }
  
  // Calculate overall momentum score (0-100)
  let momentumScore = 50 // Neutral
  
  if (currentTrend === 'rising') {
    momentumScore = 50 + Math.min(40, velocity * 2) + Math.min(10, persistence * 2)
  } else if (currentTrend === 'falling') {
    momentumScore = 50 - Math.min(40, Math.abs(velocity) * 2) - Math.min(10, persistence * 2)
  }
  
  momentumScore = Math.max(0, Math.min(100, momentumScore))
  
  // Confidence based on data availability
  const confidence = Math.min(100, (sorted.length / 30) * 100) // 30 days = 100% confidence
  
  return {
    score: Math.round(momentumScore),
    velocity: Math.round(velocity * 10) / 10,
    persistence,
    confidence: Math.round(confidence),
    trend: currentTrend,
  }
}

/**
 * Check for profanity in domain/keyword
 */
export function checkProfanity(text: string, settings: FilterSettings): FilterResult {
  if (!settings.enableProfanityFilter) {
    return { passed: true, score: 100, flags: [] }
  }
  
  const lower = text.toLowerCase()
  const found: string[] = []
  
  // Check against profanity list
  for (const word of PROFANITY_LIST) {
    if (lower.includes(word)) {
      found.push(word)
    }
  }
  
  // Check custom blocklist
  if (settings.customBlocklist) {
    for (const word of settings.customBlocklist) {
      if (lower.includes(word.toLowerCase())) {
        found.push(word)
      }
    }
  }
  
  const passed = found.length === 0
  
  return {
    passed,
    reason: passed ? undefined : `Contains blocked words: ${found.join(', ')}`,
    score: passed ? 100 : 0,
    flags: found,
  }
}

/**
 * Check for trademark risk
 */
export function checkTrademarkRisk(text: string, settings: FilterSettings): FilterResult {
  if (!settings.enableTMFilter) {
    return { passed: true, score: 100, flags: [] }
  }
  
  const lower = text.toLowerCase()
  const found: string[] = []
  
  for (const brand of TM_RISK_KEYWORDS) {
    // Check for exact match or close variants
    if (lower.includes(brand)) {
      const index = lower.indexOf(brand)
      
      // If it's at the start or end, or surrounded by non-letters, it's risky
      const beforeChar = index > 0 ? lower[index - 1] : ' '
      const afterChar = index + brand.length < lower.length ? lower[index + brand.length] : ' '
      
      // Both sides must be non-letters (separated) for it to be risky
      const isSeparated = !/[a-z]/.test(beforeChar) && !/[a-z]/.test(afterChar)
      
      if (isSeparated) {
        found.push(brand)
      }
    }
  }
  
  const passed = found.length === 0
  
  return {
    passed,
    reason: passed ? undefined : `Trademark risk: ${found.join(', ')}`,
    score: passed ? 100 : 0,
    flags: found,
  }
}

/**
 * Check for scammy niche indicators
 */
export function checkScamRisk(text: string, settings: FilterSettings): FilterResult {
  if (!settings.enableScamFilter) {
    return { passed: true, score: 100, flags: [] }
  }
  
  const lower = text.toLowerCase()
  const found: string[] = []
  
  for (const keyword of SCAM_KEYWORDS) {
    if (lower.includes(keyword)) {
      found.push(keyword)
    }
  }
  
  const passed = found.length === 0
  
  return {
    passed,
    reason: passed ? undefined : `Scam risk indicators: ${found.join(', ')}`,
    score: passed ? 100 : 0,
    flags: found,
  }
}

/**
 * Comprehensive filter check combining all filters
 */
export function applyFilters(
  text: string,
  momentum: MomentumScore | null,
  settings: FilterSettings = DEFAULT_FILTER_SETTINGS
): {
  passed: boolean
  overallScore: number
  reasons: string[]
  results: {
    profanity: FilterResult
    trademark: FilterResult
    scam: FilterResult
    momentum?: FilterResult
  }
} {
  // Run all filter checks
  const profanity = checkProfanity(text, settings)
  const trademark = checkTrademarkRisk(text, settings)
  const scam = checkScamRisk(text, settings)
  
  const results: { profanity: FilterResult; trademark: FilterResult; scam: FilterResult; momentum?: FilterResult } = { profanity, trademark, scam }
  const reasons: string[] = []
  
  // Check momentum if provided
  if (momentum) {
    const momentumPassed = momentum.score >= settings.momentumThreshold &&
                          momentum.persistence >= settings.persistenceThreshold
    
    results.momentum = {
      passed: momentumPassed,
      reason: momentumPassed ? undefined : 
        `Low momentum: score ${momentum.score} (need ${settings.momentumThreshold}), ` +
        `persistence ${momentum.persistence}d (need ${settings.persistenceThreshold}d)`,
      score: momentum.score,
      flags: momentumPassed ? [] : ['low-momentum'],
    }
    
    if (!momentumPassed) {
      reasons.push(results.momentum?.reason!)
    }
  }
  
  // Collect reasons
  if (!profanity.passed) reasons.push(profanity.reason!)
  if (!trademark.passed) reasons.push(trademark.reason!)
  if (!scam.passed) reasons.push(scam.reason!)
  
  // Calculate overall score (weighted average)
  const scores = [
    profanity.score * 0.3,
    trademark.score * 0.3,
    scam.score * 0.2,
    momentum ? momentum.score * 0.2 : 20, // Default 20 if no momentum data
  ]
  
  const overallScore = Math.round(scores.reduce((sum, s) => sum + s, 0))
  
  // Pass if all critical filters pass and score is high enough
  const passed = profanity.passed && trademark.passed && scam.passed &&
                 (!momentum || results.momentum?.passed === true)
  
  return {
    passed,
    overallScore,
    reasons,
    results,
  }
}

/**
 * Generate mock historical data for testing momentum
 * In production, this would come from real trend tracking
 */
export function generateMockHistoricalData(
  keyword: string,
  days: number = 30,
  trend: 'rising' | 'falling' | 'stable' = 'stable'
): Array<{ date: Date; volume: number; score: number }> {
  const data: Array<{ date: Date; volume: number; score: number }> = []
  let baseScore = 50
  
  for (let i = 0; i < days; i++) {
    const date = new Date(Date.now() - (days - i) * 24 * 60 * 60 * 1000)
    
    // Add trend - make changes more pronounced for detection
    if (trend === 'rising') {
      baseScore += Math.random() * 5 + 3 // +3 to +8 per day (more pronounced)
    } else if (trend === 'falling') {
      baseScore -= Math.random() * 5 + 3 // -3 to -8 per day (more pronounced)
    } else {
      baseScore += (Math.random() - 0.5) * 1 // -0.5 to +0.5 per day (very stable)
    }
    
    // Keep in bounds
    baseScore = Math.max(10, Math.min(90, baseScore))
    
    const volume = Math.round(baseScore * 100 + Math.random() * 1000)
    
    data.push({
      date,
      volume,
      score: Math.round(baseScore),
    })
  }
  
  return data
}
