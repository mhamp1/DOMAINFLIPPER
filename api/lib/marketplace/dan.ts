/**
 * Dan.com marketplace integration — URL generation + listing check.
 */
export function getDanUrl(domain: string): string { return `https://dan.com/buy-domain/${domain}` }
export function getSedoUrl(domain: string): string { return `https://sedo.com/search/details/?domain=${domain}` }

export async function checkDanListing(domain: string): Promise<{ listed: boolean; price?: number }> {
  try {
    const r = await fetch(`https://dan.com/buy-domain/${domain}`, { method: 'HEAD', redirect: 'manual' })
    return { listed: r.status === 200 }
  } catch { return { listed: false } }
}
