/**
 * AI Buyer Identification — finds companies who'd want each domain.
 */
const SONNET = 'claude-sonnet-4-20250514'

export interface BuyerLead { domain: string; companyType: string; searchQueries: string[]; emailSubject: string; emailBody: string; estimatedSalePrice: number; confidence: number }

export async function identifyBuyers(domains: Array<{ domain: string; listedPrice: number; tags: string[]; buyerPersona: string | null; daysListed: number }>): Promise<BuyerLead[] | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return null
  const list = domains.map(d => `${d.domain} — $${d.listedPrice}, tags: ${d.tags.join(', ') || 'none'}, persona: ${d.buyerPersona || 'unknown'}, ${d.daysListed}d listed`).join('\n')
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' }, body: JSON.stringify({ model: SONNET, max_tokens: 3000, system: 'You are a domain sales expert. Identify buyer types and draft outreach emails. Short, professional, not salesy. Respond ONLY with JSON array.', messages: [{ role: 'user', content: `For each domain, identify buyers and draft an outreach email.\n\n${list}\n\nJSON: [{"domain":"x.com","companyType":"...","searchQueries":["..."],"emailSubject":"...","emailBody":"...","estimatedSalePrice":500,"confidence":75}]` }] }) })
    if (!r.ok) return null
    const data = await r.json()
    const text = data.content?.find((b: any) => b.type === 'text')?.text || ''
    return JSON.parse(text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim())
  } catch { return null }
}
