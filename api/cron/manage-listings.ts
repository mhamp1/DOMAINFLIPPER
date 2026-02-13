/**
 * Vercel Cron Job — Portfolio Manager
 * 
 * Runs every 6 hours. Manages the complete post-acquisition lifecycle:
 *   1. List unlisted domains for sale on GoDaddy Aftermarket
 *   2. Set up domain parking (Bodis) for ad revenue while listed
 *   3. Redirect high-backlink domains to your site for SEO value
 *   4. Reprice stale listings (30+ days → 15% reduction)
 * 
 * Every domain should be earning from day 1, not sitting idle.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { listForSale, getCompletedSales, setNameservers, getPendingOffers, acceptOffer, counterOffer } from '../lib/sources/godaddy.js'
import { calculateListingPrice } from '../lib/valuation/scorer.js'
import { calculateListingStrategy } from '../lib/sources/afternic.js'
import { notify } from '../lib/notify.js'
import { aiNegotiateOffer } from '../lib/intelligence/ai-brain.js'

function env(key: string): string { return process.env[key] || '' }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).end()

  const cronSecret = env('CRON_SECRET')
  const adminKey = env('ADMIN_API_KEY')
  const auth = req.headers.authorization
  const reqKey = req.headers['x-admin-key'] as string
  if (cronSecret && auth !== `Bearer ${cronSecret}` && (!adminKey || reqKey !== adminKey)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const url = env('SUPABASE_URL') || env('VITE_SUPABASE_URL')
  const key = env('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) return res.status(500).json({ error: 'Database not configured' })
  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

  const userId = env('BOT_USER_ID')
  if (!userId) return res.status(500).json({ error: 'BOT_USER_ID not configured' })

  // Load settings
  const { data: settings } = await supabase.from('pipeline_settings')
    .select('*').order('last_updated', { ascending: false }).limit(1).single()
  const webhookUrl = settings?.notification_webhook

  try {
    let listed = 0
    let parked = 0
    let redirected = 0
    let repriced = 0

    // ================================================================
    // STEP 1: List unlisted domains for sale
    // ================================================================
    const hasGoDaddyConfig = !!env('GODADDY_API_KEY') && !!env('GODADDY_API_SECRET')

    if (!hasGoDaddyConfig) {
      await supabase.from('bot_logs').insert({
        user_id: userId,
        event_type: 'warning',
        message: 'SKIPPED listing — GoDaddy API credentials not configured',
      })
    } else {
      const { data: unlisted } = await supabase
        .from('owned_domains')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'owned')
        .eq('listed', false)

      for (const domain of unlisted || []) {
      try {
        const estimatedValue = domain.estimated_value || domain.current_value || domain.purchase_price * 3
        const daysOwned = Math.round((Date.now() - new Date(domain.purchase_date).getTime()) / 86400000)
        const strategy = calculateListingStrategy(domain.purchase_price, estimatedValue, domain.confidence_score ? domain.confidence_score * 100 : 50, daysOwned)
        const dnsResult = await setNameservers(domain.domain, strategy.nameservers)
        let gdListed = false
        try { const gdResult = await listForSale(domain.domain, strategy.buyNowPrice); gdListed = gdResult.success } catch {}
        await supabase.from('owned_domains').update({
          status: 'listed', listed: true, listed_price: strategy.buyNowPrice, floor_price: strategy.floorPrice,
          min_offer: strategy.minimumOffer, listed_at: new Date().toISOString(), marketplace: 'afternic',
          listing_strategy: { primary: 'afternic', dns_set: dnsResult.success, godaddy_listed: gdListed, fast_transfer: strategy.fastTransfer, buy_now: strategy.buyNowPrice, floor: strategy.floorPrice, min_offer: strategy.minimumOffer },
          updated_at: new Date().toISOString(),
        }).eq('id', domain.id)
        await supabase.from('bot_logs').insert({ user_id: userId, event_type: 'info', message: `Listed ${domain.domain}: Buy Now $${strategy.buyNowPrice}, Floor $${strategy.floorPrice} → Afternic${gdListed ? ' + GoDaddy' : ''} (DNS: ${dnsResult.success ? 'OK' : 'FAIL'})`, domain: domain.domain, details: strategy })
        listed++
      } catch (e) { await supabase.from('bot_logs').insert({ user_id: userId, event_type: 'warning', message: `Listing failed for ${domain.domain}: ${(e as Error).message}`, domain: domain.domain }) }
      }
    }

    // ================================================================
    // STEP 2: Set up parking for domains not yet parked
    // ================================================================
    if (settings?.parking_enabled !== false) {
      const bodisApiKey = env('BODIS_API_KEY')
      if (bodisApiKey) {
        const { data: unparked } = await supabase
          .from('owned_domains')
          .select('*')
          .eq('user_id', userId)
          .in('status', ['owned', 'listed'])
          .eq('parking_active', false)

        for (const domain of unparked || []) {
          try {
            const parkResult = await fetch('https://api.bodis.com/v1/domains', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${bodisApiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ domain: domain.domain, optimize: true }),
            })

            if (parkResult.ok) {
              // Set DNS to Bodis nameservers so ads actually serve
              const dnsResult = await setNameservers(domain.domain, ['ns1.bodis.com', 'ns2.bodis.com'])
              await supabase.from('owned_domains').update({
                parking_active: true, parking_provider: 'bodis',
                updated_at: new Date().toISOString(),
              }).eq('id', domain.id)
              if (!dnsResult.success) {
                await supabase.from('bot_logs').insert({
                  user_id: userId, event_type: 'warning',
                  message: `Bodis registered but DNS change failed for ${domain.domain}: ${dnsResult.message}`,
                  domain: domain.domain,
                })
              }

              await supabase.from('bot_logs').insert({
                user_id: userId, event_type: 'info',
                message: `Parked ${domain.domain} on Bodis for ad revenue`,
                domain: domain.domain,
              })
              parked++
            }
          } catch (e) {
            // Parking failure is non-critical, continue
          }
        }
      } else {
        await supabase.from('bot_logs').insert({
          user_id: userId,
          event_type: 'warning',
          message: 'SKIPPED parking — BODIS_API_KEY not configured',
        })
      }
    }

    // ================================================================
    // STEP 3: Redirect high-backlink domains for SEO value
    // ================================================================
    if (settings?.redirect_enabled && settings?.redirect_target_url) {
      const minBL = settings.redirect_min_backlinks || 50
      const { data: redirectCandidates } = await supabase
        .from('owned_domains')
        .select('*')
        .eq('user_id', userId)
        .in('status', ['owned', 'listed'])
        .is('redirect_target', null)

      for (const domain of redirectCandidates || []) {
        // Check if domain had enough backlinks when scored
        // (backlink data stored in metadata if available)
        const metadata = domain.metadata || {}
        const backlinks = metadata.referringDomains || metadata.backlinks || 0
        if (backlinks >= minBL) {
          // Note: actual DNS redirect requires domain registrar API
          // For now, just track the intent in database
          await supabase.from('owned_domains').update({
            redirect_target: settings.redirect_target_url,
            updated_at: new Date().toISOString(),
          }).eq('id', domain.id)

          await supabase.from('bot_logs').insert({
            user_id: userId, event_type: 'info',
            message: `Marked ${domain.domain} for SEO redirect to ${settings.redirect_target_url} (${backlinks} backlinks)`,
            domain: domain.domain,
          })
          redirected++
        }
      }
    }

    // ================================================================
    // STEP 4: Progressive Repricing (30/60/90/120 day schedule)
    // ================================================================
    const { data: listedDomains } = await supabase.from('owned_domains').select('*').eq('user_id', userId).eq('status', 'listed')
    for (const domain of listedDomains || []) {
      const listedAt = new Date(domain.listed_at || domain.updated_at).getTime()
      const daysListed = Math.round((Date.now() - listedAt) / 86400000)
      const currentPrice = domain.listed_price || domain.current_value
      const lastRepriceAt = domain.price_reduced_at ? new Date(domain.price_reduced_at).getTime() : 0
      const daysSinceReprice = lastRepriceAt ? Math.round((Date.now() - lastRepriceAt) / 86400000) : daysListed
      const floorPrice = domain.floor_price || Math.round((domain.purchase_price * 2) / 0.85)
      let newPrice: number | null = null, reduction = ''
      if (daysListed >= 180 && daysSinceReprice >= 30) {
        await supabase.from('owned_domains').update({ metadata: { ...(domain.metadata || {}), drop_recommended: true, drop_reason: 'Listed 180+ days' } }).eq('id', domain.id)
        continue
      } else if (daysListed >= 120 && daysSinceReprice >= 30) { newPrice = Math.round(currentPrice * 0.75); reduction = '-25% (120 days)' }
      else if (daysListed >= 90 && daysSinceReprice >= 30) { newPrice = Math.round(currentPrice * 0.80); reduction = '-20% (90 days)' }
      else if (daysListed >= 60 && daysSinceReprice >= 30) { newPrice = Math.round(currentPrice * 0.85); reduction = '-15% (60 days)' }
      else if (daysListed >= 30 && !domain.price_reduced_at) { newPrice = Math.round(currentPrice * 0.85); reduction = '-15% (30 days, first cut)' }
      if (newPrice !== null) {
        if (newPrice < floorPrice) { newPrice = floorPrice; reduction += ` (floored at $${floorPrice})` }
        if (newPrice < currentPrice) {
          await supabase.from('owned_domains').update({ listed_price: newPrice, current_value: newPrice, price_reduced_at: new Date().toISOString(), updated_at: new Date().toISOString(), metadata: { ...(domain.metadata || {}), reprice_history: [...((domain.metadata?.reprice_history) || []), { date: new Date().toISOString(), from: currentPrice, to: newPrice, reason: reduction, days_listed: daysListed }] } }).eq('id', domain.id)
          await supabase.from('bot_logs').insert({ user_id: userId, event_type: 'info', message: `Repriced ${domain.domain}: $${currentPrice} → $${newPrice} (${reduction}, floor $${floorPrice})`, domain: domain.domain })
          repriced++
        }
      }
    }

    // ================================================================
    // STEP 5: Detect completed sales
    // ================================================================
    let sold = 0
    let totalRevenue = 0
    try {
      const completedSales = await getCompletedSales()
      for (const sale of completedSales) {
        const { data: ownedDomain } = await supabase.from('owned_domains').select('*').eq('user_id', userId).eq('domain', sale.domain).in('status', ['owned', 'listed']).single()
        if (!ownedDomain) continue
        const profit = sale.salePrice - ownedDomain.purchase_price
        const roi = ownedDomain.purchase_price > 0 ? Math.round((profit / ownedDomain.purchase_price) * 100) : 0
        const daysHeld = Math.round((Date.now() - new Date(ownedDomain.purchase_date).getTime()) / 86400000)

        await supabase.from('owned_domains').update({ status: 'sold', sold: true, sale_price: sale.salePrice, profit, roi_percent: roi, days_to_sale: daysHeld, updated_at: new Date().toISOString() }).eq('id', ownedDomain.id)
        await supabase.from('transactions').insert({ user_id: userId, type: 'sell', domain: sale.domain, amount: sale.salePrice, net_amount: sale.salePrice, date: sale.saleDate, strategy_id: ownedDomain.strategy_id || 'autonomous', status: 'completed', registrar: 'GoDaddy', marketplace: 'GoDaddy Aftermarket', metadata: { purchase_price: ownedDomain.purchase_price, profit, roi_percent: roi, days_held: daysHeld } })
        await supabase.from('domain_events').insert({ user_id: userId, domain: sale.domain, event_type: 'sale_completed', event_data: { sale_price: sale.salePrice, purchase_price: ownedDomain.purchase_price, profit, roi_percent: roi, days_held: daysHeld, buyer: sale.buyer } })
        await supabase.from('flip_outcomes').upsert({ user_id: userId, domain: sale.domain, tld: ownedDomain.tld, purchase_price: ownedDomain.purchase_price, sell_price: sale.salePrice, purchase_date: ownedDomain.purchase_date, sell_date: sale.saleDate, days_to_sell: daysHeld, score_at_purchase: ownedDomain.metadata?.score || null, score_breakdown_at_purchase: ownedDomain.metadata?.score_breakdown || null, status: 'sold' }, { onConflict: 'user_id,domain' } as any)
        await supabase.from('bot_logs').insert({ user_id: userId, event_type: 'info', message: `SOLD: ${sale.domain} for $${sale.salePrice} (bought $${ownedDomain.purchase_price}, profit $${profit}, ROI ${roi}%, ${daysHeld} days)`, domain: sale.domain, details: { salePrice: sale.salePrice, purchasePrice: ownedDomain.purchase_price, profit, roi, daysHeld } })
        sold++; totalRevenue += sale.salePrice
      }
    } catch (e) { await supabase.from('bot_logs').insert({ user_id: userId, event_type: 'warning', message: `Sale detection error: ${(e as Error).message}` }) }

    // ================================================================
    // STEP 6: Handle incoming offers (auto-negotiation)
    // ================================================================
    let offersAccepted = 0, offersCountered = 0, offersRejected = 0
    try {
      const pendingOffers = await getPendingOffers()
      for (const offer of pendingOffers) {
        const { data: od } = await supabase.from('owned_domains').select('*').eq('user_id', userId).eq('domain', offer.domain).in('status', ['owned', 'listed']).single()
        if (!od) continue
        // Try AI negotiation first
        const aiDecision = await aiNegotiateOffer(offer.domain, od.purchase_price, od.listed_price || od.current_value || 0, od.floor_price || od.purchase_price * 2, offer.offerAmount, Math.round((Date.now() - new Date(od.listed_at || od.created_at).getTime()) / 86400000))
        if (aiDecision && aiDecision.confidence >= 60) {
          if (aiDecision.action === 'accept') { const result = await acceptOffer(offer.offerId); if (result.success) { await supabase.from('bot_logs').insert({ user_id: userId, event_type: 'info', message: `AI accepted offer on ${offer.domain}: $${offer.offerAmount} — ${aiDecision.reasoning}`, domain: offer.domain, details: {} }); await notify(webhookUrl, 'AI Accepted Offer', { Domain: offer.domain, Offer: `$${offer.offerAmount}` }, 'critical'); offersAccepted++ }; continue }
          if (aiDecision.action === 'counter' && aiDecision.counterAmount) { const result = await counterOffer(offer.offerId, aiDecision.counterAmount); if (result.success) { await supabase.from('bot_logs').insert({ user_id: userId, event_type: 'info', message: `AI countered on ${offer.domain}: $${offer.offerAmount} → $${aiDecision.counterAmount} — ${aiDecision.reasoning}`, domain: offer.domain, details: {} }); offersCountered++ }; continue }
          if (aiDecision.action === 'reject' || aiDecision.action === 'ignore') { await supabase.from('bot_logs').insert({ user_id: userId, event_type: 'info', message: `AI ${aiDecision.action}ed offer on ${offer.domain}: $${offer.offerAmount} — ${aiDecision.reasoning}`, domain: offer.domain, details: {} }); offersRejected++; continue }
        }
        // Fall through to rule-based logic if AI unavailable or low confidence
        const profitMultiple = od.purchase_price > 0 ? offer.offerAmount / od.purchase_price : 0
        const listingPrice = od.listed_price || od.current_value || 0

        if (profitMultiple >= 2.0) {
          const result = await acceptOffer(offer.offerId)
          if (result.success) {
            await supabase.from('bot_logs').insert({ user_id: userId, event_type: 'info', message: `AUTO-ACCEPTED offer: ${offer.domain} — $${offer.offerAmount} (bought $${od.purchase_price}, ${profitMultiple.toFixed(1)}x)`, domain: offer.domain, details: { offerAmount: offer.offerAmount, purchasePrice: od.purchase_price, profitMultiple } })
            await notify(webhookUrl, 'Offer Accepted!', { Domain: offer.domain, Offer: `$${offer.offerAmount}`, 'Bought for': `$${od.purchase_price}`, Profit: `$${offer.offerAmount - od.purchase_price}` }, 'critical')
            offersAccepted++
          }
        } else if (profitMultiple >= 1.5) {
          const counterAmount = Math.round(listingPrice * 0.8)
          const result = await counterOffer(offer.offerId, counterAmount)
          if (result.success) {
            await supabase.from('bot_logs').insert({ user_id: userId, event_type: 'info', message: `AUTO-COUNTERED: ${offer.domain} — offer $${offer.offerAmount}, counter $${counterAmount}`, domain: offer.domain, details: {} })
            offersCountered++
          }
        } else {
          await supabase.from('bot_logs').insert({ user_id: userId, event_type: 'info', message: `Offer too low: ${offer.domain} — $${offer.offerAmount} (need >= $${Math.round(od.purchase_price * 1.5)})`, domain: offer.domain, details: {} })
          offersRejected++
        }
      }
    } catch (e) { await supabase.from('bot_logs').insert({ user_id: userId, event_type: 'warning', message: `Offer handling error: ${(e as Error).message}` }) }

    // ================================================================
    // NOTIFY
    // ================================================================
    const totalActions = listed + parked + redirected + repriced + sold + offersAccepted + offersCountered
    if (totalActions > 0) {
      await notify(webhookUrl, 'Portfolio Manager', {
        'New listings': listed, 'Domains parked': parked, 'SEO redirects': redirected,
        'Price reductions': repriced, 'Domains SOLD': sold, 'Revenue': sold > 0 ? `$${totalRevenue}` : '$0',
        'Offers accepted': offersAccepted, 'Offers countered': offersCountered,
      }, sold > 0 ? 'critical' : 'info')
    }
    if (sold > 0) await notify(webhookUrl, `${sold} Domain${sold > 1 ? 's' : ''} Sold!`, { 'Total revenue': `$${totalRevenue}`, Domains: sold }, 'critical')
    return res.status(200).json({ listed, parked, redirected, repriced, sold, totalRevenue, offersAccepted, offersCountered, offersRejected })
  } catch (error: any) {
    await notify(webhookUrl, 'Portfolio Manager Error', { error: error.message }, 'critical')
    return res.status(500).json({ error: error.message })
  }
}
