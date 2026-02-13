/**
 * Vercel Cron — Auction Reconciliation (every 30 min)
 * Checks pending bids, detects wins/losses, creates owned_domains, auto-expires stale reviews.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { getAuctionDetails, getOwnedDomainsList } from '../lib/sources/godaddy.js'
import { notify } from '../lib/notify.js'

function env(key: string): string { return process.env[key] || '' }

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

  const { data: settings } = await supabase.from('pipeline_settings').select('notification_webhook').order('last_updated', { ascending: false }).limit(1).single()
  const webhookUrl = settings?.notification_webhook

  let won = 0, lost = 0, stillOpen = 0, errors = 0, catchAllAcquired = 0, reviewsExpired = 0

  try {
    // STEP 0: Expire stale review queue items
    const { data: expiredReviews } = await supabase.from('review_queue').select('id, domain, auction_end_time').eq('user_id', userId).eq('status', 'pending_review')
    for (const review of expiredReviews || []) {
      if (review.auction_end_time && new Date(review.auction_end_time).getTime() < Date.now()) {
        await supabase.from('review_queue').update({ status: 'expired' }).eq('id', review.id)
        reviewsExpired++
      }
    }
    if (reviewsExpired > 0) await supabase.from('bot_logs').insert({ user_id: userId, event_type: 'info', message: `Auto-expired ${reviewsExpired} review queue items (auction ended)`, domain: null, details: {} })

    // STEP 1: Find all pending bid transactions
    const { data: pendingBids } = await supabase.from('transactions').select('*').eq('user_id', userId).eq('type', 'bid').eq('status', 'pending').order('date', { ascending: true })

    for (const bid of pendingBids || []) {
      const auctionId = bid.metadata?.auction_id
      if (!auctionId) {
        if (Date.now() - new Date(bid.date).getTime() > 7 * 86400000) {
          await supabase.from('transactions').update({ status: 'failed', metadata: { ...bid.metadata, reconcile_note: 'No auction_id, expired after 7 days' } }).eq('id', bid.id)
          await supabase.from('bot_logs').insert({ user_id: userId, event_type: 'warning', message: `Bid on ${bid.domain} marked failed — no auction ID, 7+ days old`, domain: bid.domain, details: {} })
          lost++
        }
        continue
      }

      try {
        const result = await getAuctionDetails(auctionId)
        if (!result) { errors++; continue }

        if (result.status === 'WON') {
          const purchasePrice = result.winnerBidAmount || bid.amount
          const estimatedValue = bid.metadata?.estimated_value || purchasePrice * 3
          await supabase.from('owned_domains').upsert({
            user_id: userId, domain: bid.domain, tld: '.' + (bid.domain.split('.').pop() || ''),
            purchase_price: purchasePrice, purchase_date: new Date().toISOString(),
            estimated_value: estimatedValue, current_value: estimatedValue,
            strategy_id: bid.metadata?.strategy || 'autonomous', status: 'owned', listed: false, sold: false,
            metadata: { auction_id: auctionId, score: bid.metadata?.score, score_breakdown: bid.metadata?.score_breakdown, estimated_value: estimatedValue, bid_amount: bid.amount, winning_amount: purchasePrice },
          }, { onConflict: 'user_id,domain' } as any)

          await supabase.from('transactions').update({ status: 'completed', net_amount: purchasePrice, metadata: { ...bid.metadata, reconcile_status: 'won', winning_amount: purchasePrice } }).eq('id', bid.id)
          await supabase.from('domain_events').insert({ user_id: userId, domain: bid.domain, event_type: 'bid_won', event_data: { auction_id: auctionId, winning_amount: purchasePrice, bid_amount: bid.amount, estimated_value: estimatedValue }, correlation_id: bid.id })
          
          const { data: bs } = await supabase.from('bot_state').select('total_domains_acquired').eq('user_id', userId).single()
          await supabase.from('bot_state').update({ total_domains_acquired: (bs?.total_domains_acquired || 0) + 1 }).eq('user_id', userId)
          await supabase.from('bot_logs').insert({ user_id: userId, event_type: 'info', message: `WON AUCTION: ${bid.domain} for $${purchasePrice} (est. value $${estimatedValue})`, domain: bid.domain, details: { purchasePrice, estimatedValue, auctionId } })
          await notify(webhookUrl, 'Auction Won!', { Domain: bid.domain, 'Purchase price': `$${purchasePrice}`, 'Estimated value': `$${estimatedValue}` }, 'critical')
          won++

        } else if (result.status === 'LOST' || result.status === 'EXPIRED') {
          await supabase.from('transactions').update({ status: 'failed', metadata: { ...bid.metadata, reconcile_status: 'lost', final_price: result.currentPrice } }).eq('id', bid.id)
          const { data: bs } = await supabase.from('bot_state').select('total_spend, spend_today').eq('user_id', userId).single()
          if (bs) await supabase.from('bot_state').update({ total_spend: Math.max(0, (bs.total_spend || 0) - bid.amount), spend_today: Math.max(0, (bs.spend_today || 0) - bid.amount) }).eq('user_id', userId)
          await supabase.from('domain_events').insert({ user_id: userId, domain: bid.domain, event_type: 'bid_lost', event_data: { auction_id: auctionId, our_bid: bid.amount, final_price: result.currentPrice }, correlation_id: bid.id })
          await supabase.from('bot_logs').insert({ user_id: userId, event_type: 'info', message: `Bid lost: ${bid.domain} — our bid $${bid.amount}, final price $${result.currentPrice}`, domain: bid.domain, details: {} })
          lost++
        } else { stillOpen++ }
      } catch (e) {
        errors++
        await supabase.from('bot_logs').insert({ user_id: userId, event_type: 'warning', message: `Reconcile error for ${bid.domain}: ${(e as Error).message}`, domain: bid.domain, details: {} })
      }
    }

    // STEP 3: Catch-all — check GoDaddy account for untracked domains
    try {
      const gdDomains = await getOwnedDomainsList()
      if (gdDomains.length > 0) {
        const { data: knownDomains } = await supabase.from('owned_domains').select('domain').eq('user_id', userId).in('status', ['owned', 'listed', 'sold'])
        const knownSet = new Set((knownDomains || []).map((d: any) => d.domain))
        for (const domain of gdDomains.filter(d => !knownSet.has(d))) {
          const { data: bidTx } = await supabase.from('transactions').select('*').eq('user_id', userId).eq('domain', domain).eq('type', 'bid').order('date', { ascending: false }).limit(1).single()
          const pp = bidTx?.amount || 0; const ev = bidTx?.metadata?.estimated_value || pp * 3
          await supabase.from('owned_domains').upsert({ user_id: userId, domain, tld: '.' + (domain.split('.').pop() || ''), purchase_price: pp, purchase_date: new Date().toISOString(), estimated_value: ev, current_value: ev, strategy_id: bidTx ? 'autonomous' : 'catch_all', status: 'owned', listed: false, sold: false, metadata: { source: 'catch_all_reconciliation', transaction_id: bidTx?.id || null } }, { onConflict: 'user_id,domain' } as any)
          if (bidTx?.status === 'pending') await supabase.from('transactions').update({ status: 'completed' }).eq('id', bidTx.id)
          await supabase.from('bot_logs').insert({ user_id: userId, event_type: 'info', message: `[CATCH-ALL] Found ${domain} in GoDaddy account — added to portfolio ($${pp})`, domain, details: {} })
          catchAllAcquired++
        }
      }
    } catch (e) { await supabase.from('bot_logs').insert({ user_id: userId, event_type: 'warning', message: `Catch-all check failed: ${(e as Error).message}`, domain: null, details: {} }) }

    if (won + lost + catchAllAcquired > 0) await supabase.from('bot_logs').insert({ user_id: userId, event_type: 'info', message: `Reconciliation: ${won} won, ${lost} lost, ${stillOpen} open, ${catchAllAcquired} catch-all, ${errors} errors`, domain: null, details: {} })
    return res.status(200).json({ status: 'completed', won, lost, stillOpen, catchAllAcquired, reviewsExpired, errors, pendingBids: pendingBids?.length || 0 })
  } catch (error: any) {
    await notify(webhookUrl, 'Reconciliation Error', { error: error.message }, 'critical')
    return res.status(500).json({ error: error.message })
  }
}
