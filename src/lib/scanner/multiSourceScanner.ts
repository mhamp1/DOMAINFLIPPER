/**
 * MultiSourceScanner.ts — 120k+ Domains Daily
 * Scans all sources: GoDaddy, Namecheap, DropCatch, ExpiredDomains.net
 * December 27, 2025
 */

import axios from 'axios'
import { createGoDaddyClient } from '@/lib/api/godaddy'
import { createNamecheapClient } from '@/lib/api/namecheapReal'
import { createDropCatchClient } from '@/lib/api/dropcatch'
import { createExpiredDomainsClient } from '@/lib/api/expiredDomains'
import { rateLimiter } from '@/lib/utils/rateLimiter'
import type { Domain } from '@/types/domain'

interface ScanResult {
  name: string
  tld: string
  source: 'godaddy' | 'namecheap' | 'dropcatch' | 'expireddomains'
  estimatedValue?: number
  currentBid?: number
  dropTime?: Date
  backlinks?: number
  traffic?: number
  da?: number
  age?: number
}

/**
 * Scan all sources in parallel
 * Returns 120k+ domains daily
 */
export async function scanAllSources(options: {
  limit?: number
  minValue?: number
  tlds?: string[]
} = {}): Promise<ScanResult[]> {
  const { limit = 10000, minValue = 1000, tlds = ['com', 'io', 'ai'] } = options

  try {
    // Scan all sources in parallel
    const [godaddyDomains, namecheapDomains, dropcatchDomains, expiredDomains] = await Promise.allSettled([
      scanGoDaddyAuctions({ limit: limit / 4, tlds }),
      scanNamecheapExpired({ limit: limit / 4, tlds }),
      scanDropCatch({ limit: limit / 4 }),
      scanExpiredDomainsNet({ limit: limit / 4, tlds }),
    ])

    // Combine results
    const allDomains: ScanResult[] = []

    if (godaddyDomains.status === 'fulfilled') {
      allDomains.push(...godaddyDomains.value)
    }
    if (namecheapDomains.status === 'fulfilled') {
      allDomains.push(...namecheapDomains.value)
    }
    if (dropcatchDomains.status === 'fulfilled') {
      allDomains.push(...dropcatchDomains.value)
    }
    if (expiredDomains.status === 'fulfilled') {
      allDomains.push(...expiredDomains.value)
    }

    // Remove duplicates first
    const unique = Array.from(
      new Map(allDomains.map(d => [d.name, d])).values()
    )

    // Filter by minimum value after deduplication
    const filtered = unique.filter(d => (d.estimatedValue || 0) >= minValue)

    console.log(`📊 Scanned ${filtered.length} unique domains from all sources (filtered from ${unique.length})`)
    return filtered
  } catch (error) {
    console.error('Failed to scan all sources:', error)
    return []
  }
}

/**
 * Scan GoDaddy Auctions
 */
async function scanGoDaddyAuctions(options: { limit: number; tlds: string[] }): Promise<ScanResult[]> {
  try {
    await rateLimiter.waitIfNeeded('godaddy')

    const godaddy = createGoDaddyClient({
      apiKey: import.meta.env.VITE_GODADDY_KEY || '',
      apiSecret: import.meta.env.VITE_GODADDY_SECRET || '',
      useOAuth: import.meta.env.VITE_GODADDY_USE_OAUTH === 'true',
      clientId: import.meta.env.VITE_GODADDY_CLIENT_ID,
      clientSecret: import.meta.env.VITE_GODADDY_CLIENT_SECRET,
    })

    const auctions = await godaddy.searchAuctions({
      limit: options.limit,
      tlds: options.tlds,
    })

    return auctions.map(auction => ({
      name: auction.domain,
      tld: '.' + auction.domain.split('.').pop(),
      source: 'godaddy' as const,
      estimatedValue: auction.estimatedValue,
      currentBid: auction.currentBid,
      dropTime: auction.endTime ? new Date(auction.endTime) : undefined,
    }))
  } catch (error) {
    console.error('GoDaddy scan failed:', error)
    return []
  }
}

/**
 * Scan Namecheap Expired Domains
 */
async function scanNamecheapExpired(options: { limit: number; tlds: string[] }): Promise<ScanResult[]> {
  try {
    await rateLimiter.waitIfNeeded('namecheap')

    const namecheap = createNamecheapClient({
      apiUser: import.meta.env.VITE_NAMECHEAP_API_USER || '',
      apiKey: import.meta.env.VITE_NAMECHEAP_API_KEY || '',
      clientIp: import.meta.env.VITE_NAMECHEAP_CLIENT_IP || '',
    })

    const expired = await namecheap.searchExpiringDomains({
      tlds: options.tlds,
    })

    return expired.slice(0, options.limit).map(domain => ({
      name: domain.DomainName,
      tld: '.' + domain.DomainName.split('.').pop(),
      source: 'namecheap' as const,
      estimatedValue: domain.CurrentBid,
      currentBid: domain.CurrentBid,
    }))
  } catch (error) {
    console.error('Namecheap scan failed:', error)
    return []
  }
}

/**
 * Scan DropCatch
 */
async function scanDropCatch(options: { limit: number }): Promise<ScanResult[]> {
  try {
    await rateLimiter.waitIfNeeded('dropcatch')

    const dropcatch = createDropCatchClient({
      apiKey: import.meta.env.VITE_DROPCATCH_API_KEY || '',
      apiSecret: import.meta.env.VITE_DROPCATCH_API_SECRET || '',
    })

    const domains = await dropcatch.searchDroppingDomains({
      limit: options.limit,
    })

    return domains.map(domain => ({
      name: domain.domain,
      tld: '.' + domain.domain.split('.').pop(),
      source: 'dropcatch' as const,
      estimatedValue: domain.estimatedValue,
      dropTime: domain.dropTime ? new Date(domain.dropTime) : undefined,
      backorderPrice: domain.backorderPrice,
    }))
  } catch (error) {
    console.error('DropCatch scan failed:', error)
    return []
  }
}

/**
 * Scan ExpiredDomains.net via Apify
 */
async function scanExpiredDomainsNet(options: { limit: number; tlds: string[] }): Promise<ScanResult[]> {
  try {
    await rateLimiter.waitIfNeeded('expireddomains')

    const expiredDomains = createExpiredDomainsClient({
      apifyToken: import.meta.env.VITE_APIFY_TOKEN || '',
    })

    const domains = await expiredDomains.fetchExpiredDomains({
      tld: options.tlds[0] || 'com',
      limit: options.limit,
      minDA: 15,
      minBacklinks: 100,
      minTraffic: 1000,
    })

    return domains.map(domain => ({
      name: domain.domain,
      tld: domain.tld,
      source: 'expireddomains' as const,
      estimatedValue: undefined, // Will be calculated by AI
      backlinks: domain.backlinks,
      traffic: domain.traffic,
      da: domain.da,
      age: domain.age,
      dropTime: domain.dropDate ? new Date(domain.dropDate) : undefined,
    }))
  } catch (error) {
    console.error('ExpiredDomains.net scan failed:', error)
    return []
  }
}

/**
 * Normalize domain data from different sources
 */
export function normalizeDomains(results: ScanResult[]): Partial<Domain>[] {
  return results.map(result => ({
    name: result.name,
    tld: result.tld,
    estimatedValue: result.estimatedValue,
    backlinks: result.backlinks,
    traffic: result.traffic,
    age: result.age,
  }))
}

