/**
 * WhoisEngine.ts — REAL WHOIS DATA ENGINE
 * Gets domain age, registrar, expiration, owner — critical for valuation
 * December 2025
 */

import axios from 'axios'
import { logger } from '@/lib/utils/logger'
import { apiCall } from '@/lib/utils/apiWrapper'

// ==================== TYPES ====================

export interface WhoisData {
  domain: string
  ageYears: number
  creationDate: Date | null
  expirationDate: Date | null
  expiresSoon: boolean // < 90 days
  registrar: string
  nameServers: string[]
  owner?: string
  status: string[]
  dnssec: boolean
  raw: string
}

export interface WhoisLookupResult {
  success: boolean
  data?: WhoisData
  error?: string
  cached: boolean
}

// ==================== WHOIS SERVERS ====================

const WHOIS_RDAP_SERVERS: Record<string, string> = {
  com: 'https://rdap.verisign.com/com/v1/domain/',
  net: 'https://rdap.verisign.com/net/v1/domain/',
  org: 'https://rdap.publicinterestregistry.org/rdap/domain/',
  io: 'https://rdap.nic.io/domain/',
  ai: 'https://rdap.nic.ai/domain/',
  app: 'https://rdap.nic.google/domain/',
  dev: 'https://rdap.nic.google/domain/',
  xyz: 'https://rdap.nic.xyz/domain/',
  co: 'https://rdap.nic.co/domain/',
  me: 'https://rdap.nic.me/domain/',
  info: 'https://rdap.afilias.net/rdap/info/domain/',
  biz: 'https://rdap.afilias.net/rdap/biz/domain/',
}

// Fallback WHOIS API (for TLDs without RDAP)
const WHOIS_FALLBACK_API = 'https://whois.freeaitools.xyz/api/'

// ==================== CACHE ====================

const whoisCache = new Map<string, { data: WhoisData; timestamp: number }>()
const CACHE_TTL = 6 * 60 * 60 * 1000 // 6 hours

// ==================== WHOIS ENGINE CLASS ====================

class WhoisEngine {
  /**
   * Get WHOIS data for a domain
   */
  async lookup(domain: string): Promise<WhoisLookupResult> {
    const normalizedDomain = domain.toLowerCase().trim()
    
    // Check cache first
    const cached = whoisCache.get(normalizedDomain)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      logger.debug('WHOIS', `Cache hit for ${normalizedDomain}`)
      return { success: true, data: cached.data, cached: true }
    }

    // Try RDAP first (modern, structured)
    const tld = normalizedDomain.split('.').pop() || ''
    
