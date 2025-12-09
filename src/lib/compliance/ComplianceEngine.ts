/**
 * ComplianceEngine.ts — PRE-TRADE COMPLIANCE SYSTEM
 * Trademark, UDRP, brand impersonation, and content filters
 * December 2025 — Stay out of legal trouble
 */

import { logger } from '@/lib/utils/logger'
import { auditLog } from '@/lib/infrastructure/AuditLog'
import { legalScanner } from './LegalScanner'

// ==================== TYPES ====================

export interface ComplianceCheckResult {
  domain: string
  passed: boolean
  riskScore: number // 0-100, higher = riskier
  riskLevel: 'safe' | 'low' | 'medium' | 'high' | 'critical'
  checks: ComplianceCheck[]
  blockedBy?: string[]
  warnings: string[]
  recommendations: string[]
  estimatedLegalRisk: number // USD
  correlationId?: string
}

export interface ComplianceCheck {
  name: string
  passed: boolean
  score: number
  details?: string
  source?: string
}

export interface BlocklistEntry {
  pattern: string
  type: 'exact' | 'contains' | 'regex' | 'suffix'
  reason: string
  severity: 'block' | 'warn'
  addedAt: Date
  source?: string
}

export interface ComplianceConfig {
  enabled: boolean
  strictMode: boolean // Block on warnings too
  minSafetyScore: number // 0-100
  enableTrademarkCheck: boolean
  enableBrandCheck: boolean
  enableContentFilter: boolean
  enableGeoRestrictions: boolean
  blockedTLDs: string[]
  allowedTLDs: string[]
  maxRiskScore: number
}

// ==================== FAMOUS BRANDS ====================

const FAMOUS_BRANDS = [
  // Tech
  'apple', 'google', 'microsoft', 'amazon', 'facebook', 'meta', 'netflix', 'spotify',
  'twitter', 'instagram', 'whatsapp', 'tiktok', 'snapchat', 'linkedin', 'uber', 'lyft',
  'airbnb', 'tesla', 'nvidia', 'intel', 'amd', 'oracle', 'salesforce', 'adobe', 'zoom',
  'slack', 'dropbox', 'github', 'gitlab', 'atlassian', 'stripe', 'paypal', 'square',
  'coinbase', 'binance', 'opensea', 'ethereum', 'bitcoin', 'solana',
  
  // Finance
  'visa', 'mastercard', 'amex', 'chase', 'wellsfargo', 'bankofamerica', 'citibank',
  'goldmansachs', 'morganstanley', 'jpmorgan', 'blackrock', 'vanguard', 'fidelity',
  
  // Retail
  'walmart', 'target', 'costco', 'kroger', 'walgreens', 'cvs', 'homedepot', 'lowes',
  'bestbuy', 'macys', 'nordstrom', 'kohls', 'tjmaxx', 'ross', 'ikea', 'wayfair',
  
  // Food
  'mcdonalds', 'starbucks', 'subway', 'burgerking', 'wendys', 'chickfila', 'chipotle',
  'dominos', 'pizzahut', 'dunkin', 'coca-cola', 'pepsi', 'nestle', 'kraft',
  
  // Fashion
  'nike', 'adidas', 'puma', 'underarmour', 'lululemon', 'gap', 'hm', 'zara', 'uniqlo',
  'gucci', 'louis', 'vuitton', 'chanel', 'prada', 'hermes', 'burberry', 'versace',
  
  // Auto
  'ford', 'chevrolet', 'toyota', 'honda', 'bmw', 'mercedes', 'audi', 'porsche',
  'ferrari', 'lamborghini', 'volkswagen', 'nissan', 'hyundai', 'kia', 'subaru',
  
  // Entertainment
  'disney', 'warner', 'universal', 'paramount', 'sony', 'nintendo', 'xbox', 'playstation',
  'marvel', 'dc', 'pixar', 'dreamworks', 'hbo', 'espn', 'cnn', 'bbc', 'nfl', 'nba',
  
  // Other
  'fedex', 'ups', 'usps', 'dhl', 'marriott', 'hilton', 'hyatt', 'airbus', 'boeing',
]

// ==================== BANNED TERMS ====================

