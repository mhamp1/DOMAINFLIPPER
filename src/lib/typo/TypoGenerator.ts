/**
 * TypoGenerator.ts — Domain Variant Generator
 * Generates homoglyphs, bit-flips, typos, and phishing-style variants
 * 30% more snipe opportunities
 * December 2025
 */

import { logger } from '@/lib/utils/logger'

// ==================== TYPES ====================

export interface DomainVariant {
  variant: string
  type: 'homoglyph' | 'bitflip' | 'typo' | 'omission' | 'insertion' | 'transposition' | 'replacement'
  similarity: number // 0-100
  original: string
}

// ==================== HOMOGLYPH MAPPINGS ====================

// Unicode characters that look similar to ASCII
const HOMOGLYPHS: Record<string, string[]> = {
  'a': ['а', 'ą', 'ä', 'å', 'ā', 'ă', '@', '4'],
  'b': ['ḃ', 'ḅ', 'ḇ', '6', '8'],
  'c': ['ç', 'ć', 'č', 'ċ', '('],
  'd': ['ḋ', 'ḍ', 'ḏ', 'đ'],
  'e': ['е', 'ё', 'ę', 'ë', 'ē', 'ė', '3'],
  'f': ['ḟ'],
  'g': ['ġ', 'ğ', 'ǧ', '9'],
  'h': ['ḣ', 'ḥ', 'ḧ', 'ħ'],
  'i': ['і', 'ı', 'ï', 'î', 'ì', 'í', 'ī', '1', 'l', '!'],
  'j': ['ј'],
  'k': ['ḱ', 'ḳ', 'ķ'],
  'l': ['ł', 'ļ', 'ľ', '1', 'i', '|'],
  'm': ['ṁ', 'ṃ', 'rn'],
  'n': ['ń', 'ñ', 'ň', 'ṅ', 'ṇ'],
  'o': ['о', 'ö', 'ø', 'ō', 'ő', '0'],
  'p': ['р', 'ṗ', 'ṕ'],
  'q': ['ԛ'],
  'r': ['ŕ', 'ř', 'ṙ', 'ṛ'],
  's': ['ś', 'š', 'ş', 'ṡ', '5', '$'],
  't': ['ţ', 'ť', 'ṫ', 'ṭ', '7', '+'],
  'u': ['ü', 'ū', 'ű', 'ů', 'ų'],
  'v': ['ṽ', 'ṿ'],
  'w': ['ẃ', 'ẅ', 'ẇ', 'ẉ', 'vv'],
  'x': ['х', 'ẋ', 'ẍ'],
  'y': ['у', 'ý', 'ÿ', 'ŷ', 'ẏ'],
  'z': ['ź', 'ż', 'ž', '2'],
}

// Common keyboard typos (adjacent keys)
const KEYBOARD_ADJACENT: Record<string, string[]> = {
  'a': ['q', 'w', 's', 'z'],
  'b': ['v', 'g', 'h', 'n'],
  'c': ['x', 'd', 'f', 'v'],
  'd': ['s', 'e', 'r', 'f', 'c', 'x'],
  'e': ['w', 's', 'd', 'r', '3', '4'],
  'f': ['d', 'r', 't', 'g', 'v', 'c'],
  'g': ['f', 't', 'y', 'h', 'b', 'v'],
  'h': ['g', 'y', 'u', 'j', 'n', 'b'],
  'i': ['u', 'j', 'k', 'o', '8', '9'],
  'j': ['h', 'u', 'i', 'k', 'm', 'n'],
  'k': ['j', 'i', 'o', 'l', 'm'],
  'l': ['k', 'o', 'p', ';'],
  'm': ['n', 'j', 'k', ','],
  'n': ['b', 'h', 'j', 'm'],
  'o': ['i', 'k', 'l', 'p', '9', '0'],
  'p': ['o', 'l', '[', '0', '-'],
  'q': ['1', '2', 'w', 'a'],
  'r': ['e', 'd', 'f', 't', '4', '5'],
  's': ['a', 'w', 'e', 'd', 'x', 'z'],
  't': ['r', 'f', 'g', 'y', '5', '6'],
  'u': ['y', 'h', 'j', 'i', '7', '8'],
  'v': ['c', 'f', 'g', 'b'],
  'w': ['q', 'a', 's', 'e', '2', '3'],
  'x': ['z', 's', 'd', 'c'],
  'y': ['t', 'g', 'h', 'u', '6', '7'],
  'z': ['a', 's', 'x'],
}

