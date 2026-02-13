/**
 * Cron: Process Offers (every 30 min) — auto-responds to lander offers via AI + email.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { aiNegotiateOffer } from '../lib/intelligence/ai-brain.js'
import { sendOfferResponse } from '../lib/outreach/email.js'
import { notify } from '../lib/notify.js'

function env(key: string): string { return process.env[key] || '' }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).end()
  const cronSecret = env('CRON_SECRET')
  if (cronSecret && req.headers.authorization !== `Bearer ${cronSecret}` && req.headers['x-admin-key'] !== env('ADMIN_API_KEY')) return res.status(401).json({ error: 'Unauthorized' })

  const url = env('SUPABASE_URL') || env('VITE_SUPABASE_URL')
  const key = env('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) return res.status(500).json({ error: 'DB not configured' })
  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
  const userId = env('BOT_USER_ID')
  if (!userId) return res.status(500).json({ error: 'BOT_USER_ID required' })

  try {
    const { data: pending } = await supabase.from('domain_offers').select('*').eq('user_id', userId).eq('status', 'pending').order('created_at', { ascending: true }).limit(10)
    if (!pending?.length) return res.status(200).json({ status: 'no_pending_offers' })

    let accepted = 0, countered = 0, declined = 0

    for (const offer of pending) {
      const { data: dom } = await supabase.from('owned_domains').select('*').eq('user_id', userId).eq('domain', offer.domain).single()
      if (!dom) { await supabase.from('domain_offers').update({ status: 'declined', response_type: 'auto_decline_no_domain', responded_at: new Date().toISOString() }).eq('id', offer.id); declined++; continue }

      const purchasePrice = dom.purchase_price || 0
      const listedPrice = dom.listed_price || dom.current_value || 0
      const floorPrice = dom.floor_price || Math.max(purchasePrice * 2, 50)

      let action: 'accept' | 'counter' | 'decline' = 'decline'
      let counterAmount: number | undefined

      const ai = await aiNegotiateOffer(offer.domain, purchasePrice, listedPrice, floorPrice, offer.offer_amount, Math.round((Date.now() - new Date(dom.listed_at || dom.created_at).getTime()) / 86400000))
      if (ai && ai.confidence >= 50) {
        if (ai.action === 'accept') action = 'accept'
        else if (ai.action === 'counter') { action = 'counter'; counterAmount = ai.counterAmount }
      } else {
        if (offer.offer_amount >= floorPrice) action = 'accept'
        else if (offer.offer_amount >= purchasePrice * 1.5) { action = 'counter'; counterAmount = Math.round(listedPrice * 0.75) }
      }

      const emailResult = await sendOfferResponse(offer.buyer_email, offer.buyer_name || 'there', offer.domain, action, offer.offer_amount, counterAmount, listedPrice)

      await supabase.from('domain_offers').update({ status: action === 'accept' ? 'accepted' : action === 'counter' ? 'countered' : 'declined', response_type: `auto_${action}`, counter_amount: counterAmount || null, responded_at: new Date().toISOString() }).eq('id', offer.id)
      await supabase.from('bot_logs').insert({ user_id: userId, event_type: action === 'accept' ? 'info' : 'info', message: `Auto-${action}: ${offer.domain} — $${offer.offer_amount}${counterAmount ? ' → counter $' + counterAmount : ''} from ${offer.buyer_email}. Email ${emailResult.success ? 'sent' : 'FAILED'}`, domain: offer.domain, details: { action, offer: offer.offer_amount, counter: counterAmount, emailSent: emailResult.success } })

      if (action === 'accept') accepted++; else if (action === 'counter') countered++; else declined++
    }

    const { data: settings } = await supabase.from('pipeline_settings').select('notification_webhook').order('last_updated', { ascending: false }).limit(1).single()
    if (accepted + countered + declined > 0) await notify(settings?.notification_webhook, 'Offers Processed', { Accepted: accepted, Countered: countered, Declined: declined }, accepted > 0 ? 'critical' : 'info')

    return res.status(200).json({ processed: pending.length, accepted, countered, declined })
  } catch (e: any) { return res.status(500).json({ error: e.message }) }
}
