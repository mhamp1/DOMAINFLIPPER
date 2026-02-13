/**
 * Afternic Integration — Multi-Marketplace Domain Selling
 * DNS-based listing on GoDaddy's primary seller platform.
 */
export interface ListingStrategy {
  primary: 'afternic'; nameservers: string[]; buyNowPrice: number; floorPrice: number; minimumOffer: number; fastTransfer: boolean; additionalMarketplaces: string[]
}

export function calculateListingStrategy(purchasePrice: number, estimatedValue: number, confidence: number, domainAge: number): ListingStrategy {
  const buyNow = roundToNicePrice(estimatedValue)
  const commissionAdjusted = (purchasePrice * 2.0) / 0.85
  const floor = roundToNicePrice(Math.max(commissionAdjusted, purchasePrice * 2.5))
  const minOffer = roundToNicePrice(purchasePrice * 1.5)
  return { primary: 'afternic', nameservers: ['NS1.AFTERNIC.COM', 'NS2.AFTERNIC.COM'], buyNowPrice: buyNow, floorPrice: floor, minimumOffer: minOffer, fastTransfer: domainAge >= 60, additionalMarketplaces: ['dan.com', 'sedo.com'] }
}

function roundToNicePrice(price: number): number {
  if (price < 100) return Math.ceil(price / 5) * 5
  if (price < 500) return Math.ceil(price / 25) * 25
  if (price < 2000) return Math.ceil(price / 100) * 100
  if (price < 10000) return Math.ceil(price / 500) * 500
  return Math.ceil(price / 1000) * 1000
}

export async function checkAfternicListing(domain: string): Promise<{ isListed: boolean; price: number | null; currency: string | null } | null> {
  try {
    const response = await fetch(`https://www.afternic.com/domains/api/listingDetails/${domain}`)
    if (!response.ok) return { isListed: false, price: null, currency: null }
    const data = await response.json()
    return { isListed: data.isForSale === true || data.listed === true, price: data.price || data.buyNowPrice || null, currency: data.currency || 'USD' }
  } catch { return null }
}