const BANNED_TERMS = [
  // Adult/explicit
  'porn', 'xxx', 'sex', 'nude', 'adult', 'escort', 'cam', 'stripper',
  
  // Illegal
  'drug', 'cocaine', 'heroin', 'meth', 'weed', 'cannabis', 'marijuana',
  'gun', 'weapon', 'explosive', 'bomb', 'terror',
  
  // Fraud indicators
  'login', 'signin', 'account', 'verify', 'secure', 'official', 'support',
  'password', 'credential', 'banking', 'wallet',
  
  // Scam patterns
  'free', 'winner', 'prize', 'lottery', 'casino', 'bet', 'gamble',
  
  // Hate/harmful
  'hate', 'racist', 'nazi', 'kkk', 'supremacist',
]

// ==================== SUSPICIOUS SUFFIXES ====================

const SUSPICIOUS_SUFFIXES = [
  '-login', '-signin', '-official', '-support', '-help', '-verify',
  '-secure', '-account', '-wallet', '-store', '-shop', '-buy',
  '-discount', '-sale', '-free', '-win', '-prize',
]

// ==================== BLOCKED TLDs ====================

const DEFAULT_BLOCKED_TLDS = [
  '.ru', '.cn', '.ir', '.kp', '.su', // Sanctioned/high-risk countries
  '.xxx', '.adult', '.porn', '.sex', // Adult TLDs
  '.zip', '.mov', // Confusing TLDs
]

// ==================== COMPLIANCE ENGINE ====================

class ComplianceEngine {
  private config: ComplianceConfig
  private customBlocklist: BlocklistEntry[] = []
  private checkCache: Map<string, { result: ComplianceCheckResult; expiresAt: number }> = new Map()
  private readonly CACHE_TTL = 6 * 60 * 60 * 1000 // 6 hours

  constructor() {
    this.config = {
      enabled: true,
      strictMode: false,
      minSafetyScore: 70,
      enableTrademarkCheck: true,
      enableBrandCheck: true,
      enableContentFilter: true,
      enableGeoRestrictions: true,
      blockedTLDs: DEFAULT_BLOCKED_TLDS,
      allowedTLDs: ['.com', '.net', '.org', '.io', '.ai', '.co', '.app', '.dev', '.xyz'],
      maxRiskScore: 50,
    }

    this.loadBlocklist()
  }

  // ==================== MAIN CHECK ====================

