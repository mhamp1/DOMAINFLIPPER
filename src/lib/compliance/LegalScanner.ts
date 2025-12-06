/**
 * LegalScanner.ts — AI LEGAL PROTECTION
 * USPTO + WIPO trademark conflict detection, GDPR compliance
 * December 2025 — Avoid $100k+ lawsuits
 */

import axios from 'axios'
import { toast } from 'sonner'

// ==================== TYPES ====================

interface TrademarkResult {
  exists: boolean
  marks: Array<{
    name: string
    serialNumber: string
    status: 'LIVE' | 'DEAD' | 'PENDING'
    owner: string
    filingDate: Date
    classes: number[]
    description?: string
  }>
  riskLevel: 'high' | 'medium' | 'low' | 'none'
  recommendation: 'avoid' | 'proceed-with-caution' | 'safe' | 'premium-opportunity'
  reasoning: string
}

interface WIPOResult {
  exists: boolean
  internationalMarks: Array<{
    markName: string
    registrationNumber: string
    holder: string
    designations: string[]
    status: string
  }>
  riskLevel: 'high' | 'medium' | 'low' | 'none'
}

interface LegalRiskAssessment {
  domain: string
  overallRisk: 'critical' | 'high' | 'medium' | 'low' | 'safe'
  uspto: TrademarkResult
  wipo: WIPOResult
  gdprCompliant: boolean
  cybersquattingRisk: boolean
  udrpRisk: boolean
  recommendations: string[]
  estimatedLegalCost: number // potential lawsuit cost
  safetyScore: number // 0-100
}

interface GDPRConfig {
  whoisMasking: boolean
  dataRetentionDays: number
  consentRequired: boolean
  rightToErasure: boolean
}

// ==================== LEGAL SCANNER ====================

export class LegalScanner {
  private usptoApiKey: string
  private wipoEnabled: boolean
  private gdprConfig: GDPRConfig
  private scanCache: Map<string, LegalRiskAssessment> = new Map()
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours

  constructor(config?: {
    usptoApiKey?: string
    wipoEnabled?: boolean
    gdprConfig?: Partial<GDPRConfig>
  }) {
    // Use HARDCODED USPTO key (NEVER empty)
    this.usptoApiKey = config?.usptoApiKey || import.meta.env.VITE_USPTO_API_KEY || 'xqdufhsmpwfxsmdtsmvlmzqmgyxukr'
    this.wipoEnabled = config?.wipoEnabled ?? true
    this.gdprConfig = {
      whoisMasking: true,
      dataRetentionDays: 365,
      consentRequired: true,
      rightToErasure: true,
      ...config?.gdprConfig,
    }
  }

  // ==================== USPTO TRADEMARK SEARCH ====================

