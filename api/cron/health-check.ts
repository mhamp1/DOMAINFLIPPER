/**
 * Cron: Health Check (every 30 min) — monitors system, auto-retries failed crons,
 * and runs the autonomous phase evaluator.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { notify } from '../lib/notify.js'
import { gatherPhaseMetrics, aiSelfReviewPicks, evaluatePhase, executePhaseTransition } from '../lib/intelligence/phase-evaluator.js'

function env(key: string): string { return process.env[key] || '' }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).end()
  const cronSecret = env('CRON_SECRET')
  if (cronSecret && req.headers.authorization !== `Bearer ${cronSecret}` && req.headers['x-admin-key'] !== env('ADMIN_API_KEY')) return res.status(401).json({ error: 'Unauthorized' })

  const url = env('SUPABASE_URL') || env('VITE_SUPABASE_URL')
  const key = env('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) return res.status(200).json({ database: false, error: 'DB not configured' })
  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
  const userId = env('BOT_USER_ID')

  const errors: string[] = [], warnings: string[] = []

  const log = async (type: string, msg: string) => {
    await supabase.from('bot_logs').insert({ user_id: userId, event_type: type, message: msg })
  }

  try {
    const { data: bs, error: dbErr } = await supabase.from('bot_state').select('*').eq('user_id', userId).single()
    if (dbErr) errors.push(`DB: ${dbErr.message}`)
    if (!bs) errors.push('No bot state')

    if (bs?.last_scan_at) {
      const mins = Math.round((Date.now() - new Date(bs.last_scan_at).getTime()) / 60000)
      if (mins > 30 && bs.enabled) {
        warnings.push(`Scan overdue: ${mins}min ago`)
        try { await fetch(`https://${req.headers.host}/api/cron/scan`, { method: 'POST', headers: { Authorization: `Bearer ${cronSecret}` } }); warnings.push('Auto-retry: scan triggered') } catch {}
      }
    }

    const oneHourAgo = new Date(Date.now() - 3600000).toISOString()
    const { data: recentErrs } = await supabase.from('bot_logs').select('id').eq('user_id', userId).eq('event_type', 'scan_error').gte('created_at', oneHourAgo)
    if (recentErrs && recentErrs.length >= 3) warnings.push(`${recentErrs.length} errors in last hour`)

    const { data: staleOffers } = await supabase.from('domain_offers').select('id').eq('user_id', userId).eq('status', 'pending')
    if (staleOffers && staleOffers.length > 0) {
      warnings.push(`${staleOffers.length} pending offers`)
      try { await fetch(`https://${req.headers.host}/api/cron/process-offers`, { method: 'POST', headers: { Authorization: `Bearer ${cronSecret}` } }) } catch {}
    }

    if (errors.length > 0 || warnings.length > 0) {
      const { data: settings } = await supabase.from('pipeline_settings').select('notification_webhook').order('last_updated', { ascending: false }).limit(1).single()
      await notify(settings?.notification_webhook, 'Health Check', { Errors: errors.join('; ') || 'None', Warnings: warnings.join('; ') || 'None' }, errors.length > 0 ? 'warning' : 'info')
    }

    // ---- AUTONOMOUS PHASE EVALUATION ----
    let phaseDecision = null
    if (bs) {
      try {
        const metrics = await gatherPhaseMetrics(supabase, userId, bs)

        // AI self-review (only run if in observe mode and have enough picks — saves API cost)
        if (metrics.currentPhase === 'observe' && metrics.totalWouldBuyPicks >= 20) {
          // Only run AI review once per day (not every 30 min)
          const { count: recentReview } = await supabase.from('bot_logs')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .ilike('message', '%pick quality self-review%')
            .gte('created_at', new Date(Date.now() - 20 * 3600000).toISOString())

          if ((recentReview || 0) === 0) {
            metrics.pickQualityScore = await aiSelfReviewPicks(supabase, userId)
            await log('info', `AI pick quality self-review: ${metrics.pickQualityScore}/100`)
          } else {
            // Reuse last score from logs
            const { data: lastReview } = await supabase.from('bot_logs')
              .select('message').eq('user_id', userId)
              .ilike('message', '%pick quality self-review%')
              .order('created_at', { ascending: false }).limit(1)
            const match = lastReview?.[0]?.message?.match(/(\d+)\/100/)
            metrics.pickQualityScore = match ? parseInt(match[1]) : 50
          }
        }

        // Evaluate and execute
        phaseDecision = evaluatePhase(metrics)
        await executePhaseTransition(supabase, userId, phaseDecision, log)
      } catch (e: any) {
        warnings.push(`Phase evaluation error: ${e.message}`)
      }
    }

    return res.status(200).json({
      database: !dbErr,
      botState: !!bs,
      errors,
      warnings,
      phase: bs?.operating_phase || 'observe',
      phaseDecision: phaseDecision ? { action: phaseDecision.action, from: phaseDecision.from, to: phaseDecision.to } : null,
    })
  } catch (e: any) { return res.status(200).json({ errors: [e.message], warnings }) }
}
