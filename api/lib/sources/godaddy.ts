/**
 * GoDaddy Auctions API — BIDDING VENUE
 * Server-side only. Uses GODADDY_API_KEY / GODADDY_API_SECRET.
 *
 * CURRENCY: GoDaddy Aftermarket API uses CENTS for all monetary values.
 * $10.00 = 1000 in the API. We convert to/from dollars at the boundary.
 */

import type { RawDomain } from '../valuation/scorer.js'

const GD_BASE = 'https://api.godaddy.com/v1/aftermarket'

function getAuth(): { key: string; secret: string } | null {
  const key = process.env.GODADDY_API_KEY
  const secret = process.env.GODADDY_API_SECRET
  if (!key || !secret) return null
  return { key, secret }
}

function headers(auth: { key: string; secret: string }): Record<string, string> {
  return {
    'Authorization': `sso-key ${auth.key}:${auth.secret}`,
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  }
}

function centsToDollars(cents: number): number { return Math.round(cents) / 100 }
function dollarsToCents(dollars: number): number { return Math.round(dollars * 100) }

export async function fetchGoDaddyAuctions(options: {
  limit?: number; minPrice?: number; maxPrice?: number; tlds?: string
}): Promise<RawDomain[]> {
  const auth = getAuth()
  if (!auth) return []

  const { limit = 100, minPrice = 1, maxPrice = 50, tlds = 'com,net,org,io,ai' } = options
  const url = `${GD_BASE}/auctions?limit=${limit}&minPrice=${dollarsToCents(minPrice)}&maxPrice=${dollarsToCents(maxPrice)}&tlds=${tlds}&status=OPEN`

  const response = await fetch(url, { headers: headers(auth) })
  if (!response.ok) throw new Error(`GoDaddy API ${response.status}: ${await response.text()}`)

  const data = await response.json()
  const auctions = Array.isArray(data) ? data : (data.auctions || [])

  return auctions.map((a: any) => ({
    domain: a.domain || '',
    price: centsToDollars(a.price || 0),
    source: 'godaddy_auction',
    auctionId: a.auctionId || a.auction_id || '',
    auctionEndTime: a.auctionEndTime || a.auction_end_time || '',
    bidCount: a.bidCount || a.bid_count || 0,
  })).filter((d: RawDomain) => d.domain)
}

export async function placeGoDaddyBid(auctionId: string, bidDollars: number): Promise<{
  success: boolean; message: string; bidId?: string
}> {
  const auth = getAuth()
  if (!auth) return { success: false, message: 'GoDaddy not configured' }

  const response = await fetch(`${GD_BASE}/auctions/${auctionId}/bids`, {
    method: 'POST',
    headers: headers(auth),
    body: JSON.stringify({ bidAmount: dollarsToCents(bidDollars) }),
  })

  if (!response.ok) return { success: false, message: `Bid failed (${response.status}): ${await response.text()}` }
  const result = await response.json()
  return { success: true, message: 'Bid placed', bidId: result.bidId }
}

export async function listForSale(domain: string, priceDollars: number): Promise<{
  success: boolean; message: string
}> {
  const auth = getAuth()
  if (!auth) return { success: false, message: 'GoDaddy not configured' }

  try {
    const response = await fetch(`${GD_BASE}/listings`, {
      method: 'POST',
      headers: headers(auth),
      body: JSON.stringify([{ domain, price: dollarsToCents(priceDollars), listingType: 'FIXED_PRICE' }]),
    })
    if (!response.ok) return { success: false, message: `Listing failed (${response.status}): ${await response.text()}` }
    return { success: true, message: `Listed ${domain} for $${priceDollars}` }
  } catch (e) {
    return { success: false, message: (e as Error).message }
  }
}

