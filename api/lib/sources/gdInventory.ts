/**
 * GoDaddy Inventory File Parser — FREE real auction data
 * Downloads daily inventory files. No API key needed.
 * Returns RawDomain format compatible with existing scoring pipeline.
 */
import type { RawDomain, EnrichmentData } from '../valuation/scorer.js'

const INVENTORY_BASE = 'https://inventory.auctions.godaddy.com'

export interface InventoryDomain {
  raw: RawDomain
  enrichment: EnrichmentData
  inventoryType: 'biddable' | 'closeout' | 'ending_today'
}

async function downloadAndParse(filename: string): Promise<any[]> {
  const url = `${INVENTORY_BASE}/${filename}`

  // Try HEAD request first to check if file changed
  // Vercel serverless has no persistent filesystem, so we use in-memory cache
  const cacheKey = `gd_inventory_${filename}`
  const cached = (globalThis as any)[cacheKey] as { data: any[]; etag: string; timestamp: number } | undefined

  if (cached && (Date.now() - cached.timestamp) < 3600000) { // 1 hour memory cache
    try {
      const headResp = await fetch(url, { method: 'HEAD' })
      const serverEtag = headResp.headers.get('etag') || headResp.headers.get('last-modified') || ''
      if (serverEtag && cached.etag === serverEtag) {
        console.log(`[GD Inventory] ${filename}: unchanged (cached ${Math.round((Date.now() - cached.timestamp) / 60000)}min ago)`)
        return cached.data
      }
    } catch {} // HEAD failed, re-download
  }

  console.log(`[GD Inventory] ${filename}: downloading fresh...`)
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Inventory download failed: ${response.status} ${url}`)

  const etag = response.headers.get('etag') || response.headers.get('last-modified') || ''
  const buffer = Buffer.from(await response.arrayBuffer())
  const AdmZip = (await import('adm-zip')).default
  const zip = new AdmZip(buffer)
  const entries = zip.getEntries()
  if (entries.length === 0) throw new Error(`Empty ZIP: ${filename}`)

  const content = entries[0].getData().toString('utf-8')
  let data: any[]
  try {
    const parsed = JSON.parse(content)
    data = parsed && Array.isArray(parsed.data) ? parsed.data : Array.isArray(parsed) ? parsed : []
  } catch {
    const lines = content.trim().split('\n')
    if (lines.length < 2) return []
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
    data = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/"/g, ''))
      const obj: any = {}
      headers.forEach((h, i) => { obj[h] = values[i] || '' })
      return obj
    })
  }

  // Cache in memory
  ;(globalThis as any)[cacheKey] = { data, etag, timestamp: Date.now() }
  console.log(`[GD Inventory] ${filename}: parsed ${data.length} entries, cached`)
  return data
}

function normalizeEntry(entry: any, inventoryType: string): InventoryDomain | null {
  const domain = entry.DomainName || entry.domain || entry.Domain || entry.domainName || ''
  if (!domain || !domain.includes('.')) return null

  // Prices may be strings like "$1", "$1,801" or numbers
  const rawPrice = entry.Price || entry.price || entry.CurrentBid || entry.currentBid || entry.MinBid || entry.minBid || '0'
  const currentPrice = parseFloat(String(rawPrice).replace(/[$,]/g, '')) || 0
  const bidCount = parseInt(String(entry.Bids || entry.bids || entry.BidCount || entry.bidCount || entry.numberOfBids || '0')) || 0
  const endTime = entry.AuctionEndTime || entry.auctionEndTime || entry.EndDate || entry.endDate || entry.auctionEndTime || ''
  const domainAge = parseInt(String(entry.DomainAge || entry.domainAge || entry.Age || entry.domainAge || '0')) || 0
  const rawValuation = entry.EstimatedValue || entry.estimatedValue || entry.ValuationPrice || entry.valuationPrice || entry.valuation || '0'
  const estimatedValue = parseFloat(String(rawValuation).replace(/[$,]/g, '')) || 0
  const trustFlow = parseInt(entry.MajesticTrustFlow || entry.TrustFlow || entry.tf || '0') || 0
  const citationFlow = parseInt(entry.MajesticCitationFlow || entry.CitationFlow || entry.cf || '0') || 0
  const referringDomains = parseInt(entry.ReferringDomains || entry.referringDomains || '0') || 0
  const auctionId = entry.AuctionId || entry.auctionId || entry.ListingId || entry.listingId || undefined

  return {
    raw: { domain, price: currentPrice, source: `godaddy_inventory_${inventoryType}`, auctionId, auctionEndTime: endTime || undefined, bidCount },
    enrichment: {
      domainAge: domainAge > 0 ? domainAge : undefined,
      referringDomains: referringDomains > 0 ? referringDomains : undefined,
      trustFlow: trustFlow > 0 ? trustFlow : undefined,
      citationFlow: citationFlow > 0 ? citationFlow : undefined,
      goValueEstimate: estimatedValue > 0 ? estimatedValue : undefined,
    },
    inventoryType: inventoryType as any,
  }
}

export async function fetchGoDaddyInventory(options: {
  tlds?: string[]; maxPrice?: number; maxResults?: number; includeCloseouts?: boolean; includeEndingToday?: boolean
}): Promise<InventoryDomain[]> {
  const { tlds = ['com', 'ai', 'io', 'co', 'net', 'org'], maxPrice = 500, maxResults = 500, includeCloseouts = true, includeEndingToday = true } = options
  const tldSet = new Set(tlds.map(t => t.replace('.', '').toLowerCase()))
  const results: InventoryDomain[] = []

  // Start with SMALLEST files first (Vercel has ~10s serverless timeout)
  // auctions_ending_today.json.zip = ~1.5MB (fastest, most urgent)
  // most_active_feed_all.json.zip = ~87KB (tiny, good market signal)
  // closeout_listings.json.zip = ~7MB (medium, zero-competition buys)
  // all_biddable_auctions.json.zip = ~19MB (skip on serverless — too large)

  if (includeEndingToday) {
    try {
      const ending = await downloadAndParse('auctions_ending_today.json.zip')
      console.log(`[GD Inventory] Ending today: ${ending.length} total entries`)
      for (const entry of ending) {
        const n = normalizeEntry(entry, 'ending_today')
        if (!n) continue
        if (!tldSet.has(n.raw.domain.split('.').slice(1).join('.').toLowerCase())) continue
        if (n.raw.price > maxPrice) continue
        results.push(n)
      }
    } catch (e) { console.error(`[GD Inventory] Ending-today fetch failed:`, (e as Error).message) }
  }

  // Most active auctions (tiny file, ~87KB)
  try {
    const active = await downloadAndParse('most_active_feed_all.json.zip')
    console.log(`[GD Inventory] Most active auctions: ${active.length} total entries`)
    for (const entry of active) {
      const n = normalizeEntry(entry, 'biddable')
      if (!n) continue
      if (!tldSet.has(n.raw.domain.split('.').slice(1).join('.').toLowerCase())) continue
      if (n.raw.price > maxPrice) continue
      results.push(n)
    }
  } catch (e) { console.error(`[GD Inventory] Most-active fetch failed:`, (e as Error).message) }

  if (includeCloseouts) {
    try {
      const closeouts = await downloadAndParse('closeout_listings.json.zip')
      console.log(`[GD Inventory] Closeout listings: ${closeouts.length} total entries`)
      for (const entry of closeouts) {
        const n = normalizeEntry(entry, 'closeout')
        if (!n) continue
        if (!tldSet.has(n.raw.domain.split('.').slice(1).join('.').toLowerCase())) continue
        if (n.raw.price > maxPrice) continue
        results.push(n)
      }
    } catch (e) { console.error(`[GD Inventory] Closeout fetch failed:`, (e as Error).message) }
  }

  const seen = new Set<string>()
  const unique = results.filter(r => { if (seen.has(r.raw.domain)) return false; seen.add(r.raw.domain); return true })
  unique.sort((a, b) => {
    const aRich = (a.enrichment.trustFlow ? 1 : 0) + (a.enrichment.referringDomains ? 1 : 0) + (a.enrichment.domainAge ? 1 : 0)
    const bRich = (b.enrichment.trustFlow ? 1 : 0) + (b.enrichment.referringDomains ? 1 : 0) + (b.enrichment.domainAge ? 1 : 0)
    return bRich - aRich
  })
  console.log(`[GD Inventory] ${unique.length} domains after filtering`)
  return unique.slice(0, maxResults)
}
