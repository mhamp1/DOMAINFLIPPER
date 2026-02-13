/**
 * Cron: Daily Report (runs 10 PM)
 * Sends a summary of the day's activity to Discord/Slack webhook.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { notify } from '../lib/notify.js'
import { aiDailyBriefing } from '../lib/intelligence/ai-brain.js'
import { getOperatingCostsFromEnv, getDailyOperatingCost, calculatePL } from '../lib/costs.js'

function env(key: string): string { return process.env[key] || '' }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).end()
  const cronSecret = env('CRON_SECRET')
  const auth = req.headers.authorization
  const reqKey = req.headers['x-admin-key'] as string
  if (cronSecret && auth !== `Bearer ${cronSecret}` && reqKey !== env('ADMIN_API_KEY')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const url = env('SUPABASE_URL') || env('VITE_SUPABASE_URL')
  const key = env('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) return res.status(500).json({ error: 'DB not configured' })
  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
  const userId = env('BOT_USER_ID')
  if (!userId) return res.status(500).json({ error: 'BOT_USER_ID required' })

  try {
    const today = new Date().toISOString().split('T')[0]

    const [botState, portfolio, todayScans, todayBids, todaySales] = await Promise.all([
      supabase.from('bot_state').select('*').eq('user_id', userId).single(),
      supabase.from('owned_domains').select('purchase_price, current_value, sale_price, sold, status').eq('user_id', userId),
      supabase.from('scan_results').select('id').eq('user_id', userId).gte('created_at', today),
      supabase.from('transactions').select('amount, domain').eq('user_id', userId).eq('type', 'bid').gte('date', today),
      supabase.from('transactions').select('amount, domain').eq('user_id', userId).eq('type', 'sell').gte('date', today),
    ])

    const bs = botState.data
    const domains = portfolio.data || []
    const totalInvested = domains.reduce((s, d) => s + (d.purchase_price || 0), 0)
    const totalValue = domains.filter(d => !d.sold).reduce((s, d) => s + (d.current_value || 0), 0)
    const totalRevenue = domains.filter(d => d.sold).reduce((s, d) => s + (d.sale_price || 0), 0)
    const activeCount = domains.filter(d => !d.sold).length
    const soldCount = domains.filter(d => d.sold).length
    const bidsToday = todayBids.data || []
    const salesToday = todaySales.data || []
    const spentToday = bidsToday.reduce((s, b) => s + (b.amount || 0), 0)
    const earnedToday = salesToday.reduce((s, b) => s + (b.amount || 0), 0)

    const { data: settings } = await supabase.from('pipeline_settings').select('notification_webhook').order('last_updated', { ascending: false }).limit(1).single()

    await notify(settings?.notification_webhook, `Daily Report — ${today}`, {
      'Status': bs?.enabled ? (bs.dry_run ? 'Active (DRY RUN)' : 'Active (LIVE)') : 'Paused',
      'Phase': (bs?.operating_phase || 'observe').toUpperCase(),
      'Scanned today': todayScans.data?.length || 0,
      'Bids placed': bidsToday.length,
      'Spent today': `$${spentToday.toFixed(2)}`,
      'Sales today': salesToday.length,
      'Earned today': `$${earnedToday.toFixed(2)}`,
      'Portfolio': `${activeCount} active, ${soldCount} sold`,
      'Total invested': `$${totalInvested.toFixed(0)}`,
      'Portfolio value': `$${totalValue.toFixed(0)}`,
      'Total revenue': `$${totalRevenue.toFixed(0)}`,
      'Lifetime P&L': `$${(totalRevenue + totalValue - totalInvested).toFixed(0)}`,
    }, 'info')

    // Log daily report run for visibility in dashboard Logs tab
    await supabase.from('bot_logs').insert({
      user_id: userId,
      event_type: 'info',
      message: `Daily report sent for ${today}: ${todayScans.data?.length || 0} scans, ${bidsToday.length} bids, ${salesToday.length} sales`,
      details: {
        scansToday: todayScans.data?.length || 0,
        bidsToday: bidsToday.length,
        salesToday: salesToday.length,
        spentToday: spentToday.toFixed(2),
        earnedToday: earnedToday.toFixed(2),
      },
    })

    // COMPOUND GROWTH: Auto-adjust daily budget based on performance
    try {
      const { data: pSettings } = await supabase.from('pipeline_settings').select('*').order('last_updated', { ascending: false }).limit(1).single()
      const baseBudget = pSettings?.base_max_spend_per_day || pSettings?.max_spend_per_day || 200
      const { data: flipOutcomes } = await supabase.from('flip_outcomes').select('profit, outcome').eq('user_id', userId)
      const totalProfit = (flipOutcomes || []).filter((o: any) => o.outcome === 'profitable').reduce((sum: number, o: any) => sum + (o.profit || 0), 0)
      const totalLosses = Math.abs((flipOutcomes || []).filter((o: any) => o.outcome === 'loss').reduce((sum: number, o: any) => sum + (o.profit || 0), 0))
      const lossRate = (bs?.total_spend || 0) > 0 ? totalLosses / (bs?.total_spend || 1) : 0
      let newBudget: number
      if (lossRate > 0.3) { newBudget = Math.round(baseBudget * 0.5) }
      else if (totalProfit > 0) { newBudget = Math.round(Math.min(baseBudget + (totalProfit * 0.5) / 30, baseBudget * 3)) }
      else { newBudget = baseBudget }
      if (newBudget !== (pSettings?.max_spend_per_day || 200) && pSettings?.id) {
        await supabase.from('pipeline_settings').update({ max_spend_per_day: newBudget, base_max_spend_per_day: baseBudget, last_updated: new Date().toISOString() }).eq('id', pSettings.id)
        if (newBudget !== baseBudget) await supabase.from('bot_logs').insert({ user_id: userId, event_type: 'info', message: `Compound growth: budget adjusted to $${newBudget}/day (base $${baseBudget}, profit $${totalProfit}, loss rate ${(lossRate * 100).toFixed(0)}%)`, domain: null, details: {} })
      }
    } catch (e) { console.error('[DailyReport] Budget adjustment failed:', (e as Error).message) }

    // AI DAILY BRIEFING
    let aiBriefing: any = null
    try {
      const { data: recentLogs } = await supabase.from('bot_logs').select('message').eq('user_id', userId).order('created_at', { ascending: false }).limit(8)
      aiBriefing = await aiDailyBriefing({ domainsScanned: todayScans.data?.length || 0, bidsPlaced: bidsToday.length, domainsOwned: activeCount, revenue24h: earnedToday, spend24h: spentToday }, (recentLogs || []).map((l: any) => l.message))
    } catch {}
    if (aiBriefing) await supabase.from('bot_logs').insert({ user_id: userId, event_type: 'info', message: `AI Briefing: ${aiBriefing.summary || 'N/A'}`, domain: null, details: aiBriefing })

    // Reset daily counters on bot_state (including closeout counters)
    await supabase.from('bot_state').update({
      scans_today: 0, bids_today: 0, spend_today: 0, domains_found_today: 0,
      closeout_buys_today: 0, closeout_spend_today: 0,
    }).eq('user_id', userId)

    return res.status(200).json({ sent: true })
  } catch (e: any) {
    return res.status(500).json({ error: e.message })
  }
}
