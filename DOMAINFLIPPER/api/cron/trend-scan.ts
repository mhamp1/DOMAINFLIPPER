/**
 * Cron: Daily Trend Scan (5 AM MST = noon UTC)
 * AI identifies emerging sectors and updates search focus.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { aiTrendScan } from '../lib/intelligence/ai-brain.js'
import { notify } from '../lib/notify.js'

function env(key: string): string { return process.env[key] || '' }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).end()
  const cronSecret = env('CRON_SECRET'); const adminKey = env('ADMIN_API_KEY')
  const auth = req.headers.authorization; const reqKey = req.headers['x-admin-key'] as string
  if (cronSecret && auth !== `Bearer ${cronSecret}` && (!adminKey || reqKey !== adminKey)) return res.status(401).json({ error: 'Unauthorized' })

  const url = env('SUPABASE_URL') || env('VITE_SUPABASE_URL')
  const key = env('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) return res.status(500).json({ error: 'DB not configured' })
  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
  const userId = env('BOT_USER_ID')
  if (!userId) return res.status(500).json({ error: 'BOT_USER_ID required' })

  try {
    const { data: outcomes } = await supabase.from('flip_outcomes').select('domain, sell_price').eq('user_id', userId).not('sell_price', 'is', null).order('created_at', { ascending: false }).limit(20)
    const { data: owned } = await supabase.from('owned_domains').select('domain').eq('user_id', userId).in('status', ['owned', 'listed'])
    const trends = await aiTrendScan(new Date().toISOString().split('T')[0], (outcomes || []).map(o => ({ domain: o.domain, price: o.sell_price })), (owned || []).map(d => d.domain))
    if (!trends) return res.status(200).json({ status: 'skipped', reason: 'AI unavailable' })

    const { data: settings } = await supabase.from('pipeline_settings').select('*').order('last_updated', { ascending: false }).limit(1).single()
    if (settings?.id) {
      await supabase.from('pipeline_settings').update({ ai_trend_insights: { ...trends, scannedAt: new Date().toISOString() }, ...(trends.tldFocus?.length >= 2 ? { allowed_tlds: trends.tldFocus } : {}), last_updated: new Date().toISOString() }).eq('id', settings.id)
    }
    await supabase.from('bot_logs').insert({ user_id: userId, event_type: 'info', message: `AI Trend Scan: ${trends.emergingSectors?.length || 0} emerging sectors. Focus: ${trends.tldFocus?.join(', ')}. Terms: ${trends.suggestedSearchTerms?.slice(0, 5).join(', ')}`, domain: null, details: trends })
    await notify(settings?.notification_webhook, 'AI Trend Intelligence', { 'Emerging': trends.emergingSectors?.map(s => `${s.sector} (${s.urgency})`).join(', ') || 'None', 'Declining': trends.decliningTrends?.map(t => `${t.trend}`).join(', ') || 'None', 'TLD focus': trends.tldFocus?.join(', ') || 'Unchanged' }, 'info')
    return res.status(200).json({ status: 'completed', trends })
  } catch (e: any) { return res.status(500).json({ error: e.message }) }
}
