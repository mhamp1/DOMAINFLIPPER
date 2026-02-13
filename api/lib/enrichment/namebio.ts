/**
 * NameBio Comparable Sales API
 * Requires NameBio Domainer plan ($14.95/mo) — OPTIONAL
 * Graceful degradation: returns empty if not configured.
 */

interface ComparableSalesData {
  averagePrice?: number
  medianPrice?: number
  totalSales?: number
  highPrice?: number
  lowPrice?: number
}

interface PreviousSale {
  price: number
  date: string
  venue: string
}

export async function getKeywordComparables(keyword: string, tld: string): Promise<ComparableSalesData | null> {
  const email = process.env.NAMEBIO_EMAIL
  const key = process.env.NAMEBIO_API_KEY
  if (!email || !key) return null

  try {
    const response = await fetch('https://api.namebio.com/keywordstats/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ email, key, keyword, extension: tld, includetrends: '0' }),
    })

    if (!response.ok) return null
    const data = await response.json()
    if (data.status !== 'success' || !data.stats?.start) return null

    return {
      averagePrice: data.stats.start.average_price,
      medianPrice: data.stats.start.median_price,
      totalSales: data.stats.start.total_sales,
      highPrice: data.stats.start.high_price,
      lowPrice: data.stats.start.low_price,
    }
  } catch (e) {
    console.error('[NameBio] Keyword stats failed:', (e as Error).message)
    return null
  }
}

export async function checkPreviousSales(domain: string): Promise<PreviousSale[]> {
  const email = process.env.NAMEBIO_EMAIL
  const key = process.env.NAMEBIO_API_KEY
  if (!email || !key) return []

  try {
    const response = await fetch('https://api.namebio.com/checkdomain/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ email, key, domain }),
    })

    if (!response.ok) return []
    const data = await response.json()
    if (data.status !== 'success' || !data.sales?.length) return []

    return data.sales.map(([price, date, venue]: [string, string, string]) => ({
      price: parseInt(price),
      date,
      venue,
    }))
  } catch (e) {
    console.error('[NameBio] Check domain failed:', (e as Error).message)
    return []
  }
}
