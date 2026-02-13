/**
 * Cron: Find Buyers v2 — Monday + Thursday 9 AM UTC
 *
 * For each unsold domain with no recent leads:
 *   1. AI identifies 3 buyer types per domain (individual analysis, not batch)
 *   2. Google + LinkedIn search queries per buyer type
 *   3. Draft 3-sentence outreach per type
 *   4. Saves to buyer_leads -> Dashboard Leads tab
 *
 * YOU send the emails. Bot does the research.
 * Max 8 domains per run (~$0.10 in AI cost).
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { notify } from '../lib/notify.js'

function env(key: string): string { return process.env[key] || '' }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).end()
  const cronSecret = env('CRON_SECRET')
  if (cronSecret && req.headers.authorization !== `Bearer ${cronSecret}` && req.headers['x-admin-key'] !== env('ADMIN_API_KEY')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const url = env('SUPABASE_URL') || env('VITE_SUPABASE_URL')
  const key = env('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) return res.status(500).json({ error: 'DB not configured' })
  const anthropicKey = env('ANTHROPIC_API_KEY')
  if (!anthropicKey) return res.status(200).json({ error: 'No AI key' })

  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
  const userId = env('BOT_USER_ID')
  if (!userId) return res.status(500).json({ error: 'BOT_USER_ID required' })

  const log = async (type: string, msg: string, domain?: string) => {
    await supabase.from('bot_logs').insert({ user_id: userId, event_type: type, message: msg, domain })
  }

  try {
    // Get all owned/listed domains, oldest first
    const { data: domains } = await supabase.from('owned_domains')
      .select('*').eq('user_id', userId)
      .in('status', ['owned', 'listed'])
      .order('created_at', { ascending: true })
      .limit(20)

    if (!domains?.length) {
      return res.status(200).json({ leads_generated: 0, reason: 'No domains to find buyers for' })
    }

    // Get existing leads to avoid duplicates (last 30 days)
    const { data: existing } = await supabase.from('buyer_leads')
      .select('domain').eq('user_id', userId)
      .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString())
    const recent = new Set((existing || []).map((l: any) => l.domain))

    // Filter to domains needing new leads
    const needs = domains.filter((d: any) => !recent.has(d.domain)).slice(0, 8)
    if (!needs.length) {
      return res.status(200).json({ leads_generated: 0, reason: 'All domains have recent leads' })
    }

    let leads = 0

    // Process in parallel batches of 2 (rate limit friendly)
    for (let i = 0; i < needs.length; i += 2) {
      await Promise.allSettled(needs.slice(i, i + 2).map(async (domain: any) => {
        const sld = domain.domain.split('.')[0]
        const tld = domain.domain.split('.').pop()
        const days = Math.round((Date.now() - new Date(domain.created_at).getTime()) / 86400000)

        try {
          const r = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': anthropicKey,
              'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
              model: 'claude-haiku-4-5-20251001',
              max_tokens: 1200,
              messages: [{
                role: 'user',
                content: `Domain broker: identify 3 buyer types for "${domain.domain}".

Domain: ${domain.domain} (.${tld}), SLD: "${sld}", Price: $${domain.listed_price || domain.current_value || 'negotiable'}, Days owned: ${days}

For each: company_type (specific), why (1 sentence), google_queries (3), linkedin_query, email_subject, email_body (3 sentences max, casual pro), estimated_sale_price (realistic: $100-500 typical), confidence (0-100).

Return ONLY: {"buyers":[{"company_type":"...","why":"...","google_queries":["..."],"linkedin_query":"...","email_subject":"...","email_body":"...","estimated_sale_price":200,"confidence":70}]}`,
              }],
            }),
            signal: AbortSignal.timeout(15000),
          })

          if (!r.ok) return

          const d = await r.json()
          const t = d.content?.[0]?.text || '{}'
          const p = JSON.parse(t.replace(/```json|```/g, '').trim())

          for (const b of (p.buyers || [])) {
            await supabase.from('buyer_leads').insert({
              user_id: userId,
              domain: domain.domain,
              company_type: b.company_type,
              search_queries: [
                ...(b.google_queries || []),
                b.linkedin_query ? `LinkedIn: ${b.linkedin_query}` : null,
              ].filter(Boolean),
              email_subject: b.email_subject,
              email_body: b.email_body,
              estimated_sale_price: b.estimated_sale_price || 200,
              confidence: b.confidence || 50,
              status: b.confidence >= 65 ? 'ready_to_send' : 'pending_review',
            })
            leads++
          }

          // Update the domain's last_buyer_scan metadata
          await supabase.from('owned_domains').update({
            metadata: { ...(domain.metadata || {}), last_buyer_scan: new Date().toISOString() },
          }).eq('id', domain.id)

          await log('info', `Buyer finder: ${(p.buyers || []).length} buyer types for ${domain.domain}`, domain.domain)
        } catch { /* parse/network failed, skip domain */ }
      }))
    }

    await log('info', `Buyer finder v2: ${needs.length} domains analyzed, ${leads} leads generated`)

    // Notification
    const { data: settings } = await supabase.from('pipeline_settings').select('notification_webhook').order('last_updated', { ascending: false }).limit(1).single()
    if (settings?.notification_webhook) {
      await notify(settings.notification_webhook, 'Buyer Finder v2', {
        Analyzed: needs.length,
        Leads: leads,
        Top: needs.slice(0, 3).map((d: any) => d.domain).join(', '),
      }, 'info')
    }

    return res.status(200).json({ domains_analyzed: needs.length, leads_generated: leads })
  } catch (e: any) {
    await log('error', `Buyer finder error: ${e.message}`)
    return res.status(200).json({ error: e.message })
  }
}
