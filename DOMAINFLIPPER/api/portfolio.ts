/**
 * Vercel Serverless Function — Portfolio & Dashboard Data
 * 
 * GET: Read portfolio, scan results, bot logs, and stats
 * Query params:
 *   ?type=portfolio    - Owned domains
 *   ?type=stats        - Portfolio statistics
 *   ?type=scans        - Recent scan results
 *   ?type=logs         - Bot activity logs
 *   ?type=transactions - Transaction history
 * 
 * Authentication: X-Admin-Key header
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
  if (!expectedKey) return false
  const adminKey = req.headers['x-admin-key'] as string
  if (adminKey === expectedKey) return true
  const authHeader = req.headers.authorization
  if (authHeader === `Bearer ${expectedKey}`) return true
  return false
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Admin-Key')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  if (!verifyAuth(req)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const supabase = getSupabaseAdmin()
  if (!supabase) {
    return res.status(500).json({ error: 'Database not configured' })
  }

  const userId = getEnv('BOT_USER_ID')
  if (!userId) {
    return res.status(500).json({ error: 'BOT_USER_ID not configured' })
  }

  const type = (req.query.type as string) || 'portfolio'
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 500)

  try {
    switch (type) {
      case 'portfolio': {
        const offset = Math.max(0, parseInt(req.query.offset as string) || 0)

        const { count: totalCount } = await supabase
          .from('owned_domains')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)

        const { data, error } = await supabase
          .from('owned_domains')
          .select('*')
          .eq('user_id', userId)
          .order('purchase_date', { ascending: false })
          .range(offset, offset + limit - 1)

        if (error) return res.status(500).json({ error: error.message })
        return res.status(200).json({
          domains: data || [],
          count: data?.length || 0,
          total: totalCount || 0,
          offset, limit,
          hasMore: (offset + limit) < (totalCount || 0),
        })
      }

      case 'stats': {
        // Get real portfolio stats from database
        const { data: domains, error: domainsError } = await supabase
          .from('owned_domains')
          .select('purchase_price, current_value, sale_price, sold, status')
          .eq('user_id', userId)

        if (domainsError) return res.status(500).json({ error: domainsError.message })

        const ownedDomains = domains || []
        const totalSpent = ownedDomains.reduce((sum: number, d: any) => sum + (d.purchase_price || 0), 0)
        const totalCurrentValue = ownedDomains.filter((d: any) => !d.sold).reduce((sum: number, d: any) => sum + (d.current_value || 0), 0)
        const totalRevenue = ownedDomains.filter((d: any) => d.sold).reduce((sum: number, d: any) => sum + (d.sale_price || 0), 0)
        const activeCount = ownedDomains.filter((d: any) => !d.sold).length
        const soldCount = ownedDomains.filter((d: any) => d.sold).length

        // Get bot state
        const { data: botState } = await supabase
          .from('bot_state')
          .select('*')
          .eq('user_id', userId)
          .single()

        return res.status(200).json({
          portfolio: {
            totalSpent: Math.round(totalSpent * 100) / 100,
            totalCurrentValue: Math.round(totalCurrentValue * 100) / 100,
            totalRevenue: Math.round(totalRevenue * 100) / 100,
            totalProfit: Math.round((totalRevenue - ownedDomains.filter((d: any) => d.sold).reduce((s: number, d: any) => s + (d.purchase_price || 0), 0)) * 100) / 100,
            unrealizedValue: Math.round(totalCurrentValue * 100) / 100,
            activeCount,
            soldCount,
            totalCount: ownedDomains.length,
          },
          bot: botState || {
            enabled: false,
            dry_run: true,
            total_scans: 0,
            total_bids: 0,
            total_spend: 0,
          },
        })
      }

      case 'scans': {
        const { data, error } = await supabase
          .from('scan_results')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(limit)

        if (error) return res.status(500).json({ error: error.message })
        return res.status(200).json({ results: data || [], count: data?.length || 0 })
      }

      case 'logs': {
        const { data, error } = await supabase
          .from('bot_logs')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(limit)

        if (error) return res.status(500).json({ error: error.message })
        return res.status(200).json({ logs: data || [], count: data?.length || 0 })
      }

      case 'transactions': {
        const { data, error } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', userId)
          .order('date', { ascending: false })
          .limit(limit)

        if (error) return res.status(500).json({ error: error.message })
        return res.status(200).json({ transactions: data || [], count: data?.length || 0 })
      }

      case 'review': {
        const { data, error } = await supabase
          .from('review_queue')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(limit)

        if (error) return res.status(500).json({ error: error.message })
        return res.status(200).json({ items: data || [], count: data?.length || 0 })
      }

      case 'offers': {
        const { data, error } = await supabase
          .from('domain_offers')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(limit)

        if (error) return res.status(500).json({ error: error.message })
        return res.status(200).json({ offers: data || [], count: data?.length || 0 })
      }

      case 'buyer_leads': {
        const { data, error } = await supabase
          .from('buyer_leads')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(limit)

        if (error) return res.status(500).json({ error: error.message })
        return res.status(200).json({ leads: data || [], count: data?.length || 0 })
      }

      default:
        return res.status(400).json({
          error: 'Invalid type',
          validTypes: ['portfolio', 'stats', 'scans', 'logs', 'transactions', 'review', 'offers', 'buyer_leads'],
        })
    }

  } catch (error: any) {
    console.error('Portfolio error:', error)
    return res.status(500).json({ error: error.message })
  }
}