export async function getAuctionDetails(auctionId: string): Promise<{
  status: string; domain: string; currentPrice: number; bidCount: number;
  auctionEndTime: string; isWinner: boolean; winnerBidAmount: number | null; raw: any
} | null> {
  const auth = getAuth()
  if (!auth) return null
  try {
    const response = await fetch(`${GD_BASE}/auctions/${auctionId}`, { headers: headers(auth) })
    if (!response.ok) {
      if (response.status === 404) return { status: 'EXPIRED', domain: '', currentPrice: 0, bidCount: 0, auctionEndTime: '', isWinner: false, winnerBidAmount: null, raw: null }
      return null
    }
    const data = await response.json()
    const st = data.status || data.auctionStatus || 'UNKNOWN'
    const isEnded = ['CLOSED', 'ENDED', 'COMPLETED', 'EXPIRED'].includes(st.toUpperCase())
    const isWinner = data.isHighBidder === true || data.isWinner === true || data.bidStatus === 'WON'
    return {
      status: isWinner && isEnded ? 'WON' : (isEnded ? 'LOST' : st.toUpperCase()),
      domain: data.domain || '', currentPrice: typeof data.price === 'number' ? centsToDollars(data.price) : (data.price || 0),
      bidCount: data.bidCount || 0, auctionEndTime: data.auctionEndTime || '',
      isWinner, winnerBidAmount: isWinner ? (typeof data.winningBid === 'number' ? centsToDollars(data.winningBid) : null) : null, raw: data,
    }
  } catch (e) { return null }
}

export async function getOwnedDomainsList(): Promise<string[]> {
  const auth = getAuth()
  if (!auth) return []
  try {
    const response = await fetch('https://api.godaddy.com/v1/domains', { headers: headers(auth) })
    if (!response.ok) return []
    const domains = await response.json()
    return (Array.isArray(domains) ? domains : []).map((d: any) => d.domain || '').filter(Boolean)
  } catch { return [] }
}

export async function getCompletedSales(): Promise<Array<{ domain: string; salePrice: number; saleDate: string; buyer: string | null }>> {
  const auth = getAuth()
  if (!auth) return []
  try {
    const response = await fetch(`${GD_BASE}/listings?status=SOLD`, { headers: headers(auth) })
    if (!response.ok) return []
    const data = await response.json()
    const listings = Array.isArray(data) ? data : (data.listings || [])
    return listings.map((l: any) => ({
      domain: l.domain || '', salePrice: typeof l.salePrice === 'number' ? centsToDollars(l.salePrice) : (l.salePrice || 0),
      saleDate: l.saleDate || l.completedAt || new Date().toISOString(), buyer: l.buyerEmail || null,
    })).filter((s: any) => s.domain)
  } catch { return [] }
}

export async function getDomainExpiry(domain: string): Promise<{ expires: string; autoRenew: boolean; renewalPrice: number; status: string } | null> {
  const auth = getAuth()
  if (!auth) return null
  try {
    const response = await fetch(`https://api.godaddy.com/v1/domains/${domain}`, { headers: headers(auth) })
    if (!response.ok) return null
    const data = await response.json()
    return { expires: data.expires || '', autoRenew: data.renewAuto ?? false, renewalPrice: data.renewalPrice ? centsToDollars(data.renewalPrice) : 0, status: data.status || 'UNKNOWN' }
  } catch { return null }
}

export async function renewDomain(domain: string): Promise<{ success: boolean; message: string }> {
  const auth = getAuth()
  if (!auth) return { success: false, message: 'GoDaddy not configured' }
  try {
    const response = await fetch(`https://api.godaddy.com/v1/domains/${domain}/renew`, { method: 'POST', headers: headers(auth), body: JSON.stringify({ period: 1 }) })
    if (!response.ok) return { success: false, message: `Renewal failed (${response.status})` }
    return { success: true, message: `Renewed ${domain} for 1 year` }
  } catch (e) { return { success: false, message: (e as Error).message } }
}

export async function dropDomain(domain: string): Promise<{ success: boolean; message: string }> {
  const auth = getAuth()
  if (!auth) return { success: false, message: 'GoDaddy not configured' }
  try {
    const response = await fetch(`https://api.godaddy.com/v1/domains/${domain}`, { method: 'PATCH', headers: headers(auth), body: JSON.stringify({ renewAuto: false }) })
    if (!response.ok) return { success: false, message: `Drop failed (${response.status})` }
    return { success: true, message: `Auto-renew disabled for ${domain}` }
  } catch (e) { return { success: false, message: (e as Error).message } }
}