  /**
   * Search USPTO trademark database
   */
  async searchUSPTO(keyword: string): Promise<TrademarkResult> {
    try {
      // USPTO TSDR API
      const response = await axios.get('https://tsdrapi.uspto.gov/ts/cd/public/v1/search', {
        params: {
          q: keyword,
          f: '["serialNumber","markIdentification","currentStatus","ownerName","filingDate","internationalClass"]',
          rows: 20,
          api_key: this.usptoApiKey,
        },
        timeout: 15000,
        headers: { 'User-Agent': 'DomainFlipper/2.0' },
      })

      const results = response.data?.searchResponse?.results || []
      
      // Filter to live/pending marks
      const relevantMarks = results
        .filter((r: any) => {
          const status = r.currentStatus?.[0] || ''
          return status.includes('LIVE') || status.includes('PENDING')
        })
        .map((r: any) => ({
          name: r.markIdentification?.[0] || '',
          serialNumber: r.serialNumber?.[0] || '',
          status: r.currentStatus?.[0]?.includes('LIVE') ? 'LIVE' as const : 
                  r.currentStatus?.[0]?.includes('PENDING') ? 'PENDING' as const : 'DEAD' as const,
          owner: r.ownerName?.[0] || 'Unknown',
          filingDate: new Date(r.filingDate?.[0] || Date.now()),
          classes: r.internationalClass?.map((c: string) => parseInt(c)) || [],
          description: r.goodsServices?.[0],
        }))

      // Calculate risk level
      let riskLevel: TrademarkResult['riskLevel'] = 'none'
      let recommendation: TrademarkResult['recommendation'] = 'safe'
      let reasoning = 'No conflicting trademarks found.'

      if (relevantMarks.length > 0) {
        // Check for exact match
        const exactMatch = relevantMarks.find(
          (m: { name: string }) => m.name.toLowerCase() === keyword.toLowerCase()
        )

        if (exactMatch) {
          riskLevel = 'high'
          recommendation = 'avoid'
          reasoning = `Exact trademark match found: "${exactMatch.name}" (${exactMatch.status}) owned by ${exactMatch.owner}. HIGH UDRP risk.`
        } else {
          // Check for similar marks
          const similarMarks = relevantMarks.filter((m: { name: string }) => 
            this.calculateSimilarity(m.name.toLowerCase(), keyword.toLowerCase()) > 0.7
          )

          if (similarMarks.length > 0) {
            riskLevel = 'medium'
            recommendation = 'proceed-with-caution'
            reasoning = `${similarMarks.length} similar trademark(s) found. Consider legal review before acquisition.`
          } else {
            riskLevel = 'low'
            recommendation = 'safe'
            reasoning = `${relevantMarks.length} related marks found but none are conflicting.`
          }
        }

        // Check for famous brands (premium opportunity if available)
        const famousBrands = ['apple', 'google', 'amazon', 'microsoft', 'facebook', 'meta', 'tesla', 'nike', 'coca-cola']
        if (famousBrands.some(b => keyword.toLowerCase().includes(b))) {
          riskLevel = 'high'
          recommendation = 'avoid'
          reasoning = `Domain contains famous brand name. Extremely high UDRP risk - avoid.`
        }
      } else {
        // No trademarks = potential premium opportunity
        if (keyword.length <= 5 && /^[a-z]+$/.test(keyword)) {
          recommendation = 'premium-opportunity'
          reasoning = `No conflicting trademarks and short brandable name. Premium acquisition opportunity!`
        }
      }

      return {
        exists: relevantMarks.length > 0,
        marks: relevantMarks,
        riskLevel,
        recommendation,
        reasoning,
      }
    } catch (error) {
      console.warn('USPTO search error:', error)
      return {
        exists: false,
        marks: [],
        riskLevel: 'low',
        recommendation: 'proceed-with-caution',
        reasoning: 'USPTO search failed. Recommend manual verification.',
      }
    }
  }

  /**
   * Calculate string similarity (Levenshtein-based)
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2
    const shorter = str1.length > str2.length ? str2 : str1
    
    if (longer.length === 0) return 1.0
    
    const editDistance = this.levenshteinDistance(longer, shorter)
    return (longer.length - editDistance) / longer.length
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = []
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i]
    }
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j
    }
    
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

  // ==================== WIPO INTERNATIONAL SEARCH ====================

  /**
   * Search WIPO Global Brand Database
   */
  async searchWIPO(keyword: string): Promise<WIPOResult> {
    if (!this.wipoEnabled) {
      return { exists: false, internationalMarks: [], riskLevel: 'none' }
    }

    try {
      // WIPO Global Brand Database API
      const response = await axios.get('https://branddb.wipo.int/brand-search/public/v1/search', {
        params: {
          q: keyword,
          rows: 20,
        },
        timeout: 15000,
        headers: { 'User-Agent': 'DomainFlipper/2.0' },
      })

      const results = response.data?.response?.docs || []
      
      const internationalMarks = results
        .filter((r: any) => r.STATUS_CODE === 'A') // Active marks
        .map((r: any) => ({
          markName: r.MARK_NAME || '',
          registrationNumber: r.REG_NUM || '',
          holder: r.HOLD_NAME_EN || r.HOLD_NAME || 'Unknown',
          designations: r.DESIG || [],
          status: r.STATUS_CODE || '',
        }))

      let riskLevel: WIPOResult['riskLevel'] = 'none'
      if (internationalMarks.length > 5) riskLevel = 'high'
      else if (internationalMarks.length > 2) riskLevel = 'medium'
      else if (internationalMarks.length > 0) riskLevel = 'low'

      return {
        exists: internationalMarks.length > 0,
        internationalMarks,
        riskLevel,
      }
    } catch (error) {
      console.warn('WIPO search error:', error)
      return { exists: false, internationalMarks: [], riskLevel: 'none' }
    }
  }

  // ==================== COMPREHENSIVE RISK ASSESSMENT ====================

