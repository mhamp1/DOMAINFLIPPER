/**
 * Brandability Scorer — NLP-based Domain Brandability Analysis
 * December 2025
 * 
 * Scores domains based on:
 * - Pronounceability (CVCV patterns, vowel/consonant ratio)
 * - Syllable count estimation
 * - Token cleanliness
 * - Stopword/profanity/trademark risk filters
 * - Language detection
 */

export interface BrandabilityConfig {
  minVowelRatio: number          // 0.2-0.5 typical for brandable names
  maxVowelRatio: number          // 0.2-0.5 typical for brandable names
  maxLength: number              // Shorter = more brandable
  minLength: number              // Too short may not be brandable
  penalizeProfanity: boolean     // Flag profanity risks
  penalizeStopwords: boolean     // Flag common stopwords
  penalizeTrademark: boolean     // Flag potential trademark risks
  requireEnglish: boolean        // Downweight non-English
  minScore: number               // Minimum brandability score (0-100)
}

export interface BrandabilityScore {
  score: number                  // 0-100 overall score
  pronounceability: number       // 0-100
  syllableCount: number          // Estimated syllables
  vowelRatio: number            // 0.0-1.0
  consonantRatio: number        // 0.0-1.0
  length: number                // Character count
  hasNumbers: boolean           // Contains digits
  hasHyphens: boolean           // Contains hyphens
  cvcvScore: number             // CVCV pattern score
  isClean: boolean              // No profanity/stopwords/TM risks
  language: string              // Detected language
  warnings: string[]            // Any issues found
  breakdown: string             // Explanation of score
}

// Common stopwords that reduce brandability
const STOPWORDS = new Set([
  'the', 'and', 'but', 'for', 'with', 'from', 'this', 'that', 'have',
  'been', 'have', 'has', 'had', 'can', 'will', 'would', 'could', 'should',
  'get', 'got', 'make', 'made', 'take', 'use', 'used', 'new', 'old', 'good',
  'great', 'best', 'top', 'free', 'buy', 'sell', 'online', 'web', 'site',
  'home', 'page', 'cheap', 'fast', 'easy', 'simple', 'quick', 'real', 'true'
])

// Profanity patterns (simplified for production)
const PROFANITY_PATTERNS = [
  /\b(damn|hell|crap|suck|stupid|dumb|idiot|moron|jerk)\b/i,
  // Add more patterns as needed
]

// Common trademark patterns to flag
const TRADEMARK_PATTERNS = [
  /\b(google|facebook|apple|amazon|microsoft|twitter|meta|tesla|netflix)\b/i,
  /\b(nike|adidas|coca|pepsi|mcdonalds|disney|sony|samsung|intel|oracle)\b/i,
]

// Vowels and consonants
const VOWELS = new Set(['a', 'e', 'i', 'o', 'u', 'y'])
const CONSONANTS = new Set('bcdfghjklmnpqrstvwxz'.split(''))

// Language detection heuristics (basic)
const LANGUAGE_PATTERNS = {
  spanish: /[áéíóúñü]/i,
  french: /[àâæçéèêëïîôœùûü]/i,
  german: /[äöüß]/i,
  italian: /[àèéìíîòóùú]/i,
  portuguese: /[ãáâàçéêíóôõú]/i,
  // English is default
}

export const DEFAULT_BRANDABILITY_CONFIG: BrandabilityConfig = {
  minVowelRatio: 0.25,
  maxVowelRatio: 0.5,
  maxLength: 15,
  minLength: 4,
  penalizeProfanity: true,
  penalizeStopwords: true,
  penalizeTrademark: true,
  requireEnglish: false,
  minScore: 60,
}

export class BrandabilityScorer {
  private config: BrandabilityConfig
  
  constructor(config?: BrandabilityConfig) {
    this.config = config || DEFAULT_BRANDABILITY_CONFIG
  }

