/**
 * Vercel Cron Job — Autonomous Domain Scanner v2 (Intelligence Layer)
 * 
 * Called by Vercel Cron every 15 minutes. Runs entirely server-side.
 * 
 * Pipeline:
 *   1. Verify auth
 *   2. Check bot_state (enabled? daily limit?)
 *   3. FETCH domains from multiple sources:
 *      - ExpiredDomains.net via Apify (primary — has backlinks, age, TF)
 *      - GoDaddy Auctions API (bidding venue)
 *   4. ENRICH each domain with optional APIs:
 *      - NameBio comparable sales
 *      - EstiBot appraisal + CPC
 *      - USPTO trademark check
 *   5. SCORE with 8-factor weighted algorithm
 *   6. DECIDE: bid / skip / review queue
 *   7. BID on qualifying domains (if DRY_RUN=false)
 *   8. SAVE everything to Supabase
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import { scoreDomain, calculateBid, type RawDomain, type EnrichmentData, type ScoredDomain } from '../lib/valuation/scorer.js'
import { fetchExpiredDomains } from '../lib/sources/expiredDomains.js'
import { fetchGoDaddyAuctions, placeGoDaddyBid } from '../lib/sources/godaddy.js'
import { fetchGoDaddyInventory } from '../lib/sources/gdInventory.js'
import { getKeywordComparables, checkPreviousSales } from '../lib/enrichment/namebio.js'
import { getEstiBotAppraisals } from '../lib/enrichment/estibot.js'
import { checkTrademark } from '../lib/enrichment/uspto.js'
import { notify } from '../lib/notify.js'
import { analyzePatterns } from '../lib/intelligence/patterns.js'
import { assessRisk } from '../lib/intelligence/risk.js'
import { determineStrategy } from '../lib/intelligence/strategy.js'
import { aiAnalyzeDomains, type AIDomainAnalysis } from '../lib/intelligence/ai-brain.js'

// ============================================
// HELPERS
// ============================================

function env(key: string): string { return process.env[key] || '' }

function getSupabase(): SupabaseClient | null {
  const url = env('SUPABASE_URL') || env('VITE_SUPABASE_URL')
  const key = env('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) return null
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

type LogEntry = { event_type: string; message: string; domain?: string; details?: any }

// ============================================
// MAIN HANDLER
// ============================================

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Auth: Vercel Cron sends Bearer CRON_SECRET, manual triggers send X-Admin-Key
  const cronSecret = env('CRON_SECRET')
  const adminKey = env('ADMIN_API_KEY')
  const authHeader = req.headers.authorization
  const reqAdminKey = req.headers['x-admin-key'] as string
  if (cronSecret && authHeader !== `Bearer ${cronSecret}` && (!adminKey || reqAdminKey !== adminKey)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const startTime = Date.now()
  const batchId = `scan-${Date.now().toString(36)}`
  const logs: LogEntry[] = []
  const log = (type: string, msg: string, domain?: string, details?: any) => {
    logs.push({ event_type: type, message: msg, domain, details })
    console.log(`[${type}] ${msg}${domain ? ` (${domain})` : ''}`)
  }

  const supabase = getSupabase()
  if (!supabase) return res.status(500).json({ error: 'SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required' })
  const userId = env('BOT_USER_ID')
  if (!userId) return res.status(500).json({ error: 'BOT_USER_ID required' })

  try {
    // ---- 1. BOT STATE ----
    let { data: botState } = await supabase.from('bot_state').select('*').eq('user_id', userId).single()
    if (!botState) {
      const { data: newState } = await supabase.from('bot_state').insert({
        user_id: userId, enabled: false, dry_run: true,
        scans_today: 0, bids_today: 0, spend_today: 0, domains_found_today: 0,
        total_scans: 0, total_bids: 0, total_spend: 0, total_domains_acquired: 0,
      }).select().single()
      botState = newState
    }
    if (!botState?.enabled) {
      return res.status(200).json({ status: 'skipped', reason: 'Bot is disabled', batchId })
    }
    log('scan_started', `Batch ${batchId}`)

    // ---- 2. SETTINGS ----
    const { data: settings } = await supabase.from('pipeline_settings').select('*').order('last_updated', { ascending: false }).limit(1).single()

    // ---- SELF-HEALING: COOLDOWN WITH AUTO-RESUME ----
    const { data: recentErrors } = await supabase.from('bot_logs').select('created_at')
      .eq('user_id', userId).eq('event_type', 'scan_error')
      .order('created_at', { ascending: false }).limit(3)

    if (recentErrors?.length === 3) {
      const allRecent = recentErrors.every(l => Date.now() - new Date(l.created_at).getTime() < 3600000)
      if (allRecent) {
        const cooldownHours = [1, 4, 12, 24]
        const currentLevel = botState.cooldown_level || 0
        const hours = cooldownHours[Math.min(currentLevel, cooldownHours.length - 1)]
        const cooldownUntil = new Date(Date.now() + hours * 3600000).toISOString()

        await supabase.from('bot_state').update({
          cooldown_until: cooldownUntil,
          cooldown_level: Math.min(currentLevel + 1, cooldownHours.length - 1),
          last_error: `Auto-cooldown: ${hours}hr pause after 3 consecutive failures`,
        }).eq('user_id', userId)

        const webhookUrl = settings?.notification_webhook || null
        await notify(webhookUrl, 'Bot Cooling Down (Auto-Resume)', {
          Reason: '3 consecutive scan failures', Cooldown: `${hours} hours`, 'Resume at': cooldownUntil,
        }, 'warning')
        log('warning', `Self-healing: cooldown ${hours}hr, auto-resume at ${cooldownUntil}`)
        await saveLogs(supabase, userId, logs)
        return res.status(200).json({ status: 'cooldown', resumeAt: cooldownUntil })
      }
    }

    // Check if we're in cooldown
    if (botState.cooldown_until) {
      if (Date.now() < new Date(botState.cooldown_until).getTime()) {
        return res.status(200).json({ status: 'cooldown', resumeAt: botState.cooldown_until })
      } else {
        await supabase.from('bot_state').update({ cooldown_until: null, last_error: null }).eq('user_id', userId)
        log('info', 'Self-healing: cooldown expired, resuming scans')
        await notify(settings?.notification_webhook || null, 'Bot Auto-Resumed', { Status: 'Scanning resumed after cooldown' }, 'info')
      }
    }

    // Reset cooldown level after 24hr clean
    if (botState.cooldown_level && botState.cooldown_level > 0) {
      const { data: last24hErrors } = await supabase.from('bot_logs').select('id').eq('user_id', userId).eq('event_type', 'scan_error').gte('created_at', new Date(Date.now() - 86400000).toISOString())
      if (!last24hErrors || last24hErrors.length === 0) {
        await supabase.from('bot_state').update({ cooldown_level: 0 }).eq('user_id', userId)
        log('info', 'Self-healing: 24hr clean — cooldown level reset')
      }
    }
    const dryRun = settings?.dry_run ?? botState.dry_run ?? true
    const maxSpendDay = settings?.max_spend_per_day ?? 200
    const maxSpendDomain = settings?.max_spend_per_domain ?? 20
    const minROI = settings?.min_margin_multiplier ?? 3.0
    const allowedTLDs = settings?.allowed_tlds ?? ['.com', '.ai', '.io']
    const reviewThreshold = maxSpendDomain * 2 // Domains above 2x per-domain cap go to review

    // Verify spend from actual transactions as backup (in case counters are stale)
    const todayISO = new Date().toISOString().split('T')[0]
    const { data: todayTx } = await supabase.from('transactions').select('amount')
      .eq('user_id', userId).eq('type', 'bid').gte('date', todayISO)
    const actualSpendToday = (todayTx || []).reduce((s: number, t: { amount: number }) => s + (t.amount || 0), 0)
    const effectiveSpend = Math.max(botState.spend_today || 0, actualSpendToday)

    if (effectiveSpend >= maxSpendDay) {
      log('spend_limit_reached', `$${effectiveSpend}/$${maxSpendDay} (counter: $${botState.spend_today}, actual: $${actualSpendToday})`)
      await saveLogs(supabase, userId, logs)
      return res.status(200).json({ status: 'skipped', reason: 'Daily limit reached', batchId })
    }

    // ---- 3. FETCH DOMAINS FROM ALL SOURCES ----
    const rawDomains: RawDomain[] = []
    const fetchErrors: string[] = []
    const tldList = allowedTLDs.map((t: string) => t.replace('.', ''))

    let expiredEnrichments: Record<string, EnrichmentData> = {}

    // Source A: ExpiredDomains.net via Apify (primary — richest data)
    try {
      const expired = await fetchExpiredDomains({ tlds: tldList, minBacklinks: 5, maxResults: 200 })
      log('info', `ExpiredDomains: ${expired.length} domains`)
      for (const e of expired) rawDomains.push(e.raw)
      for (const e of expired) expiredEnrichments[e.raw.domain] = e.enrichment
    } catch (e: any) { fetchErrors.push(`ExpiredDomains: ${e.message}`); log('scan_error', e.message) }

    // Source B: GoDaddy — try Auctions API first, fall back to FREE Inventory Files
    try {
      const gdDomains = await fetchGoDaddyAuctions({ limit: 100, maxPrice: maxSpendDomain, tlds: tldList.join(',') })
      if (gdDomains.length > 0) {
        log('info', `GoDaddy Auctions API: ${gdDomains.length} domains`)
        rawDomains.push(...gdDomains)
      } else {
        throw new Error('Auctions API returned 0 results')
      }
    } catch (apiError: any) {
      log('info', `GoDaddy API unavailable (${apiError.message}), using inventory files`)
      try {
        const inventoryDomains = await fetchGoDaddyInventory({ tlds: tldList, maxPrice: maxSpendDomain, maxResults: 300, includeCloseouts: true, includeEndingToday: true })
        log('info', `GoDaddy Inventory Files: ${inventoryDomains.length} domains (with SEO metrics)`)
        for (const inv of inventoryDomains) {
          rawDomains.push(inv.raw)
          if (inv.enrichment) {
            expiredEnrichments[inv.raw.domain] = { ...(expiredEnrichments[inv.raw.domain] || {}), ...inv.enrichment }
          }
        }
      } catch (invError: any) { fetchErrors.push(`GoDaddy Inventory: ${invError.message}`); log('scan_error', invError.message) }
    }

    // Deduplicate by domain name
    const seen = new Set<string>()
    const uniqueDomains = rawDomains.filter(d => {
      if (!d.domain || seen.has(d.domain)) return false
      seen.add(d.domain)
      return true
    })

    if (uniqueDomains.length === 0) {
      log('scan_error', `No domains found. Errors: ${fetchErrors.join('; ')}`)
      await updateState(supabase, userId, botState, { scansOnly: true, fetchErrors })
      await saveLogs(supabase, userId, logs)
      return res.status(200).json({ status: 'completed_with_errors', batchId, errors: fetchErrors, domainsScanned: 0 })
    }

    log('info', `Total unique domains to score: ${uniqueDomains.length}`)

    // ---- 4. ENRICH (optional APIs) ----
    // EstiBot batch appraisal (fast, batch mode)
    let estibotData: Record<string, any> = {}
    try {
      estibotData = await getEstiBotAppraisals(uniqueDomains.map(d => d.domain))
      if (Object.keys(estibotData).length > 0) log('info', `EstiBot: ${Object.keys(estibotData).length} appraisals`)
    } catch (e: any) { log('warning', `EstiBot skipped: ${e.message}`) }

    // ---- 5. SCORE EVERY DOMAIN ----
    const scored: ScoredDomain[] = []

    for (const raw of uniqueDomains) {
      // Build enrichment from all available sources
      const enrichment: EnrichmentData = {
        ...(expiredEnrichments?.[raw.domain] || {}),
      }

      // Merge EstiBot data
      const eb = estibotData[raw.domain]
      if (eb) {
        if (eb.cpc) enrichment.keywordCPC = eb.cpc
        if (eb.domain_age) enrichment.domainAge = enrichment.domainAge || eb.domain_age
        if (eb.appraised_value) enrichment.estibotValue = eb.appraised_value
      }

      scored.push(scoreDomain(raw, enrichment))
    }

    // Sort by score descending
    scored.sort((a, b) => b.score.total - a.score.total)

    // ---- 6. ENRICH TOP CANDIDATES (expensive APIs, only for high scorers) ----
    const topCandidates = scored.filter(d => d.score.total >= 50).slice(0, 20)
    for (const domain of topCandidates) {
      try {
        // NameBio comparable sales (only for top candidates to conserve API calls)
        const sld = domain.sld
        const tld = domain.tld.replace('.', '')
        const comps = await getKeywordComparables(sld, tld)
        if (comps && comps.totalSales && comps.totalSales > 0) {
          // Re-score with comparable data
          const prevSales = await checkPreviousSales(domain.domain)
          const compSales = prevSales.length > 0
            ? prevSales.map(s => ({ domain: domain.domain, price: s.price, date: s.date }))
            : comps.medianPrice ? [{ domain: 'comparable', price: comps.medianPrice, date: '' }] : []

          if (compSales.length > 0) {
            // Update the scored domain with comp data by re-scoring
            const enrichedRaw = { ...domain, price: domain.currentPrice, source: domain.source } as any as RawDomain
            enrichedRaw.domain = domain.domain
            const enrichment: EnrichmentData = {
              ...(expiredEnrichments?.[domain.domain] || {}),
              comparableSales: compSales,
            }
            const eb = estibotData[domain.domain]
            if (eb?.cpc) enrichment.keywordCPC = eb.cpc
            if (eb?.domain_age) enrichment.domainAge = enrichment.domainAge || eb.domain_age
            if (eb?.appraised_value) enrichment.estibotValue = eb.appraised_value

            const rescored = scoreDomain(enrichedRaw, enrichment)
            // Replace in array
            const idx = scored.findIndex(s => s.domain === domain.domain)
            if (idx >= 0) scored[idx] = rescored
          }
        }
      } catch (e: any) { /* NameBio optional, skip on error */ }

      try {
        // USPTO trademark check
        const tm = await checkTrademark(domain.domain)
        if (tm.hasActiveTrademark) {
          log('info', `Trademark found for ${domain.domain}: ${tm.trademarkCount} matches`, domain.domain)
          // Flag for review
          const idx = scored.findIndex(s => s.domain === domain.domain)
          if (idx >= 0) {
            scored[idx].score.breakdown.trademark = {
              score: 5, max: 5,
              reason: `Active trademark — ${tm.trademarkCount} matches. Review for legal risk.`,
            }
            scored[idx].score.total += 5
          }
        }
      } catch (e: any) { /* USPTO optional, skip on error */ }
    }

    // Re-sort after enrichment
    scored.sort((a, b) => b.score.total - a.score.total)

    // ---- 7. INTELLIGENCE LAYERS + DECIDE ----
    // Layer patterns, risk, and strategy on top of base score
    const decisions: Array<{
      domain: ScoredDomain
      decision: ReturnType<typeof calculateBid>
      patterns: ReturnType<typeof analyzePatterns>
      risk: ReturnType<typeof assessRisk>
      strategy: ReturnType<typeof determineStrategy> | null
    }> = []

    for (const d of scored) {
      if (!allowedTLDs.includes(d.tld)) continue
      if (d.currentPrice > maxSpendDomain) continue
      if (d.currentPrice <= 0) continue

      // Pattern recognition — detect LLL, CVCV, dictionary words, etc.
      const patterns = analyzePatterns(d.domain)
      if (patterns.patternBonus > 0) {
        d.score.total = Math.min(100, d.score.total + patterns.patternBonus)
        d.score.reasoning += ' ' + patterns.reasoning
      }

      // Risk assessment — trademark, spam, bidding wars, etc.
      const risk = assessRisk(d.domain, expiredEnrichments?.[d.domain] || {}, {
        bidCount: d.bidCount,
        currentPrice: d.currentPrice,
        estimatedValue: d.score.estimatedValue,
      })

      // If critical risk, skip entirely
      if (risk.overallRisk === 'critical') {
        decisions.push({
          domain: d,
          decision: { shouldBid: false, bidAmount: 0, maxProxyBid: 0, reason: risk.recommendation + ': ' + risk.risks.map(r => r.description).join('; '), requiresReview: false },
          patterns, risk, strategy: null,
        })
        continue
      }

      // Calculate base bid decision
      const decision = calculateBid(d, { minRoi: minROI, perDomainCap: maxSpendDomain, reviewThreshold })

      // Apply risk multiplier to max bid
      if (risk.maxBidMultiplier < 1.0 && decision.shouldBid) {
        decision.maxProxyBid = Math.round(decision.maxProxyBid * risk.maxBidMultiplier)
        decision.reason += ` Risk: ${risk.overallRisk} — max bid reduced to $${decision.maxProxyBid}.`
      }

      // High risk → force review
      if (risk.overallRisk === 'high' && decision.shouldBid) {
        decision.requiresReview = true
        decision.reason += ' High risk — manual review required.'
      }

      // Auction strategy (only for domains we'd actually bid on)
      let strategy: ReturnType<typeof determineStrategy> | null = null
      if (decision.shouldBid && d.auctionId) {
        const maxAffordable = Math.min(d.score.estimatedValue / minROI, maxSpendDomain)
        strategy = determineStrategy(d.domain, d.auctionEndTime, d.bidCount || 0, d.currentPrice, d.score.estimatedValue, maxAffordable)
        if (strategy.approach === 'skip_overheated') {
          decision.shouldBid = false
          decision.reason = strategy.reasoning
        } else {
          decision.bidAmount = strategy.bidAmount
          decision.maxProxyBid = strategy.maxBid
          decision.reason += ' Strategy: ' + strategy.reasoning
        }
      }

      decisions.push({ domain: d, decision, patterns, risk, strategy })
    }

    const qualified = decisions.filter(b => b.decision.shouldBid)
    const reviewNeeded = qualified.filter(b => b.decision.requiresReview)
    const autoBid = qualified.filter(b => !b.decision.requiresReview)

    log('info', `Scored ${scored.length}, qualified ${qualified.length} (${autoBid.length} auto, ${reviewNeeded.length} review)`)

    // ---- AI BRAIN: Deep evaluation of top candidates ----
    let aiInsights: Record<string, AIDomainAnalysis> = {}
    if (qualified.length > 0) {
      try {
        const topForAI = qualified.slice(0, 15).map(b => ({
          domain: b.domain.domain, price: b.domain.currentPrice, estimatedValue: b.domain.score.estimatedValue,
          score: b.domain.score.total, age: b.domain.score.breakdown.age?.score, backlinks: b.domain.score.breakdown.backlinks?.score,
          bidCount: b.domain.bidCount, source: b.domain.source,
        }))
        const aiResult = await aiAnalyzeDomains(topForAI)
        if (aiResult) {
          aiInsights = aiResult
          log('info', `AI Brain evaluated ${Object.keys(aiResult).length} domains`)
          for (const [domain, analysis] of Object.entries(aiResult)) {
            if (!analysis.shouldBid) log('info', `AI vetoed ${domain}: ${analysis.reasoning}`, domain)
          }
        }
      } catch (e) { log('warning', `AI Brain failed (rules fallback): ${(e as Error).message}`) }
    }

    // ---- 8. SAVE SCAN RESULTS ----
    const scanRows = scored.slice(0, 200).map(d => {
      const bd = decisions.find(b => b.domain.domain === d.domain)
      const decisionLabel = bd?.decision.shouldBid
        ? (dryRun ? 'dry_run_would_bid' : (bd.decision.requiresReview ? 'review' : 'bid'))
        : 'skip'
      return {
        user_id: userId,
        domain: d.domain,
        tld: d.tld,
        source: d.source,
        current_price: d.currentPrice,
        estimated_value: d.score.estimatedValue,
        roi_multiple: d.roiMultiple,
        total_score: d.score.total,
        length_score: d.score.breakdown.length.score,
        tld_score: d.score.breakdown.tld.score,
        keyword_score: d.score.breakdown.keywords.score,
        brandability_score: d.score.breakdown.brandability.score,
        trend_score: d.score.breakdown.backlinks.score,
        decision: decisionLabel,
        decision_reason: bd?.decision.reason || 'Below thresholds',
        reasoning: d.score.reasoning || null,
        risk_level: bd?.risk.overallRisk || null,
        risk_factors: bd?.risk.risks || [],
        pattern_bonus: bd?.patterns.patternBonus || 0,
        patterns_detected: bd?.patterns.patterns || [],
        strategy: bd?.strategy?.approach || null,
        auction_id: d.auctionId || null,
        auction_end_time: d.auctionEndTime || null,
        scan_batch_id: batchId,
      }
    })

    for (let i = 0; i < scanRows.length; i += 50) {
      await supabase.from('scan_results').insert(scanRows.slice(i, i + 50)).then(({ error }) => {
        if (error) log('scan_error', `Save failed: ${error.message}`)
      })
    }

    // ---- 9. REVIEW QUEUE ----
    for (const { domain: d, decision } of reviewNeeded) {
      await supabase.from('review_queue').insert({
        user_id: userId,
        domain: d.domain,
        source: d.source,
        total_score: d.score.total,
        score_breakdown: d.score.breakdown,
        estimated_value: d.score.estimatedValue,
        confidence: d.score.confidence,
        current_price: d.currentPrice,
        recommended_bid: decision.bidAmount,
        max_proxy_bid: decision.maxProxyBid,
        auction_id: d.auctionId || null,
        auction_end_time: d.auctionEndTime || null,
        reason: decision.reason,
        status: 'pending_review',
        enrichment_data: d.score.breakdown,
      })
      log('info', `[REVIEW] ${d.domain} — $${d.currentPrice}, score ${d.score.total}, rec bid $${decision.bidAmount}`, d.domain)
    }

    // ---- 10. PLACE BIDS (if not DRY_RUN) ----
    let bidsPlaced = 0
    let bidSpend = 0
    const remainingBudget = maxSpendDay - (botState.spend_today || 0)

    // ---- PRE-BID: GoDaddy connectivity check ----
    if (!dryRun && autoBid.length > 0) {
      try {
        const testResp = await fetch('https://api.godaddy.com/v1/domains?limit=1', {
          headers: { 'Authorization': `sso-key ${env('GODADDY_API_KEY')}:${env('GODADDY_API_SECRET')}`, 'Accept': 'application/json' },
        })
        if (!testResp.ok && (testResp.status === 401 || testResp.status === 402 || testResp.status === 403)) {
          log('warning', `GoDaddy account issue (${testResp.status}) — bids may fail`)
          await notify(settings?.notification_webhook, 'GoDaddy Account Issue', { Error: `API returned ${testResp.status}`, Action: 'Check account balance and API credentials' }, 'critical')
        }
      } catch (e) { /* Non-critical — proceed with bids */ }
    }

    if (!dryRun) {
      for (const { domain: d, decision } of autoBid) {
        if (bidSpend + decision.bidAmount > remainingBudget) {
          log('spend_limit_reached', `Would exceed daily budget`, d.domain)
          break
        }
        if (!d.auctionId || d.source !== 'godaddy_auction') continue // Only GoDaddy has bid API

        const result = await placeGoDaddyBid(d.auctionId, decision.bidAmount)
        if (result.success) {
          bidsPlaced++
          bidSpend += decision.bidAmount
          log('bid_placed', `$${decision.bidAmount} (score ${d.score.total}, est $${d.score.estimatedValue})`, d.domain)

          await supabase.from('transactions').insert({
            user_id: userId, type: 'bid', domain: d.domain, amount: decision.bidAmount,
            date: new Date().toISOString(), strategy_id: 'autonomous', status: 'pending',
            registrar: 'GoDaddy',
            metadata: {
              auction_id: d.auctionId, score: d.score.total, estimated_value: d.score.estimatedValue,
              roi: d.roiMultiple, confidence: d.score.confidence,
              score_breakdown: Object.fromEntries(Object.entries(d.score.breakdown).map(([k, v]: [string, any]) => [k, { score: v.score, max: v.max }])),
            },
          })
        } else {
          log('bid_error', result.message, d.domain)
        }
      }
    } else {
      // DRY_RUN log
      for (const { domain: d, decision } of autoBid.slice(0, 10)) {
        log('info', `[DRY_RUN] Would bid $${decision.bidAmount} (score ${d.score.total}, est $${d.score.estimatedValue}, ${d.score.confidence}% conf, ROI ${d.roiMultiple.toFixed(1)}x)`, d.domain)
      }
      if (autoBid.length > 10) log('info', `[DRY_RUN] ...and ${autoBid.length - 10} more`)
    }

    // ---- 11. UPDATE STATE ----
    const elapsed = Date.now() - startTime
    await updateState(supabase, userId, botState, {
      bidsPlaced, bidSpend, domainsFound: qualified.length, fetchErrors,
    })

    log('scan_completed', `${scored.length} scored, ${qualified.length} qualified, ${bidsPlaced} bids, $${bidSpend} spent, ${elapsed}ms`)

    // Notifications
    const webhookUrl = settings?.notification_webhook
    if (bidsPlaced > 0) {
      await notify(webhookUrl, 'Bids Placed', {
        'Bids': bidsPlaced,
        'Amount': `$${bidSpend}`,
        'Top domain': autoBid[0]?.domain.domain || 'N/A',
      }, 'critical')
    } else if (qualified.length > 0 && dryRun) {
      await notify(webhookUrl, 'DRY RUN: Domains Found', {
        'Qualified': qualified.length,
        'Top score': scored[0]?.score.total || 0,
        'Top domain': scored[0]?.domain || 'N/A',
      }, 'info')
    }
    if (reviewNeeded.length > 0) {
      await notify(webhookUrl, 'Review Queue', {
        'Domains needing review': reviewNeeded.length,
        'Top': reviewNeeded[0]?.domain.domain || 'N/A',
        'Price': `$${reviewNeeded[0]?.domain.currentPrice || 0}`,
      }, 'warning')
    }
    if (fetchErrors.length > 0) {
      await notify(webhookUrl, 'Scan Errors', { 'Errors': fetchErrors.join(', ') }, 'warning')
    }

    await saveLogs(supabase, userId, logs)

    return res.status(200).json({
      status: 'completed',
      batchId,
      dryRun,
      domainsScanned: scored.length,
      domainsQualified: qualified.length,
      reviewQueued: reviewNeeded.length,
      bidsPlaced,
      amountSpent: bidSpend,
      elapsedMs: elapsed,
      errors: fetchErrors.length > 0 ? fetchErrors : undefined,
      topDomains: scored.slice(0, 10).map(d => ({
        domain: d.domain,
        score: d.score.total,
        confidence: d.score.confidence,
        price: d.currentPrice,
        estimatedValue: d.score.estimatedValue,
        roi: d.roiMultiple.toFixed(1) + 'x',
        source: d.source,
        breakdown: Object.fromEntries(
          Object.entries(d.score.breakdown).map(([k, v]) => [k, `${v.score}/${v.max}`])
        ),
      })),
    })
  } catch (error: any) {
    console.error('Cron fatal:', error)
    log('scan_error', `Fatal: ${error.message}`)
    try { await saveLogs(getSupabase()!, env('BOT_USER_ID'), logs) } catch { }
    return res.status(500).json({ status: 'error', error: error.message, batchId })
  }
}

