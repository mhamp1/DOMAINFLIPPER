/**
 * Vercel Serverless Function — JustDropped API Proxy
 * Bypasses CORS by making server-side requests to JustDropped
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  try {
    // Validate and sanitize query parameters
    const limitNum = Math.max(1, Math.min(1000, parseInt(limit as string || '100')))
    const tldParam = (tld as string || 'com').replace(/[^a-z]/g, '')

    const url = `https://justdropped.com/api/v1/domains?limit=${limitNum}&tld=${tldParam}`

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      return res.status(response.status).json({ 
        error: `JustDropped returned status ${response.status}`,
        status: response.status 
      })
    }

    const data = await response.json()
    return res.status(200).json(data)
  } catch (error: any) {
    console.error('JustDropped API error:', error)
    return res.status(500).json({ error: error.message })
  }
}
