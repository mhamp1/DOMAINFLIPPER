/**
 * Clustered De-duplication Utility
 * Groups near-duplicate keywords/domains and keeps best-scoring representative
 * Avoids overbuying variants (plural/singular, hyphen variants, close edit distance)
 */

import { logger } from '@/lib/utils/logger'

export interface DomainCandidate {
  domain: string
  score: number
  estimatedValue: number
  metadata?: Record<string, unknown>
}

export interface DomainCluster {
  representative: DomainCandidate
  variants: DomainCandidate[]
  clusterScore: number
  reason: string
}

/**
 * Calculate Levenshtein edit distance between two strings
 */
export function editDistance(str1: string, str2: string): number {
  const len1 = str1.length
  const len2 = str2.length
  
  // Create 2D array for dynamic programming
  const dp: number[][] = Array(len1 + 1)
    .fill(null)
    .map(() => Array(len2 + 1).fill(0))
  
  // Initialize first row and column
  for (let i = 0; i <= len1; i++) dp[i][0] = i
  for (let j = 0; j <= len2; j++) dp[0][j] = j
  
  // Fill the dp table
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,     // deletion
          dp[i][j - 1] + 1,     // insertion
          dp[i - 1][j - 1] + 1  // substitution
        )
      }
    }
  }
  
  return dp[len1][len2]
}

/**
 * Normalize domain name for comparison
 * Removes TLD and common separators
 */
export function normalizeDomain(domain: string): string {
  return domain
    .toLowerCase()
    .replace(/\.(com|net|org|io|ai|co|app|dev)$/i, '') // Remove TLD
    .replace(/[-_]/g, '') // Remove hyphens and underscores
}

/**
 * Check if two domains are plural/singular variants
 */
export function isPluralVariant(domain1: string, domain2: string): boolean {
  const norm1 = normalizeDomain(domain1)
  const norm2 = normalizeDomain(domain2)
  
  // Check if one is plural of the other
  if (norm1 + 's' === norm2 || norm2 + 's' === norm1) return true
  if (norm1 + 'es' === norm2 || norm2 + 'es' === norm1) return true
  
  // Check for -y to -ies conversion
  if (norm1.endsWith('y') && norm1.slice(0, -1) + 'ies' === norm2) return true
  if (norm2.endsWith('y') && norm2.slice(0, -1) + 'ies' === norm1) return true
  
  return false
}

/**
 * Check if two domains are hyphen variants
 */
export function isHyphenVariant(domain1: string, domain2: string): boolean {
  const norm1 = domain1.toLowerCase().replace(/\.(com|net|org|io|ai|co|app|dev)$/i, '')
  const norm2 = domain2.toLowerCase().replace(/\.(com|net|org|io|ai|co|app|dev)$/i, '')
  
  // Remove all hyphens and compare
  const noHyphen1 = norm1.replace(/-/g, '')
  const noHyphen2 = norm2.replace(/-/g, '')
  
  return noHyphen1 === noHyphen2 && norm1 !== norm2
}

/**
 * Check if two domains are close by edit distance
 */
export function isCloseEditDistance(
  domain1: string,
  domain2: string,
  maxDistance: number = 2
): boolean {
  const norm1 = normalizeDomain(domain1)
  const norm2 = normalizeDomain(domain2)
  
  // Don't compare if lengths are too different
  if (Math.abs(norm1.length - norm2.length) > maxDistance) return false
  
  const distance = editDistance(norm1, norm2)
  return distance <= maxDistance && distance > 0
}

/**
 * Check if domains are similar (any variant type)
 */
export function areSimilarDomains(
  domain1: string,
  domain2: string,
  options: {
    checkPlural?: boolean
    checkHyphen?: boolean
    checkEditDistance?: boolean
    maxEditDistance?: number
  } = {}
): { similar: boolean; reason?: string } {
  const {
    checkPlural = true,
    checkHyphen = true,
    checkEditDistance = true,
    maxEditDistance = 2,
  } = options
  
  // Same domain
  if (domain1.toLowerCase() === domain2.toLowerCase()) {
    return { similar: true, reason: 'identical' }
  }
  
  // Plural/singular variant
  if (checkPlural && isPluralVariant(domain1, domain2)) {
    return { similar: true, reason: 'plural-variant' }
  }
  
  // Hyphen variant
  if (checkHyphen && isHyphenVariant(domain1, domain2)) {
    return { similar: true, reason: 'hyphen-variant' }
  }
  
  // Edit distance
  if (checkEditDistance && isCloseEditDistance(domain1, domain2, maxEditDistance)) {
    return { similar: true, reason: 'close-edit-distance' }
  }
  
  return { similar: false }
}

/**
 * Cluster similar domains together
 */