// ============================================
// STATE + LOG HELPERS
// ============================================

async function updateState(supabase: SupabaseClient, userId: string, botState: any, data: {
  scansOnly?: boolean; bidsPlaced?: number; bidSpend?: number; domainsFound?: number; fetchErrors?: string[]
}) {
  await supabase.from('bot_state').update({
    last_scan_at: new Date().toISOString(),
    last_error: data.fetchErrors?.length ? data.fetchErrors.join('; ') : null,
    last_error_at: data.fetchErrors?.length ? new Date().toISOString() : botState.last_error_at,
    scans_today: (botState.scans_today || 0) + 1,
    bids_today: (botState.bids_today || 0) + (data.bidsPlaced || 0),
    spend_today: (botState.spend_today || 0) + (data.bidSpend || 0),
    domains_found_today: (botState.domains_found_today || 0) + (data.domainsFound || 0),
    total_scans: (botState.total_scans || 0) + 1,
    total_bids: (botState.total_bids || 0) + (data.bidsPlaced || 0),
    total_spend: (botState.total_spend || 0) + (data.bidSpend || 0),
  }).eq('user_id', userId)

  // Daily spend record
  const today = new Date().toISOString().split('T')[0]
  const { data: rec } = await supabase.from('spend_records').select('*').eq('user_id', userId).eq('date', today).single()
  if (rec) {
    await supabase.from('spend_records').update({
      spent: (rec.spent || 0) + (data.bidSpend || 0),
      transaction_count: (rec.transaction_count || 0) + (data.bidsPlaced || 0),
    }).eq('id', rec.id)
  } else {
    await supabase.from('spend_records').insert({
      user_id: userId, date: today, spent: data.bidSpend || 0, transaction_count: data.bidsPlaced || 0,
    })
  }
}

async function saveLogs(supabase: SupabaseClient, userId: string, logs: LogEntry[]) {
  if (!logs.length) return
  await supabase.from('bot_logs').insert(
    logs.map(l => ({ user_id: userId, event_type: l.event_type, message: l.message, domain: l.domain || null, details: l.details || {} }))
  )
}
