/**
 * Vercel Serverless Function — Namecheap Domain Check Proxy
 * Bypasses CORS by making server-side API calls
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const apiUser = process.env.VITE_NAMECHEAP_API_USER || process.env.NAMECHEAP_API_USER
  const apiKey = process.env.VITE_NAMECHEAP_API_KEY || process.env.NAMECHEAP_API_KEY
  const clientIp = process.env.VITE_NAMECHEAP_CLIENT_IP || process.env.NAMECHEAP_CLIENT_IP || '0.0.0.0'

  if (!apiUser || !apiKey) {
    return res.status(500).json({ error: 'Namecheap API not configured' })
  }

  try {
    const { domains } = req.query
    
    if (!domains) {
      return res.status(400).json({ error: 'domains parameter required' })
    }

    const url = `https://api.namecheap.com/xml.response?ApiUser=${apiUser}&ApiKey=${apiKey}&UserName=${apiUser}&ClientIp=${clientIp}&Command=namecheap.domains.check&DomainList=${domains}`

    const response = await fetch(url)
    const xmlText = await response.text()

    // Return raw XML (frontend will parse it)
    res.setHeader('Content-Type', 'application/xml')
    return res.status(200).send(xmlText)
  } catch (error: any) {
    console.error('Namecheap API error:', error)
    return res.status(500).json({ error: error.message })
  }
}