export function clusterDomains(
  candidates: DomainCandidate[],
  options: {
    checkPlural?: boolean
    checkHyphen?: boolean
    checkEditDistance?: boolean
    maxEditDistance?: number
  } = {}
): DomainCluster[] {
  const clusters: DomainCluster[] = []
  const processed = new Set<string>()
  
  for (const candidate of candidates) {
    if (processed.has(candidate.domain)) continue
    
    // Start a new cluster
    const cluster: DomainCluster = {
      representative: candidate,
      variants: [],
      clusterScore: candidate.score,
      reason: 'original',
    }
    
    processed.add(candidate.domain)
    
    // Find all similar domains
    for (const other of candidates) {
      if (processed.has(other.domain)) continue
      if (other.domain === candidate.domain) continue
      
      const similarity = areSimilarDomains(candidate.domain, other.domain, options)
      
      if (similarity.similar) {
        cluster.variants.push(other)
        processed.add(other.domain)
        
        // Update representative if other has higher score
        if (other.score > cluster.representative.score) {
          cluster.variants.push(cluster.representative)
          cluster.representative = other
          cluster.reason = similarity.reason || 'better-score'
        }
      }
    }
    
    // Calculate cluster score (max score + bonus for variants)
    cluster.clusterScore = cluster.representative.score + cluster.variants.length * 0.5
    
    clusters.push(cluster)
  }
  
  // Sort clusters by score
  return clusters.sort((a, b) => b.clusterScore - a.clusterScore)
}

/**
 * De-duplicate domains and return only representatives
 */
export function deduplicateDomains(
  candidates: DomainCandidate[],
  options: {
    checkPlural?: boolean
    checkHyphen?: boolean
    checkEditDistance?: boolean
    maxEditDistance?: number
    keepVariants?: boolean // Return all variants instead of just representatives
  } = {}
): DomainCandidate[] {
  const clusters = clusterDomains(candidates, options)
  
  if (options.keepVariants) {
    // Return flattened list with all domains
    return clusters.flatMap(cluster => [
      cluster.representative,
      ...cluster.variants,
    ])
  }
  
  // Return only representatives
  return clusters.map(cluster => cluster.representative)
}

/**
 * Get detailed de-duplication report
 */
export function getDeduplicationReport(
  candidates: DomainCandidate[],
  options: {
    checkPlural?: boolean
    checkHyphen?: boolean
    checkEditDistance?: boolean
    maxEditDistance?: number
  } = {}
): {
  clusters: DomainCluster[]
  totalCandidates: number
  totalClusters: number
  totalSaved: number
  duplicatesFound: {
    plural: number
    hyphen: number
    editDistance: number
  }
} {
  const clusters = clusterDomains(candidates, options)
  
  // Count duplicate types
  let pluralCount = 0
  let hyphenCount = 0
  let editDistanceCount = 0
  
  clusters.forEach(cluster => {
    cluster.variants.forEach(variant => {
      const similarity = areSimilarDomains(
        cluster.representative.domain,
        variant.domain,
        options
      )
      
      if (similarity.reason === 'plural-variant') pluralCount++
      else if (similarity.reason === 'hyphen-variant') hyphenCount++
      else if (similarity.reason === 'close-edit-distance') editDistanceCount++
    })
  })
  
  const totalVariants = clusters.reduce((sum, c) => sum + c.variants.length, 0)
  
  return {
    clusters,
    totalCandidates: candidates.length,
    totalClusters: clusters.length,
    totalSaved: totalVariants,
    duplicatesFound: {
      plural: pluralCount,
      hyphen: hyphenCount,
      editDistance: editDistanceCount,
    },
  }
}

/**
 * Example usage and testing helper
 */
export function testDeduplication(): void {
  const testCandidates: DomainCandidate[] = [
    { domain: 'apple.com', score: 90, estimatedValue: 10000 },
    { domain: 'apples.com', score: 85, estimatedValue: 8000 },
    { domain: 'app-le.com', score: 75, estimatedValue: 5000 },
    { domain: 'aple.com', score: 70, estimatedValue: 4000 },
    { domain: 'banana.com', score: 88, estimatedValue: 9000 },
    { domain: 'bananas.com', score: 82, estimatedValue: 7000 },
    { domain: 'cherry.com', score: 95, estimatedValue: 12000 },
  ]
  
  logger.info('DEDUPLICATION', 'Original candidates:', testCandidates.length)
  
  const report = getDeduplicationReport(testCandidates)
  
  logger.info('DEDUPLICATION', 'De-duplication Report:')
  logger.info('DEDUPLICATION', `- Total clusters: ${report.totalClusters}`)
  logger.info('DEDUPLICATION', `- Duplicates saved: ${report.totalSaved}`)
  logger.info('DEDUPLICATION', `- Plural variants: ${report.duplicatesFound.plural}`)
  logger.info('DEDUPLICATION', `- Hyphen variants: ${report.duplicatesFound.hyphen}`)
  logger.info('DEDUPLICATION', `- Edit distance: ${report.duplicatesFound.editDistance}`)
  
  logger.info('DEDUPLICATION', '\nClusters:')
  report.clusters.forEach((cluster, i) => {
    logger.info('DEDUPLICATION', `${i + 1}. ${cluster.representative.domain} (score: ${cluster.representative.score})`)
    cluster.variants.forEach(v => {
      logger.info('DEDUPLICATION', `   - ${v.domain} (score: ${v.score})`)
    })
  })
  
  const deduplicated = deduplicateDomains(testCandidates)
  logger.info('DEDUPLICATION', '\nFinal representatives:', deduplicated.map(d => d.domain))
}
