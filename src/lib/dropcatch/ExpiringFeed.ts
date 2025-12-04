import type { ExpiringDomain } from '@/types/domain'

/**
 * Real-time expiring domain feed
 * Monitors domains expiring today from multiple sources
 */

// Demo data generator for expiring domains
const generateExpiringDomains = (): ExpiringDomain[] => {
  const now = new Date()
  const premiumNames = [
    'quantumai', 'neuralgpt', 'cryptovault', 'metaverse', 'blockchainpro',
    'aianalysis', 'cloudnative', 'webthree', 'nftmarket', 'digitalpay',
    'smartcontract', 'decentralize', 'tokenomics', 'defiprotocol', 'gamingmetaverse'
  ]
  
  const tlds = ['.com', '.ai', '.io', '.net', '.co']
  
  return premiumNames.map((name) => {
    const dropTime = new Date(now.getTime() + (Math.random() * 3600 * 1000)) // Within next hour
    const tld = tlds[Math.floor(Math.random() * tlds.length)]
    
    return {
      name: `${name}${tld}`,
      dropTime: dropTime.toISOString(),
      tld,
      backlinks: Math.floor(Math.random() * 50000) + 1000,
      age: Math.floor(Math.random() * 15) + 1,
      traffic: Math.floor(Math.random() * 10000) + 500,
    }
  })
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