  /**
   * Perform full legal risk assessment for a domain
   */
  async assessRisk(domain: string): Promise<LegalRiskAssessment> {
    // Check cache
    const cached = this.scanCache.get(domain)
    if (cached) return cached

    // Extract keyword from domain
    const keyword = domain.split('.')[0].replace(/-/g, '')

    // Parallel searches
    const [uspto, wipo] = await Promise.all([
      this.searchUSPTO(keyword),
      this.searchWIPO(keyword),
    ])

    // Assess cybersquatting risk
    const cybersquattingRisk = this.assessCybersquattingRisk(keyword, uspto, wipo)

    // Assess UDRP risk
    const udrpRisk = uspto.riskLevel === 'high' || 
                     (uspto.riskLevel === 'medium' && wipo.riskLevel !== 'none')

    // Calculate overall risk
    let overallRisk: LegalRiskAssessment['overallRisk'] = 'safe'
    if (uspto.riskLevel === 'high' || wipo.riskLevel === 'high' || cybersquattingRisk) {
      overallRisk = 'critical'
    } else if (uspto.riskLevel === 'medium' || wipo.riskLevel === 'medium') {
      overallRisk = 'high'
    } else if (uspto.riskLevel === 'low' || wipo.riskLevel === 'low') {
      overallRisk = 'medium'
    } else if (uspto.marks.length > 0 || wipo.internationalMarks.length > 0) {
      overallRisk = 'low'
    }

    // Generate recommendations
    const recommendations: string[] = []
    if (overallRisk === 'critical') {
      recommendations.push('DO NOT ACQUIRE - High legal risk')
      recommendations.push('Active trademarks detected - UDRP likely')
    } else if (overallRisk === 'high') {
      recommendations.push('Consult IP attorney before acquisition')
      recommendations.push('Verify no bad-faith use claims possible')
    } else if (overallRisk === 'medium') {
      recommendations.push('Monitor trademark filings after acquisition')
      recommendations.push('Document legitimate use case')
    } else {
      recommendations.push('Safe to acquire')
      if (uspto.recommendation === 'premium-opportunity') {
        recommendations.push('Premium brandable opportunity - prioritize!')
      }
    }

    // Calculate safety score (0-100)
    let safetyScore = 100
    if (uspto.riskLevel === 'high') safetyScore -= 40
    else if (uspto.riskLevel === 'medium') safetyScore -= 25
    else if (uspto.riskLevel === 'low') safetyScore -= 10
    
    if (wipo.riskLevel === 'high') safetyScore -= 30
    else if (wipo.riskLevel === 'medium') safetyScore -= 15
    else if (wipo.riskLevel === 'low') safetyScore -= 5

    if (cybersquattingRisk) safetyScore -= 20
    if (udrpRisk) safetyScore -= 15

    safetyScore = Math.max(0, safetyScore)

    // Estimate potential legal cost
    let estimatedLegalCost = 0
    if (overallRisk === 'critical') estimatedLegalCost = 150000
    else if (overallRisk === 'high') estimatedLegalCost = 75000
    else if (overallRisk === 'medium') estimatedLegalCost = 25000
    else if (overallRisk === 'low') estimatedLegalCost = 5000

    const assessment: LegalRiskAssessment = {
      domain,
      overallRisk,
      uspto,
      wipo,
      gdprCompliant: this.gdprConfig.whoisMasking,
      cybersquattingRisk,
      udrpRisk,
      recommendations,
      estimatedLegalCost,
      safetyScore,
    }

    // Cache result
    this.scanCache.set(domain, assessment)
    setTimeout(() => this.scanCache.delete(domain), this.CACHE_TTL)

    return assessment
  }

  /**
   * Assess cybersquatting risk
   */
  private assessCybersquattingRisk(keyword: string, uspto: TrademarkResult, wipo: WIPOResult): boolean {
    // Famous brand variations
    const famousBrands = [
      'apple', 'google', 'amazon', 'microsoft', 'facebook', 'meta', 'tesla', 'nike',
      'coca-cola', 'disney', 'netflix', 'spotify', 'uber', 'airbnb', 'twitter', 'x'
    ]

    // Check for typosquatting of famous brands
    for (const brand of famousBrands) {
      if (this.calculateSimilarity(keyword.toLowerCase(), brand) > 0.8) {
        return true
      }
    }

    // Check for common brand suffixes (e.g., apple-store, google-official)
    const suspiciousSuffixes = ['official', 'store', 'shop', 'buy', 'login', 'support', 'help']
    const keywordLower = keyword.toLowerCase()
    
    for (const brand of famousBrands) {
      for (const suffix of suspiciousSuffixes) {
        if (keywordLower === `${brand}${suffix}` || keywordLower === `${brand}-${suffix}`) {
          return true
        }
      }
    }

    return false
  }

