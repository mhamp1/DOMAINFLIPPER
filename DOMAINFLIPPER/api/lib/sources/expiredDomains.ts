/**
 * ExpiredDomains.net via Apify — PRIMARY FEED
 * 
 * ExpiredDomains.net aggregates data from all major registrars and provides
 * SEO metrics, backlink counts, domain age, and auction status.
 * 
 * Requires: APIFY_TOKEN env var (server-side only)
 * Free tier: 100 actor runs/month
 * Graceful degradation: returns empty if not configured.
 */

import type { RawDomain, EnrichmentData } from '../valuation/scorer.js'

interface ExpiredDomainEntry {
  domain: string
  tld: string
  backlinks?: number
  referringDomains?: number
  domainAge?: number
  trustFlow?: number
  citationFlow?: number
  archiveOrg?: number // number of snapshots
  registrar?: string
  auctionType?: string // 'GoDaddy', 'NameJet', 'DropCatch', 'SnapNames', etc.
  currentBid?: number
  bidCount?: number
  endDate?: string
}

export interface ExpiredDomainResult {
  raw: RawDomain
  enrichment: EnrichmentData
}

export async function fetchExpiredDomains(filters: {
  tlds?: string[]
  minBacklinks?: number
  minAge?: number
  maxResults?: number
}): Promise<ExpiredDomainResult[]> {
  const token = process.env.APIFY_TOKEN
  if (!token) {
    console.warn('[ExpiredDomains] APIFY_TOKEN not configured — skipping')
    return []
  }

  // Try several known Apify actors for ExpiredDomains.net
  const actorId = process.env.APIFY_EXPIRED_DOMAINS_ACTOR || 'easyapi~expireddomains-net-scraper'

  try {
    const response = await fetch(
      `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${token}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tlds: (filters.tlds || ['com', 'net', 'org', 'io', 'ai']).join(','),
          minBacklinks: filters.minBacklinks || 5,
          minDomainAge: filters.minAge || 1,
          maxResults: filters.maxResults || 200,
          sortBy: 'backlinks',
        }),
      }
    )

    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`Apify ${response.status}: ${errText.slice(0, 200)}`)
    }

    const entries: any[] = await response.json()
    if (!Array.isArray(entries)) return []

    return entries
      .filter((e: any) => e.domain)
      .map((e: any): ExpiredDomainResult => ({
        raw: {
          domain: e.domain,
          price: e.currentBid || e.price || e.minBid || 0,
          source: `expired_domains_${(e.auctionType || 'unknown').toLowerCase()}`,
          auctionId: e.auctionId || undefined,
          auctionEndTime: e.endDate || undefined,
          bidCount: e.bidCount || 0,
        },
        enrichment: {
          referringDomains: e.referringDomains || e.bl || e.backlinks || undefined,
          trustFlow: e.trustFlow || e.tf || undefined,
          citationFlow: e.citationFlow || e.cf || undefined,
          domainAge: e.domainAge || e.age || undefined,
        },
      }))
  } catch (e) {
    console.error('[ExpiredDomains] Fetch failed:', (e as Error).message)
    return []
  }
}