  /**
   * Run full compliance check on a domain
   */
  async check(domain: string, correlationId?: string): Promise<ComplianceCheckResult> {
    if (!this.config.enabled) {
      return this.createPassResult(domain, correlationId)
    }

    // Check cache
    const cached = this.checkCache.get(domain)
    if (cached && cached.expiresAt > Date.now()) {
      return { ...cached.result, correlationId }
    }

    const checks: ComplianceCheck[] = []
    const warnings: string[] = []
    const blockedBy: string[] = []
    const recommendations: string[] = []
    let riskScore = 0

    const domainName = domain.split('.')[0].toLowerCase()
    const tld = '.' + domain.split('.').slice(1).join('.')

    // 1. TLD Check
    const tldCheck = this.checkTLD(tld)
    checks.push(tldCheck)
    if (!tldCheck.passed) {
      blockedBy.push(tldCheck.name)
      riskScore += 30
    }

    // 2. Banned Terms Check
    const bannedCheck = this.checkBannedTerms(domainName)
    checks.push(bannedCheck)
    if (!bannedCheck.passed) {
      blockedBy.push(bannedCheck.name)
      riskScore += 50
    } else if (bannedCheck.score < 100) {
      warnings.push(bannedCheck.details || 'Suspicious terms detected')
      riskScore += 20
    }

    // 3. Famous Brand Check
    if (this.config.enableBrandCheck) {
      const brandCheck = this.checkBrandInfringement(domainName)
      checks.push(brandCheck)
      if (!brandCheck.passed) {
        blockedBy.push(brandCheck.name)
        riskScore += 40
      } else if (brandCheck.score < 100) {
        warnings.push(brandCheck.details || 'Potential brand similarity')
        riskScore += 15
      }
    }

    // 4. Cybersquatting Pattern Check
    const squatCheck = this.checkCybersquattingPatterns(domainName)
    checks.push(squatCheck)
    if (!squatCheck.passed) {
      blockedBy.push(squatCheck.name)
      riskScore += 35
    }

    // 5. Trademark Check (USPTO/WIPO)
    if (this.config.enableTrademarkCheck) {
      try {
        const trademarkCheck = await this.checkTrademarks(domain)
        checks.push(trademarkCheck)
        if (!trademarkCheck.passed) {
          blockedBy.push(trademarkCheck.name)
          riskScore += 45
        } else if (trademarkCheck.score < 100) {
          warnings.push(trademarkCheck.details || 'Similar trademarks exist')
          riskScore += 20
        }
      } catch (error) {
        logger.warn('COMPLIANCE', 'Trademark check failed', { domain, error })
        warnings.push('Trademark check unavailable - proceed with caution')
        riskScore += 10
      }
    }

    // 6. Custom Blocklist Check
    const blocklistCheck = this.checkCustomBlocklist(domain)
    checks.push(blocklistCheck)
    if (!blocklistCheck.passed) {
      blockedBy.push(blocklistCheck.name)
      riskScore += 100 // Instant block
    }

    // 7. Content Filter (adult/illegal)
    if (this.config.enableContentFilter) {
      const contentCheck = this.checkContentPolicy(domainName)
      checks.push(contentCheck)
      if (!contentCheck.passed) {
        blockedBy.push(contentCheck.name)
        riskScore += 60
      }
    }

    // Calculate risk level
    const riskLevel = this.calculateRiskLevel(riskScore)
    const passed = blockedBy.length === 0 && 
                   riskScore <= this.config.maxRiskScore &&
                   (!this.config.strictMode || warnings.length === 0)

    // Generate recommendations
    if (riskLevel === 'medium') {
      recommendations.push('Consider manual review before acquisition')
      recommendations.push('Document legitimate business use case')
    } else if (riskLevel === 'high' || riskLevel === 'critical') {
      recommendations.push('Do NOT acquire - high legal risk')
      recommendations.push('Consult legal counsel if proceeding')
    } else if (riskLevel === 'safe') {
      recommendations.push('Safe to acquire')
    }

    // Estimate legal risk
    const estimatedLegalRisk = this.estimateLegalRisk(riskScore, checks)

    const result: ComplianceCheckResult = {
      domain,
      passed,
      riskScore: Math.min(100, riskScore),
      riskLevel,
      checks,
      blockedBy: blockedBy.length > 0 ? blockedBy : undefined,
      warnings,
      recommendations,
      estimatedLegalRisk,
      correlationId,
    }

    // Cache result
    this.checkCache.set(domain, {
      result,
      expiresAt: Date.now() + this.CACHE_TTL,
    })

    // Audit log
    auditLog.logCompliance(domain, passed ? 'pass' : 'block', {
      checks: Object.fromEntries(checks.map(c => [c.name, c.passed])),
      riskLevel,
      reasons: blockedBy,
      correlationId,
    })

    return result
  }

  // ==================== INDIVIDUAL CHECKS ====================

  private checkTLD(tld: string): ComplianceCheck {
    const isBlocked = this.config.blockedTLDs.some(b => tld.endsWith(b))
    const isAllowed = this.config.allowedTLDs.length === 0 || 
                      this.config.allowedTLDs.some(a => tld.endsWith(a))

    return {
      name: 'TLD Policy',
      passed: !isBlocked && isAllowed,
      score: isBlocked ? 0 : (isAllowed ? 100 : 50),
      details: isBlocked ? `TLD ${tld} is blocked` : 
               (!isAllowed ? `TLD ${tld} not in allowed list` : 'TLD is allowed'),
    }
  }

  private checkBannedTerms(domainName: string): ComplianceCheck {
    const foundTerms: string[] = []
    
    for (const term of BANNED_TERMS) {
      if (domainName.includes(term)) {
        foundTerms.push(term)
      }
    }

    return {
      name: 'Banned Terms',
      passed: foundTerms.length === 0,
      score: foundTerms.length === 0 ? 100 : 0,
      details: foundTerms.length > 0 ? `Contains banned terms: ${foundTerms.join(', ')}` : 'No banned terms',
    }
  }

  private checkBrandInfringement(domainName: string): ComplianceCheck {
    const matchedBrands: { brand: string; similarity: number }[] = []

    for (const brand of FAMOUS_BRANDS) {
      // Exact match
      if (domainName === brand || domainName === brand.replace(/-/g, '')) {
        return {
          name: 'Brand Protection',
          passed: false,
          score: 0,
          details: `Exact match with protected brand: ${brand}`,
        }
      }

      // Contains brand
      if (domainName.includes(brand)) {
        matchedBrands.push({ brand, similarity: 90 })
      }

      // Levenshtein similarity
      const similarity = this.calculateSimilarity(domainName, brand)
      if (similarity > 0.85 && similarity < 1) {
        matchedBrands.push({ brand, similarity: similarity * 100 })
      }
    }

    if (matchedBrands.length > 0) {
      const highestRisk = matchedBrands.sort((a, b) => b.similarity - a.similarity)[0]
      return {
        name: 'Brand Protection',
        passed: highestRisk.similarity < 90,
        score: 100 - highestRisk.similarity,
        details: `Similar to brand: ${highestRisk.brand} (${highestRisk.similarity.toFixed(0)}% match)`,
      }
    }

    return {
      name: 'Brand Protection',
      passed: true,
      score: 100,
      details: 'No brand conflicts detected',
    }
  }