  /**
   * Score a domain name for brandability
   */
  scoreDomain(domain: string): BrandabilityScore {
    // Extract domain without TLD
    const name = this.extractName(domain)
    const lowerName = name.toLowerCase()
    
    const warnings: string[] = []
    let totalScore = 100
    
    // 1. Length analysis (optimal: 6-12 chars)
    const length = name.length
    let lengthScore = 100
    if (length < this.config.minLength) {
      lengthScore = 50
      warnings.push(`Too short (${length} chars)`)
      totalScore -= 25
    } else if (length > this.config.maxLength) {
      lengthScore = Math.max(0, 100 - (length - this.config.maxLength) * 5)
      warnings.push(`Too long (${length} chars)`)
      totalScore -= (length - this.config.maxLength) * 3
    } else if (length >= 6 && length <= 12) {
      lengthScore = 100
    } else {
      lengthScore = 85
    }
    
    // 2. Vowel/consonant ratio
    const { vowels, consonants, vowelRatio, consonantRatio } = this.analyzeCharacters(lowerName)
    let vowelScore = 100
    if (vowelRatio < this.config.minVowelRatio || vowelRatio > this.config.maxVowelRatio) {
      vowelScore = 70
      warnings.push(`Vowel ratio ${vowelRatio.toFixed(2)} outside optimal range`)
      totalScore -= 10
    }
    
    // 3. CVCV pattern score (alternating consonant-vowel is most pronounceable)
    const cvcvScore = this.calculateCVCVScore(lowerName)
    totalScore = totalScore * (cvcvScore / 100)
    
    // 4. Syllable estimation
    const syllableCount = this.estimateSyllables(lowerName)
    let syllableScore = 100
    if (syllableCount > 4) {
      syllableScore = Math.max(0, 100 - (syllableCount - 4) * 15)
      warnings.push(`Too many syllables (${syllableCount})`)
      totalScore -= 10
    }
    
    // 5. Numbers and hyphens reduce brandability
    const hasNumbers = /\d/.test(name)
    const hasHyphens = /-/.test(name)
    if (hasNumbers) {
      warnings.push('Contains numbers')
      totalScore -= 20
    }
    if (hasHyphens) {
      warnings.push('Contains hyphens')
      totalScore -= 15
    }
    
    // 6. Check for stopwords
    let isClean = true
    if (this.config.penalizeStopwords && this.containsStopword(lowerName)) {
      isClean = false
      warnings.push('Contains common stopword')
      totalScore -= 15
    }
    
    // 7. Check for profanity
    if (this.config.penalizeProfanity && this.containsProfanity(lowerName)) {
      isClean = false
      warnings.push('Contains profanity')
      totalScore -= 40
    }
    
    // 8. Check for trademark risks
    if (this.config.penalizeTrademark && this.containsTrademark(lowerName)) {
      isClean = false
      warnings.push('Potential trademark conflict')
      totalScore -= 50
    }
    
    // 9. Language detection
    const language = this.detectLanguage(lowerName)
    if (this.config.requireEnglish && language !== 'english') {
      warnings.push(`Non-English (${language})`)
      totalScore -= 20
    }
    
    // 10. Calculate pronounceability
    const pronounceability = (cvcvScore + vowelScore + syllableScore) / 3
    
    // Final score (capped at 0-100)
    const finalScore = Math.max(0, Math.min(100, totalScore))
    
    const breakdown = this.generateBreakdown(finalScore, {
      length: lengthScore,
      vowel: vowelScore,
      cvcv: cvcvScore,
      syllable: syllableScore,
      pronounceability,
      hasNumbers,
      hasHyphens,
      isClean,
    })
    
    return {
      score: Math.round(finalScore),
      pronounceability: Math.round(pronounceability),
      syllableCount,
      vowelRatio,
      consonantRatio,
      length,
      hasNumbers,
      hasHyphens,
      cvcvScore: Math.round(cvcvScore),
      isClean,
      language,
      warnings,
      breakdown,
    }
  }

