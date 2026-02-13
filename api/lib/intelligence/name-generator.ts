/**
 * AI Name Generator v2 — Targeted Brandable Domain Creation
 *
 * 2 parallel AI calls (saves cost) generating ~60 candidates across:
 *   - Compound brandables + short pronounceables (call 1)
 *   - Dictionary .ai + industry-targeted (call 2)
 *
 * Phase-aware: observe logs, cautious registers 1/day, scale registers 3/day.
 * Conservative valuations: most brandables sell $100-300, not $800.
 */

function env(key: string): string { return process.env[key] || '' }

export interface GeneratedName {
  domain: string
  strategy: string
  reasoning: string
  estimatedValue: number
  targetBuyer: string
  tld: string
  registrationCost: number
  // Keep v1 compat
  category?: string
}

async function callHaiku(apiKey: string, prompt: string): Promise<string> {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    }),
    signal: AbortSignal.timeout(15000),
  })
  if (!r.ok) throw new Error(`Claude API ${r.status}`)
  const d = await r.json()
  return d.content?.[0]?.text || ''
}

function parseNames(text: string, strategy: string): GeneratedName[] {
  try {
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim())
    return (Array.isArray(parsed) ? parsed : []).map((n: any) => ({
      domain: n.domain || '',
      strategy,
      reasoning: n.reasoning || '',
      estimatedValue: n.estimatedValue || 100,
      targetBuyer: n.targetBuyer || 'startups',
      tld: (n.domain || '').split('.').pop() || '',
      registrationCost: (n.domain || '').endsWith('.ai') ? 25 : (n.domain || '').endsWith('.io') ? 30 : 10,
      category: n.category || strategy,
    })).filter((n: GeneratedName) => n.domain)
  } catch {
    return []
  }
}

/**
 * Generate hyper-targeted brandable names using AI.
 * Returns ~60 names across multiple patterns and TLDs.
 * 2 AI calls run in parallel (~$0.02 total cost).
 */