// Common suffix replacements
const SUFFIX_VARIANTS: Record<string, string[]> = {
  '.com': ['.co', '.cm', '.om', '.con', '.comm', '.cim', '.cpm'],
  '.net': ['.ner', '.bet', '.met', '.nef', '.ne'],
  '.org': ['.orh', '.orf', '.oeg', '.og'],
  '.io': ['.oi', '.ia', '.i0', '.1o'],
  '.ai': ['.a1', '.al', '.ei', '.ae'],
}

// ==================== GENERATOR CLASS ====================

class TypoGenerator {
  /**
   * Generate all variants for a domain
   */
  generateVariants(domain: string, options?: {
    maxVariants?: number
    includeHomoglyphs?: boolean
    includeBitflips?: boolean
    includeTypos?: boolean
    minSimilarity?: number
  }): DomainVariant[] {
    const {
      maxVariants = 100,
      includeHomoglyphs = true,
      includeBitflips = true,
      includeTypos = true,
      minSimilarity = 70,
    } = options || {}

    const variants: DomainVariant[] = []
    const seen = new Set<string>()
    seen.add(domain.toLowerCase())

    // Split domain into name and TLD
    const parts = domain.toLowerCase().split('.')
    const tld = '.' + parts.pop()
    const name = parts.join('.')

    // 1. Homoglyph variants
    if (includeHomoglyphs) {
      const homoglyphVariants = this.generateHomoglyphs(name, tld, domain)
      homoglyphVariants.forEach(v => {
        if (!seen.has(v.variant) && v.similarity >= minSimilarity) {
          seen.add(v.variant)
          variants.push(v)
        }
      })
    }

    // 2. Bit-flip variants
    if (includeBitflips) {
      const bitflipVariants = this.generateBitflips(name, tld, domain)
      bitflipVariants.forEach(v => {
        if (!seen.has(v.variant) && v.similarity >= minSimilarity) {
          seen.add(v.variant)
          variants.push(v)
        }
      })
    }

    // 3. Typo variants
    if (includeTypos) {
      const typoVariants = [
        ...this.generateOmissions(name, tld, domain),
        ...this.generateInsertions(name, tld, domain),
        ...this.generateTranspositions(name, tld, domain),
        ...this.generateReplacements(name, tld, domain),
        ...this.generateSuffixVariants(name, tld, domain),
      ]
      typoVariants.forEach(v => {
        if (!seen.has(v.variant) && v.similarity >= minSimilarity) {
          seen.add(v.variant)
          variants.push(v)
        }
      })
    }

    // Sort by similarity (highest first) and limit
    return variants
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, maxVariants)
  }

  /**
   * Generate homoglyph substitutions
   */
  private generateHomoglyphs(name: string, tld: string, original: string): DomainVariant[] {
    const variants: DomainVariant[] = []

    for (let i = 0; i < name.length; i++) {
      const char = name[i].toLowerCase()
      const glyphs = HOMOGLYPHS[char]

      if (glyphs) {
        for (const glyph of glyphs) {
          const variant = name.slice(0, i) + glyph + name.slice(i + 1) + tld
          
          // Only include if it looks like a valid domain
          if (/^[a-z0-9\u0080-\uFFFF-]+\.[a-z]+$/i.test(variant)) {
            variants.push({
              variant,
              type: 'homoglyph',
              similarity: this.calculateSimilarity(original, variant),
              original,
            })
          }
        }
      }
    }

    return variants
  }

  /**
   * Generate bit-flip variants (single character change)
   */
  private generateBitflips(name: string, tld: string, original: string): DomainVariant[] {
    const variants: DomainVariant[] = []
    const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789'

    for (let i = 0; i < name.length; i++) {
      for (const char of alphabet) {
        if (char !== name[i]) {
          const variant = name.slice(0, i) + char + name.slice(i + 1) + tld
          variants.push({
            variant,
            type: 'bitflip',
            similarity: this.calculateSimilarity(original, variant),
            original,
          })
        }
      }
    }

    return variants
  }

  /**
   * Generate omission variants (missing character)
   */
  private generateOmissions(name: string, tld: string, original: string): DomainVariant[] {
    const variants: DomainVariant[] = []

    for (let i = 0; i < name.length; i++) {
      const variant = name.slice(0, i) + name.slice(i + 1) + tld
      if (variant.length > tld.length + 1) { // At least 1 char + tld
        variants.push({
          variant,
          type: 'omission',
          similarity: this.calculateSimilarity(original, variant),
          original,
        })
      }
    }

    return variants
  }

  /**
   * Generate insertion variants (extra character)
   */
  private generateInsertions(name: string, tld: string, original: string): DomainVariant[] {
    const variants: DomainVariant[] = []

    for (let i = 0; i <= name.length; i++) {
      // Insert adjacent key typos
      const adjacentChar = KEYBOARD_ADJACENT[name[i]] || KEYBOARD_ADJACENT[name[i - 1]]
      if (adjacentChar) {
        for (const char of adjacentChar.slice(0, 2)) { // Limit insertions
          const variant = name.slice(0, i) + char + name.slice(i) + tld
          variants.push({
            variant,
            type: 'insertion',
            similarity: this.calculateSimilarity(original, variant),
            original,
          })
        }
      }
    }

    return variants
  }

  /**
   * Generate transposition variants (swapped characters)
   */
  private generateTranspositions(name: string, tld: string, original: string): DomainVariant[] {
    const variants: DomainVariant[] = []

    for (let i = 0; i < name.length - 1; i++) {
      const chars = name.split('')
      const temp = chars[i]
      chars[i] = chars[i + 1]
      chars[i + 1] = temp
      const variant = chars.join('') + tld
      variants.push({
        variant,
        type: 'transposition',
        similarity: this.calculateSimilarity(original, variant),
        original,
      })
    }

    return variants
  }

  /**
   * Generate keyboard replacement variants
   */
  private generateReplacements(name: string, tld: string, original: string): DomainVariant[] {
    const variants: DomainVariant[] = []

    for (let i = 0; i < name.length; i++) {
      const adjacent = KEYBOARD_ADJACENT[name[i]]
      if (adjacent) {
        for (const char of adjacent.slice(0, 3)) { // Limit replacements
          const variant = name.slice(0, i) + char + name.slice(i + 1) + tld
          variants.push({
            variant,
            type: 'replacement',
            similarity: this.calculateSimilarity(original, variant),
            original,
          })
        }
      }
    }

    return variants
  }

  /**
   * Generate TLD/suffix variants
   */
  private generateSuffixVariants(name: string, tld: string, original: string): DomainVariant[] {
    const variants: DomainVariant[] = []
    const suffixVariants = SUFFIX_VARIANTS[tld]

    if (suffixVariants) {
      for (const suffix of suffixVariants) {
        const variant = name + suffix
        variants.push({
          variant,
          type: 'typo',
          similarity: this.calculateSimilarity(original, variant),
          original,
        })
      }
    }

    return variants
  }

  /**
   * Calculate similarity between two strings (Levenshtein-based)
   */
  private calculateSimilarity(a: string, b: string): number {
    const longer = a.length > b.length ? a : b
    const shorter = a.length > b.length ? b : a

    if (longer.length === 0) return 100

    const distance = this.levenshteinDistance(longer, shorter)
    return Math.round((1 - distance / longer.length) * 100)
  }

  /**
   * Levenshtein distance
   */
  private levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = []

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i]
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b[i - 1] === a[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          )
        }
      }
    }

    return matrix[b.length][a.length]
  }

  /**
   * Generate variants and filter for available domains
   */
  async findAvailableVariants(
    domain: string,
    checkAvailability: (domain: string) => Promise<boolean>
  ): Promise<DomainVariant[]> {
    const variants = this.generateVariants(domain)
    const available: DomainVariant[] = []

    logger.info('TYPO', `Checking ${variants.length} variants for ${domain}`)

    // Check in batches of 10
    for (let i = 0; i < variants.length; i += 10) {
      const batch = variants.slice(i, i + 10)
      const results = await Promise.allSettled(
        batch.map(async v => {
          const isAvailable = await checkAvailability(v.variant)
          return { variant: v, available: isAvailable }
        })
      )

      results.forEach(result => {
        if (result.status === 'fulfilled' && result.value.available) {
          available.push(result.value.variant)
        }
      })

      // Rate limit
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    logger.info('TYPO', `Found ${available.length} available variants for ${domain}`)
    return available
  }
}

// Export singleton
export const typoGenerator = new TypoGenerator()