  private checkCybersquattingPatterns(domainName: string): ComplianceCheck {
    // Check for suspicious suffixes
    for (const suffix of SUSPICIOUS_SUFFIXES) {
      if (domainName.endsWith(suffix.replace('-', ''))) {
        // Check if prefix is a brand
        const prefix = domainName.slice(0, -suffix.replace('-', '').length)
        if (FAMOUS_BRANDS.includes(prefix)) {
          return {
            name: 'Cybersquatting Check',
            passed: false,
            score: 0,
            details: `Cybersquatting pattern detected: ${prefix}${suffix}`,
          }
        }
      }
    }

    // Check for typosquatting patterns
    const typoPatterns = [
      /(.)\1{3,}/, // Repeated characters (gooooogle)
      /[0o][0o]/, // Zero for O substitution
      /[1il][1il]/, // 1/I/l confusion
      /rn/, // 'rn' looks like 'm'
    ]

    for (const pattern of typoPatterns) {
      if (pattern.test(domainName)) {
        const cleanName = domainName.replace(pattern, '')
        for (const brand of FAMOUS_BRANDS.slice(0, 50)) { // Check top brands
          if (this.calculateSimilarity(cleanName, brand) > 0.8) {
            return {
              name: 'Cybersquatting Check',
              passed: false,
              score: 0,
              details: `Potential typosquat of: ${brand}`,
            }
          }
        }
      }
    }

    return {
      name: 'Cybersquatting Check',
      passed: true,
      score: 100,
      details: 'No cybersquatting patterns detected',
    }
  }

  private async checkTrademarks(domain: string): Promise<ComplianceCheck> {
    const assessment = await legalScanner.assessRisk(domain)
    
    return {
      name: 'Trademark Check',
      passed: assessment.overallRisk === 'safe' || assessment.overallRisk === 'low',
      score: assessment.safetyScore,
      details: assessment.uspto.reasoning,
      source: 'USPTO/WIPO',
    }
  }

  private checkCustomBlocklist(domain: string): ComplianceCheck {
    for (const entry of this.customBlocklist) {
      let matches = false
      
      switch (entry.type) {
        case 'exact':
          matches = domain.toLowerCase() === entry.pattern.toLowerCase()
          break
        case 'contains':
          matches = domain.toLowerCase().includes(entry.pattern.toLowerCase())
          break
        case 'regex':
          try {
            matches = new RegExp(entry.pattern, 'i').test(domain)
          } catch {
            // Invalid regex, skip
          }
          break
        case 'suffix':
          matches = domain.toLowerCase().endsWith(entry.pattern.toLowerCase())
          break
      }

      if (matches) {
        return {
          name: 'Custom Blocklist',
          passed: entry.severity !== 'block',
          score: entry.severity === 'block' ? 0 : 50,
          details: entry.reason,
          source: entry.source,
        }
      }
    }

    return {
      name: 'Custom Blocklist',
      passed: true,
      score: 100,
      details: 'Not in blocklist',
    }
  }

  private checkContentPolicy(domainName: string): ComplianceCheck {
    // Adult content indicators
    const adultIndicators = ['xxx', 'porn', 'sex', 'nude', 'adult', 'cam', 'escort']
    for (const indicator of adultIndicators) {
      if (domainName.includes(indicator)) {
        return {
          name: 'Content Policy',
          passed: false,
          score: 0,
          details: `Adult content indicator: ${indicator}`,
        }
      }
    }

    // Illegal content indicators
    const illegalIndicators = ['drug', 'weed', 'coke', 'meth', 'pill', 'pharm']
    for (const indicator of illegalIndicators) {
      if (domainName.includes(indicator)) {
        return {
          name: 'Content Policy',
          passed: false,
          score: 0,
          details: `Potential illegal content: ${indicator}`,
        }
      }
    }

    return {
      name: 'Content Policy',
      passed: true,
      score: 100,
      details: 'Content policy compliant',
    }
  }

