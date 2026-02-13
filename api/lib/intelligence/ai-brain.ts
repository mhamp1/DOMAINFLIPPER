/**
 * AI Brain — Claude-powered intelligence layer.
 * Graceful degradation: returns null if ANTHROPIC_API_KEY not set.
 */

const HAIKU = 'claude-3-5-haiku-20241022'
const SONNET = 'claude-sonnet-4-20250514'

interface AIResponse { text: string; parsed: any; model: string; inputTokens: number; outputTokens: number; cost: number }

async function callClaude(model: string, systemPrompt: string, userPrompt: string, maxTokens: number = 1000): Promise<AIResponse | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return null
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model, max_tokens: maxTokens, system: systemPrompt, messages: [{ role: 'user', content: userPrompt }] }),
    })
    if (!response.ok) { console.error(`[AI Brain] Claude ${response.status}: ${(await response.text()).slice(0, 200)}`); return null }
    const data = await response.json()
    const text = data.content?.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n') || ''
    const inputTokens = data.usage?.input_tokens || 0
    const outputTokens = data.usage?.output_tokens || 0
    const isHaiku = model.includes('haiku')
    const cost = isHaiku ? inputTokens * 0.0000008 + outputTokens * 0.000004 : inputTokens * 0.000003 + outputTokens * 0.000015
    let parsed = null
    try { parsed = JSON.parse(text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()) } catch {}
    return { text, parsed, model, inputTokens, outputTokens, cost }
  } catch (e) { console.error(`[AI Brain] API call failed: ${(e as Error).message}`); return null }
}

export interface AIDomainAnalysis {
  brandabilityScore: number; marketFitScore: number; flipPotential: number; riskLevel: string
  shouldBid: boolean; maxBidSuggestion: number; suggestedListPrice: number; reasoning: string
  buyerPersona: string; quickFlip: boolean; tags: string[]
}

export async function aiAnalyzeDomains(domains: Array<{ domain: string; price: number; estimatedValue: number; score: number; age?: number; backlinks?: number; bidCount?: number; source: string }>): Promise<Record<string, AIDomainAnalysis> | null> {
  if (domains.length === 0) return {}
  const systemPrompt = `You are an expert domain investor. Evaluate domains for flip potential. .com is king, .ai is hot for AI boom. Short brandable names sell fast. Respond ONLY with JSON. No other text.`
  const list = domains.map(d => `"${d.domain}" — $${d.price}, est $${d.estimatedValue}, score ${d.score}, ${d.age || '?'}yr, ${d.backlinks || 0}bl, ${d.bidCount || 0} bids, ${d.source}`).join('\n')
  const userPrompt = `Analyze these ${domains.length} domains. For each: shouldBid (bool), maxBidSuggestion ($), suggestedListPrice ($), reasoning (1 sentence), tags (array). Be HONEST - most domains are NOT worth buying.\n\nDOMAINS:\n${list}\n\nRespond with JSON: { "domain.com": { "brandabilityScore": 8, "marketFitScore": 7, "flipPotential": 8, "riskLevel": "low", "shouldBid": true, "maxBidSuggestion": 45, "suggestedListPrice": 299, "reasoning": "...", "buyerPersona": "...", "quickFlip": true, "tags": ["fintech"] } }`
  const result = await callClaude(HAIKU, systemPrompt, userPrompt, 2500)
  if (!result?.parsed) return null
  console.log(`[AI Brain] Domain analysis: ${domains.length} domains, ~$${result.cost.toFixed(4)}`)
  return result.parsed
}

export interface AIPortfolioStrategy {
  overallHealth: string; domainsToReprice: Array<{ domain: string; currentPrice: number; suggestedPrice: number; reason: string }>
  domainsToDrop: Array<{ domain: string; reason: string; urgency: string }>
  domainsToHold: Array<{ domain: string; reason: string }>
  budgetRecommendation: string; focusAreas: string[]; strategicInsights: string
}