  /**
   * Extract domain name without TLD
   */
  private extractName(domain: string): string {
    // Remove protocol if present
    domain = domain.replace(/^https?:\/\//, '')
    // Remove www. if present
    domain = domain.replace(/^www\./, '')
    // Extract name before first dot
    const parts = domain.split('.')
    return parts[0] || domain
  }

  /**
   * Analyze character composition
   */
  private analyzeCharacters(name: string) {
    let vowels = 0
    let consonants = 0
    
    for (const char of name) {
      if (VOWELS.has(char)) {
        vowels++
      } else if (CONSONANTS.has(char)) {
        consonants++
      }
    }
    
    const total = vowels + consonants
    return {
      vowels,
      consonants,
      vowelRatio: total > 0 ? vowels / total : 0,
      consonantRatio: total > 0 ? consonants / total : 0,
    }
  }

  /**
   * Calculate CVCV pattern score (alternating consonant-vowel)
   * Higher score = more pronounceable
   */
  private calculateCVCVScore(name: string): number {
    if (name.length === 0) return 0
    
    let alternations = 0
    let lastType: 'vowel' | 'consonant' | null = null
    
    for (const char of name) {
      if (VOWELS.has(char)) {
        if (lastType === 'consonant') alternations++
        lastType = 'vowel'
      } else if (CONSONANTS.has(char)) {
        if (lastType === 'vowel') alternations++
        lastType = 'consonant'
      }
    }
    
    // Score based on alternation frequency
    const maxPossibleAlternations = name.length - 1
    if (maxPossibleAlternations === 0) return 50
    
    const alternationRatio = alternations / maxPossibleAlternations
    
    // Optimal is around 70-80% alternation
    if (alternationRatio >= 0.7 && alternationRatio <= 0.9) {
      return 100
    } else if (alternationRatio >= 0.5) {
      return 85
    } else if (alternationRatio >= 0.3) {
      return 70
    } else {
      return 50
    }
  }

  /**
   * Estimate syllable count using vowel groups
   */
  private estimateSyllables(name: string): number {
    if (name.length === 0) return 0
    
    let syllables = 0
    let inVowelGroup = false
    
    for (const char of name) {
      if (VOWELS.has(char)) {
        if (!inVowelGroup) {
          syllables++
          inVowelGroup = true
        }
      } else {
        inVowelGroup = false
      }
    }
    
    // Adjust for silent 'e' at end
    if (name.endsWith('e') && syllables > 1) {
      syllables--
    }
    
    return Math.max(1, syllables)
  }

  /**
   * Check if contains stopword
   */
  private containsStopword(name: string): boolean {
    return STOPWORDS.has(name)
  }

  /**
   * Check if contains profanity
   */
  private containsProfanity(name: string): boolean {
    return PROFANITY_PATTERNS.some(pattern => pattern.test(name))
  }

  /**
   * Check if contains trademark
   */
  private containsTrademark(name: string): boolean {
    return TRADEMARK_PATTERNS.some(pattern => pattern.test(name))
  }

  /**
   * Detect language based on special characters
   */
  private detectLanguage(name: string): string {
    for (const [lang, pattern] of Object.entries(LANGUAGE_PATTERNS)) {
      if (pattern.test(name)) {
        return lang
      }
    }
    return 'english'
  }

  /**
   * Generate human-readable breakdown
   */
  private generateBreakdown(score: number, factors: any): string {
    const parts: string[] = []
    
    if (factors.length >= 90) parts.push('optimal length')
    else if (factors.length >= 70) parts.push('good length')
    else parts.push('length concern')
    
    if (factors.cvcv >= 85) parts.push('highly pronounceable')
    else if (factors.cvcv >= 70) parts.push('pronounceable')
    else parts.push('hard to pronounce')
    
    if (!factors.isClean) parts.push('quality issues')
    if (factors.hasNumbers) parts.push('has numbers')
    if (factors.hasHyphens) parts.push('has hyphens')
    
    return parts.join(', ')
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<BrandabilityConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * Get current configuration
   */
  getConfig(): BrandabilityConfig {
    return { ...this.config }
  }
}

// Singleton instance
export const brandabilityScorer = new BrandabilityScorer()
