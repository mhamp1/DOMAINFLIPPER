/**
 * EstiBot Appraisal API
 * Requires EstiBot Domainer plan (~$30/mo) — OPTIONAL
 * Provides appraised value, CPC, search volume.
 * Graceful degradation: returns empty if not configured.
 */

export interface EstiBotResult {
  appraised_value: number
  cpc: number
  search_volume: number
  domain_age: number
}

export async function getEstiBotAppraisals(domains: string[]): Promise<Record<string, EstiBotResult>> {
  const apiKey = process.env.ESTIBOT_API_KEY
  if (!apiKey || domains.length === 0) return {}

  try {
    // EstiBot cache mode: fast (150ms for 200 domains)
    const url = `https://www.estibot.com/api.php?a=appraise&d=${domains.join(',')}&mode=cache&key=${apiKey}`
    const response = await fetch(url)
    if (!response.ok) return {}

    const data = await response.json()
    const results: Record<string, EstiBotResult> = {}

    for (const item of data.results?.found || []) {
      if (item.domain && item.appraised_value) {
        results[item.domain] = {
          appraised_value: Number(item.appraised_value) || 0,
          cpc: Number(item.cpc) || 0,
          search_volume: Number(item.search_volume) || 0,
          domain_age: Number(item.age) || 0,
        }
      }
    }
    return results
  } catch (e) {
    console.error('[EstiBot] Appraisal failed:', (e as Error).message)
    return {}
  }
}
