/**
 * Phase Evaluator — Autonomous rollout controller
 *
 * Runs inside health-check cron every 30 minutes.
 * Evaluates bot metrics and decides whether to promote, demote, or hold phase.
 *
 * PROMOTION requires ALL criteria met.
 * DEMOTION triggers on ANY single criteria.
 * This asymmetry is intentional — easy to scale back, hard to scale up.
 *
 * Phases:
 *   observe  — $0 spend, logs "would buy" picks
 *   cautious — small budget (2 closeouts + 1 registration/day)
 *   scale    — proven model (4 closeouts + 3 registrations/day)
 */

import type { SupabaseClient } from '@supabase/supabase-js'

function env(key: string): string { return process.env[key] || '' }

export interface PhaseMetrics {
  currentPhase: string
  daysInPhase: number
  phaseSince: string
  totalWouldBuyPicks: number
  pickQualityScore: number     // 0-100, AI self-review
  totalPurchased: number
  totalSpent: number
  totalRevenue: number
  totalSales: number
  portfolioSize: number
  rollingLoss30d: number       // negative = losing money
  criticalErrors24h: number
  wouldBuyLast7d: number
  daysSinceLastSale: number | null
  phaseLocked: boolean         // user manual override
}

export interface PhaseDecision {
  action: 'promote' | 'demote' | 'hold'
  from: string
  to: string
  reasons: string[]
  metrics: PhaseMetrics
}

/**
 * Gather all metrics needed for phase evaluation.
 */
export async function gatherPhaseMetrics(
  supabase: SupabaseClient,
  userId: string,
  botState: any,
): Promise<PhaseMetrics> {
  const now = Date.now()
  const phase = botState.operating_phase || 'observe'
  const phaseSince = botState.phase_changed_at || botState.created_at || new Date().toISOString()
  const daysInPhase = Math.floor((now - new Date(phaseSince).getTime()) / 86400000)

  // Count "would buy" picks (observe mode logs)
  const { count: totalWouldBuy } = await supabase.from('bot_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .or('message.ilike.%[OBSERVE] Would buy%,message.ilike.%[OBSERVE] Would register%')

  // Would-buy picks in last 7 days
  const { count: wouldBuyLast7d } = await supabase.from('bot_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .or('message.ilike.%[OBSERVE] Would buy%,message.ilike.%[OBSERVE] Would register%')
    .gte('created_at', new Date(now - 7 * 86400000).toISOString())

  // Portfolio stats
  const { data: owned } = await supabase.from('owned_domains')
    .select('purchase_price, current_value, status, created_at')
    .eq('user_id', userId)
  const portfolioSize = (owned || []).filter(d => ['owned', 'listed'].includes(d.status)).length
  const totalSpent = (owned || []).reduce((sum: number, d: any) => sum + (d.purchase_price || 0), 0)

  // Sales (transactions where type = 'sale' or 'sell')
  const { data: sales } = await supabase.from('transactions')
    .select('amount, created_at')
    .eq('user_id', userId).in('type', ['sale', 'sell'])
  const totalRevenue = (sales || []).reduce((sum: number, s: any) => sum + (s.amount || 0), 0)
  const totalSales = (sales || []).length

  // Days since last sale
  let daysSinceLastSale: number | null = null
  if (sales && sales.length > 0) {
    const lastSaleDate = new Date(Math.max(...sales.map((s: any) => new Date(s.created_at).getTime())))
    daysSinceLastSale = Math.floor((now - lastSaleDate.getTime()) / 86400000)
  }

  // 30-day rolling P&L
  const thirtyDaysAgo = new Date(now - 30 * 86400000).toISOString()
  const { data: recentPurchases } = await supabase.from('transactions')
    .select('amount').eq('user_id', userId).in('type', ['purchase', 'bid'])
    .gte('created_at', thirtyDaysAgo)
  const { data: recentSales } = await supabase.from('transactions')
    .select('amount').eq('user_id', userId).in('type', ['sale', 'sell'])
    .gte('created_at', thirtyDaysAgo)
  const spent30d = (recentPurchases || []).reduce((s: number, t: any) => s + (t.amount || 0), 0)
  const rev30d = (recentSales || []).reduce((s: number, t: any) => s + (t.amount || 0), 0)
  const rollingLoss30d = rev30d - spent30d // negative = losing

  // Critical errors in last 24 hours
  const { count: critErrors } = await supabase.from('bot_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId).eq('event_type', 'error')
    .gte('created_at', new Date(now - 24 * 3600000).toISOString())

  return {
    currentPhase: phase,
    daysInPhase,
    phaseSince,
    totalWouldBuyPicks: totalWouldBuy || 0,
    pickQualityScore: 0, // computed separately via AI
    totalPurchased: (owned || []).length,
    totalSpent,
    totalRevenue,
    totalSales,
    portfolioSize,
    rollingLoss30d,
    criticalErrors24h: critErrors || 0,
    wouldBuyLast7d: wouldBuyLast7d || 0,
    daysSinceLastSale,
    phaseLocked: botState.phase_locked || false,
  }
}

/**
 * AI self-review: score the bot's own picks for quality.
 * Looks at the last 20 "would buy" / "purchased" entries and rates them.
 * Returns 0-100 quality score.
 */
export async function aiSelfReviewPicks(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  const anthropicKey = env('ANTHROPIC_API_KEY')
  if (!anthropicKey) return 50 // default to passing if no AI

  // Get recent picks
  const { data: picks } = await supabase.from('bot_logs')
    .select('message, created_at')
    .eq('user_id', userId)
    .or(
      'message.ilike.%Would buy closeout%,' +
      'message.ilike.%Would register%,' +
      'message.ilike.%CLOSEOUT BOUGHT%,' +
      'message.ilike.%REGISTERED%'
    )
    .order('created_at', { ascending: false })
    .limit(20)

  if (!picks || picks.length < 5) return 50 // not enough data

  const pickList = picks.map((p: any) => p.message).join('\n')

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        messages: [{
          role: 'user',
          content: `You are a domain investing expert. Review these automated domain picks and score the overall quality.

PICKS:
${pickList}

Consider:
- Are these domains actually brandable/memorable?
- Are the prices reasonable for the estimated flip values?
- Are the estimated flip values REALISTIC (most sell $100-300)?
- Would a professional domainer buy these?

Return ONLY a JSON object: {"score": 0-100, "reasoning": "one sentence"}
Score guide: 80+ = excellent picks, 70-79 = good, 60-69 = okay, below 60 = concerning.`
        }],
      }),
      signal: AbortSignal.timeout(8000),
    })

    if (!response.ok) return 50

    const data = await response.json()
    const text = data.content?.[0]?.text || '{}'
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim())
    return Math.max(0, Math.min(100, parsed.score || 50))
  } catch {
    return 50
  }
}

