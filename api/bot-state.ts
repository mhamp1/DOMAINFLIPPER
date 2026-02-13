/**
 * Vercel Serverless Function — Bot State Management
 * 
 * GET: Read current bot state
 * POST: Update bot state (enable/disable, toggle dry_run)
 * 
 * Authentication: X-Admin-Key header or Supabase auth
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

function getEnv(key: string): string {
  return process.env[key] || ''
}

function getSupabaseAdmin() {
  const url = getEnv('SUPABASE_URL') || getEnv('VITE_SUPABASE_URL')
  const serviceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !serviceKey) return null
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
}

function verifyAuth(req: VercelRequest): boolean {
  const expectedKey = getEnv('ADMIN_API_KEY')
  if (!expectedKey) return false // No key configured = fail secure
  
  const adminKey = req.headers['x-admin-key'] as string
  if (adminKey === expectedKey) return true
  
  // Accept via Authorization header (must match actual key, not just any Bearer token)
  const authHeader = req.headers.authorization
  if (authHeader === `Bearer ${expectedKey}`) return true
  
  return false
}

async function getBotContext(supabase: ReturnType<typeof createClient>, userId: string) {
  const [{ data: botState }, { data: settings }] = await Promise.all([
    supabase.from('bot_state').select('*').eq('user_id', userId).single(),
    supabase.from('pipeline_settings').select('*').order('last_updated', { ascending: false }).limit(1).single(),
  ])

  const dryRun = settings?.dry_run ?? botState?.dry_run ?? true
  const maxSpendDay = settings?.max_spend_per_day ?? 200

  return { botState, settings, dryRun, maxSpendDay }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Admin-Key')

  if (req.method === 'OPTIONS') return res.status(200).end()

  if (!verifyAuth(req)) {
    return res.status(401).json({ error: 'Unauthorized. Set X-Admin-Key header.' })
  }

  const supabase = getSupabaseAdmin()
  if (!supabase) {
    return res.status(500).json({ error: 'Database not configured' })
  }

  const userId = getEnv('BOT_USER_ID')
  if (!userId) {
    return res.status(500).json({ error: 'BOT_USER_ID not configured' })
  }

  try {
    if (req.method === 'GET') {
      // Get current bot state
      const { data: botState, error } = await supabase
        .from('bot_state')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error || !botState) {
        return res.status(200).json({
          enabled: false,
          dry_run: true,
          last_scan_at: null,
          scans_today: 0,
          bids_today: 0,
          spend_today: 0,
          domains_found_today: 0,
          total_scans: 0,
          total_bids: 0,
          total_spend: 0,
          total_domains_acquired: 0,
          message: 'No bot state found. Bot has not been initialized.',
        })
      }

      return res.status(200).json(botState)

    } else if (req.method === 'POST') {
      const { action, reviewId, ...updates } = req.body || {}

      if (action === 'enable') {
        // Enable the bot
        const { error } = await supabase.from('bot_state').upsert({
          user_id: userId,
          enabled: true,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })

        if (error) return res.status(500).json({ error: error.message })

        // Log the action
        await supabase.from('bot_logs').insert({
          user_id: userId,
          event_type: 'bot_enabled',
          message: 'Bot enabled via API',
        })

        return res.status(200).json({ success: true, message: 'Bot enabled' })

      } else if (action === 'disable') {
        const { error } = await supabase.from('bot_state').update({
          enabled: false,
          updated_at: new Date().toISOString(),
        }).eq('user_id', userId)

        if (error) return res.status(500).json({ error: error.message })

        await supabase.from('bot_logs').insert({
          user_id: userId,
          event_type: 'bot_disabled',
          message: 'Bot disabled via API',
        })

        return res.status(200).json({ success: true, message: 'Bot disabled' })

      } else if (action === 'toggle_dry_run') {
        const { data: current } = await supabase
          .from('bot_state')
          .select('dry_run')
          .eq('user_id', userId)
          .single()

        const newDryRun = !(current?.dry_run ?? true)

        const { error } = await supabase.from('bot_state').update({
          dry_run: newDryRun,
          updated_at: new Date().toISOString(),
        }).eq('user_id', userId)

        if (error) return res.status(500).json({ error: error.message })

        await supabase.from('bot_logs').insert({
          user_id: userId,
          event_type: newDryRun ? 'dry_run_enabled' : 'dry_run_disabled',
          message: `DRY_RUN ${newDryRun ? 'enabled' : 'disabled'} via API`,
        })

        return res.status(200).json({ 
          success: true, 
          dry_run: newDryRun,
          message: `DRY_RUN ${newDryRun ? 'enabled (safe mode)' : 'DISABLED (real bids will be placed!)'}`,
        })

      } else if (action === 'reset_daily') {
        const { error } = await supabase.from('bot_state').update({
          scans_today: 0,
          bids_today: 0,
          spend_today: 0,
          domains_found_today: 0,
          updated_at: new Date().toISOString(),
        }).eq('user_id', userId)

        if (error) return res.status(500).json({ error: error.message })

        await supabase.from('bot_logs').insert({
          user_id: userId,
          event_type: 'daily_reset',
          message: 'Daily counters reset',
        })

        return res.status(200).json({ success: true, message: 'Daily counters reset' })

      } else if (action === 'approve_review') {
        if (!reviewId) {
          return res.status(400).json({ error: 'reviewId is required for approve_review' })
        }

        const { botState, settings, dryRun, maxSpendDay } = await getBotContext(supabase, userId)

        const { data: item, error: reviewError } = await supabase
          .from('review_queue')
          .select('*')
          .eq('id', reviewId)
          .eq('user_id', userId)
          .single()

        if (reviewError || !item) {
          return res.status(404).json({ error: 'Review item not found' })
        }

        if (item.status !== 'pending_review') {
          return res.status(400).json({ error: `Review item is already ${item.status}` })
        }

        const recommendedBid = Number(item.recommended_bid || 0)
        const remainingBudget = maxSpendDay - (botState?.spend_today || 0)

        if (recommendedBid <= 0) {
          await supabase.from('review_queue').update({
            status: 'rejected',
            reviewed_at: new Date().toISOString(),
            reviewer_notes: 'Rejected: invalid recommended bid amount',
          }).eq('id', item.id)

          await supabase.from('bot_logs').insert({
            user_id: userId,
            event_type: 'warning',
            message: `Review approve skipped (invalid bid) for ${item.domain}`,
            domain: item.domain,
          })

          return res.status(400).json({ error: 'Invalid recommended bid amount' })
        }

        if (recommendedBid > remainingBudget) {
          await supabase.from('review_queue').update({
            status: 'rejected',
            reviewed_at: new Date().toISOString(),
            reviewer_notes: `Rejected: recommended bid $${recommendedBid} exceeds remaining daily budget $${remainingBudget}`,
          }).eq('id', item.id)

          await supabase.from('bot_logs').insert({
            user_id: userId,
            event_type: 'spend_limit_reached',
            message: `Review approve skipped for ${item.domain}: bid $${recommendedBid} exceeds remaining daily budget $${remainingBudget}`,
            domain: item.domain,
          })

          return res.status(200).json({
            success: false,
            skipped: true,
            reason: 'Daily budget limit would be exceeded',
          })
        }

        if (dryRun) {
          await supabase.from('review_queue').update({
            status: 'approved',
            reviewed_at: new Date().toISOString(),
            reviewer_notes: 'Approved in DRY_RUN — bid simulated only',
          }).eq('id', item.id)

          await supabase.from('bot_logs').insert({
            user_id: userId,
            event_type: 'info',
            message: `[DRY_RUN] WOULD BID $${recommendedBid} (review approve; score ${item.total_score}, est $${item.estimated_value})`,
            domain: item.domain,
            details: {
              source: item.source,
              context: 'review_approve',
              recommended_bid: recommendedBid,
              max_proxy_bid: item.max_proxy_bid,
              risk_level: item.risk_level,
            },
          })

          return res.status(200).json({
            success: true,
            dry_run: true,
            message: 'Approved in DRY_RUN mode — bid simulated only',
          })
        }

        // LIVE MODE: place real bid (GoDaddy auctions only)
        if (!item.auction_id || item.source !== 'godaddy_auction') {
          await supabase.from('bot_logs').insert({
            user_id: userId,
            event_type: 'bid_error',
            message: `Review approve failed for ${item.domain}: only GoDaddy auctions are supported for live bids`,
            domain: item.domain,
          })

          return res.status(400).json({ error: 'Only GoDaddy auctions are supported for live bids from review' })
        }

        // Dynamic import to avoid ESM module resolution issues at cold start
        const { placeGoDaddyBid } = await import('./lib/sources/godaddy.js')
        const bidResult = await placeGoDaddyBid(item.auction_id, recommendedBid)

        if (!bidResult.success) {
          await supabase.from('review_queue').update({
            status: 'rejected',
            reviewed_at: new Date().toISOString(),
            reviewer_notes: `Bid failed: ${bidResult.message}`,
          }).eq('id', item.id)

          await supabase.from('bot_logs').insert({
            user_id: userId,
            event_type: 'bid_error',
            message: `Review approve bid failed for ${item.domain}: ${bidResult.message}`,
            domain: item.domain,
          })

          return res.status(500).json({ error: bidResult.message })
        }

        // Update review queue + bot_state + transactions on success
        await supabase.from('review_queue').update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewer_notes: `Bid placed via review (bidId=${bidResult.bidId || 'n/a'})`,
        }).eq('id', item.id)

        const bidSpend = recommendedBid

        await supabase.from('bot_state').update({
          last_bid_at: new Date().toISOString(),
          bids_today: (botState?.bids_today || 0) + 1,
          spend_today: (botState?.spend_today || 0) + bidSpend,
          total_bids: (botState?.total_bids || 0) + 1,
          total_spend: (botState?.total_spend || 0) + bidSpend,
        }).eq('user_id', userId)

        await supabase.from('transactions').insert({
          user_id: userId,
          type: 'bid',
          domain: item.domain,
          amount: bidSpend,
          date: new Date().toISOString(),
          strategy_id: 'review_approve',
          status: 'pending',
          registrar: 'GoDaddy',
          metadata: {
            auction_id: item.auction_id,
            score: item.total_score,
            estimated_value: item.estimated_value,
            confidence: item.confidence,
            risk_level: item.risk_level,
          },
        })

        await supabase.from('bot_logs').insert({
          user_id: userId,
          event_type: 'bid_placed',
          message: `Review approve placed bid $${bidSpend} on ${item.domain} (score ${item.total_score}, est $${item.estimated_value})`,
          domain: item.domain,
        })

        return res.status(200).json({
          success: true,
          dry_run: false,
          message: 'Review approved and live bid placed',
        })

      } else if (action === 'set_phase_lock') {
        const { phase_locked } = req.body || {}
        const { error } = await supabase.from('bot_state').update({
          phase_locked: !!phase_locked,
          updated_at: new Date().toISOString(),
        }).eq('user_id', userId)
        if (error) return res.status(500).json({ error: error.message })
        await supabase.from('bot_logs').insert({
          user_id: userId,
          event_type: 'info',
          message: `Phase lock ${phase_locked ? 'enabled' : 'disabled'} via dashboard`,
        })
        return res.status(200).json({ success: true, phase_locked: !!phase_locked })

      } else if (action === 'set_phase') {
        const { operating_phase } = req.body || {}
        if (!['observe', 'cautious', 'scale'].includes(operating_phase)) {
          return res.status(400).json({ error: 'Invalid phase. Must be observe, cautious, or scale.' })
        }
        const { error } = await supabase.from('bot_state').update({
          operating_phase,
          phase_changed_at: new Date().toISOString(),
          phase_change_reason: 'Manual override via dashboard',
          phase_locked: true,
          updated_at: new Date().toISOString(),
        }).eq('user_id', userId)
        if (error) return res.status(500).json({ error: error.message })
        await supabase.from('bot_logs').insert({
          user_id: userId,
          event_type: 'info',
          message: `Phase manually set to ${operating_phase} via dashboard`,
        })
        return res.status(200).json({ success: true, operating_phase })

      } else if (action === 'reject_review') {
        if (!reviewId) {
          return res.status(400).json({ error: 'reviewId is required for reject_review' })
        }

        const { data: item, error: reviewError } = await supabase
          .from('review_queue')
          .select('id, domain, status')
          .eq('id', reviewId)
          .eq('user_id', userId)
          .single()

        if (reviewError || !item) {
          return res.status(404).json({ error: 'Review item not found' })
        }

        await supabase.from('review_queue').update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewer_notes: 'Rejected via dashboard',
        }).eq('id', item.id)

        await supabase.from('bot_logs').insert({
          user_id: userId,
          event_type: 'info',
          message: `Review rejected for ${item.domain}`,
          domain: item.domain,
        })

        return res.status(200).json({ success: true, message: 'Review rejected' })

      } else {
        return res.status(400).json({ 
          error: 'Invalid action',
          validActions: ['enable', 'disable', 'toggle_dry_run', 'reset_daily', 'approve_review', 'reject_review'],
        })
      }
    }

    return res.status(405).json({ error: 'Method not allowed' })

  } catch (error: any) {
    console.error('Bot state error:', error)
    return res.status(500).json({ error: error.message })
  }
}
