/**
 * Health Check Endpoint — GET /api/health
 * Point an external uptime monitor (UptimeRobot, etc.) at this.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

function env(key: string): string { return process.env[key] || '' }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).end()
  const url = env('SUPABASE_URL') || env('VITE_SUPABASE_URL')
  const key = env('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) return res.status(503).json({ status: 'unhealthy', reason: 'Database not configured' })
  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
  const userId = env('BOT_USER_ID')
  if (!userId) return res.status(503).json({ status: 'unhealthy', reason: 'BOT_USER_ID not set' })

  try {
    const { data: botState } = await supabase.from('bot_state').select('enabled, dry_run, last_scan_at, last_error, cooldown_until, scans_today, spend_today').eq('user_id', userId).single()
    if (!botState) return res.status(503).json({ status: 'unhealthy', reason: 'No bot state record' })

    const lastScan = botState.last_scan_at ? new Date(botState.last_scan_at).getTime() : 0
    const minutesSinceLastScan = Math.round((Date.now() - lastScan) / 60000)
    const isStale = minutesSinceLastScan > 60

    let status = 'healthy', reason = 'All systems operational'
    if (!botState.enabled) { status = 'paused'; reason = 'Bot is disabled' }
    else if (botState.cooldown_until && new Date(botState.cooldown_until).getTime() > Date.now()) { status = 'cooldown'; reason = `Cooling down until ${botState.cooldown_until}` }
    else if (isStale && botState.enabled) { status = 'unhealthy'; reason = `No scan in ${minutesSinceLastScan} minutes` }
    else if (botState.last_error) { status = 'degraded'; reason = botState.last_error }

    return res.status(status === 'unhealthy' ? 503 : 200).json({ status, reason, enabled: botState.enabled, dry_run: botState.dry_run, last_scan_minutes_ago: minutesSinceLastScan, scans_today: botState.scans_today, spend_today: botState.spend_today, timestamp: new Date().toISOString() })
  } catch (error: any) { return res.status(503).json({ status: 'unhealthy', reason: error.message }) }
}
