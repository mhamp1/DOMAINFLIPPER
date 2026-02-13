/**
 * Namecheap Domain Check API — SECONDARY SOURCE
 * 
 * Checks bulk domain availability.
 * Server-side only. Uses NAMECHEAP_API_USER / NAMECHEAP_API_KEY / NAMECHEAP_CLIENT_IP.
 */

import type { RawDomain } from '../valuation/scorer.js'

export async function checkNamecheapAvailability(domains: string[]): Promise<RawDomain[]> {
  const apiUser = process.env.NAMECHEAP_API_USER
  const apiKey = process.env.NAMECHEAP_API_KEY
  const clientIp = process.env.NAMECHEAP_CLIENT_IP || '0.0.0.0'
  if (!apiUser || !apiKey || domains.length === 0) return []

  const batch = domains.slice(0, 50) // Namecheap limit
  const params = new URLSearchParams({
    ApiUser: apiUser,
    ApiKey: apiKey,
    UserName: apiUser,
    ClientIp: clientIp,
    Command: 'namecheap.domains.check',
    DomainList: batch.join(','),
  })

  const response = await fetch(`https://api.namecheap.com/xml.response?${params}`)
  if (!response.ok) throw new Error(`Namecheap ${response.status}`)

  const xml = await response.text()
  const results: RawDomain[] = []
  const regex = /Domain="([^"]+)"[^>]*Available="([^"]+)"[^>]*(?:PremiumRegistrationPrice="([^"]+)")?/g
  let match
  while ((match = regex.exec(xml)) !== null) {
    if (match[2] === 'true') {
      results.push({
        domain: match[1],
        price: match[3] ? parseFloat(match[3]) : 10,
        source: 'namecheap',
      })
    }
  }
  return results
}

/** Generate keyword-based domain candidates for availability checking */
export function generateCandidates(tlds: string[]): string[] {
  const prefixes = ['get', 'try', 'use', 'my', 'go', 'the']
  const keywords = ['ai', 'data', 'cloud', 'tech', 'dev', 'hub', 'app', 'pay', 'bot', 'sync']
  const suffixes = ['hub', 'pro', 'ly', 'io', 'lab', 'hq', 'ify', 'ly']
  const candidates: string[] = []

  for (const kw of keywords) {
    for (const tld of tlds) {
      const ext = tld.replace('.', '')
      candidates.push(`${kw}.${ext}`)
      for (const pre of prefixes) candidates.push(`${pre}${kw}.${ext}`)
      for (const suf of suffixes) candidates.push(`${kw}${suf}.${ext}`)
    }
  }
  return [...new Set(candidates)].slice(0, 50) // dedupe, cap at 50
}
