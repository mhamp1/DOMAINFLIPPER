/**
 * Vercel Serverless Function — Dynadot Closeouts Proxy
 * Bypasses CORS by making server-side requests to Dynadot
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
    const pageNum = Math.max(1, Math.min(100, parseInt(page as string || '1')))
    const sortParam = (sort as string || 'price_asc').replace(/[^a-z_]/g, '')

    const url = `https://www.dynadot.com/market/closeout-domains?page=${pageNum}&sort=${sortParam}`

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Referer': 'https://www.dynadot.com/market/closeout-domains',
      },
    })

    if (!response.ok) {
      return res.status(response.status).json({ 
        error: `Dynadot returned status ${response.status}`,
        status: response.status 
      })
    }

    const html = await response.text()
    
    // Return the HTML for client-side parsing
    res.setHeader('Content-Type', 'text/html')
    return res.status(200).send(html)
  } catch (error: any) {
    console.error('Dynadot Closeouts API error:', error)
    return res.status(500).json({ error: error.message })
  }
}
