/**
 * Vercel Cron — Renewal & Expiry Manager (daily 6 AM MST / 1 PM UTC)
 * Auto-renews profitable domains, auto-drops unprofitable ones.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { getDomainExpiry, renewDomain, dropDomain } from '../lib/sources/godaddy.js'
import { notify } from '../lib/notify.js'

function env(key: string): string { return process.env[key] || '' }
const TLD_RENEWAL: Record<string, number> = { ai: 70, io: 50, co: 30, dev: 12, app: 14, com: 10, net: 10, org: 10, gg: 30, xyz: 10, me: 15, info: 10, cc: 25 }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).end()
  const cronSecret = env('CRON_SECRET')
  const adminKey = env('ADMIN_API_KEY')
  const auth = req.headers.authorization
  const reqKey = req.headers['x-admin-key'] as string
  if (cronSecret && auth !== `Bearer ${cronSecret}` && (!adminKey || reqKey !== adminKey)) return res.status(401).json({ error: 'Unauthorized' })

  const url = env('SUPABASE_URL') || env('VITE_SUPABASE_URL')
  const key = env('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) return res.status(500).json({ error: 'DB not configured' })
  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
  const userId = env('BOT_USER_ID')
  if (!userId) return res.status(500).json({ error: 'BOT_USER_ID required' })

  const { data: stgs } = await supabase.from('pipeline_settings').select('notification_webhook').order('last_updated', { ascending: false }).limit(1).single()
  const webhookUrl = stgs?.notification_webhook
  let renewed = 0, dropped = 0
  const urgent: string[] = []

  try {
    const { data: domains } = await supabase.from('owned_domains').select('*').eq('user_id', userId).in('status', ['owned', 'listed'])
    for (const domain of domains || []) {
      try {
        const expiry = await getDomainExpiry(domain.domain)
        if (!expiry?.expires) continue
        const daysUntilExpiry = Math.round((new Date(expiry.expires).getTime() - Date.now()) / 86400000)
        await supabase.from('owned_domains').update({ metadata: { ...(domain.metadata || {}), expires: expiry.expires, days_until_expiry: daysUntilExpiry } }).eq('id', domain.id)
        if (daysUntilExpiry > 30) continue

        const tld = domain.domain.split('.').pop() || ''
        const renewalCost = expiry.renewalPrice || TLD_RENEWAL[tld] || 15
        const currentValue = domain.listed_price || domain.current_value || domain.estimated_value
        if (daysUntilExpiry <= 7) urgent.push(`${domain.domain} expires in ${daysUntilExpiry} days!`)

        if (currentValue > renewalCost * 2) {
          const result = await renewDomain(domain.domain)
          if (result.success) {
            await supabase.from('transactions').insert({ user_id: userId, type: 'renewal', domain: domain.domain, amount: renewalCost, date: new Date().toISOString(), strategy_id: 'auto_renewal', status: 'completed', metadata: { renewal_cost: renewalCost, estimated_value: currentValue, days_until_expiry: daysUntilExpiry } })
            await supabase.from('bot_logs').insert({ user_id: userId, event_type: 'info', message: `AUTO-RENEWED: ${domain.domain} ($${renewalCost}, value $${currentValue})`, domain: domain.domain, details: {} })
            renewed++
          }
        } else {
          await dropDomain(domain.domain)
          await supabase.from('owned_domains').update({ status: 'expired', updated_at: new Date().toISOString(), metadata: { ...(domain.metadata || {}), drop_reason: 'auto_drop_unprofitable', renewal_cost: renewalCost, value_at_drop: currentValue } }).eq('id', domain.id)
          await supabase.from('flip_outcomes').upsert({ user_id: userId, domain: domain.domain, tld: domain.tld, purchase_price: domain.purchase_price, sell_price: 0, status: 'dropped', created_at: new Date().toISOString() }, { onConflict: 'user_id,domain' } as any)
          await supabase.from('bot_logs').insert({ user_id: userId, event_type: 'warning', message: `AUTO-DROPPED: ${domain.domain} (renewal $${renewalCost} > value $${currentValue}/2)`, domain: domain.domain, details: {} })
          dropped++
        }
      } catch (e) { await supabase.from('bot_logs').insert({ user_id: userId, event_type: 'warning', message: `Renewal check failed for ${domain.domain}: ${(e as Error).message}`, domain: domain.domain, details: {} }) }
    }

    if (renewed > 0 || dropped > 0 || urgent.length > 0)
      await notify(webhookUrl, 'Renewal Manager', { 'Auto-renewed': renewed, 'Auto-dropped': dropped, ...(urgent.length > 0 ? { 'URGENT': urgent.join(', ') } : {}) }, urgent.length > 0 ? 'critical' : 'info')

    return res.status(200).json({ renewed, dropped, urgent: urgent.length })
  } catch (error: any) {
    await notify(webhookUrl, 'Renewal Manager Error', { error: error.message }, 'critical')
    return res.status(500).json({ error: error.message })
  }
}