/**
 * Core decision engine. Evaluates metrics and decides phase transition.
 */
export function evaluatePhase(metrics: PhaseMetrics): PhaseDecision {
  const { currentPhase } = metrics
  const reasons: string[] = []

  // ---- LOCKED CHECK ----
  if (metrics.phaseLocked) {
    return { action: 'hold', from: currentPhase, to: currentPhase, reasons: ['Phase manually locked by user'], metrics }
  }

  // ---- DEMOTION CHECKS (any single trigger) ----
  // These fire FIRST — safety before growth.

  if (currentPhase === 'scale') {
    if (metrics.daysSinceLastSale !== null && metrics.daysSinceLastSale >= 60) {
      reasons.push(`No sales in ${metrics.daysSinceLastSale} days — model may not be working`)
      return { action: 'demote', from: 'scale', to: 'cautious', reasons, metrics }
    }
    if (metrics.rollingLoss30d < -500) {
      reasons.push(`30-day rolling loss: $${Math.abs(metrics.rollingLoss30d).toFixed(0)} — bleeding money`)
      return { action: 'demote', from: 'scale', to: 'cautious', reasons, metrics }
    }
    if (metrics.criticalErrors24h >= 3) {
      reasons.push(`${metrics.criticalErrors24h} critical errors in 24h — system unstable`)
      return { action: 'demote', from: 'scale', to: 'cautious', reasons, metrics }
    }
  }

  if (currentPhase === 'cautious') {
    if (metrics.criticalErrors24h >= 3) {
      reasons.push(`${metrics.criticalErrors24h} critical errors in 24h — pausing purchases`)
      return { action: 'demote', from: 'cautious', to: 'observe', reasons, metrics }
    }
    if (metrics.wouldBuyLast7d === 0 && metrics.daysInPhase >= 7) {
      reasons.push('0 qualifying picks in 7 days — scanner may be broken')
      return { action: 'demote', from: 'cautious', to: 'observe', reasons, metrics }
    }
  }

  // ---- PROMOTION CHECKS (ALL criteria must be met) ----

  if (currentPhase === 'observe') {
    const criteria = {
      minDays: metrics.daysInPhase >= 7,
      enoughPicks: metrics.totalWouldBuyPicks >= 40,
      goodQuality: metrics.pickQualityScore >= 70,
      stable: metrics.criticalErrors24h === 0,
    }

    const met = Object.values(criteria).filter(Boolean).length
    const total = Object.values(criteria).length

    if (met === total) {
      reasons.push(`All ${total} promotion criteria met`)
      reasons.push(`${metrics.daysInPhase} days observing, ${metrics.totalWouldBuyPicks} picks logged, quality ${metrics.pickQualityScore}/100`)
      return { action: 'promote', from: 'observe', to: 'cautious', reasons, metrics }
    } else {
      if (!criteria.minDays) reasons.push(`Need 7+ days observing (at ${metrics.daysInPhase})`)
      if (!criteria.enoughPicks) reasons.push(`Need 40+ picks logged (at ${metrics.totalWouldBuyPicks})`)
      if (!criteria.goodQuality) reasons.push(`Need 70+ quality score (at ${metrics.pickQualityScore})`)
      if (!criteria.stable) reasons.push(`Need 0 critical errors (have ${metrics.criticalErrors24h})`)
      return { action: 'hold', from: currentPhase, to: currentPhase, reasons, metrics }
    }
  }

  if (currentPhase === 'cautious') {
    const criteria = {
      minDays: metrics.daysInPhase >= 30,
      hasSale: metrics.totalSales >= 1,
      portfolioSize: metrics.portfolioSize >= 15,
      revenueRatio: metrics.totalSpent > 0 ? (metrics.totalRevenue / metrics.totalSpent) >= 0.3 : false,
      stable: metrics.criticalErrors24h === 0,
    }

    const met = Object.values(criteria).filter(Boolean).length
    const total = Object.values(criteria).length

    if (met === total) {
      reasons.push(`All ${total} scale criteria met`)
      reasons.push(`${metrics.totalSales} sale(s), $${metrics.totalRevenue} revenue, ${metrics.portfolioSize} domains, ${metrics.daysInPhase} days`)
      return { action: 'promote', from: 'cautious', to: 'scale', reasons, metrics }
    } else {
      if (!criteria.minDays) reasons.push(`Need 30+ days in cautious (at ${metrics.daysInPhase})`)
      if (!criteria.hasSale) reasons.push(`Need at least 1 sale (have ${metrics.totalSales})`)
      if (!criteria.portfolioSize) reasons.push(`Need 15+ domains (have ${metrics.portfolioSize})`)
      if (!criteria.revenueRatio) reasons.push(`Need revenue >= 30% of cost (at ${metrics.totalSpent > 0 ? Math.round(metrics.totalRevenue / metrics.totalSpent * 100) : 0}%)`)
      if (!criteria.stable) reasons.push(`Need 0 critical errors (have ${metrics.criticalErrors24h})`)
      return { action: 'hold', from: currentPhase, to: currentPhase, reasons, metrics }
    }
  }

  // Scale phase — already at max, just hold
  return { action: 'hold', from: currentPhase, to: currentPhase, reasons: ['At max phase'], metrics }
}