    try {
      let whoisData: WhoisData | null = null

      if (WHOIS_RDAP_SERVERS[tld]) {
        whoisData = await this.lookupRDAP(normalizedDomain, tld)
      }

      // Fallback to WHOIS API if RDAP fails or not available
      if (!whoisData) {
        whoisData = await this.lookupFallback(normalizedDomain)
      }

      if (whoisData) {
        // Cache result
        whoisCache.set(normalizedDomain, { data: whoisData, timestamp: Date.now() })
        logger.info('WHOIS', `Lookup successful for ${normalizedDomain}`, {
          age: whoisData.ageYears,
          registrar: whoisData.registrar,
          expiresSoon: whoisData.expiresSoon,
        })
        return { success: true, data: whoisData, cached: false }
      }

      return { success: false, error: 'No WHOIS data found', cached: false }
    } catch (error: any) {
      logger.error('WHOIS', `Lookup failed for ${normalizedDomain}`, error)
      return { success: false, error: error.message, cached: false }
    }
  }

  /**
   * Lookup via RDAP (modern JSON-based WHOIS)
   */
  private async lookupRDAP(domain: string, tld: string): Promise<WhoisData | null> {
    const rdapUrl = WHOIS_RDAP_SERVERS[tld]
    if (!rdapUrl) return null

    const response = await apiCall(
      () => axios.get(`${rdapUrl}${domain}`, { timeout: 10000 }),
      { service: 'rdap', action: 'lookup' }
    )

    if (!response.success || !response.data?.data) return null

    const data = response.data.data

    // Parse RDAP response
    const events = data.events || []
    const registrationEvent = events.find((e: any) => e.eventAction === 'registration')
    const expirationEvent = events.find((e: any) => e.eventAction === 'expiration')

    const creationDate = registrationEvent ? new Date(registrationEvent.eventDate) : null
    const expirationDate = expirationEvent ? new Date(expirationEvent.eventDate) : null

    const ageYears = creationDate 
      ? (Date.now() - creationDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
      : 0

    const expiresSoon = expirationDate 
      ? (expirationDate.getTime() - Date.now()) < 90 * 24 * 60 * 60 * 1000
      : false

    // Get registrar
    const registrarEntity = data.entities?.find((e: any) => e.roles?.includes('registrar'))
    const registrar = registrarEntity?.vcardArray?.[1]?.find((v: any) => v[0] === 'fn')?.[3] 
      || registrarEntity?.publicIds?.[0]?.identifier 
      || 'Unknown'

    // Get registrant (owner) - often redacted
    const registrantEntity = data.entities?.find((e: any) => e.roles?.includes('registrant'))
    const owner = registrantEntity?.vcardArray?.[1]?.find((v: any) => v[0] === 'fn')?.[3]

    // Get nameservers
    const nameServers = data.nameservers?.map((ns: any) => ns.ldhName || ns.objectClassName) || []

    // Get status
    const status = data.status || []

    return {
      domain,
      ageYears: Math.round(ageYears * 10) / 10,
      creationDate,
      expirationDate,
      expiresSoon,
      registrar,
      nameServers,
      owner,
      status,
      dnssec: data.secureDNS?.delegationSigned || false,
      raw: JSON.stringify(data, null, 2),
    }
  }

  /**
   * Fallback WHOIS lookup via API
   */
  private async lookupFallback(domain: string): Promise<WhoisData | null> {
    try {
      const response = await apiCall(
        () => axios.get(`${WHOIS_FALLBACK_API}${domain}`, { timeout: 15000 }),
        { service: 'whois-api', action: 'lookup' }
      )

      if (!response.success || !response.data?.data) return null

      const data = response.data.data

      // Parse various WHOIS formats
      const creationDate = data.creation_date || data.created || data.creationDate
      const expirationDate = data.expiration_date || data.expires || data.expirationDate

      const parsedCreation = creationDate ? new Date(creationDate) : null
      const parsedExpiration = expirationDate ? new Date(expirationDate) : null

      const ageYears = parsedCreation
        ? (Date.now() - parsedCreation.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
        : 0

      const expiresSoon = parsedExpiration
        ? (parsedExpiration.getTime() - Date.now()) < 90 * 24 * 60 * 60 * 1000
        : false

      return {
        domain,
        ageYears: Math.round(ageYears * 10) / 10,
        creationDate: parsedCreation,
        expirationDate: parsedExpiration,
        expiresSoon,
        registrar: data.registrar || data.registrar_name || 'Unknown',
        nameServers: data.name_servers || data.nameservers || [],
        owner: data.registrant_name || data.registrant_organization,
        status: Array.isArray(data.status) ? data.status : [data.status].filter(Boolean),
        dnssec: data.dnssec === 'signedDelegation' || data.dnssec === true,
        raw: JSON.stringify(data, null, 2),
      }
    } catch (error) {
      logger.warn('WHOIS', `Fallback lookup failed for ${domain}`)
      return null
    }
  }

  /**
   * Batch lookup multiple domains
   */
  async batchLookup(domains: string[]): Promise<Map<string, WhoisLookupResult>> {
    const results = new Map<string, WhoisLookupResult>()

    // Process in parallel batches of 10
    const BATCH_SIZE = 10

    for (let i = 0; i < domains.length; i += BATCH_SIZE) {
      const batch = domains.slice(i, i + BATCH_SIZE)
      const batchResults = await Promise.allSettled(
        batch.map(domain => this.lookup(domain))
      )

      batchResults.forEach((result, index) => {
        const domain = batch[index]
        if (result.status === 'fulfilled') {
          results.set(domain, result.value)
        } else {
          results.set(domain, { success: false, error: result.reason?.message, cached: false })
        }
      })

      // Small delay between batches
      if (i + BATCH_SIZE < domains.length) {
        await new Promise(resolve => setTimeout(resolve, 200))
      }
    }

    return results
  }

  /**
   * Calculate valuation multiplier based on WHOIS data
   */
  getValuationMultiplier(whois: WhoisData): number {
    let multiplier = 1.0

    // Age premium (aged domains = premium)
    if (whois.ageYears > 20) multiplier *= 4.0
    else if (whois.ageYears > 15) multiplier *= 3.0
    else if (whois.ageYears > 10) multiplier *= 2.5
    else if (whois.ageYears > 5) multiplier *= 1.8
    else if (whois.ageYears > 2) multiplier *= 1.3

    // Expiring soon = easier to snipe
    if (whois.expiresSoon) multiplier *= 1.5

    // Registrar premium (some are easier to snipe)
    const easyRegistrars = ['godaddy', 'namecheap', 'dynadot', 'porkbun']
    if (easyRegistrars.some(r => whois.registrar.toLowerCase().includes(r))) {
      multiplier *= 1.2
    }

    // DNSSEC enabled = more premium
    if (whois.dnssec) multiplier *= 1.1

    return Math.round(multiplier * 100) / 100
  }

  /**
   * Check if domain is droppable (expiring + not renewed)
   */
  isDroppable(whois: WhoisData): boolean {
    if (!whois.expirationDate) return false

    const daysUntilExpiry = (whois.expirationDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)

    // Domain is droppable if expiring within 75 days and has certain statuses
    const droppableStatuses = ['pendingDelete', 'redemptionPeriod', 'autoRenewPeriod']
    const hasDroppableStatus = whois.status.some(s => 
      droppableStatuses.some(ds => s.toLowerCase().includes(ds.toLowerCase()))
    )

    return daysUntilExpiry < 75 || hasDroppableStatus
  }

  /**
   * Get cache stats
   */
  getCacheStats(): { size: number; hitRate: number } {
    return {
      size: whoisCache.size,
      hitRate: 0, // Would need to track hits/misses
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    whoisCache.clear()
    logger.info('WHOIS', 'Cache cleared')
  }
}

// Export singleton
export const whoisEngine = new WhoisEngine()

