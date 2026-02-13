/**
 * Cron: Monthly Scoring Calibration (runs 1st of month 3 AM)
 * After 20+ completed flips, correlates which scoring factors predicted profit.
 * Adjusts scoring weights automatically. The bot gets smarter from experience.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { notify } from '../lib/notify.js'

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
    const { data: outcomes } = await supabase.from('flip_outcomes').select('*')
      .eq('user_id', userId).not('sell_price', 'is', null)

    if (!outcomes || outcomes.length < 20) {
      await supabase.from('bot_logs').insert({
        user_id: userId, event_type: 'info',
        message: `Calibration skipped: only ${outcomes?.length || 0} completed flips (need 20+)`,
      })
      return res.status(200).json({ status: 'skipped', reason: `Need 20+ completed flips, have ${outcomes?.length || 0}` })
    }

    const profitable = outcomes.filter(o => (o.sell_price - o.purchase_price) > 0)
    const unprofitable = outcomes.filter(o => (o.sell_price - o.purchase_price) <= 0)
    const factors = ['length', 'tld', 'keywords', 'brandability', 'backlinks', 'age', 'comparables', 'trademark']

    const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0
    const correlations: Record<string, number> = {}

    for (const factor of factors) {
      const profAvg = avg(profitable.map(o => o.score_breakdown_at_purchase?.[factor]?.score || 0))
      const unprofAvg = avg(unprofitable.map(o => o.score_breakdown_at_purchase?.[factor]?.score || 0))
      correlations[factor] = Math.round((profAvg - unprofAvg) * 100) / 100
    }

    // Load current weights
    const { data: settingsRow } = await supabase.from('pipeline_settings').select('scoring_weights, id')
      .order('last_updated', { ascending: false }).limit(1).single()

    const weights: Record<string, number> = settingsRow?.scoring_weights || {}
    for (const factor of factors) {
      const w = weights[factor] || 1.0
      if (correlations[factor] > 2) {
        weights[factor] = Math.min(w * 1.15, 2.0) // Increase weight, cap at 2x
      } else if (correlations[factor] < -2) {
        weights[factor] = Math.max(w * 0.85, 0.5) // Decrease weight, floor at 0.5x
      } else {
        weights[factor] = w // No change
      }
    }

    if (settingsRow?.id) {
      await supabase.from('pipeline_settings').update({ scoring_weights: weights }).eq('id', settingsRow.id)
    }

    const winRate = Math.round((profitable.length / outcomes.length) * 100)
    const avgProfit = Math.round(avg(profitable.map(o => o.sell_price - o.purchase_price)))
    const strongest = Object.entries(correlations).sort(([, a], [, b]) => b - a)[0]?.[0] || 'unknown'
    const weakest = Object.entries(correlations).sort(([, a], [, b]) => a - b)[0]?.[0] || 'unknown'

    await supabase.from('bot_logs').insert({
      user_id: userId, event_type: 'info',
      message: `Calibration complete: ${outcomes.length} flips, ${winRate}% win rate, avg profit $${avgProfit}. Strongest: ${strongest}, weakest: ${weakest}.`,
      details: { correlations, weights, flipsAnalyzed: outcomes.length, winRate, avgProfit },
    })

    const { data: settings } = await supabase.from('pipeline_settings').select('notification_webhook')
      .order('last_updated', { ascending: false }).limit(1).single()

    await notify(settings?.notification_webhook, 'Monthly Calibration', {
      'Flips analyzed': outcomes.length,
      'Win rate': `${winRate}%`,
      'Avg profit': `$${avgProfit}`,
      'Strongest factor': strongest,
      'Weakest factor': weakest,
      'Weights adjusted': Object.entries(weights).map(([k, v]) => `${k}: ${v.toFixed(2)}x`).join(', '),
    }, 'info')

    // LEARNING LAYER 2: Strategy insights from outcomes
    if (outcomes.length >= 10) {
      const tldStats: Record<string, { sold: number; loss: number; avgROI: number }> = {}
      for (const o of outcomes) {
        const tld = o.tld || '.' + (o.domain?.split('.').pop() || '')
        if (!tldStats[tld]) tldStats[tld] = { sold: 0, loss: 0, avgROI: 0 }
        if ((o.sell_price - o.purchase_price) > 0) { tldStats[tld].sold++; tldStats[tld].avgROI += ((o.sell_price - o.purchase_price) / o.purchase_price) * 100 }
        else { tldStats[tld].loss++ }
      }
      for (const tld of Object.keys(tldStats)) { const s = tldStats[tld]; if (s.sold > 0) s.avgROI = Math.round(s.avgROI / s.sold) }
      
      const priceRanges = [{ label: '$0-$10', min: 0, max: 10 }, { label: '$10-$25', min: 10, max: 25 }, { label: '$25-$50', min: 25, max: 50 }, { label: '$50-$100', min: 50, max: 100 }, { label: '$100+', min: 100, max: Infinity }]
      const rangeStats = priceRanges.map(r => {
        const inRange = outcomes.filter(o => o.purchase_price >= r.min && o.purchase_price < r.max)
        const profitable = inRange.filter(o => (o.sell_price - o.purchase_price) > 0)
        return { range: r.label, total: inRange.length, profitable: profitable.length, winRate: inRange.length > 0 ? Math.round(profitable.length / inRange.length * 100) : 0 }
      })

      if (settingsRow?.id) {
        await supabase.from('pipeline_settings').update({
          learned_insights: { tld_performance: tldStats, price_range_performance: rangeStats, total_outcomes: outcomes.length, overall_win_rate: winRate, calibrated_at: new Date().toISOString() },
          last_updated: new Date().toISOString(),
        }).eq('id', settingsRow.id)
      }
      await supabase.from('bot_logs').insert({ user_id: userId, event_type: 'info', message: `Calibration insights: ${outcomes.length} outcomes, ${Object.entries(tldStats).filter(([, s]) => s.sold > 0).map(([t, s]) => `${t} ${s.sold}W/${s.loss}L`).join(', ')}`, domain: null, details: {} })
    }

    return res.status(200).json({ status: 'calibrated', flipsAnalyzed: outcomes.length, winRate, correlations, weights })
  } catch (e: any) {
    return res.status(500).json({ error: e.message })
  }
}
