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
    const { 
      query = 'tech', 
      country = 'US', 
      city = '',
      sources = 'CC_TLD,EXTENSION,KEYWORD_SPIN',
      tlds = 'com,net,org,io,ai',
      waitMs = 1000
    } = req.query

    const params = new URLSearchParams({
      query: query as string,
      country: country as string,
      city: city as string,
      sources: sources as string,
      tlds: tlds as string,
      waitMs: waitMs.toString(),
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
