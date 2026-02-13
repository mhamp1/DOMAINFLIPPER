/**
 * Cron: AI Domain Generation v2 — Daily 4 AM UTC
 *
 * Phase-aware:
 *   observe:  generate + check availability + log "would register", buy nothing
 *   cautious: register max 1/day, $15/day
 *   scale:    register max 3/day, $40/day
 *
 * 2 parallel AI calls per run (~$0.02 cost).
 * Conservative valuations baked in.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { generateTargetedNames, checkAvailabilityFast, registerDomain } from '../lib/intelligence/name-generator.js'
import { notify } from '../lib/notify.js'

function env(key: string): string { return process.env[key] || '' }

const PHASE_LIMITS: Record<string, { maxPerDay: number; maxSpend: number }> = {
  observe:  { maxPerDay: 0,  maxSpend: 0 },
  cautious: { maxPerDay: 1,  maxSpend: 15 },
  scale:    { maxPerDay: 3,  maxSpend: 40 },
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).end()
  const cronSecret = env('CRON_SECRET')
  if (cronSecret && req.headers.authorization !== `Bearer ${cronSecret}` && req.headers['x-admin-key'] !== env('ADMIN_API_KEY')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const start = Date.now()
  const url = env('SUPABASE_URL') || env('VITE_SUPABASE_URL')
  const key = env('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) return res.status(500).json({ error: 'DB not configured' })

  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
  const userId = env('BOT_USER_ID')
  if (!userId) return res.status(500).json({ error: 'BOT_USER_ID required' })

  const log = async (type: string, msg: string, domain?: string) => {
    await supabase.from('bot_logs').insert({ user_id: userId, event_type: type, message: msg, domain })
  }

  try {
    const { data: botState } = await supabase.from('bot_state').select('*').eq('user_id', userId).single()
    if (!botState || botState.is_paused) return res.status(200).json({ skipped: true })
    if (!botState.enabled) return res.status(200).json({ status: 'disabled' })

    const phase = botState.operating_phase || 'observe'
    const limits = PHASE_LIMITS[phase] || PHASE_LIMITS.observe

    // Get existing portfolio to avoid duplicates
    const { data: owned } = await supabase.from('owned_domains').select('domain').eq('user_id', userId)
    const portfolio = (owned || []).map((d: any) => d.domain)

    // Get trend insights from last scan
    const { data: trendLog } = await supabase.from('bot_logs')
      .select('message').eq('user_id', userId).eq('event_type', 'info')
      .ilike('message', '%trend%sector%')
      .order('created_at', { ascending: false }).limit(1)

    await log('info', `AI Name Gen v2 [${phase}]: generating...`)

    // 1. AI generates ~60 names across 2 parallel strategies
    const generated = await generateTargetedNames(
      trendLog?.[0]?.message || '',
      portfolio,
      limits.maxSpend,
    )
    await log('info', `AI Name Gen v2: ${generated.length} candidates generated`)

    if (!generated.length) {
      return res.status(200).json({ generated: 0, registered: 0, phase })
    }

    // 2. Parallel availability check
    const availability = await checkAvailabilityFast(generated.map(n => n.domain))
    const available = generated.filter(n => availability.get(n.domain.toLowerCase()) === true)
    await log('info', `AI Name Gen v2: ${available.length}/${generated.length} available`)

    if (!available.length) {
      return res.status(200).json({ generated: generated.length, available: 0, registered: 0, phase })
    }

    // 3. Sort by estimated value, register top ones within budget
    available.sort((a, b) => b.estimatedValue - a.estimatedValue)

    const registered: string[] = []
    const wouldRegister: string[] = []
    let spent = 0

    for (const name of available.slice(0, Math.max(limits.maxPerDay, 5))) {
      // OBSERVE phase: log everything, register nothing
      if (phase === 'observe' || limits.maxPerDay === 0) {
        wouldRegister.push(name.domain)
        await log('info',
          `[OBSERVE] Would register: ${name.domain} (~$${name.registrationCost}) -- ${name.strategy} -- est $${name.estimatedValue} -- target: ${name.targetBuyer}`,
          name.domain
        )
        continue
      }

      // Budget/limit gate
      if (registered.length >= limits.maxPerDay || spent + name.registrationCost > limits.maxSpend) break

      // LIVE REGISTRATION
      const result = await registerDomain(name.domain)
      if (result.success) {
        registered.push(name.domain)
        spent += result.cost
        await Promise.all([
          supabase.from('owned_domains').insert({
            user_id: userId, domain: name.domain, status: 'owned',
            purchase_price: result.cost,
            current_value: name.estimatedValue,
            listed_price: Math.round(name.estimatedValue * 0.8),
            registrar: 'auto', acquired_via: 'ai_generation',
            metadata: {
              ai_generation: true, strategy: name.strategy,
              reasoning: name.reasoning, target_buyer: name.targetBuyer,
              registration_cost: result.cost,
            },
          }),
          supabase.from('transactions').insert({
            user_id: userId, domain: name.domain, type: 'purchase',
            amount: result.cost, source: 'ai_generation',
          }),
          log('bid_placed',
            `REGISTERED: ${name.domain} $${result.cost} (${name.strategy}, est $${name.estimatedValue})`,
            name.domain
          ),
        ])
      }
    }

    // Update spend
    if (spent > 0) {
      await supabase.from('bot_state').update({
        spend_today: (botState.spend_today || 0) + spent,
      }).eq('user_id', userId)
    }

    const totalMs = Date.now() - start
    await log('info',
      `AI Name Gen v2 [${phase}]: ${generated.length} generated -> ${available.length} available -> ` +
      (phase === 'observe' ? `${wouldRegister.length} would-register` : `${registered.length} registered ($${spent})`) +
      ` [${totalMs}ms]`
    )

    // Notification
    const { data: settings } = await supabase.from('pipeline_settings').select('notification_webhook').order('last_updated', { ascending: false }).limit(1).single()
    if (settings?.notification_webhook) {
      await notify(settings.notification_webhook, 'AI Name Gen v2', {
        Phase: phase,
        Generated: generated.length,
        Available: available.length,
        Registered: phase === 'observe' ? `${wouldRegister.length} (would-register)` : registered.length,
        'Top picks': available.slice(0, 5).map(r => `${r.domain} (est $${r.estimatedValue})`).join(', '),
      }, 'info')
    }

    return res.status(200).json({
      phase,
      generated: generated.length,
      available: available.length,
      registered: registered.length,
      would_register: wouldRegister.length,
      spent,
      timing_ms: totalMs,
    })
  } catch (e: any) {
    await log('error', `AI Name Gen error: ${e.message}`)
    return res.status(200).json({ error: e.message })
  }
}