  // ==================== HELPERS ====================

  private calculateRiskLevel(score: number): ComplianceCheckResult['riskLevel'] {
    if (score >= 80) return 'critical'
    if (score >= 50) return 'high'
    if (score >= 30) return 'medium'
    if (score >= 10) return 'low'
    return 'safe'
  }

  private estimateLegalRisk(score: number, checks: ComplianceCheck[]): number {
    // Base risk from score
    let risk = score * 500 // $500 per risk point

    // Multiply for specific high-risk checks
    for (const check of checks) {
      if (!check.passed) {
        if (check.name === 'Brand Protection') risk *= 2
        if (check.name === 'Trademark Check') risk *= 2.5
        if (check.name === 'Cybersquatting Check') risk *= 1.5
      }
    }

    return Math.min(200000, Math.round(risk))
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2
    const shorter = str1.length > str2.length ? str2 : str1
    
    if (longer.length === 0) return 1.0
    
    const editDistance = this.levenshteinDistance(longer, shorter)
    return (longer.length - editDistance) / longer.length
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = []
    
    for (let i = 0; i <= str2.length; i++) matrix[i] = [i]
    for (let j = 0; j <= str1.length; j++) matrix[0][j] = j
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          )
        }
      }
    }
    
    return matrix[str2.length][str1.length]
  }

  private createPassResult(domain: string, correlationId?: string): ComplianceCheckResult {
    return {
      domain,
      passed: true,
      riskScore: 0,
      riskLevel: 'safe',
      checks: [{ name: 'Compliance Disabled', passed: true, score: 100 }],
      warnings: [],
      recommendations: ['Compliance checks disabled'],
      estimatedLegalRisk: 0,
      correlationId,
    }
  }

  // ==================== BLOCKLIST MANAGEMENT ====================

  addToBlocklist(entry: Omit<BlocklistEntry, 'addedAt'>): void {
    this.customBlocklist.push({ ...entry, addedAt: new Date() })
    this.saveBlocklist()
    logger.info('COMPLIANCE', `Added to blocklist: ${entry.pattern}`, { reason: entry.reason })
  }

  removeFromBlocklist(pattern: string): boolean {
    const index = this.customBlocklist.findIndex(e => e.pattern === pattern)
    if (index !== -1) {
      this.customBlocklist.splice(index, 1)
      this.saveBlocklist()
      return true
    }
    return false
  }

  getBlocklist(): BlocklistEntry[] {
    return [...this.customBlocklist]
  }

  // ==================== BATCH OPERATIONS ====================

  async batchCheck(domains: string[], correlationId?: string): Promise<Map<string, ComplianceCheckResult>> {
    const results = new Map<string, ComplianceCheckResult>()
    
    // Process in batches to avoid overwhelming external APIs
    const batchSize = 10
    for (let i = 0; i < domains.length; i += batchSize) {
      const batch = domains.slice(i, i + batchSize)
      const batchResults = await Promise.all(
        batch.map(d => this.check(d, correlationId))
      )
      batch.forEach((domain, idx) => results.set(domain, batchResults[idx]))
      
      // Rate limiting
      if (i + batchSize < domains.length) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }

    return results
  }

  async filterCompliant(domains: string[]): Promise<string[]> {
    const results = await this.batchCheck(domains)
    return domains.filter(d => results.get(d)?.passed)
  }

  // ==================== CONFIG ====================

  setConfig(config: Partial<ComplianceConfig>): void {
    this.config = { ...this.config, ...config }
    logger.info('COMPLIANCE', 'Config updated', this.config)
  }

  getConfig(): ComplianceConfig {
    return { ...this.config }
  }

  // ==================== PERSISTENCE ====================

  private saveBlocklist(): void {
    try {
      localStorage.setItem('domainFlipper_blocklist', JSON.stringify(
        this.customBlocklist.map(e => ({ ...e, addedAt: e.addedAt.toISOString() }))
      ))
    } catch (e) {
      // Ignore
    }
  }

  private loadBlocklist(): void {
    try {
      const saved = localStorage.getItem('domainFlipper_blocklist')
      if (saved) {
        this.customBlocklist = JSON.parse(saved).map((e: any) => ({
          ...e,
          addedAt: new Date(e.addedAt),
        }))
      }
    } catch (e) {
      // Ignore
    }
  }

  clearCache(): void {
    this.checkCache.clear()
  }
}

// ==================== SINGLETON ====================

export const complianceEngine = new ComplianceEngine()
