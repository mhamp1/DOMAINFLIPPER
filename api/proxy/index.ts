/**
 * Vercel Serverless Function — Generic API Proxy
 * Proxies any API request to bypass CORS
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Target-URL')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  try {
    const targetUrl = req.headers['x-target-url'] as string || req.query.url as string

    if (!targetUrl) {
      return res.status(400).json({ error: 'Target URL required (x-target-url header or url query param)' })
    }

    // Only allow certain domains for security
    const allowedDomains = [
      'api.godaddy.com',
      'api.namecheap.com',
      'api.github.com',
      'api.ycombinator.com',
      'trends.google.com',
    ]

    const url = new URL(targetUrl)
    if (!allowedDomains.some(d => url.hostname.includes(d))) {
      return res.status(403).json({ error: 'Domain not allowed' })
    }

    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Accept': 'application/json',
        ...(req.headers.authorization ? { 'Authorization': req.headers.authorization as string } : {}),
      },
      body: req.method === 'POST' ? JSON.stringify(req.body) : undefined,
    })

    const contentType = response.headers.get('content-type')
    
    if (contentType?.includes('application/json')) {
      const data = await response.json()
      return res.status(response.status).json(data)
    } else {
      const text = await response.text()
      res.setHeader('Content-Type', contentType || 'text/plain')
      return res.status(response.status).send(text)
    }
  } catch (error: any) {
    console.error('Proxy error:', error)
    return res.status(500).json({ error: error.message })
  }
}
