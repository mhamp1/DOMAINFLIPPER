/**
 * Auction Strategy — decides HOW to bid based on auction dynamics.
 * Real logic based on time remaining, bid count, and price vs. value ratio.
 */

export interface AuctionStrategy {
  approach: 'snipe_late' | 'bid_early_low' | 'proxy_and_forget' | 'skip_overheated'
  timing: string
  bidAmount: number
  maxBid: number
  reasoning: string
}

/** GoDaddy's actual bid increment rules */
function getMinIncrement(currentBid: number): number {
  if (currentBid < 15) return 1
  if (currentBid < 100) return 5
  if (currentBid < 500) return 10
  if (currentBid < 1000) return 25
  if (currentBid < 5000) return 50
  return 100
}

export function determineStrategy(
  domain: string,
  auctionEndTime: string | undefined,
  bidCount: number,
  currentPrice: number,
  estimatedValue: number,
  maxAffordable: number, // min(estValue/minROI, perDomainCap)
): AuctionStrategy {
  const hoursRemaining = auctionEndTime
    ? (new Date(auctionEndTime).getTime() - Date.now()) / (1000 * 60 * 60)
    : 48 // Default if unknown

  // OVERHEATED: too many bidders or price above 50% of value
  if (bidCount > 15 || currentPrice > estimatedValue * 0.5) {
    return {
      approach: 'skip_overheated',
      timing: 'never',
      bidAmount: 0,
      maxBid: 0,
      reasoning: `Overheated: ${bidCount} bids, price $${currentPrice} is ${((currentPrice / estimatedValue) * 100).toFixed(0)}% of est. value $${estimatedValue}.`,
    }
  }

  // SNIPE: ending soon (<2h), few bids, price well below max
  if (hoursRemaining < 2 && bidCount < 5 && currentPrice < maxAffordable * 0.3) {
    const bid = currentPrice + getMinIncrement(currentPrice)
    return {
      approach: 'snipe_late',
      timing: `now (${hoursRemaining.toFixed(1)}h left)`,
      bidAmount: Math.round(bid * 100) / 100,
      maxBid: Math.round(maxAffordable * 0.8),
      reasoning: `Late snipe: ${hoursRemaining.toFixed(1)}h left, only ${bidCount} bids, price $${currentPrice} well below ceiling $${Math.round(maxAffordable)}.`,
    }
  }

  // PROXY: lots of time (>24h) — set proxy and forget
  if (hoursRemaining > 24) {
    const startBid = Math.max(currentPrice + getMinIncrement(currentPrice), maxAffordable * 0.2)
    return {
      approach: 'proxy_and_forget',
      timing: 'now (set proxy)',
      bidAmount: Math.round(startBid * 100) / 100,
      maxBid: Math.round(maxAffordable * 0.7),
      reasoning: `${Math.round(hoursRemaining)}h remaining. Proxy bid $${Math.round(startBid)} with max $${Math.round(maxAffordable * 0.7)}.`,
    }
  }

  // DEFAULT: controlled early bid
  const bid = currentPrice + getMinIncrement(currentPrice)
  return {
    approach: 'bid_early_low',
    timing: 'now',
    bidAmount: Math.round(bid * 100) / 100,
    maxBid: Math.round(maxAffordable * 0.6),
    reasoning: `${Math.round(hoursRemaining)}h left, ${bidCount} bids. Controlled bid $${Math.round(bid)}, max $${Math.round(maxAffordable * 0.6)}.`,
  }
}