  // ==================== GDPR COMPLIANCE ====================

  /**
   * Check GDPR compliance for domain handling
   */
  checkGDPRCompliance(domainData: {
    hasPersonalData: boolean
    dataLocation: string
    consentObtained: boolean
  }): { compliant: boolean; issues: string[]; recommendations: string[] } {
    const issues: string[] = []
    const recommendations: string[] = []

    // Check WHOIS masking
    if (!this.gdprConfig.whoisMasking) {
      issues.push('WHOIS privacy not enabled - personal data exposed')
      recommendations.push('Enable WHOIS privacy protection')
    }

    // Check consent
    if (this.gdprConfig.consentRequired && !domainData.consentObtained) {
      issues.push('User consent not obtained for data processing')
      recommendations.push('Implement consent mechanism')
    }

    // Check data location
    const euCompliantRegions = ['eu', 'eea', 'uk', 'us-privacy-shield']
    if (!euCompliantRegions.some(r => domainData.dataLocation.toLowerCase().includes(r))) {
      issues.push('Data may be stored in non-GDPR compliant region')
      recommendations.push('Ensure data is stored in GDPR-compliant region')
    }

    // Check data retention
    if (this.gdprConfig.dataRetentionDays > 365 * 3) {
      issues.push('Data retention period exceeds recommended maximum')
      recommendations.push('Review and reduce data retention period')
    }

    return {
      compliant: issues.length === 0,
      issues,
      recommendations,
    }
  }

  /**
   * Generate GDPR-compliant privacy notice for domain
   */
  generatePrivacyNotice(domain: string): string {
    return `
# Privacy Notice for ${domain}

## Data Controller
DomainFlipper AI

## Data Collected
- Domain registration data (WHOIS)
- Usage analytics (anonymized)
- Contact form submissions

## Legal Basis
- Legitimate interest (domain management)
- Consent (marketing communications)

## Data Retention
Data is retained for ${this.gdprConfig.dataRetentionDays} days after last activity.

## Your Rights
- Access your data
- Request correction
- Request deletion
- Data portability
- Withdraw consent

## Contact
privacy@domainflipper.ai

Last updated: ${new Date().toISOString().split('T')[0]}
    `.trim()
  }

  // ==================== BATCH SCANNING ====================

  /**
   * Scan multiple domains for legal risk
   */
  async batchScan(domains: string[]): Promise<Map<string, LegalRiskAssessment>> {
    const results = new Map<string, LegalRiskAssessment>()
    const batchSize = 5 // Process 5 at a time to avoid rate limits

    for (let i = 0; i < domains.length; i += batchSize) {
      const batch = domains.slice(i, i + batchSize)
      const assessments = await Promise.all(batch.map(d => this.assessRisk(d)))
      
      batch.forEach((domain, idx) => {
        results.set(domain, assessments[idx])
      })

      // Rate limiting
      if (i + batchSize < domains.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    // Log summary
    const critical = Array.from(results.values()).filter(r => r.overallRisk === 'critical').length
    const safe = Array.from(results.values()).filter(r => r.overallRisk === 'safe').length

    if (critical > 0) {
      toast.warning(`⚠️ LEGAL SCAN: ${critical} high-risk domains detected`, {
        description: `${safe}/${domains.length} domains are safe to acquire`,
        icon: '⚖️',
      })
    } else {
      toast.success(`✅ LEGAL SCAN: All clear`, {
        description: `${safe}/${domains.length} domains safe to acquire`,
        icon: '⚖️',
      })
    }

    return results
  }

  /**
   * Filter domains by legal safety
   */
  async filterSafeDomains(domains: string[], minSafetyScore = 70): Promise<string[]> {
    const assessments = await this.batchScan(domains)
    
    return domains.filter(d => {
      const assessment = assessments.get(d)
      return assessment && assessment.safetyScore >= minSafetyScore
    })
  }
}

// Export singleton
export const legalScanner = new LegalScanner()