export async function generateTargetedNames(
  trends: string,
  existing: string[],
  budget: number,
): Promise<GeneratedName[]> {
  const apiKey = env('ANTHROPIC_API_KEY')
  if (!apiKey) return []

  const ex = existing.slice(0, 10).join(', ')
  const t = trends || 'AI agents, fintech, health tech, climate, cybersecurity'

  const [b1, b2] = await Promise.allSettled([
    callHaiku(apiKey, `Generate 30 brandable domain names. Two types:

TYPE A (15) — Compound: [prefix][suffix].[tld], 5-10 chars, pronounceable. Mix .com 60%, .ai 20%, .io 20%.
TYPE B (15) — Short pronounceables: 3-5 chars, made-up but sounds good. .com preferred.

Trends: ${t}. Avoid similar to: ${ex}
CONSERVATIVE estimatedValue — most sell $100-300. Only exceptional 4-char .com hit $500+.
Return ONLY JSON: [{"domain":"x.com","reasoning":"why","estimatedValue":150,"targetBuyer":"who","category":"compound"}]`),

    callHaiku(apiKey, `Generate 30 domain names. Two types:

TYPE A (15) — Dictionary .ai: [english verb/noun].ai, 4-9 chars, AI/ML related. Realistic: $200-500.
TYPE B (15) — Industry-targeted: [industry+mod].[tld], 6-12 chars. Hot: ${t}. Mix .com 40%, .ai 30%, .io 20%, .co 10%.

CONSERVATIVE estimatedValue. Return ONLY JSON: [{"domain":"x.ai","reasoning":"why","estimatedValue":200,"targetBuyer":"who","category":"industry"}]`),
  ])

  const all: GeneratedName[] = []
  if (b1.status === 'fulfilled') all.push(...parseNames(b1.value, 'compound_or_short'))
  if (b2.status === 'fulfilled') all.push(...parseNames(b2.value, 'dictionary_or_industry'))

  const seen = new Set<string>()
  return all.filter(n => {
    const k = n.domain.toLowerCase()
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

/**
 * Check availability in parallel batches via GoDaddy API.
 */
export async function checkAvailabilityFast(domains: string[]): Promise<Map<string, boolean>> {
  const apiKey = env('GODADDY_API_KEY')
  const apiSecret = env('GODADDY_API_SECRET')
  const results = new Map<string, boolean>()
  if (!apiKey) return results

  for (let i = 0; i < domains.length; i += 50) {
    try {
      const r = await fetch('https://api.godaddy.com/v1/domains/available?checkType=FAST', {
        method: 'POST',
        headers: {
          Authorization: `sso-key ${apiKey}:${apiSecret}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(domains.slice(i, i + 50)),
        signal: AbortSignal.timeout(8000),
      })
      if (r.ok) {
        const d = await r.json()
        if (d.domains) {
          for (const x of d.domains) {
            results.set(x.domain.toLowerCase(), x.available === true)
          }
        }
      }
    } catch { /* skip failed batch */ }
  }

  return results
}

/**
 * Register a domain via the cheapest available registrar per TLD.
 * Tries Namecheap first (cheaper for .com), then GoDaddy as fallback.
 */
export async function registerDomain(domain: string): Promise<{ success: boolean; cost: number; error?: string }> {
  const tld = domain.split('.').pop() || ''
  const ncKey = env('NAMECHEAP_API_KEY')
  const ncUser = env('NAMECHEAP_API_USER')
  const gdKey = env('GODADDY_API_KEY')
  const gdSecret = env('GODADDY_API_SECRET')
  const reg = (field: string, fallback: string) => env(`REGISTRANT_${field}`) || fallback

  // Try Namecheap first
  if (ncKey && ncUser) {
    try {
      const p = new URLSearchParams({
        ApiUser: ncUser, ApiKey: ncKey, UserName: ncUser,
        ClientIp: env('SERVER_IP') || '127.0.0.1',
        Command: 'namecheap.domains.create', DomainName: domain, Years: '1',
        RegistrantFirstName: reg('FIRST_NAME', 'Domain'), RegistrantLastName: reg('LAST_NAME', 'Admin'),
        RegistrantAddress1: reg('ADDRESS', '123 Main St'), RegistrantCity: reg('CITY', 'Phoenix'),
        RegistrantStateProvince: reg('STATE', 'AZ'), RegistrantPostalCode: reg('ZIP', '85001'),
        RegistrantCountry: reg('COUNTRY', 'US'), RegistrantPhone: reg('PHONE', '+1.5555555555'),
        RegistrantEmailAddress: reg('EMAIL', 'admin@example.com'),
        TechFirstName: reg('FIRST_NAME', 'Domain'), TechLastName: reg('LAST_NAME', 'Admin'),
        TechAddress1: reg('ADDRESS', '123 Main St'), TechCity: reg('CITY', 'Phoenix'),
        TechStateProvince: reg('STATE', 'AZ'), TechPostalCode: reg('ZIP', '85001'),
        TechCountry: reg('COUNTRY', 'US'), TechPhone: reg('PHONE', '+1.5555555555'),
        TechEmailAddress: reg('EMAIL', 'admin@example.com'),
        AdminFirstName: reg('FIRST_NAME', 'Domain'), AdminLastName: reg('LAST_NAME', 'Admin'),
        AdminAddress1: reg('ADDRESS', '123 Main St'), AdminCity: reg('CITY', 'Phoenix'),
        AdminStateProvince: reg('STATE', 'AZ'), AdminPostalCode: reg('ZIP', '85001'),
        AdminCountry: reg('COUNTRY', 'US'), AdminPhone: reg('PHONE', '+1.5555555555'),
        AdminEmailAddress: reg('EMAIL', 'admin@example.com'),
        AuxBillingFirstName: reg('FIRST_NAME', 'Domain'), AuxBillingLastName: reg('LAST_NAME', 'Admin'),
        AuxBillingAddress1: reg('ADDRESS', '123 Main St'), AuxBillingCity: reg('CITY', 'Phoenix'),
        AuxBillingStateProvince: reg('STATE', 'AZ'), AuxBillingPostalCode: reg('ZIP', '85001'),
        AuxBillingCountry: reg('COUNTRY', 'US'), AuxBillingPhone: reg('PHONE', '+1.5555555555'),
        AuxBillingEmailAddress: reg('EMAIL', 'admin@example.com'),
        AddFreeWhoisguard: 'yes', WGEnabled: 'yes',
      })
      const r = await fetch(`https://api.namecheap.com/xml.response?${p}`, { signal: AbortSignal.timeout(15000) })
      const t = await r.text()
      if (t.includes('Status="OK"') || t.includes('DomainCreated="true"')) {
        const m = t.match(/ChargedAmount="([\d.]+)"/)
        return { success: true, cost: m ? parseFloat(m[1]) : (tld === 'com' ? 10 : 25) }
      }
    } catch { /* fall through to GoDaddy */ }
  }

  // Fallback: GoDaddy
  if (gdKey) {
    try {
      const r = await fetch('https://api.godaddy.com/v1/domains/purchase', {
        method: 'POST',
        headers: {
          Authorization: `sso-key ${gdKey}:${gdSecret}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          domain,
          consent: { agreementKeys: ['DNRA'], agreedBy: env('SERVER_IP'), agreedAt: new Date().toISOString() },
          period: 1, renewAuto: false, privacy: true,
          contactRegistrant: {
            nameFirst: reg('FIRST_NAME', 'Domain'), nameLast: reg('LAST_NAME', 'Admin'),
            email: reg('EMAIL', 'admin@example.com'), phone: reg('PHONE', '+1.5555555555'),
            addressMailing: {
              address1: reg('ADDRESS', '123 Main St'), city: reg('CITY', 'Phoenix'),
              state: reg('STATE', 'AZ'), postalCode: reg('ZIP', '85001'), country: reg('COUNTRY', 'US'),
            },
          },
        }),
        signal: AbortSignal.timeout(15000),
      })
      if (r.ok) return { success: true, cost: tld === 'com' ? 12 : tld === 'ai' ? 25 : 15 }
    } catch { /* registration failed */ }
  }

  return { success: false, cost: 0, error: 'Registration failed' }
}

// ---- V1 COMPATIBILITY EXPORTS ----
// These maintain backward compatibility with existing code that imports v1 functions.

export async function generateBrandableNames(
  trendInsights: { emergingSectors?: Array<{ sector: string; keywords: string[] }>; tldFocus?: string[] },
  existingPortfolio: string[],
  budget: number,
): Promise<GeneratedName[] | null> {
  const sectors = trendInsights.emergingSectors?.map(s => `${s.sector}: ${s.keywords.join(', ')}`).join('\n') || ''
  const result = await generateTargetedNames(sectors, existingPortfolio, budget)
  return result.length > 0 ? result : null
}

export function rankAvailableNames(generated: GeneratedName[], available: string[]): GeneratedName[] {
  const set = new Set(available.map(d => d.toLowerCase()))
  return generated.filter(g => set.has(g.domain.toLowerCase())).sort((a, b) => b.estimatedValue - a.estimatedValue)
}
