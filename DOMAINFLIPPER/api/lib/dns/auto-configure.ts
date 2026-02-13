/**
 * Auto-DNS — Points domains to Vercel lander + adds to Vercel project.
 */
function env(key: string): string { return process.env[key] || '' }

export async function addDomainToVercel(domain: string): Promise<{ success: boolean; error?: string }> {
  const token = env('VERCEL_TOKEN'), projectId = env('VERCEL_PROJECT_ID')
  if (!token || !projectId) return { success: false, error: 'VERCEL_TOKEN or VERCEL_PROJECT_ID not set' }
  try {
    const r = await fetch(`https://api.vercel.com/v10/projects/${projectId}/domains`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: domain }) })
    return (r.ok || r.status === 409) ? { success: true } : { success: false, error: `Vercel ${r.status}` }
  } catch (e) { return { success: false, error: (e as Error).message } }
}

export async function setDnsToVercel(domain: string): Promise<{ success: boolean; error?: string }> {
  const apiKey = env('GODADDY_API_KEY'), apiSecret = env('GODADDY_API_SECRET')
  if (!apiKey || !apiSecret) return { success: false, error: 'GoDaddy creds not set' }
  try {
    const r = await fetch(`https://api.godaddy.com/v1/domains/${domain}/records/A/@`, { method: 'PUT', headers: { Authorization: `sso-key ${apiKey}:${apiSecret}`, 'Content-Type': 'application/json' }, body: JSON.stringify([{ data: '76.76.21.21', ttl: 600 }]) })
    return r.ok ? { success: true } : { success: false, error: `GoDaddy ${r.status}` }
  } catch (e) { return { success: false, error: (e as Error).message } }
}

export async function autoConfigureDomain(domain: string): Promise<{ vercel: boolean; dns: boolean; errors: string[] }> {
  const errors: string[] = []
  const v = await addDomainToVercel(domain); if (!v.success) errors.push(`Vercel: ${v.error}`)
  const d = await setDnsToVercel(domain); if (!d.success) errors.push(`DNS: ${d.error}`)
  return { vercel: v.success, dns: d.success, errors }
}
