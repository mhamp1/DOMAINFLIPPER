import type { ExpiringDomain } from '@/types/domain'

/**
 * Real-time expiring domain feed
 * Monitors domains expiring today from multiple sources
 */

// NO MOCK DATA - Returns empty array until real API connected
const generateExpiringDomains = (): ExpiringDomain[] => {
  // NO MOCK DATA - Real API required
  console.warn('[EXPIRING_FEED] No mock data - connect real expiring domains API')
  return []
}

/**
 * Fetch expiring domains from multiple sources
 * In production, this would call real APIs from:
 * - ExpiredDomains.net
 * - GoDaddy Auctions
 * - Namecheap
 * - DropCatch
 * - SnapNames
 */
export const fetchExpiringDomains = async (): Promise<ExpiringDomain[]> => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 500))
  
  // In production, this would be:
  // const today = new Date().toISOString().slice(0,10)
  // const response = await fetch(`https://www.expireddomains.net/api/v1/deleted/?date=${today}`)
  // const data = await response.json()
  // return data.domains.map(...)
  
  // For demo, generate synthetic data
  return generateExpiringDomains()
}

// Quality filtering constants
const MIN_CRITERIA_COUNT = 2 // Minimum number of quality criteria that must be met

/**
 * Filter expiring domains by quality criteria
 */
export const filterHighValueDomains = (domains: ExpiringDomain[]): ExpiringDomain[] => {
  return domains.filter(domain => {
    // Minimum quality thresholds
    const hasBacklinks = (domain.backlinks || 0) > 500
    const hasTraffic = (domain.traffic || 0) > 100
    const isAged = (domain.age || 0) > 2
    const isPremiumTLD = ['.com', '.ai', '.io'].includes(domain.tld)
    
    // Must meet at least MIN_CRITERIA_COUNT criteria
    const criteriaCount = [hasBacklinks, hasTraffic, isAged, isPremiumTLD].filter(Boolean).length
    
    return criteriaCount >= MIN_CRITERIA_COUNT
  })
}
