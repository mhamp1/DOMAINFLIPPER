/**
 * useApi — Shared hook for calling server-side /api/ endpoints.
 * All dashboard data comes through here. No mock data. No localStorage for bot data.
 */

import { useState, useEffect, useCallback } from 'react'

const ADMIN_KEY = import.meta.env.VITE_ADMIN_API_KEY || ''

interface UseApiResult<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useApi<T>(endpoint: string, options?: {
  autoFetch?: boolean
  pollInterval?: number // ms, 0 = no polling
}): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(endpoint, {
        headers: {
          'X-Admin-Key': ADMIN_KEY,
          'Accept': 'application/json',
        },
      })
      const json = await res.json()
      if (!res.ok || json.error) {
        setError(json.error || `HTTP ${res.status}`)
        setData(null)
      } else {
        setData(json)
        setError(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [endpoint])

  useEffect(() => {
    if (options?.autoFetch === false) return
    fetchData()
  }, [fetchData, options?.autoFetch])

  // Polling support
  useEffect(() => {
    const interval = options?.pollInterval
    if (!interval || interval <= 0) return
    const timer = setInterval(fetchData, interval)
    return () => clearInterval(timer)
  }, [fetchData, options?.pollInterval])

  return { data, loading, error, refetch: fetchData }
}

/**
 * POST/PUT helper for API mutations (bot control, settings update).
 */
export async function apiMutate<T = unknown>(
  endpoint: string,
  method: 'POST' | 'PUT',
  body: Record<string, unknown>,
): Promise<{ data: T | null; error: string | null }> {
  try {
    const res = await fetch(endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Key': ADMIN_KEY,
        'Accept': 'application/json',
      },
      body: JSON.stringify(body),
    })
    const json = await res.json()
    if (!res.ok || json.error) {
      return { data: null, error: json.error || `HTTP ${res.status}` }
    }
    return { data: json, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Network error' }
  }
}

// ==================== TYPE DEFINITIONS ====================

export interface BotState {
  enabled: boolean
  dry_run: boolean
  last_scan_at: string | null
  last_bid_at: string | null
  last_error: string | null
  scans_today: number
  bids_today: number
  spend_today: number
  domains_found_today: number
  total_scans: number
  total_bids: number
  total_spend: number
  total_domains_acquired: number
  // Autonomous phase system
  operating_phase?: 'observe' | 'cautious' | 'scale'
  phase_changed_at?: string | null
  phase_change_reason?: string | null
  phase_locked?: boolean
}

export interface PortfolioStats {
  portfolio: {
    totalSpent: number
    totalCurrentValue: number
    totalRevenue: number
    totalProfit: number       // Realized profit only (sold domains)
    unrealizedValue: number   // Estimated value of unsold domains
    activeCount: number
    soldCount: number
    totalCount: number
  }
  bot: BotState
}

export interface ScanResult {
  id: string
  domain: string
  tld: string
  source: string
  current_price: number
  estimated_value: number
  roi_multiple: number
  total_score: number
  length_score: number
  tld_score: number
  keyword_score: number
  brandability_score: number
  trend_score: number
  decision: 'bid' | 'skip' | 'review' | 'dry_run_would_bid'
  decision_reason: string
  reasoning: string | null
  bid_amount: number | null
  bid_result: string | null
  created_at: string
}

export interface ReviewQueueItem {
  id: string
  domain: string
  source: string
  total_score: number
  score_breakdown: Record<string, unknown>
  estimated_value: number
  confidence: number
  current_price: number
  recommended_bid: number
  max_proxy_bid: number | null
  auction_id: string | null
  auction_end_time: string | null
  reason: string
  status: 'pending_review' | 'approved' | 'rejected' | 'expired'
  created_at: string
}

export interface BotLog {
  id: string
  event_type: string
  message: string
  domain: string | null
  details: Record<string, unknown> | null
  created_at: string
}

export interface PipelineSettings {
  dry_run: boolean
  registrar_provider: string
  marketplace_channels: string[]
  max_spend_per_day: number
  max_spend_per_domain: number
  min_margin_multiplier: number
  allowed_tlds: string[]
  notification_webhook: string | null
}

export interface OwnedDomain {
  id: string
  domain: string
  tld: string
  purchase_price: number
  purchase_date: string
  estimated_value: number
  current_value: number
  status: string
  listed: boolean
  sold: boolean
  sale_price: number | null
  registrar: string
}