/**
 * Execute phase transition — updates DB and logs the change.
 */
export async function executePhaseTransition(
  supabase: SupabaseClient,
  userId: string,
  decision: PhaseDecision,
  log: (type: string, msg: string) => Promise<void>,
): Promise<void> {
  if (decision.action === 'hold') {
    // Log progress toward next transition (but not every run — only twice/day)
    const { count: recentPhaseLog } = await supabase.from('bot_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .ilike('message', '%Phase evaluation%')
      .gte('created_at', new Date(Date.now() - 12 * 3600000).toISOString())

    if ((recentPhaseLog || 0) === 0) {
      await log('info',
        `Phase evaluation: HOLD at ${decision.from}. ` +
        `Progress: ${decision.reasons.join(' | ')}`
      )
    }
    return
  }

  const verb = decision.action === 'promote' ? 'PROMOTED' : 'DEMOTED'

  // Update phase in DB
  await supabase.from('bot_state').update({
    operating_phase: decision.to,
    phase_changed_at: new Date().toISOString(),
    phase_change_reason: decision.reasons.join('; '),
  }).eq('user_id', userId)

  // Log prominently
  await log('info',
    `AUTO-${verb}: ${decision.from} -> ${decision.to}. ` +
    `Reasons: ${decision.reasons.join(' | ')}`
  )

  // Also log detailed metrics for audit trail
  await log('info',
    `Phase metrics at transition: ` +
    `days=${decision.metrics.daysInPhase}, ` +
    `picks=${decision.metrics.totalWouldBuyPicks}, ` +
    `quality=${decision.metrics.pickQualityScore}, ` +
    `portfolio=${decision.metrics.portfolioSize}, ` +
    `spent=$${decision.metrics.totalSpent.toFixed(0)}, ` +
    `revenue=$${decision.metrics.totalRevenue.toFixed(0)}, ` +
    `sales=${decision.metrics.totalSales}, ` +
    `30d_pnl=$${decision.metrics.rollingLoss30d.toFixed(0)}, ` +
    `errors_24h=${decision.metrics.criticalErrors24h}`
  )
}
