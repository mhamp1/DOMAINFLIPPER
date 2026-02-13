/**
 * Cron: Daily Portfolio Optimization (8 AM MST / 3 PM UTC)
 * Recommends drops for money-losing domains (6+ months, renewal > value).
 * Note: Stale listing repricing is handled by manage-listings.ts (every 6 hours).
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { notify } from '../lib/notify.js'

function env(key: string): string { return process.env[key] || '' }

const TLD_RENEWAL: Record<string, number> = {
  ai: 70, io: 50, co: 30, dev: 12, app: 14, com: 10, net: 10, org: 10,
}

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

  const { data: settings } = await supabase.from('pipeline_settings').select('notification_webhook').order('last_updated', { ascending: false }).limit(1).single()
  let dropRecommended = 0

  try {
    const sixMonthsAgo = new Date(Date.now() - 180 * 86400000).toISOString()
    const { data: old } = await supabase.from('owned_domains').select('*')
      .eq('user_id', userId).in('status', ['owned', 'listed']).lt('purchase_date', sixMonthsAgo)

    for (const d of old || []) {
      const tld = d.domain?.split('.').pop() || ''
      const renewalCost = TLD_RENEWAL[tld] || 15
      const lp = d.listed_price || d.current_value || 0
      if (lp < renewalCost * 2) {
        await supabase.from('bot_logs').insert({
          user_id: userId, event_type: 'warning',
          message: `DROP RECOMMENDATION: ${d.domain} — listed $${lp}, renewal $${renewalCost}/yr, held ${Math.round((Date.now() - new Date(d.purchase_date).getTime()) / 86400000)} days`,
          domain: d.domain,
        })
        // Flag domain for auto-drop by renewal cron
        await supabase.from('owned_domains').update({
          metadata: {
            ...(d.metadata || {}),
            drop_recommended: true,
            drop_recommended_at: new Date().toISOString(),
            drop_reason: `Listed $${lp}, renewal $${renewalCost}/yr`,
          },
        }).eq('id', d.id)
        dropRecommended++
      }
    }

    if (dropRecommended > 0) {
      await notify(settings?.notification_webhook, 'Daily Portfolio Review', { 'Drop recommendations': dropRecommended }, 'warning')
    }

    return res.status(200).json({ dropRecommended })
  } catch (e: any) {
    return res.status(500).json({ error: e.message })
  }
}
