/**
 * Vercel Serverless Function — Pipeline Settings
 * 
 * GET: Read current pipeline settings
 * PUT: Update pipeline settings with validation
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

// Validate settings server-side
function validateSettings(settings: any): { valid: boolean; error?: string } {
  if (settings.max_spend_per_day !== undefined) {
    if (settings.max_spend_per_day < 1 || settings.max_spend_per_day > 10000) {
      return { valid: false, error: 'max_spend_per_day must be between $1 and $10,000' }
    }
  }
  if (settings.max_spend_per_domain !== undefined) {
    if (settings.max_spend_per_domain < 1 || settings.max_spend_per_domain > 1000) {
      return { valid: false, error: 'max_spend_per_domain must be between $1 and $1,000' }
    }
  }
  if (settings.min_margin_multiplier !== undefined) {
    if (settings.min_margin_multiplier < 1.5 || settings.min_margin_multiplier > 100) {
      return { valid: false, error: 'min_margin_multiplier must be between 1.5x and 100x' }
    }
  }
  if (settings.allowed_tlds !== undefined) {
    if (!Array.isArray(settings.allowed_tlds) || settings.allowed_tlds.length === 0) {
      return { valid: false, error: 'At least one TLD must be allowed' }
    }
  }
  return { valid: true }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Admin-Key')

  if (req.method === 'OPTIONS') return res.status(200).end()

  if (!verifyAuth(req)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const supabase = getSupabaseAdmin()
  if (!supabase) {
    return res.status(500).json({ error: 'Database not configured' })
  }

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('pipeline_settings')
        .select('*')
        .order('last_updated', { ascending: false })
        .limit(1)
        .single()

      if (error || !data) {
        // Return defaults
        return res.status(200).json({
          dry_run: true,
          registrar_provider: 'GoDaddy',
          marketplace_channels: ['Afternic', 'Dan'],
          max_spend_per_day: 200,
          max_spend_per_domain: 20,
          min_margin_multiplier: 3.0,
          allowed_tlds: ['.com', '.ai', '.io'],
          notification_webhook: null,
          message: 'Using default settings (no saved settings found)',
        })
      }

      return res.status(200).json(data)

    } else if (req.method === 'PUT') {
      const updates = req.body

      // Validate
      const validation = validateSettings(updates)
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error })
      }

      // Add metadata
      updates.last_updated = new Date().toISOString()
      updates.updated_by = 'api'

      // Upsert settings
      const { data: existing } = await supabase
        .from('pipeline_settings')
        .select('id')
        .order('last_updated', { ascending: false })
        .limit(1)
        .single()

      if (existing) {
        const { error } = await supabase
          .from('pipeline_settings')
          .update(updates)
          .eq('id', existing.id)

        if (error) return res.status(500).json({ error: error.message })
      } else {
        const { error } = await supabase
          .from('pipeline_settings')
          .insert(updates)

        if (error) return res.status(500).json({ error: error.message })
      }

      // Log the change
      const userId = getEnv('BOT_USER_ID')
      if (userId) {
        await supabase.from('bot_logs').insert({
          user_id: userId,
          event_type: 'settings_changed',
          message: `Pipeline settings updated: ${Object.keys(updates).filter(k => k !== 'last_updated' && k !== 'updated_by').join(', ')}`,
          details: updates,
        })
      }

      return res.status(200).json({ success: true, message: 'Settings updated' })
    }

    return res.status(405).json({ error: 'Method not allowed' })

  } catch (error: any) {
    console.error('Settings error:', error)
    return res.status(500).json({ error: error.message })
  }
}
