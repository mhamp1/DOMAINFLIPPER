/**
 * USPTO Trademark Check — FREE
 * Checks if a domain name matches an active US trademark.
 * Active trademark = premium buyer exists but also legal risk.
 */

export interface TrademarkResult {
  hasActiveTrademark: boolean
  trademarkCount: number
  requiresReview: boolean
  topMatches: Array<{ name: string; status: string; serialNumber: string }>
}

export async function checkTrademark(domainName: string): Promise<TrademarkResult> {
  // Strip TLD to get the keyword
  const keyword = domainName.replace(/\.[^.]+$/, '')
  if (keyword.length < 3) {
    return { hasActiveTrademark: false, trademarkCount: 0, requiresReview: false, topMatches: [] }
  }

  try {
    // USPTO Open Data portal — free, no API key needed
    const url = `https://developer.uspto.gov/ibd-api/v1/application/publications?searchText=${encodeURIComponent(keyword)}&rows=5`
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    })

    if (!response.ok) {
      return { hasActiveTrademark: false, trademarkCount: 0, requiresReview: false, topMatches: [] }
    }

    const data = await response.json()
    const results = data.results || []

    const activeMarks = results.filter((r: any) =>
      r.status === 'LIVE' || r.status === 'REGISTERED' || r.statusCode?.startsWith('6')
    )

    const topMatches = results.slice(0, 3).map((r: any) => ({
      name: r.title || r.markIdentification || keyword,
      status: r.status || 'UNKNOWN',
      serialNumber: r.serialNumber || '',
    }))

    return {
      hasActiveTrademark: activeMarks.length > 0,
      trademarkCount: results.length,
      requiresReview: activeMarks.length > 0,
      topMatches,
    }
  } catch (e) {
    console.error('[USPTO] Trademark check failed:', (e as Error).message)
    return { hasActiveTrademark: false, trademarkCount: 0, requiresReview: false, topMatches: [] }
  }
}
