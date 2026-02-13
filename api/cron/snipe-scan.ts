/**
 * Cron: Snipe Scanner (every 5 min)
 * Lightweight scan — ONLY auctions ending within 2 hours.
 * Speed advantage over competitors scanning every 15-30 min.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { fetchGoDaddyInventory } from '../lib/sources/gdInventory.js'
import { scoreDomain, calculateBid } from '../lib/valuation/scorer.js'
import { placeGoDaddyBid } from '../lib/sources/godaddy.js'
import { notify } from '../lib/notify.js'

function env(key: string): string { return process.env[key] || '' }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).end()
  const cronSecret = env('CRON_SECRET')
  const auth = req.headers.authorization
  if (cronSecret && auth !== `Bearer ${cronSecret}` && req.headers['x-admin-key'] !== env('ADMIN_API_KEY'))
    return res.status(401).json({ error: 'Unauthorized' })

  const url = env('SUPABASE_URL') || env('VITE_SUPABASE_URL')
  const key = env('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) return res.status(500).json({ error: 'DB not configured' })
  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
  const userId = env('BOT_USER_ID')
  if (!userId) return res.status(500).json({ error: 'BOT_USER_ID required' })

  try {
    const { data: botState } = await supabase.from('bot_state').select('*').eq('user_id', userId).single()
    if (!botState?.enabled) return res.status(200).json({ status: 'disabled' })
    if (botState.cooldown_until && new Date(botState.cooldown_until).getTime() > Date.now())
      return res.status(200).json({ status: 'cooldown' })

    const { data: settings } = await supabase.from('pipeline_settings').select('*').order('last_updated', { ascending: false }).limit(1).single()
    const maxSpendDomain = settings?.max_spend_per_domain || 20
    const minROI = settings?.min_margin_multiplier || 3.0
    const maxSpendDay = settings?.max_spend_per_day || 200
    const remainingBudget = maxSpendDay - (botState.spend_today || 0)
    if (remainingBudget <= 0) return res.status(200).json({ status: 'budget_exhausted' })

    const tldList = (settings?.allowed_tlds || ['.com', '.ai', '.io']).map((t: string) => t.replace('.', ''))

    // ONLY fetch ending-today — small file, fast
    const endingToday = await fetchGoDaddyInventory({ tlds: tldList, maxPrice: maxSpendDomain, maxResults: 200, includeCloseouts: false, includeEndingToday: true })

    // Filter to auctions ending within 2 hours
    const urgent = endingToday.filter(d => {
      if (!d.raw.auctionEndTime) return false
      const hoursLeft = (new Date(d.raw.auctionEndTime).getTime() - Date.now()) / 3600000
      return hoursLeft > 0 && hoursLeft < 2
    })

    if (urgent.length === 0) return res.status(200).json({ status: 'no_urgent', scanned: endingToday.length })

    // Check existing bids
    const { data: existingBids } = await supabase.from('transactions').select('domain').eq('user_id', userId).eq('type', 'bid').eq('status', 'pending')
    const alreadyBid = new Set((existingBids || []).map((b: any) => b.domain))

    let bidCount = 0, bidSpend = 0

    for (const d of urgent) {
      if (alreadyBid.has(d.raw.domain)) continue
      const scored = scoreDomain(d.raw, d.enrichment)
      if (scored.score.total < 50) continue
      const decision = calculateBid(scored, { minRoi: minROI, perDomainCap: maxSpendDomain, reviewThreshold: 999 })
      if (!decision.shouldBid || bidSpend + decision.bidAmount > remainingBudget) continue

      const hoursLeft = ((new Date(d.raw.auctionEndTime!).getTime() - Date.now()) / 3600000).toFixed(1)

      if (!botState.dry_run && scored.auctionId) {
        const result = await placeGoDaddyBid(scored.auctionId, decision.bidAmount)
        if (result.success) {
          bidCount++; bidSpend += decision.bidAmount
          await supabase.from('transactions').insert({ user_id: userId, type: 'bid', domain: d.raw.domain, amount: decision.bidAmount, date: new Date().toISOString(), strategy_id: 'snipe_scan', status: 'pending', registrar: 'GoDaddy', metadata: { snipe: true, hours_remaining: hoursLeft, score: scored.score.total, estimated_value: scored.score.estimatedValue } })
          await supabase.from('bot_logs').insert({ user_id: userId, event_type: 'bid_placed', message: `SNIPE: ${d.raw.domain} for $${decision.bidAmount} (${hoursLeft}h left, score ${scored.score.total})`, domain: d.raw.domain, details: {} })
        }
      } else {
        await supabase.from('bot_logs').insert({ user_id: userId, event_type: 'info', message: `[DRY_RUN] Would snipe ${d.raw.domain} for $${decision.bidAmount} (${hoursLeft}h left, score ${scored.score.total})`, domain: d.raw.domain, details: {} })
      }
    }

    if (bidCount > 0) {
      await supabase.from('bot_state').update({ bids_today: (botState.bids_today || 0) + bidCount, spend_today: (botState.spend_today || 0) + bidSpend, total_bids: (botState.total_bids || 0) + bidCount, total_spend: (botState.total_spend || 0) + bidSpend }).eq('user_id', userId)
      await notify(settings?.notification_webhook, 'Snipe Bids Placed', { Bids: bidCount, Spent: `$${bidSpend}`, 'Urgent auctions': urgent.length }, 'critical')
    }

    return res.status(200).json({ status: 'completed', urgentFound: urgent.length, newOpportunities: urgent.length - alreadyBid.size, bidsPlaced: bidCount, spent: bidSpend })
  } catch (e: any) { return res.status(500).json({ error: e.message }) }
}
