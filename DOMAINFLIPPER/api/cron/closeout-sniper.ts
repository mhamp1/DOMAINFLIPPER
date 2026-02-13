/**
 * CLOSEOUT SNIPER — Every 15 Minutes
 *
 * GoDaddy closeouts: expired auction domains with 0 bids, fixed $11-12 price.
 * HugeDomains skips many of these: young domains, non-.com, semantic meaning.
 *
 * Phase-aware:
 *   observe:  scores + logs "would buy", purchases nothing
 *   cautious: max 2/day, $25/day cap
 *   scale:    max 4/day, $50/day cap
 *
 * SPEED: Scores thousands of domains in <500ms using pure math.
 * Only top 5 get Claude Haiku for deep analysis (~$0.005/run).
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

function env(key: string): string { return process.env[key] || '' }

const PHASE_LIMITS: Record<string, { maxPerDay: number; maxSpendPerDay: number }> = {
  observe:  { maxPerDay: 0,  maxSpendPerDay: 0 },
  cautious: { maxPerDay: 2,  maxSpendPerDay: 25 },
  scale:    { maxPerDay: 4,  maxSpendPerDay: 50 },
}

interface CloseoutDomain {
  domain: string
  price: number
  tld: string
  sld: string
  length: number
  age?: number
  gdValue?: number
  traffic?: number
}

interface FastScore {
  total: number
  reasons: string[]
  estimatedFlipValue: number
  passesFilter: boolean
}

/**
 * FAST SCORE — Runs in < 0.1ms per domain. Pure math, no network calls.
 *
 * Conservative valuations: most brandables sell $100-300, not $800.
 * 5x minimum ROI filter ensures we only buy what's clearly profitable.
 */
