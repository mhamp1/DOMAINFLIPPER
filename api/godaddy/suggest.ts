/**
 * Vercel Serverless Function — GoDaddy Domain Suggestions Proxy
 * Bypasses CORS by making server-side API calls
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

  const apiKey = process.env.VITE_GODADDY_KEY || process.env.GODADDY_API_KEY
  const apiSecret = process.env.VITE_GODADDY_SECRET || process.env.GODADDY_API_SECRET

  if (!apiKey || !apiSecret) {
    return res.status(500).json({ error: 'GoDaddy API not configured' })
  }

  try {
    // Validate and sanitize query parameters
    const queryParam = (query as string || 'tech').slice(0, 100).replace(/[^a-zA-Z0-9-]/g, '')
    const countryParam = (country as string || 'US').slice(0, 2).toUpperCase()
    const cityParam = (city as string || '').slice(0, 100).replace(/[^a-zA-Z\s]/g, '')
    const sourcesParam = (sources as string || 'CC_TLD,EXTENSION,KEYWORD_SPIN').replace(/[^A-Z_,]/g, '')
    const tldsParam = (tlds as string || 'com,net,org,io,ai').replace(/[^a-z,]/g, '')
    const waitMsNum = Math.max(0, Math.min(10000, parseInt(waitMs as string || '1000')))
    
    const params = new URLSearchParams({
      query: queryParam,
      country: countryParam,
      city: cityParam,
      sources: sourcesParam,
      tlds: tldsParam,
      waitMs: waitMsNum.toString(),
    })

    const url = `https://api.godaddy.com/v1/domains/suggest?${params.toString()}`

    const response = await fetch(url, {
      headers: {
        'Authorization': `sso-key ${apiKey}:${apiSecret}`,
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      const error = await response.text()
      return res.status(response.status).json({ error, status: response.status })
    }

    const data = await response.json()
    return res.status(200).json(data)
  } catch (error: any) {
    console.error('GoDaddy Suggest API error:', error)
    return res.status(500).json({ error: error.message })
  }
}