export async function setNameservers(domain: string, nameservers: string[]): Promise<{ success: boolean; message: string }> {
  const auth = getAuth()
  if (!auth) return { success: false, message: 'GoDaddy not configured' }
  try {
    const response = await fetch(`https://api.godaddy.com/v1/domains/${domain}`, { method: 'PATCH', headers: headers(auth), body: JSON.stringify({ nameServers: nameservers }) })
    if (!response.ok) return { success: false, message: 'Nameserver update failed' }
    return { success: true, message: `Nameservers set to ${nameservers.join(', ')}` }
  } catch (e) { return { success: false, message: (e as Error).message } }
}

export async function getPendingOffers(): Promise<Array<{ offerId: string; domain: string; offerAmount: number; buyerEmail: string | null; createdAt: string; expiresAt: string }>> {
  const auth = getAuth()
  if (!auth) return []
  try {
    const response = await fetch(`${GD_BASE}/listings?includeOffers=true`, { headers: headers(auth) })
    if (!response.ok) return []
    const data = await response.json()
    const listings = Array.isArray(data) ? data : (data.listings || [])
    const offers: any[] = []
    for (const listing of listings) {
      for (const offer of (listing.offers || [])) {
        if (offer.status === 'PENDING' || offer.status === 'ACTIVE') {
          offers.push({ offerId: offer.offerId || offer.id, domain: listing.domain, offerAmount: typeof offer.price === 'number' ? centsToDollars(offer.price) : (offer.price || 0), buyerEmail: offer.buyerEmail || null, createdAt: offer.createdAt || '', expiresAt: offer.expiresAt || '' })
        }
      }
    }
    return offers
  } catch { return [] }
}

export async function acceptOffer(offerId: string): Promise<{ success: boolean; message: string }> {
  const auth = getAuth()
  if (!auth) return { success: false, message: 'GoDaddy not configured' }
  try {
    const response = await fetch(`${GD_BASE}/listings/offers/${offerId}/accept`, { method: 'POST', headers: headers(auth) })
    if (!response.ok) return { success: false, message: `Accept failed (${response.status})` }
    return { success: true, message: 'Offer accepted' }
  } catch (e) { return { success: false, message: (e as Error).message } }
}

export async function counterOffer(offerId: string, counterAmount: number): Promise<{ success: boolean; message: string }> {
  const auth = getAuth()
  if (!auth) return { success: false, message: 'GoDaddy not configured' }
  try {
    const response = await fetch(`${GD_BASE}/listings/offers/${offerId}/counter`, { method: 'POST', headers: headers(auth), body: JSON.stringify({ price: dollarsToCents(counterAmount) }) })
    if (!response.ok) return { success: false, message: `Counter failed (${response.status})` }
    return { success: true, message: `Counter-offered at $${counterAmount}` }
  } catch (e) { return { success: false, message: (e as Error).message } }
}

export async function purchaseCloseout(domain: string, price: number): Promise<{ success: boolean; message: string; orderId?: string }> {
  const auth = getAuth()
  if (!auth) return { success: false, message: 'GoDaddy not configured' }
  try {
    const response = await fetch('https://api.godaddy.com/v1/orders/purchase', {
      method: 'POST', headers: headers(auth),
      body: JSON.stringify({ domains: [{ domain, consent: { agreedAt: new Date().toISOString(), agreedBy: 'API', agreementKeys: ['DNRA'] } }], payment: { type: 'ACCOUNT_BALANCE' } }),
    })
    if (!response.ok) return { success: false, message: `Purchase failed (${response.status}): ${(await response.text()).slice(0, 200)}` }
    const data = await response.json()
    return { success: true, message: `Purchased ${domain} for $${price}`, orderId: data.orderId || data.id }
  } catch (e) { return { success: false, message: (e as Error).message } }
}