function fastScore(d: CloseoutDomain): FastScore {
  let score = 0
  const reasons: string[] = []

  // LENGTH (max 30)
  if (d.length <= 3) { score += 30; reasons.push('ultra-short') }
  else if (d.length <= 4) { score += 27; reasons.push('4-char') }
  else if (d.length <= 5) { score += 24; reasons.push('5-char') }
  else if (d.length <= 6) { score += 20; reasons.push('6-char') }
  else if (d.length <= 8) { score += 14; reasons.push('short') }
  else if (d.length <= 10) { score += 8 }
  else if (d.length <= 12) { score += 4 }

  // TLD (max 20)
  const tldScores: Record<string, number> = {
    'com': 20, 'ai': 18, 'io': 15, 'co': 14, 'app': 13, 'dev': 12,
    'net': 10, 'org': 9, 'gg': 10, 'xyz': 8, 'me': 8,
    'tech': 7, 'cloud': 7, 'finance': 6, 'health': 6,
  }
  const tldScore = tldScores[d.tld] || 3
  score += tldScore
  if (tldScore >= 15) reasons.push(`premium .${d.tld}`)

  // PRONOUNCEABILITY (max 15)
  const vowels = new Set('aeiou')
  const sld = d.sld.toLowerCase()
  let cv = 0
  for (let i = 1; i < sld.length; i++) {
    if (vowels.has(sld[i]) !== vowels.has(sld[i - 1])) cv++
  }
  const ratio = sld.length > 1 ? cv / (sld.length - 1) : 0
  score += Math.round(ratio * 15)
  if (ratio > 0.7) reasons.push('pronounceable')

  // NUMBERS/HYPHENS (-20)
  if (/[-0-9]/.test(sld)) { score -= 20; reasons.push('numbers-or-hyphens') }

  // BRANDABLE COMPONENTS (max 15)
  const prefixes = [
    'pay', 'fin', 'bit', 'net', 'web', 'get', 'go', 'pro', 'smart', 'fast', 'next',
    'open', 'cloud', 'data', 'code', 'dev', 'ai', 'meta', 'cyber', 'tech', 'bio', 'med',
    'health', 'green', 'eco', 'block', 'trade', 'stack', 'hub', 'lab', 'base', 'flow',
    'mind', 'spark', 'bolt', 'pulse', 'zen', 'nova', 'apex', 'core', 'edge', 'sync',
    'leap', 'shift', 'dash', 'snap', 'grid', 'beam', 'link',
  ]
  const suffixes = [
    'ly', 'fy', 'hub', 'lab', 'dev', 'box', 'pad', 'kit', 'way', 'spot',
    'zone', 'base', 'works', 'ware', 'mind', 'flow', 'stack', 'vault', 'forge',
    'craft', 'point', 'shift',
  ]
  let ws = 0
  for (const p of prefixes) { if (sld.startsWith(p) && sld.length > p.length) { ws += 8; break } }
  for (const s of suffixes) { if (sld.endsWith(s) && sld.length > s.length) { ws += 7; break } }
  score += Math.min(ws, 15)
  if (ws > 0) reasons.push('brandable-components')

  // GD UNDERVALUATION (max 10)
  if (d.gdValue && d.gdValue < 500 && score > 40) { score += 10; reasons.push('GD-undervalued') }

  // AGE (max 5, don't penalize young — HD blind spot)
  if (d.age && d.age >= 5) { score += 5; reasons.push('aged') }
  else if (d.age && d.age >= 2) { score += 3 }
  else { score += 1 }

  // TRAFFIC (max 5)
  if (d.traffic && d.traffic > 100) { score += 5; reasons.push('has-traffic') }
  else if (d.traffic && d.traffic > 10) { score += 2 }

  // CONSERVATIVE flip value estimate
  let est = 0
  if (d.length <= 4 && d.tld === 'com') est = 300
  else if (d.length <= 4 && tldScore >= 15) est = 150
  else if (d.length <= 5 && d.tld === 'com') est = 150
  else if (d.length <= 6 && d.tld === 'com') est = 100
  else if (d.length <= 6 && tldScore >= 12) est = 75
  else if (d.length <= 8 && d.tld === 'com') est = 60
  else if (score > 50) est = 50
  else est = 25
  if (ws > 0) est = Math.round(est * 1.3)
  if (ratio > 0.7) est = Math.round(est * 1.2)

  const clamped = Math.max(0, Math.min(100, score))
  return {
    total: clamped,
    reasons,
    estimatedFlipValue: est,
    passesFilter: clamped >= 50 && est >= d.price * 5, // 5x min ROI
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).end()
  const cronSecret = env('CRON_SECRET')
  const auth = req.headers.authorization
  if (cronSecret && auth !== `Bearer ${cronSecret}` && req.headers['x-admin-key'] !== env('ADMIN_API_KEY')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const startTime = Date.now()
  const url = env('SUPABASE_URL') || env('VITE_SUPABASE_URL')
  const key = env('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) return res.status(500).json({ error: 'DB not configured' })

  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
  const userId = env('BOT_USER_ID')
  const apiKey = env('GODADDY_API_KEY')
  const apiSecret = env('GODADDY_API_SECRET')

  const log = async (type: string, message: string, domain?: string) => {
    await supabase.from('bot_logs').insert({ user_id: userId, event_type: type, message, domain })
  }

  try {
    const { data: botState } = await supabase.from('bot_state').select('*').eq('user_id', userId).single()
    if (!botState || botState.is_paused) return res.status(200).json({ skipped: true, reason: 'Bot paused' })

    const phase = botState.operating_phase || 'observe'
    const limits = PHASE_LIMITS[phase] || PHASE_LIMITS.observe
    const boughtToday = botState.closeout_buys_today || 0
    const spentToday = botState.closeout_spend_today || 0

    if (phase !== 'observe' && (boughtToday >= limits.maxPerDay || spentToday >= limits.maxSpendPerDay)) {
      return res.status(200).json({ skipped: true, reason: 'Daily limit hit', phase })
    }

    // DOWNLOAD closeout inventory
    const dlStart = Date.now()
    let rawData: any[] = []

    if (!apiKey) {
      return res.status(200).json({ error: 'GODADDY_API_KEY not configured' })
    }

    try {
      // Try aftermarket API for closeout-status listings first
      const r = await fetch(
        'https://api.godaddy.com/v1/aftermarket/listings?status=closeout&limit=500',
        {
          headers: { Authorization: `sso-key ${apiKey}:${apiSecret}` },
          signal: AbortSignal.timeout(10000),
        }
      )
      if (r.ok) {
        rawData = await r.json()
      } else {
        // Fallback: inventory file
        const inv = await fetch('https://inventory.godaddy.com/closeout_listings.json.zip', {
          headers: { Authorization: `sso-key ${apiKey}:${apiSecret}` },
          signal: AbortSignal.timeout(10000),
        })
        if (inv.ok) {
          const buf = Buffer.from(await inv.arrayBuffer())
          try {
            const { gunzipSync } = await import('zlib')
            rawData = JSON.parse(gunzipSync(buf).toString())
          } catch {
            rawData = JSON.parse(buf.toString())
          }
        }
      }
    } catch (e: any) {
      await log('warning', `Closeout fetch failed: ${e.message}`)
      return res.status(200).json({ error: 'Fetch failed' })
    }

    const dlMs = Date.now() - dlStart
    if (!rawData.length) return res.status(200).json({ scanned: 0, phase })

    // DEDUP against owned + bid domains
    const { data: ownedRows } = await supabase.from('owned_domains').select('domain').eq('user_id', userId)
    const ownedSet = new Set((ownedRows || []).map((d: any) => d.domain.toLowerCase()))
    const { data: bidRows } = await supabase.from('auction_bids').select('domain').eq('user_id', userId).in('status', ['pending', 'winning'])
    const bidSet = new Set((bidRows || []).map((d: any) => d.domain.toLowerCase()))

    const closeouts: CloseoutDomain[] = rawData.filter((item: any) => {
      const dom = (item.domainName || item.domain || '').toLowerCase()
      if (!dom || ownedSet.has(dom) || bidSet.has(dom)) return false
      const price = item.price || item.currentPrice || item.minimumBid || 0
      return price >= 1 && price <= 20
    }).map((item: any) => {
      const dom = (item.domainName || item.domain || '').toLowerCase()
      const parts = dom.split('.')
      const tld = parts.pop() || ''
      const sld = parts.join('.')
      return {
        domain: dom,
        price: item.price || item.currentPrice || 12,
        tld,
        sld,
        length: sld.length,
        age: item.domainAge || item.age,
        gdValue: item.estimatedValue || item.goValue,
        traffic: item.monthlyTraffic || item.traffic,
      }
    })

    // FAST SCORE
    const fStart = Date.now()
    const scored = closeouts.map(d => ({ domain: d, score: fastScore(d) }))
    const passing = scored.filter(s => s.score.passesFilter).sort((a, b) => b.score.total - a.score.total)
    const fMs = Date.now() - fStart

    // AI DEEP analysis on top 5 only
    const top = passing.slice(0, 5)
    let ranked = top.map(t => t.domain)
    let aiMs = 0
    const anthropicKey = env('ANTHROPIC_API_KEY')

    if (anthropicKey && top.length > 0) {
      const aiStart = Date.now()
      try {
        const list = top.map(c =>
          `${c.domain.domain} -- $${c.domain.price}, ${c.domain.length}chars, .${c.domain.tld}, score ${c.score.total}, est $${c.score.estimatedFlipValue}, [${c.score.reasons.join(', ')}]`
        ).join('\n')
        const r = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': anthropicKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 300,
            messages: [{
              role: 'user',
              content: `Domain expert: rank these closeouts by realistic flip potential. Most brandables sell $100-300. Return ONLY JSON array of domain names in buy-priority order, or [] if none worth it.\n\n${list}`,
            }],
          }),
          signal: AbortSignal.timeout(5000),
        })
        if (r.ok) {
          const d = await r.json()
          const t = d.content?.[0]?.text || '[]'
          try {
            const arr: string[] = JSON.parse(t.replace(/```json|```/g, '').trim())
            if (Array.isArray(arr) && arr.length) {
              const map = new Map(top.map(c => [c.domain.domain, c.domain]))
              const reordered = arr.map(n => map.get(n.toLowerCase())).filter(Boolean) as CloseoutDomain[]
              if (reordered.length) ranked = reordered
            }
          } catch { /* use original order */ }
        }
      } catch { /* AI timeout — use fast-score order */ }
      aiMs = Date.now() - aiStart
    }

    // PURCHASE OR LOG based on phase
    const purchased: string[] = []
    const wouldBuy: string[] = []
    let spent = 0
    const remBuys = limits.maxPerDay - boughtToday
    const remBudget = limits.maxSpendPerDay - spentToday

    for (const domain of ranked.slice(0, Math.max(remBuys, 5))) {
      const sc = top.find(c => c.domain.domain === domain.domain)?.score

      // OBSERVE phase: log everything, buy nothing
      if (phase === 'observe' || limits.maxPerDay === 0) {
        wouldBuy.push(domain.domain)
        await log('info',
          `[OBSERVE] Would buy closeout: ${domain.domain} for $${domain.price} (score ${sc?.total || '?'}, est flip $${sc?.estimatedFlipValue || '?'}, [${sc?.reasons?.join(', ') || ''}])`,
          domain.domain
        )
        continue
      }

      // Budget/limit gate
      if (purchased.length >= remBuys || spent + domain.price > remBudget) break

      // LIVE PURCHASE
      try {
        const pr = await fetch(
          `https://api.godaddy.com/v1/aftermarket/listings/${encodeURIComponent(domain.domain)}/purchase`,
          {
            method: 'POST',
            headers: {
              Authorization: `sso-key ${apiKey}:${apiSecret}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ price: domain.price }),
            signal: AbortSignal.timeout(8000),
          }
        )

        if (pr.ok || pr.status === 201) {
          purchased.push(domain.domain)
          spent += domain.price
          await Promise.all([
            supabase.from('owned_domains').insert({
              user_id: userId, domain: domain.domain, status: 'owned',
              purchase_price: domain.price, current_value: sc?.estimatedFlipValue || domain.price * 5,
              registrar: 'GoDaddy', acquired_via: 'closeout',
              metadata: {
                closeout_sniper: true, fast_score: sc?.total,
                fast_reasons: sc?.reasons, estimated_flip: sc?.estimatedFlipValue,
              },
            }),
            supabase.from('transactions').insert({
              user_id: userId, domain: domain.domain, type: 'purchase',
              amount: domain.price, source: 'closeout_sniper',
            }),
            log('bid_placed',
              `CLOSEOUT BOUGHT: ${domain.domain} $${domain.price} (score ${sc?.total}, est $${sc?.estimatedFlipValue}) [${Date.now() - startTime}ms]`,
              domain.domain
            ),
          ])
        } else {
          const errText = await pr.text().catch(() => '')
          await log('warning', `Closeout purchase failed: ${domain.domain} ${pr.status} ${errText.slice(0, 100)}`, domain.domain)
        }
      } catch (e: any) {
        await log('warning', `Closeout purchase error: ${domain.domain} ${e.message}`, domain.domain)
      }
    }

    // Update spend tracking
    if (spent > 0) {
      await supabase.from('bot_state').update({
        spend_today: (botState.spend_today || 0) + spent,
        closeout_buys_today: boughtToday + purchased.length,
        closeout_spend_today: spentToday + spent,
      }).eq('user_id', userId)
    }

    if (passing.length > 0 || wouldBuy.length > 0) {
      await log('info',
        `Closeout [${phase}]: ${closeouts.length} scanned, ${passing.length} passed -> ` +
        (phase === 'observe' ? `${wouldBuy.length} would-buy` : `${purchased.length} bought ($${spent})`) +
        ` [${Date.now() - startTime}ms]`
      )
    }

    return res.status(200).json({
      phase,
      scanned: closeouts.length,
      passing: passing.length,
      purchased: purchased.length,
      would_buy: wouldBuy.length,
      spent,
      timing: { total_ms: Date.now() - startTime, download_ms: dlMs, filter_ms: fMs, ai_ms: aiMs },
    })
  } catch (e: any) {
    await log('error', `Closeout sniper error: ${e.message}`)
    return res.status(200).json({ error: e.message })
  }
}
