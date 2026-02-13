/**
 * Domain Registration via Namecheap API.
 */
export interface RegistrationResult { domain: string; success: boolean; cost: number; error?: string; orderId?: string }

export async function registerDomain(domain: string): Promise<RegistrationResult> {
  const apiUser = process.env.NAMECHEAP_API_USER, apiKey = process.env.NAMECHEAP_API_KEY, clientIp = process.env.NAMECHEAP_CLIENT_IP || '0.0.0.0'
  if (!apiUser || !apiKey) return { domain, success: false, cost: 0, error: 'Namecheap not configured' }
  const reg = { FirstName: process.env.REGISTRANT_FIRST_NAME || 'Domain', LastName: process.env.REGISTRANT_LAST_NAME || 'Admin', Address1: process.env.REGISTRANT_ADDRESS || '123 Main St', City: process.env.REGISTRANT_CITY || 'Phoenix', StateProvince: process.env.REGISTRANT_STATE || 'AZ', PostalCode: process.env.REGISTRANT_ZIP || '85001', Country: process.env.REGISTRANT_COUNTRY || 'US', Phone: process.env.REGISTRANT_PHONE || '+1.5551234567', EmailAddress: process.env.REGISTRANT_EMAIL || `${apiUser}@users.noreply.github.com` }
  const params = new URLSearchParams({ ApiUser: apiUser, ApiKey: apiKey, UserName: apiUser, ClientIp: clientIp, Command: 'namecheap.domains.create', DomainName: domain, Years: '1', AddFreeWhoisguard: 'yes', WGEnabled: 'yes', ...Object.fromEntries(['Registrant', 'Tech', 'Admin', 'AuxBilling'].flatMap(p => Object.entries(reg).map(([k, v]) => [`${p}${k}`, v]))) })
  try {
    const r = await fetch(`https://api.namecheap.com/xml.response?${params}`)
    if (!r.ok) return { domain, success: false, cost: 0, error: `HTTP ${r.status}` }
    const xml = await r.text()
    if (xml.includes('Status="ERROR"')) { const m = xml.match(/<Error[^>]*>([^<]+)<\/Error>/); return { domain, success: false, cost: 0, error: m?.[1] || 'Failed' } }
    const cost = parseFloat(xml.match(/ChargedAmount="([^"]+)"/)?.[1] || '10')
    return { domain, success: true, cost, orderId: xml.match(/OrderID="([^"]+)"/)?.[1] }
  } catch (e) { return { domain, success: false, cost: 0, error: (e as Error).message } }
}

export async function registerBatch(domains: string[], maxBudget: number): Promise<RegistrationResult[]> {
  const results: RegistrationResult[] = []; let spent = 0
  for (const d of domains) {
    if (spent + 15 > maxBudget) break
    const r = await registerDomain(d); results.push(r)
    if (r.success) spent += r.cost
    await new Promise(r => setTimeout(r, 100))
  }
  return results
}