export async function aiPortfolioReview(portfolio: Array<{ domain: string; purchasePrice: number; listedPrice: number; daysOwned: number; daysListed: number; parkingRevenue: number }>, performance: { totalSpent: number; totalRevenue: number; totalProfit: number; winRate: number; domainsOwned: number; domainsSold: number }): Promise<AIPortfolioStrategy | null> {
  const systemPrompt = `You are a senior domain portfolio manager. Review portfolios and make strategic decisions. Cash tied in unsold domains is a cost. Cut losers fast. Respond ONLY with JSON.`
  const summary = portfolio.slice(0, 30).map(d => `${d.domain}: bought $${d.purchasePrice}, listed $${d.listedPrice}, ${d.daysOwned}d owned, ${d.daysListed}d listed, parking $${d.parkingRevenue.toFixed(2)}`).join('\n')
  const userPrompt = `Review portfolio. Spent: $${performance.totalSpent}, Revenue: $${performance.totalRevenue}, Profit: $${performance.totalProfit}, Win rate: ${performance.winRate}%, Owned: ${performance.domainsOwned}, Sold: ${performance.domainsSold}.\n\nPORTFOLIO:\n${summary}\n\nRespond JSON: { "overallHealth": "healthy", "domainsToReprice": [...], "domainsToDrop": [...], "domainsToHold": [...], "budgetRecommendation": "...", "focusAreas": [...], "strategicInsights": "..." }`
  const result = await callClaude(SONNET, systemPrompt, userPrompt, 2500)
  if (!result?.parsed) return null
  console.log(`[AI Brain] Portfolio review: ~$${result.cost.toFixed(4)}`)
  return result.parsed
}

export interface AITrendInsights {
  emergingSectors: Array<{ sector: string; keywords: string[]; urgency: string }>
  decliningTrends: Array<{ trend: string; action: string }>
  suggestedSearchTerms: string[]; tldFocus: string[]
}

export async function aiTrendScan(currentDate: string, recentSales: Array<{ domain: string; price: number }>, currentPortfolio: string[]): Promise<AITrendInsights | null> {
  const systemPrompt = `You are a domain market trend analyst. Identify emerging sectors and declining trends. AI/ML domains hot 2023-2026. Fintech, healthtech, climate always sell. Respond ONLY with JSON.`
  const userPrompt = `Date: ${currentDate}. Recent sales: ${recentSales.slice(0, 10).map(s => `${s.domain} $${s.price}`).join(', ') || 'None'}. Portfolio: ${currentPortfolio.slice(0, 20).join(', ') || 'Empty'}.\n\nWhat sectors/keywords to hunt? Which trends declining? Search terms for GoDaddy inventory? TLD focus?\n\nJSON: { "emergingSectors": [{"sector":"...","keywords":[...],"urgency":"buy_now|watch|emerging"}], "decliningTrends": [{"trend":"...","action":"sell_fast|stop_buying"}], "suggestedSearchTerms": [...], "tldFocus": [".com",".ai"] }`
  const result = await callClaude(SONNET, systemPrompt, userPrompt, 1500)
  if (!result?.parsed) return null
  console.log(`[AI Brain] Trend scan: ~$${result.cost.toFixed(4)}`)
  return result.parsed
}

export interface AINegotiationDecision { action: string; counterAmount?: number; reasoning: string; confidence: number }

export async function aiNegotiateOffer(domain: string, purchasePrice: number, listedPrice: number, floorPrice: number, offerAmount: number, daysListed: number): Promise<AINegotiationDecision | null> {
  const systemPrompt = `You are a domain negotiator. Decide: accept, counter (with amount), reject, or ignore. Never accept below floor price. First offer is rarely best. Respond ONLY with JSON.`
  const userPrompt = `Offer on ${domain}: $${offerAmount}. Bought $${purchasePrice}, listed $${listedPrice}, floor $${floorPrice}, ${daysListed}d listed.\n\nJSON: { "action": "counter", "counterAmount": 450, "reasoning": "...", "confidence": 80 }`
  const result = await callClaude(HAIKU, systemPrompt, userPrompt, 400)
  if (!result?.parsed) return null
  console.log(`[AI Brain] Negotiation for ${domain}: ${result.parsed.action}, ~$${result.cost.toFixed(4)}`)
  return result.parsed
}

export interface AIDailyBriefing { summary: string; topOpportunity: string; topRisk: string; actionItems: string[]; marketSentiment: string }

export async function aiDailyBriefing(stats: { domainsScanned: number; bidsPlaced: number; domainsOwned: number; revenue24h: number; spend24h: number }, recentActivity: string[]): Promise<AIDailyBriefing | null> {
  const systemPrompt = `You are an AI brain for a domain bot. Give a brief daily summary. Be direct, actionable. Respond ONLY with JSON.`
  const userPrompt = `Stats: scanned ${stats.domainsScanned}, bids ${stats.bidsPlaced}, portfolio ${stats.domainsOwned}, revenue $${stats.revenue24h}, spend $${stats.spend24h}.\nRecent: ${recentActivity.slice(0, 8).join(' | ')}\n\nJSON: { "summary": "...", "topOpportunity": "...", "topRisk": "...", "actionItems": ["..."], "marketSentiment": "neutral" }`
  const result = await callClaude(HAIKU, systemPrompt, userPrompt, 600)
  if (!result?.parsed) return null
  console.log(`[AI Brain] Daily briefing: ~$${result.cost.toFixed(4)}`)
  return result.parsed
}
